// upload-stickers.js
// Bulk-upload PNG/SVG/WebP files to Cloudflare Images via your Worker
// and register them as sticker items under a named pack in Firestore.
//
// Requires: Node 18+ (global fetch), firebase-admin, mime
//
// ENV:
//   FAMILY_ID=nnjgPbutVfa8VsMgdKm4
//   WORKER_BASE=http://127.0.0.1:8787          (no trailing slash; prod can be same-origin reverse-proxy)
//   STICKER_SRC_DIR=./openmoji-sprites-v2.0.0/png
//   STICKER_PACK_NAME="OpenMoji"
//   PRIVACY=public|private                      (default public)
//   LIMIT=50                                    (default 50)
//
// Firebase Admin:
//   export GOOGLE_APPLICATION_CREDENTIALS=/full/path/service-account.json

const fs = require('node:fs');
const path = require('node:path');
const mime = require('mime-types');
const admin = require('firebase-admin');

// ------------------ Config from ENV ------------------
const FAMILY_ID = process.env.FAMILY_ID;
const WORKER_BASE = (process.env.WORKER_BASE || '').replace(/\/+$/,'');
const SRC_DIR = process.env.STICKER_SRC_DIR || 'stickers';
const PACK_NAME = process.env.STICKER_PACK_NAME || 'OpenMoji';
const PRIVACY = (process.env.PRIVACY === 'private') ? 'private' : 'public';
const LIMIT = Math.max(1, Number(process.env.LIMIT || 50));

// ------------------ Guard rails ----------------------
function die(msg) { console.error(msg); process.exit(1); }
function log(...a){ console.log('[upload-stickers]', ...a); }

if (!FAMILY_ID) die('Missing FAMILY_ID env');
if (!WORKER_BASE) die('Missing WORKER_BASE env (e.g. http://127.0.0.1:8787)');
if (!fs.existsSync(SRC_DIR)) die(`STICKER_SRC_DIR does not exist: ${path.resolve(SRC_DIR)}`);

log(`Family: ${FAMILY_ID}`);
log(`Worker: ${WORKER_BASE}`);
log(`Source: ${path.resolve(SRC_DIR)}`);
log(`Privacy: ${PRIVACY}`);
log(`Limit: ${LIMIT}`);

// ------------------ Firebase Admin -------------------
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} catch (e) {
  die(`Failed to init firebase-admin: ${e.message || e}`);
}
const db = admin.firestore();

// ------------------ Helpers --------------------------
const ALLOWED_EXT = new Set(['.png', '.svg', '.webp']);

function listFilesRecursive(dir) {
  /** @type {string[]} */
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...listFilesRecursive(p));
    } else if (ent.isFile()) {
      if (ALLOWED_EXT.has(path.extname(ent.name).toLowerCase())) {
        out.push(p);
      }
    }
  }
  return out;
}

async function mintDirectUpload() {
  const res = await fetch(`${WORKER_BASE}/get-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // You could also send { deliveryVariant: "full" } here if your Worker supports it
    body: JSON.stringify({ privacy: PRIVACY }),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok || !json?.uploadURL || !json?.imageId) {
    throw new Error(`Mint failed (${res.status}): ${text.slice(0,200)}`);
  }
  return json; // { imageId, uploadURL, deliveryBase, variant, privacy }
}

async function directUpload(uploadURL, absPath) {
  const buf = fs.readFileSync(absPath);
  const type = mime.lookup(path.basename(absPath)) || 'application/octet-stream';

  // Node 18+ has Blob/FormData globally
  const blob = new Blob([buf], { type });
  const fd = new FormData();
  fd.append('file', blob, path.basename(absPath));

  const res = await fetch(uploadURL, { method: 'POST', body: fd });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Direct upload failed (${res.status}): ${raw.slice(0,200)}`);

  try {
    const j = JSON.parse(raw);
    return j?.result?.id || null;
  } catch {
    return null; // some responses aren’t JSON; the minted imageId is still canonical
  }
}

async function ensurePackByName(familyId, name) {
  const packsCol = db.collection(`families/${familyId}/stickerPacks`);
  const snap = await packsCol.where('name', '==', name).limit(1).get();
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ref: d.ref };
  }
  const ref = await packsCol.add({
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id, ref };
}

async function addStickerItem(familyId, packId, data) {
  const itemsCol = db.collection(`families/${familyId}/stickerPacks/${packId}/items`);
  await itemsCol.add({
    name: data.name || 'Sticker',
    kind: 'cf-image',
    imageId: data.imageId,
    deliveryURL: data.deliveryURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ------------------ Main -----------------------------
(async () => {
  // 1) files
  let files = listFilesRecursive(SRC_DIR);
  if (!files.length) die('No .png/.svg/.webp files found in STICKER_SRC_DIR');
  files.sort();                  // deterministic order
  files = files.slice(0, LIMIT); // cap to LIMIT

  // 2) pack
  const { id: packId } = await ensurePackByName(FAMILY_ID, PACK_NAME);
  log(`Using pack "${PACK_NAME}" (${packId})`);

  // 3) loop
  let ok = 0, fail = 0;
  for (const abs of files) {
    const rel = path.relative(SRC_DIR, abs);
    try {
      // mint upload URL
      const { imageId, uploadURL, deliveryBase, variant } = await mintDirectUpload();
      // upload binary
      const confirmed = await directUpload(uploadURL, abs);
      const finalId = confirmed || imageId;
      const deliveryURL = deliveryBase ? `${deliveryBase}/${finalId}/${variant || 'public'}` : null;

      // write item to Firestore
      const baseName = path.basename(rel).replace(/\.[^.]+$/, '');
      await addStickerItem(FAMILY_ID, packId, { name: baseName, imageId: finalId, deliveryURL });

      ok++;
      log(`✔ uploaded: ${rel} → ${finalId}`);
    } catch (e) {
      fail++;
      console.error(`✖ failed: ${rel}\n   ${e.message || e}`);
    }
  }

  log(`Done. Success: ${ok}, Failed: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => {
  die(e?.stack || e?.message || String(e));
});
