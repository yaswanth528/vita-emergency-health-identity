import { Router } from 'express';
import { isPlanId } from '../../shared/plans.js';
import type { PaymentRecord } from '../../shared/subscription.js';
import { requireAuth, sessionUser } from '../auth.js';
import { requireFeature } from '../entitlements.js';
import { asyncRoute, errors } from '../errors.js';
import { paymentsForUser } from '../store.js';
import {
  cancelForUser,
  confirmPayment,
  getSubscriptionView,
  openCheckout,
} from '../subscription-service.js';

/* ============================================================================
   Subscription
   ----------------------------------------------------------------------------
   Thin. Every one of these handlers validates its input, hands off to the
   service, and renders the result — there is no billing logic at this layer,
   because two endpoints that each decide what "subscribed" means is how a
   dashboard ends up disagreeing with a paywall.
   ========================================================================== */

export const subscriptionRouter = Router();

subscriptionRouter.use(requireAuth);

/** The authoritative state, including server-computed entitlements. */
subscriptionRouter.get('/', (req, res) => {
  res.json({ subscription: getSubscriptionView(sessionUser(req).id) });
});

subscriptionRouter.get('/payments', (req, res) => {
  const payments: PaymentRecord[] = paymentsForUser(sessionUser(req).id).map((p) => ({
    id: p.id,
    planId: p.plan_id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.method,
    description: p.description,
    createdAt: p.created_at,
  }));
  res.json({ payments });
});

/**
 * Start a payment. The plan id is the only thing taken from the client, and it
 * is checked against the catalogue before anything else happens — the price
 * comes from the server's own copy either way.
 */
subscriptionRouter.post(
  '/checkout',
  asyncRoute(async (req, res) => {
    const planId = (req.body as { planId?: unknown })?.planId;
    if (!isPlanId(planId)) throw errors.invalidPlan(planId);

    const session = await openCheckout(sessionUser(req), planId);
    res.json({ checkout: session });
  }),
);

/**
 * The handoff from Razorpay Checkout. Nothing here is trusted: the signature
 * is recomputed, the payment is re-fetched from the provider, and the amount is
 * compared against the catalogue before any entitlement is granted.
 */
subscriptionRouter.post(
  '/verify',
  asyncRoute(async (req, res) => {
    const body = req.body as {
      razorpay_payment_id?: unknown;
      razorpay_subscription_id?: unknown;
      razorpay_signature?: unknown;
    };

    const paymentId = body?.razorpay_payment_id;
    const providerSubscriptionId = body?.razorpay_subscription_id;
    const signature = body?.razorpay_signature;

    if (
      typeof paymentId !== 'string' ||
      typeof providerSubscriptionId !== 'string' ||
      typeof signature !== 'string'
    ) {
      throw errors.invalidRequest('This payment confirmation was incomplete.');
    }

    const subscription = await confirmPayment({
      userId: sessionUser(req).id,
      paymentId,
      providerSubscriptionId,
      signature,
    });

    res.json({ subscription });
  }),
);

subscriptionRouter.post(
  '/cancel',
  asyncRoute(async (req, res) => {
    const atPeriodEnd = (req.body as { atPeriodEnd?: unknown })?.atPeriodEnd;
    if (atPeriodEnd !== undefined && typeof atPeriodEnd !== 'boolean') {
      throw errors.invalidRequest('Invalid cancellation option.');
    }

    const subscription = await cancelForUser(sessionUser(req).id, atPeriodEnd ?? true);
    res.json({ subscription });
  }),
);

/**
 * A genuinely gated endpoint, guarded by the same helper the UI reads. Its
 * presence is the proof that entitlement checks happen server-side: hiding the
 * button would not stop a curl.
 */
subscriptionRouter.get('/export', requireFeature('audit-export'), (req, res) => {
  const user = sessionUser(req);
  res.json({
    exportedAt: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email },
    subscription: getSubscriptionView(user.id),
    payments: paymentsForUser(user.id),
  });
});
