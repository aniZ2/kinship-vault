// src/lib/stripe/products.ts

/**
 * Stripe Product Configuration
 *
 * Before using, create these products in Stripe Dashboard:
 * 1. Go to https://dashboard.stripe.com/products
 * 2. Create each product with the prices below
 * 3. Copy the price IDs and update this file
 */

export type SubscriptionTier = 'free' | 'user_pro' | 'family_pro' | 'event';

// ============================================================================
// PRICE IDS - Update these after creating products in Stripe Dashboard
// ============================================================================

export const STRIPE_PRICES = {
  // User Pro - Allows joining 5 families instead of 2
  USER_PRO_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_USER_PRO_MONTHLY || 'price_user_pro_monthly',
  USER_PRO_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_USER_PRO_ANNUAL || 'price_user_pro_annual',

  // Family Pro - 25 members, unlimited storage
  FAMILY_PRO_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRO_MONTHLY || 'price_family_pro_monthly',
  FAMILY_PRO_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRO_ANNUAL || 'price_family_pro_annual',

  // Event Pack - $99/year one-time
  EVENT_PACK: process.env.NEXT_PUBLIC_STRIPE_EVENT_PACK || 'price_event_pack',
} as const;

// ============================================================================
// PRICING DISPLAY
// ============================================================================

export const PRICING = {
  userPro: {
    monthly: 5,
    annual: 50,
    annualSavings: 10, // $60 - $50 = $10 saved (2 months free)
  },
  familyPro: {
    monthly: 10,
    annual: 100,
    annualSavings: 20, // $120 - $100 = $20 saved (2 months free)
  },
  eventPack: {
    annual: 99,
  },
} as const;

// ============================================================================
// LIMITS BY TIER
// ============================================================================

export const LIMITS = {
  // How many families a user can join
  familiesPerUser: {
    free: 2,
    user_pro: 5,
  },

  // Family member limits
  membersPerFamily: {
    free: 5,
    family_pro: 25,
  },

  // Storage limits (in bytes)
  storagePerFamily: {
    free: 1 * 1024 * 1024 * 1024, // 1GB
    family_pro: Infinity, // Unlimited
  },

  // Event limits
  editorsPerEvent: 5,
  guestsPerEvent: Infinity, // Unlimited
} as const;

// ============================================================================
// SUBSCRIPTION STATUS TYPES
// ============================================================================

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid';

export interface UserSubscription {
  status: SubscriptionStatus;
  priceId: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

export interface FamilySubscription {
  type: 'free' | 'pro';
  status?: SubscriptionStatus;
  priceId?: string;
  currentPeriodEnd?: Date;
  stripeSubscriptionId?: string;
  storageUsedBytes: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the family limit for a user based on their subscription
 */
export function getUserFamilyLimit(hasUserPro: boolean): number {
  return hasUserPro ? LIMITS.familiesPerUser.user_pro : LIMITS.familiesPerUser.free;
}

/**
 * Get the member limit for a family based on its subscription
 */
export function getFamilyMemberLimit(hasFamilyPro: boolean): number {
  return hasFamilyPro ? LIMITS.membersPerFamily.family_pro : LIMITS.membersPerFamily.free;
}

/**
 * Get the storage limit for a family based on its subscription
 */
export function getFamilyStorageLimit(hasFamilyPro: boolean): number {
  return hasFamilyPro ? LIMITS.storagePerFamily.family_pro : LIMITS.storagePerFamily.free;
}

/**
 * Check if a subscription is considered active
 */
export function isSubscriptionActive(status?: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes === Infinity) return 'Unlimited';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Calculate storage usage percentage
 */
export function getStoragePercentage(used: number, limit: number): number {
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Check if user is near storage limit (80%+)
 */
export function isNearStorageLimit(used: number, limit: number): boolean {
  if (limit === Infinity) return false;
  return (used / limit) >= 0.8;
}

/**
 * Check if user is at storage limit
 */
export function isAtStorageLimit(used: number, limit: number): boolean {
  if (limit === Infinity) return false;
  return used >= limit;
}
