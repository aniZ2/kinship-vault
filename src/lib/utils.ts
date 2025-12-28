// src/lib/utils.ts

import { Timestamp } from "firebase/firestore";

/**
 * Convert Firestore timestamp or Date to Date object
 */
export function toDate(maybeTs: Timestamp | Date | string | null | undefined): Date | null {
  if (!maybeTs) return null;
  if (maybeTs instanceof Date) return maybeTs;
  if (typeof maybeTs === "object" && "toDate" in maybeTs && typeof maybeTs.toDate === "function") {
    return maybeTs.toDate();
  }
  if (typeof maybeTs === "string") {
    const d = new Date(maybeTs);
    return Number.isNaN(+d) ? null : d;
  }
  return null;
}

/**
 * Get period tag for a page based on its date
 */
export function periodTagFor(page: { timePeriod?: { from?: unknown }; createdAt?: unknown }): string {
  const now = new Date();
  const from = toDate(page?.timePeriod?.from as Timestamp) || toDate(page?.createdAt as Timestamp);
  if (!from) return "Unknown";
  const year = from.getFullYear();
  if (year === now.getFullYear()) return "This Year";
  const decade = Math.floor(year / 10) * 10;
  return `The ${decade}s`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Format money with currency
 */
export function formatMoney(n: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/**
 * Get initials from a user object
 */
export function initialsFrom(
  user: { displayName?: string | null; email?: string | null } | null,
  fallback: string = "You"
): string {
  const name = user?.displayName || user?.email?.split("@")[0] || fallback;
  return name
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

/**
 * Convert data URL to Blob
 */
export function dataURLtoBlob(dataURL: string): Blob | null {
  if (!dataURL) return null;
  const [hdr, b64] = dataURL.split(",");
  const mime = /data:(.*?);base64/.exec(hdr)?.[1] || "image/png";
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * Prune undefined values from an object (deep)
 */
export function pruneUndefinedDeep<T>(v: T): T {
  if (Array.isArray(v)) {
    return v.map(pruneUndefinedDeep).filter((x) => x !== undefined) as T;
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      const pr = pruneUndefinedDeep(val);
      if (pr !== undefined) out[k] = pr;
    }
    return out as T;
  }
  return v === undefined ? (undefined as T) : v;
}

/**
 * Build image URL from image ID
 * Uses R2 worker for new images, falls back to Cloudflare Images for legacy
 */
export function cfURL(id: string | undefined): string {
  if (!id) return "";
  
  // New R2 format - IDs contain timestamp and UUID
  const r2Base = process.env.NEXT_PUBLIC_IMAGES_API_BASE || "";
  if (r2Base && (id.includes("-") && id.length > 30)) {
    return `${r2Base}/images/${id}`;
  }
  
  // Legacy Cloudflare Images format
  const hash = process.env.NEXT_PUBLIC_CF_IMAGES_HASH || "";
  const variant = process.env.NEXT_PUBLIC_CF_IMAGES_VARIANT || "public";
  if (!hash) return "";
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}
