// cf-worker/src/worker.js - R2 Storage Version

export default {
  async fetch(req, env) {
    try {
      const cors = computeCors(req, env.ALLOWED_ORIGINS || "*");
      if (req.method === "OPTIONS") return new Response(null, { headers: cors });

      const url = new URL(req.url);

      // --- Health check ---
      if (url.pathname === "/health" && req.method === "GET") {
        return json({
          ok: true,
          storage: "r2",
          bucketBound: !!env.IMAGES_BUCKET,
          requireAuth: env.REQUIRE_AUTH === "1",
        }, 200, cors);
      }

      // --- Auth helper ---
      const requireAuth = env.REQUIRE_AUTH === "1";
      let authPayload = null;
      
      const verifyAuth = async () => {
        if (!requireAuth) return true;
        const idToken = parseBearer(req.headers.get("authorization"));
        if (!idToken) return false;
        try {
          authPayload = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
          return true;
        } catch (e) {
          console.error("Auth failed:", e);
          return false;
        }
      };

      // --- Upload image ---
      if (url.pathname === "/upload" && req.method === "POST") {
        if (requireAuth && !(await verifyAuth())) {
          return json({ error: "unauthorized" }, 401, cors);
        }

        const formData = await req.formData();
        const file = formData.get("file");
        if (!file || !(file instanceof File)) {
          return json({ error: "no file provided" }, 400, cors);
        }

        // Generate unique ID
        const ext = getExtension(file.name || file.type);
        const imageId = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        
        // Upload to R2
        await env.IMAGES_BUCKET.put(imageId, file.stream(), {
          httpMetadata: {
            contentType: file.type || "image/jpeg",
          },
          customMetadata: {
            originalName: file.name || "unknown",
            uploadedBy: authPayload?.sub || "anonymous",
            uploadedAt: new Date().toISOString(),
          },
        });

        return json({
          ok: true,
          imageId,
          // Client will use /images/:id to fetch
          deliveryURL: `${url.origin}/images/${imageId}`,
        }, 200, cors);
      }

      // --- Get image (PUBLIC - no auth needed for viewing) ---
      if (url.pathname.startsWith("/images/") && req.method === "GET") {
        const imageId = url.pathname.replace("/images/", "");
        if (!imageId) return json({ error: "missing image id" }, 400, cors);

        const object = await env.IMAGES_BUCKET.get(imageId);
        if (!object) {
          return json({ error: "not found" }, 404, cors);
        }

        // Images are public - allow CORS from any origin for fetching
        const origin = req.headers.get("origin") || "*";
        const headers = new Headers();
        headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("ETag", object.etag);
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

        return new Response(object.body, { headers });
      }

      // --- Delete image ---
      if (url.pathname.startsWith("/images/") && req.method === "DELETE") {
        if (requireAuth && !(await verifyAuth())) {
          return json({ error: "unauthorized" }, 401, cors);
        }

        const imageId = url.pathname.replace("/images/", "");
        if (!imageId) return json({ error: "missing image id" }, 400, cors);

        await env.IMAGES_BUCKET.delete(imageId);
        return json({ ok: true }, 200, cors);
      }

      // --- Batch delete ---
      if (url.pathname === "/images/delete" && req.method === "POST") {
        if (requireAuth && !(await verifyAuth())) {
          return json({ error: "unauthorized" }, 401, cors);
        }

        const { ids } = await safeJSON(req);
        if (!Array.isArray(ids) || ids.length === 0) {
          return json({ error: "bad_request" }, 400, cors);
        }

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              await env.IMAGES_BUCKET.delete(id);
              return { id, ok: true };
            } catch (e) {
              return { id, ok: false, error: String(e) };
            }
          })
        );

        return json({ ok: results.every((r) => r.ok), results }, 200, cors);
      }

      // --- Legacy endpoint compatibility (for existing client code) ---
      if (url.pathname === "/get-upload-url" && req.method === "POST") {
        // Return info that tells client to use direct upload instead
        return json({
          useDirectUpload: true,
          uploadEndpoint: `${url.origin}/upload`,
          message: "Use POST /upload with multipart form data",
        }, 200, cors);
      }

      return new Response("Not found", { status: 404, headers: cors });
    } catch (e) {
      console.error("Worker error:", e);
      return new Response(`Internal Error: ${String(e?.message || e)}`, { status: 500 });
    }
  },
};

/* ---------- Helpers ---------- */

function parseBearer(h) {
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/.exec(h);
  return m ? m[1] : null;
}

async function safeJSON(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

function getExtension(nameOrType) {
  if (nameOrType.includes("/")) {
    // It's a mime type
    const map = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/heic": ".heic",
      "image/heif": ".heif",
    };
    return map[nameOrType] || ".jpg";
  }
  // It's a filename
  const ext = nameOrType.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : ".jpg";
}

function computeCors(req, allowedCsv) {
  const allowed = (allowedCsv || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get("origin") || "";
  const allowAll = allowed.includes("*");
  const allowOrigin = allowAll || allowed.includes(origin) ? (origin || "*") : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Credentials": allowOrigin !== "*" ? "true" : "false",
  };
}

/* ---------- Firebase ID token verify ---------- */

let JWKS_CACHE = { keys: null, ts: 0 };
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

async function getJWKS() {
  const now = Date.now();
  if (JWKS_CACHE.keys && now - JWKS_CACHE.ts < 3600_000) return JWKS_CACHE.keys;
  const r = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  const j = await r.json();
  if (!j?.keys?.length) throw new Error("no_jwks");
  JWKS_CACHE = { keys: j.keys, ts: now };
  return j.keys;
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  if (s.length % 4) s += "=".repeat(4 - (s.length % 4));
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifyFirebaseToken(idToken, projectId) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("bad_jwt");
  const [h, p, s] = parts;
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  const sig = b64urlToBytes(s);
  const keys = await getJWKS();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("no_matching_kid");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    sig,
    new TextEncoder().encode(`${h}.${p}`)
  );
  if (!ok) throw new Error("bad_signature");
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("bad_iss");
  if (payload.aud !== projectId) throw new Error("bad_aud");
  if (!payload.sub) throw new Error("bad_sub");
  if (payload.exp && now > payload.exp) throw new Error("expired");
  return payload;
}
