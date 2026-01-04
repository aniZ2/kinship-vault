// src/lib/renderToken.ts
// HMAC-signed tokens for secure render page access

import crypto from 'crypto';

function getRenderSecret(): string {
  const secret = process.env.RENDER_SECRET;
  if (!secret) {
    throw new Error('RENDER_SECRET environment variable is required');
  }
  return secret;
}
const TOKEN_EXPIRY_MS = 60 * 1000; // 60 seconds

interface RenderTokenPayload {
  familyId: string;
  pageId: string;
  timestamp: number;
  quality: 'standard' | 'pro';
}

/**
 * Create a signed render token for accessing the render page
 */
export function createRenderToken(
  familyId: string,
  pageId: string,
  quality: 'standard' | 'pro' = 'standard'
): string {
  const payload: RenderTokenPayload = {
    familyId,
    pageId,
    timestamp: Date.now(),
    quality,
  };

  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', getRenderSecret())
    .update(data)
    .digest('hex');

  // Base64 encode the payload + signature
  const token = Buffer.from(`${data}.${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode a render token
 * Returns the payload if valid, null if invalid or expired
 */
export function verifyRenderToken(token: string): RenderTokenPayload | null {
  try {
    // Decode from base64url
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastDotIndex = decoded.lastIndexOf('.');

    if (lastDotIndex === -1) return null;

    const data = decoded.substring(0, lastDotIndex);
    const providedSignature = decoded.substring(lastDotIndex + 1);

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', getRenderSecret())
      .update(data)
      .digest('hex');

    if (providedSignature !== expectedSignature) {
      console.warn('Render token signature mismatch');
      return null;
    }

    // Parse payload
    const payload: RenderTokenPayload = JSON.parse(data);

    // Check expiry
    const age = Date.now() - payload.timestamp;
    if (age > TOKEN_EXPIRY_MS) {
      console.warn('Render token expired', { age, maxAge: TOKEN_EXPIRY_MS });
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to verify render token:', error);
    return null;
  }
}

/**
 * Get the render URL for a page
 */
export function getRenderUrl(
  familyId: string,
  pageId: string,
  quality: 'standard' | 'pro' = 'standard'
): string {
  const token = createRenderToken(familyId, pageId, quality);
  const baseUrl = process.env.RENDER_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/render/${familyId}/${pageId}?token=${token}`;
}
