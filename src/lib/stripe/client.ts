// src/lib/stripe/client.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe.js instance (client-side)
 * Uses singleton pattern to avoid multiple loads
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Redirect to Stripe Checkout
 * Modern approach: redirect directly to the checkout URL
 */
export async function redirectToCheckout(checkoutUrl: string): Promise<void> {
  if (!checkoutUrl) {
    throw new Error('Checkout URL required');
  }
  window.location.href = checkoutUrl;
}

/**
 * Redirect to Stripe Customer Portal
 */
export async function redirectToPortal(portalUrl: string): Promise<void> {
  window.location.href = portalUrl;
}
