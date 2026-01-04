// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { STRIPE_PRICES } from '@/lib/stripe/products';

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(key, {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripe;
}

type CheckoutType = 'user_pro' | 'family_pro' | 'event_pack';
type BillingPeriod = 'monthly' | 'annual';

interface CheckoutRequest {
  type: CheckoutType;
  billingPeriod?: BillingPeriod;
  familyId?: string;
  eventId?: string;
}

/**
 * Create a Stripe Checkout Session
 *
 * POST /api/stripe/checkout
 * Body: { type: 'user_pro' | 'family_pro' | 'event_pack', billingPeriod?: 'monthly' | 'annual', familyId?: string, eventId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { type, billingPeriod = 'monthly', familyId, eventId } = body;

    // Get or create Stripe customer
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await getStripe().customers.create({
        email: decodedToken.email || undefined,
        metadata: {
          firebaseUserId: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to user document
      await adminDb.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Determine price ID and metadata
    let priceId: string;
    const metadata: Record<string, string> = {
      userId,
      subscriptionType: type,
    };

    switch (type) {
      case 'user_pro':
        priceId = billingPeriod === 'annual'
          ? STRIPE_PRICES.USER_PRO_ANNUAL
          : STRIPE_PRICES.USER_PRO_MONTHLY;
        break;

      case 'family_pro':
        if (!familyId) {
          return NextResponse.json({ error: 'familyId required for family_pro' }, { status: 400 });
        }
        priceId = billingPeriod === 'annual'
          ? STRIPE_PRICES.FAMILY_PRO_ANNUAL
          : STRIPE_PRICES.FAMILY_PRO_MONTHLY;
        metadata.familyId = familyId;
        break;

      case 'event_pack':
        if (!eventId) {
          return NextResponse.json({ error: 'eventId required for event_pack' }, { status: 400 });
        }
        priceId = STRIPE_PRICES.EVENT_PACK;
        metadata.eventId = eventId;
        break;

      default:
        return NextResponse.json({ error: 'Invalid subscription type' }, { status: 400 });
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata,
      success_url: `https://kinshipvault.com/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://kinshipvault.com/settings/billing?canceled=true`,
      subscription_data: {
        metadata,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);

    if (error instanceof Error && error.message.includes('auth')) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
