// scripts/scan-stickers.mjs
// Usage:
//   node scripts/scan-stickers.mjs
//   node scripts/scan-stickers.mjs --zip=https://example.com/washi-pack.zip
//
// - Scans public/stickers/builtin/** for images (png/svg/webp)
// - Optional: downloads a ZIP into public/stickers/builtin/ before scanning
// - Emits public/stickers/builtin/manifest.json with packs based on subfolders
//
// Folder shape (example):
// public/stickers/builtin/
//   washi/  -> becomes pack "Washi Tape"
//     tape1.png, tape2.png ...
//   pins/   -> "Pins & Clips"
//     pin-red.png, paperclip.png ...
//
// Each file becomes a sticker item with url: "/stickers/builtin/<folder>/<file>"

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import stream from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Optional unzip without extra deps:
import * as unzip from 'node:buffer'; // just to keep import list tidy (not used directly)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILTIN_DIR = path.join(ROOT, 'public', 'stickers', 'builtin');
const MANIFEST = path.join(BUILTIN_DIR, 'manifest.json');

const ALLOWED = new Set(['.png', '.webp', '.svg']);

function titleCase(s) {
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function downloadZip(url, destZipPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ZIP download failed ${res.status}`);
  const f = await fs.promises.open(destZipPath, 'w');
  await pipeline(res.body, f.createWriteStream());
  await f.close();
}

// Minimal unzip using `unzip -o` if present; otherwise error with tip.
async function unzipFile(zipPath, toDir) {
  try {
    // Prefer system unzip for simplicity
    await new Promise((resolve, reject) => {
      const { spawn } = require('node:child_process');
      const p = spawn('unzip', ['-o', zipPath, '-d', toDir], { stdio: 'inherit' });
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('unzip failed'))));
    });
  } catch (e) {
    throw new Error(
      `Could not unzip ${zipPath}. Install 'unzip' or extract manually into ${toDir}.`
    );
  }
}

function scanPacks(rootDir) {
  const packs = [];
  const folders = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  // If images are directly under builtin/, put them into a default pack
  const loose = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isFile() && ALLOWED.has(path.extname(d.name).toLowerCase()));

  if (loose.length) {
    packs.push({
      id: 'builtin',
      name: 'Built-in',
      items: loose.map((f) => ({
        id: f.name.replace(/\.[^.]+$/, ''),
        name: f.name.replace(/\.[^.]+$/, ''),
        kind: 'image',
        url: `/stickers/builtin/${f.name}`,
      })),
    });
  }

  for (const folder of folders) {
    const full = path.join(rootDir, folder);
    const files = fs.readdirSync(full, { withFileTypes: true })
      .filter((d) => d.isFile() && ALLOWED.has(path.extname(d.name).toLowerCase()))
      .map((d) => d.name)
      .sort();

    if (files.length === 0) continue;

    packs.push({
      id: folder.toLowerCase(),
      name: titleCase(folder),
      items: files.map((fname) => ({
        id: fname.replace(/\.[^.]+$/, ''),
        name: fname.replace(/\.[^.]+$/, ''),
        kind: 'image',
        url: `/stickers/builtin/${folder}/${fname}`,
      })),
    });
  }

  return packs;
}

(async () => {
  // Parse args
  const zipArg = process.argv.find((a) => a.startsWith('--zip='));
  const zipUrl = zipArg ? zipArg.split('=')[1] : '';

  await ensureDir(BUILTIN_DIR);

  if (zipUrl) {
    const tmpZip = path.join(BUILTIN_DIR, 'pack.zip');
    console.log('[stickers] Downloading ZIP…');
    await downloadZip(zipUrl, tmpZip);
    console.log('[stickers] Extracting…');
    await unzipFile(tmpZip, BUILTIN_DIR);
    await fs.promises.unlink(tmpZip).catch(() => {});
  }

  const packs = scanPacks(BUILTIN_DIR);
  await fs.promises.writeFile(MANIFEST, JSON.stringify({ packs }, null, 2));
  console.log(`[stickers] Wrote ${MANIFEST} with ${packs.length} pack(s).`);
})();
