// src/lib/stripe/products.ts

/**
 * Stripe Product Configuration
 *
 * Before using, create these products in Stripe Dashboard:
 * 1. Go to https://dashboard.stripe.com/products
 * 2. Create each product with the prices below
 * 3. Copy the price IDs and update this file
 */

export type SubscriptionTier = 'free' | 'user_pro' | 'family_pro' | 'event_pack';

// ============================================================================
// PRICE IDS - Update these after creating products in Stripe Dashboard
// ============================================================================

export const STRIPE_PRICES = {
  // User Pro - $49/year - Allows joining 5 families instead of 2
  USER_PRO_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_USER_PRO_ANNUAL || 'price_user_pro_annual',

  // Family Pro - $199/year - 5 members, 50GB storage, limited guest uploads
  FAMILY_PRO_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRO_ANNUAL || 'price_family_pro_annual',

  // Event Pack - $299/year - 5 members, unlimited storage, unlimited guest uploads, view links, 5 free yearbooks
  EVENT_PACK: process.env.NEXT_PUBLIC_STRIPE_EVENT_PACK || 'price_event_pack',
} as const;

// ============================================================================
// PRICING DISPLAY
// ============================================================================

export const PRICING = {
  userPro: {
    annual: 49,
  },
  familyPro: {
    annual: 199,
  },
  eventPack: {
    annual: 299,
    // Future pricing phases:
    // phase2: 399 (Month 6-18)
    // phase3: 499 (Month 18+)
  },
} as const;

// ============================================================================
// EVENT PACK LIFECYCLE
// ============================================================================

export const EVENT_PACK_LIFECYCLE = {
  // Year 1: Full 365 days of editing from creation
  INITIAL_EDIT_DAYS: 365,

  // Renewals: 90 days of editing per renewal
  RENEWAL_EDIT_DAYS: 90,

  // Grace period before guest view tokens are revoked (days after expiry)
  GUEST_ACCESS_GRACE_DAYS: 7,
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

  // Family member limits (edit access) - same across all tiers
  membersPerFamily: {
    free: 5,
    family_pro: 5,
    event_pack: 5,
  },

  // Storage limits (in bytes)
  storagePerFamily: {
    free: 1 * 1024 * 1024 * 1024, // 1GB
    family_pro: 50 * 1024 * 1024 * 1024, // 50GB
    event_pack: Infinity, // Unlimited
  },

  // Guest upload limits
  guestUploads: {
    free: 0, // Not available
    family_pro: 100, // Limited
    event_pack: Infinity, // Unlimited
  },

  // Guest view links
  guestViewLinks: {
    free: 0,
    family_pro: 0,
    event_pack: Infinity, // Unlimited
  },

  // Free yearbooks per year
  freeYearbooks: {
    free: 0,
    family_pro: 0,
    event_pack: 5,
  },
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
  type: 'free' | 'family_pro' | 'event_pack';
  status?: SubscriptionStatus;
  priceId?: string;
  currentPeriodEnd?: Date;
  stripeSubscriptionId?: string;
  storageUsedBytes: number;

  // Event Pack lifecycle fields
  createdAt?: Date;              // When the subscription was first created
  editWindowStart?: Date;        // When current edit window started
  editWindowEnd?: Date;          // When current edit window ends
  renewalCount?: number;         // Number of times renewed (0 = first year)
  isArchived?: boolean;          // True if expired and not renewed
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
 * Note: All tiers have the same 5-member limit for edit access
 */
export function getFamilyMemberLimit(tier: 'free' | 'family_pro' | 'event_pack' = 'free'): number {
  return LIMITS.membersPerFamily[tier] || LIMITS.membersPerFamily.free;
}

/**
 * Get the storage limit for a family based on its subscription
 */
export function getFamilyStorageLimit(tier: 'free' | 'family_pro' | 'event_pack' = 'free'): number {
  return LIMITS.storagePerFamily[tier] || LIMITS.storagePerFamily.free;
}

/**
 * Check if guest uploads are enabled for a tier
 */
export function hasGuestUploads(tier: 'free' | 'family_pro' | 'event_pack' = 'free'): boolean {
  return (LIMITS.guestUploads[tier] || 0) > 0;
}

/**
 * Check if guest view links are enabled for a tier
 */
export function hasGuestViewLinks(tier: 'free' | 'family_pro' | 'event_pack' = 'free'): boolean {
  return (LIMITS.guestViewLinks[tier] || 0) > 0;
}

/**
 * Get free yearbooks count for a tier
 */
export function getFreeYearbooks(tier: 'free' | 'family_pro' | 'event_pack' = 'free'): number {
  return LIMITS.freeYearbooks[tier] || 0;
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

// ============================================================================
// EVENT PACK LIFECYCLE HELPERS
// ============================================================================

/**
 * Check if an Event Pack has active edit access
 * - Year 1: Full 365 days from creation
 * - Renewals: 90 days from renewal
 */
export function hasEventPackEditAccess(subscription: FamilySubscription): boolean {
  if (subscription.type !== 'event_pack') return true; // Non-event packs always have edit access if active
  if (!isSubscriptionActive(subscription.status)) return false;
  if (subscription.isArchived) return false;

  const now = new Date();
  const editWindowEnd = subscription.editWindowEnd;

  if (!editWindowEnd) {
    // Fallback: if no edit window set, check currentPeriodEnd
    return subscription.currentPeriodEnd ? now < subscription.currentPeriodEnd : false;
  }

  return now < editWindowEnd;
}

/**
 * Check if an Event Pack is in archived (view-only) state
 * Organizer retains view-only access forever after expiry
 */
export function isEventPackArchived(subscription: FamilySubscription): boolean {
  if (subscription.type !== 'event_pack') return false;

  // Explicitly archived
  if (subscription.isArchived) return true;

  // Edit window expired but not renewed
  const now = new Date();
  const editWindowEnd = subscription.editWindowEnd;

  if (editWindowEnd && now >= editWindowEnd) {
    return true;
  }

  return false;
}

/**
 * Check if guests should still have view access
 * Guests lose access after expiry + grace period
 */
export function hasGuestViewAccess(subscription: FamilySubscription): boolean {
  if (subscription.type !== 'event_pack') return false;
  if (isSubscriptionActive(subscription.status)) return true;

  // Check grace period
  const editWindowEnd = subscription.editWindowEnd;
  if (!editWindowEnd) return false;

  const gracePeriodEnd = new Date(editWindowEnd);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + EVENT_PACK_LIFECYCLE.GUEST_ACCESS_GRACE_DAYS);

  return new Date() < gracePeriodEnd;
}

/**
 * Calculate the edit window end date for a new Event Pack subscription
 */
export function calculateEditWindowEnd(startDate: Date, isRenewal: boolean): Date {
  const days = isRenewal
    ? EVENT_PACK_LIFECYCLE.RENEWAL_EDIT_DAYS
    : EVENT_PACK_LIFECYCLE.INITIAL_EDIT_DAYS;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

/**
 * Get days remaining in the edit window
 */
export function getEditWindowDaysRemaining(subscription: FamilySubscription): number {
  if (subscription.type !== 'event_pack') return Infinity;

  const editWindowEnd = subscription.editWindowEnd;
  if (!editWindowEnd) return 0;

  const now = new Date();
  const diffMs = editWindowEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get a human-readable status for the Event Pack
 */
export function getEventPackStatus(subscription: FamilySubscription): 'active' | 'expiring_soon' | 'archived' | 'inactive' {
  if (subscription.type !== 'event_pack') return 'inactive';
  if (!isSubscriptionActive(subscription.status)) return 'inactive';

  if (isEventPackArchived(subscription)) return 'archived';

  const daysRemaining = getEditWindowDaysRemaining(subscription);
  if (daysRemaining <= 30) return 'expiring_soon';

  return 'active';
}
