// src/lib/cfImages.ts - R2 Storage Version

const DEFAULT_API_BASE = (process.env.NEXT_PUBLIC_IMAGES_API_BASE || "").replace(/\/+$/, "");

interface UploadResult {
  imageId: string;
  deliveryURL: string;
}

interface DeleteOptions {
  apiBaseURL?: string;
}

function resolveBaseURL(apiBaseURL?: string): string {
  const base = (apiBaseURL || DEFAULT_API_BASE || "").replace(/\/+$/, "");
  if (!base) throw new Error("Missing images API base URL (set NEXT_PUBLIC_IMAGES_API_BASE)");
  return base;
}

/* ---------------- Upload ---------------- */
export async function uploadToCloudflare(
  _workerBaseURL: string | undefined,
  fileOrBlob: Blob,
  idToken?: string,
  _privacy: string = "public",
  opts: { apiBaseURL?: string } = {}
): Promise<UploadResult> {
  if (!(fileOrBlob instanceof Blob)) throw new Error("No file/blob provided to upload");

  const base = resolveBaseURL(opts?.apiBaseURL);

  const fd = new FormData();
  fd.append("file", fileOrBlob);

  const res = await fetch(`${base}/upload`, {
    method: "POST",
    headers: {
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: fd,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data?.imageId || !data?.deliveryURL) {
    throw new Error("Invalid upload response");
  }

  return {
    imageId: data.imageId,
    deliveryURL: data.deliveryURL,
  };
}

/* ---------------- Build delivery URL ---------------- */
export function buildDeliveryURL(imageId: string, _variant?: string): string {
  if (!imageId) return "";
  const base = resolveBaseURL();
  return `${base}/images/${imageId}`;
}

/* ---------------- Replace (upload new, delete old) ---------------- */
export async function replaceCloudflareImage(
  _workerBaseURL: string | undefined,
  fileOrBlob: Blob,
  idToken: string | undefined,
  oldImageId: string,
  _options: { apiBaseURL?: string } = {}
): Promise<UploadResult> {
  // Upload new image
  const result = await uploadToCloudflare(undefined, fileOrBlob, idToken);
  
  // Delete old image (fire and forget)
  if (oldImageId) {
    deleteCloudflareImage(undefined, oldImageId, idToken).catch(() => {});
  }
  
  return result;
}

/* ---------------- Delete (single) ---------------- */
export async function deleteCloudflareImage(
  _workerBaseURL: string | undefined,
  imageId: string,
  idToken?: string,
  options: DeleteOptions = {}
): Promise<{ ok: boolean }> {
  if (!imageId) return { ok: true };
  
  const base = resolveBaseURL(options.apiBaseURL);
  
  const res = await fetch(`${base}/images/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
    headers: {
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
  });
  
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed (${res.status})`);
  }
  
  return { ok: true };
}

/* ---------------- Delete (batch) ---------------- */
export async function deleteCloudflareImages(
  _workerBaseURL: string | undefined,
  imageIds: string[],
  idToken?: string,
  options: DeleteOptions = {}
): Promise<{ ok: boolean; results?: unknown[] }> {
  const ids = Array.isArray(imageIds) ? imageIds.filter(Boolean) : [];
  if (!ids.length) return { ok: true, results: [] };
  
  const base = resolveBaseURL(options.apiBaseURL);

  const res = await fetch(`${base}/images/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ ids }),
  });
  
  if (!res.ok) throw new Error(`Batch delete failed (${res.status})`);
  return res.json();
}

/* ---------------- Helper for authenticated image URLs ---------------- */
export function getAuthenticatedImageURL(imageId: string, idToken?: string): string {
  if (!imageId) return "";
  const base = resolveBaseURL();
  // For authenticated requests, the client needs to fetch with auth header
  // This just returns the base URL - actual fetching should include the token
  return `${base}/images/${imageId}`;
}
