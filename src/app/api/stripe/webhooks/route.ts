// src/app/api/stripe/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { isSubscriptionActive } from '@/lib/stripe/products';

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripe;
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events:
 * - checkout.session.completed: Initial subscription created
 * - customer.subscription.updated: Subscription changes (upgrade/downgrade/cancel)
 * - customer.subscription.deleted: Subscription ended
 * - invoice.payment_failed: Payment failed
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { customer, subscription, metadata } = session;

  if (!customer || !subscription || !metadata) {
    console.error('Missing required checkout data');
    return;
  }

  const customerId = typeof customer === 'string' ? customer : customer.id;
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;

  // Fetch full subscription details
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price.id;

  // Determine subscription type from metadata
  const { userId, familyId, subscriptionType } = metadata;

  if (subscriptionType === 'user_pro') {
    // User Pro subscription
    await updateUserSubscription(userId, {
      stripeCustomerId: customerId,
      userProSubscription: {
        status: sub.status,
        priceId,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        stripeSubscriptionId: subscriptionId,
      },
    });
  } else if (subscriptionType === 'family_pro' && familyId) {
    // Family Pro subscription
    await updateFamilySubscription(familyId, {
      subscription: {
        type: 'pro',
        status: sub.status,
        priceId,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        stripeSubscriptionId: subscriptionId,
      },
    });

    // Also link customer to user if not already
    if (userId) {
      await adminDb.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
      });
    }
  } else if (subscriptionType === 'event_pack' && metadata.eventId) {
    // Event Pack subscription
    await adminDb.collection('events').doc(metadata.eventId).update({
      stripeSubscriptionId: subscriptionId,
      status: 'active',
      expiresAt: new Date(sub.current_period_end * 1000),
    });
  }

  console.log(`Checkout completed: ${subscriptionType} for ${userId || familyId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;

  // Find what this subscription belongs to by checking metadata or querying
  // First, try to find a user with this subscription
  const usersSnap = await adminDb
    .collection('users')
    .where('userProSubscription.stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    const userDoc = usersSnap.docs[0];
    await userDoc.ref.update({
      'userProSubscription.status': subscription.status,
      'userProSubscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
      'userProSubscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
      'userProSubscription.priceId': priceId,
    });
    console.log(`Updated User Pro subscription for user ${userDoc.id}`);
    return;
  }

  // Check for family subscription
  const familiesSnap = await adminDb
    .collection('families')
    .where('subscription.stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!familiesSnap.empty) {
    const familyDoc = familiesSnap.docs[0];
    const isActive = isSubscriptionActive(subscription.status as any);
    await familyDoc.ref.update({
      'subscription.status': subscription.status,
      'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
      'subscription.type': isActive ? 'pro' : 'free',
      'subscription.priceId': priceId,
    });
    console.log(`Updated Family Pro subscription for family ${familyDoc.id}`);
    return;
  }

  // Check for event subscription
  const eventsSnap = await adminDb
    .collection('events')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!eventsSnap.empty) {
    const eventDoc = eventsSnap.docs[0];
    await eventDoc.ref.update({
      status: isSubscriptionActive(subscription.status as any) ? 'active' : 'archived',
      expiresAt: new Date(subscription.current_period_end * 1000),
    });
    console.log(`Updated Event subscription for event ${eventDoc.id}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Similar lookup as above, but set to inactive/free state
  const usersSnap = await adminDb
    .collection('users')
    .where('userProSubscription.stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    const userDoc = usersSnap.docs[0];
    await userDoc.ref.update({
      'userProSubscription.status': 'canceled',
      'userProSubscription.cancelAtPeriodEnd': true,
    });
    console.log(`Canceled User Pro subscription for user ${userDoc.id}`);
    return;
  }

  const familiesSnap = await adminDb
    .collection('families')
    .where('subscription.stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!familiesSnap.empty) {
    const familyDoc = familiesSnap.docs[0];
    await familyDoc.ref.update({
      'subscription.status': 'canceled',
      'subscription.type': 'free',
    });
    console.log(`Canceled Family Pro subscription for family ${familyDoc.id}`);
    return;
  }

  const eventsSnap = await adminDb
    .collection('events')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!eventsSnap.empty) {
    const eventDoc = eventsSnap.docs[0];
    await eventDoc.ref.update({
      status: 'archived',
    });
    console.log(`Archived event ${eventDoc.id} due to subscription deletion`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  // Log the failure - subscription status will be updated via subscription.updated webhook
  console.warn(`Payment failed for subscription ${subscriptionId}`);

  // Optionally: Send notification email to user
  // This would require fetching user email and sending via your email service
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateUserSubscription(userId: string, data: Record<string, any>) {
  await adminDb.collection('users').doc(userId).update(data);
}

async function updateFamilySubscription(familyId: string, data: Record<string, any>) {
  await adminDb.collection('families').doc(familyId).update(data);
}
