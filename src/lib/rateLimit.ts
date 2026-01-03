// src/lib/rateLimit.ts

/**
 * Rate limiting utilities for client and server-side use
 */

// ============================================================================
// CLIENT-SIDE RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const clientLimits = new Map<string, RateLimitEntry>();

/**
 * Check if an action is allowed based on rate limits (client-side)
 * @param key - Unique identifier for the rate limit (e.g., 'photo-upload')
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed boolean and remaining count
 */
export function checkClientRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = clientLimits.get(key);

  // No entry or window expired - reset
  if (!entry || now - entry.windowStart >= windowMs) {
    clientLimits.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  // Within window - check count
  if (entry.count >= maxRequests) {
    const resetIn = windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: windowMs - (now - entry.windowStart),
  };
}

/**
 * Reset a specific rate limit (useful for testing or after successful operations)
 */
export function resetClientRateLimit(key: string): void {
  clientLimits.delete(key);
}

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

export const RATE_LIMITS = {
  // Photo uploads (authenticated users): max 10 per minute
  photoUpload: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // Guest uploads: two-tier rate limiting
  // Burst: 5 uploads/minute (prevents rapid-fire abuse)
  // Sustained: 20 uploads/hour (prevents grinding)
  // Enforced per IP + familyId
  guestUploadBurst: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  guestUploadSustained: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // API calls: max 100 per minute
  apiCall: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Auth attempts: max 5 per 15 minutes
  authAttempt: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;

// ============================================================================
// SERVER-SIDE RATE LIMITING (for API routes)
// ============================================================================

/**
 * Get client identifier from request for rate limiting
 * Uses IP address or forwarded headers
 */
export function getClientIdentifier(request: Request): string {
  // Try to get the real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback - in development this might be localhost
  return 'unknown-client';
}

// ============================================================================
// IN-MEMORY STORE FOR SERVER-SIDE (use Redis in production)
// ============================================================================

const serverLimits = new Map<string, RateLimitEntry>();

/**
 * Server-side rate limit check
 * Note: In production, replace this with Redis or similar for distributed rate limiting
 */
export function checkServerRateLimit(
  clientId: string,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number; headers: Record<string, string> } {
  const compositeKey = `${key}:${clientId}`;
  const now = Date.now();
  const entry = serverLimits.get(compositeKey);

  let result: { allowed: boolean; remaining: number; resetIn: number };

  // No entry or window expired - reset
  if (!entry || now - entry.windowStart >= windowMs) {
    serverLimits.set(compositeKey, { count: 1, windowStart: now });
    result = { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  } else if (entry.count >= maxRequests) {
    // Within window and limit exceeded
    const resetIn = windowMs - (now - entry.windowStart);
    result = { allowed: false, remaining: 0, resetIn };
  } else {
    // Increment count
    entry.count++;
    result = {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetIn: windowMs - (now - entry.windowStart),
    };
  }

  // Build rate limit headers
  const headers = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil((now + result.resetIn) / 1000).toString(),
  };

  if (!result.allowed) {
    headers['Retry-After'] = Math.ceil(result.resetIn / 1000).toString();
  }

  return { ...result, headers };
}

/**
 * Create a rate-limited API response
 */
export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(resetIn / 1000)} seconds before trying again`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(resetIn / 1000).toString(),
      },
    }
  );
}

// ============================================================================
// HELPER HOOK FOR REACT COMPONENTS
// ============================================================================

/**
 * Hook-friendly rate limit check that returns a function
 * Usage: const { check, remaining } = useRateLimit('photo-upload', RATE_LIMITS.photoUpload)
 */
export function createRateLimiter(
  key: string,
  config: { maxRequests: number; windowMs: number }
) {
  return {
    check: () => checkClientRateLimit(key, config.maxRequests, config.windowMs),
    reset: () => resetClientRateLimit(key),
  };
}
