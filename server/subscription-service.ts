import {
  comparePlans,
  isPaidPlan,
  planById,
  type PlanId,
} from '../shared/plans.js';
import type { CheckoutSession, SubscriptionView } from '../shared/subscription.js';
import { getDb, isoDate } from './db.js';
import { env, razorpayPlanIdFor } from './env.js';
import { errors } from './errors.js';
import { resolveSubscription } from './entitlements.js';
import {
  cancelSubscription,
  createSubscription,
  describeProviderError,
  fetchPayment,
  fetchSubscription,
  unixToIsoDate,
  type ProviderSubscription,
} from './razorpay.js';
import { verifySubscriptionPaymentSignature } from './razorpay-signature.js';
import {
  insertSubscription,
  markPaymentRefunded,
  paymentById,
  recordPayment,
  subscriptionByProviderId,
  subscriptionByStatus,
  updateSubscription,
  type StoredStatus,
  type SubscriptionRow,
  type UserRow,
} from './store.js';

/* ============================================================================
   Subscription service
   ----------------------------------------------------------------------------
   All the billing decisions, in one place, with the HTTP layer above it and
   the provider adapter below it.

   The rule the whole file is arranged around: a row becomes `active` in
   exactly one function, `activate`, and that function is reached only from a
   verified signature or a verified webhook. There is no path from "the browser
   said it worked" to an entitlement.
   ========================================================================== */

/** A month on from now, used only when the provider does not state a period end. */
function fallbackNextBillingDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function providerNextBillingDate(sub: ProviderSubscription | null): string | null {
  if (!sub) return null;
  return unixToIsoDate(sub.currentEnd) ?? unixToIsoDate(sub.chargeAt);
}

/* --- Reading ------------------------------------------------------------------- */

export function getSubscriptionView(userId: string): SubscriptionView {
  return resolveSubscription(userId);
}

/* --- Checkout ------------------------------------------------------------------ */

/**
 * Create — or hand back — the provider subscription the browser should open
 * checkout against.
 *
 * The reuse path is the duplicate-order guard. Clicking "Choose Family" three
 * times must not leave three mandates on the customer's card, so an unpaid
 * attempt at the same plan is returned as-is rather than replaced.
 */
export async function openCheckout(user: UserRow, planId: PlanId): Promise<CheckoutSession> {
  const plan = planById(planId);

  if (!isPaidPlan(planId)) {
    throw errors.invalidRequest(
      'The free plan does not require payment. You are on it whenever no paid plan is active.',
    );
  }

  const current = resolveSubscription(user.id);
  if (current.status === 'active' && current.plan === planId) {
    throw errors.alreadySubscribed(plan.name);
  }

  const razorpayPlanId = razorpayPlanIdFor(planId);
  if (!razorpayPlanId || !env.razorpay.configured) {
    throw errors.providerUnconfigured();
  }

  const pending = subscriptionByStatus(user.id, 'pending');
  if (pending) {
    // A pending row with no provider id yet is either a request still waiting
    // on Razorpay or one that died mid-setup. Age is what separates them, and
    // the distinction matters: retiring a live one would orphan the mandate it
    // is about to create, which is the exact leak this ordering prevents.
    if (!pending.provider_subscription_id) {
      if (isWithinSetupWindow(pending.created_at)) throw errors.checkoutInFlight();
      await retirePending(pending, true);
    } else {
      const disposition = await classifyPending(pending.provider_subscription_id);

      switch (disposition.kind) {
        case 'payable':
          if (pending.plan_id === planId) {
            return checkoutSession({
              providerSubscriptionId: pending.provider_subscription_id,
              planId,
              user,
              reused: true,
            });
          }
          // A different plan was chosen. This one has never been charged, so
          // cancelling it costs the customer nothing.
          await retirePending(pending);
          break;

        case 'paid': {
          // The customer paid and the confirmation never reached us — a closed
          // tab, or a webhook still in flight. Reconcile instead of starting a
          // second payment: the old code cancelled this mandate and charged
          // them again for the same plan.
          reconcilePaidAttempt(pending, disposition.sub);
          const settled = resolveSubscription(user.id);
          if (settled.status === 'active' && settled.plan === planId) {
            throw errors.alreadySubscribed(planById(planId).name);
          }
          break;
        }

        case 'dead':
          await retirePending(pending, true);
          break;

        case 'unknown':
          // Refuse rather than guess. Proceeding would either double-charge or
          // cancel a paid mandate, depending on which way the guess went.
          throw errors.checkoutUnverifiable();
      }
    }
  }

  // Reserve the one-pending-per-user slot BEFORE calling Razorpay. Creating the
  // mandate first would let two concurrent requests each create one and then
  // have the second insert rejected by the index — leaving a mandate on the
  // customer's card that nothing in this database refers to. Losing the race
  // here costs nothing, because nothing has been created yet.
  let row: SubscriptionRow;
  try {
    row = insertSubscription({
      userId: user.id,
      planId,
      status: 'pending',
      amount: plan.priceInPaise,
      currency: plan.currency,
      providerPlanId: razorpayPlanId,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw errors.checkoutInFlight();
    throw err;
  }

  let providerSub: ProviderSubscription;
  try {
    providerSub = await createSubscription({
      razorpayPlanId,
      notes: { userId: user.id, planId, app: 'pulse' },
    });
  } catch (err) {
    // Release the slot, or a provider blip would lock the customer out of
    // retrying until the row was cleared by hand.
    updateSubscription(row.id, { status: 'expired' });
    throw err;
  }

  updateSubscription(row.id, {
    provider_subscription_id: providerSub.id,
    payment_customer_id: providerSub.customerId,
  });

  return checkoutSession({
    providerSubscriptionId: providerSub.id,
    planId,
    user,
    reused: false,
  });
}

/** better-sqlite3 surfaces a violated unique index with this code. */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

/**
 * How long a reserved-but-not-yet-created attempt is assumed to still be in
 * flight. Long enough to cover a slow provider call, short enough that a
 * process killed mid-setup does not lock the customer out for long.
 */
const SETUP_WINDOW_MS = 60_000;

function isWithinSetupWindow(createdAt: string): boolean {
  const started = new Date(createdAt).getTime();
  if (Number.isNaN(started)) return false;
  return Date.now() - started < SETUP_WINDOW_MS;
}

function checkoutSession(input: {
  providerSubscriptionId: string;
  planId: PlanId;
  user: UserRow;
  reused: boolean;
}): CheckoutSession {
  const plan = planById(input.planId);
  return {
    // The publishable key. Sent per-request rather than baked into the bundle
    // so rotating keys does not need a frontend rebuild.
    keyId: env.razorpay.keyId,
    subscriptionId: input.providerSubscriptionId,
    planId: input.planId,
    amount: plan.priceInPaise,
    currency: plan.currency,
    name: 'PULSE',
    description: `${plan.name} plan · ₹${plan.priceInPaise / 100}/month`,
    prefill: { name: input.user.name, email: input.user.email },
    reused: input.reused,
  };
}

/**
 * What a pending attempt actually is at the provider.
 *
 *   payable    the mandate exists but has never been charged — safe to reuse
 *   paid       it has been charged; the local row simply never caught up
 *   dead       terminal at the provider; nothing to reuse and nothing to cancel
 *   unknown    the provider could not be reached
 */
type PendingDisposition =
  | { kind: 'payable' }
  | { kind: 'paid'; sub: ProviderSubscription }
  | { kind: 'dead' }
  | { kind: 'unknown' };

async function classifyPending(providerSubscriptionId: string): Promise<PendingDisposition> {
  let sub: ProviderSubscription;
  try {
    sub = await fetchSubscription(providerSubscriptionId);
  } catch {
    // Deliberately NOT 'dead'. Treating an unreachable provider as a spent
    // attempt is how you cancel a mandate the customer has already paid for.
    return { kind: 'unknown' };
  }

  switch (sub.status) {
    case 'created':
    case 'authenticated':
      return { kind: 'payable' };
    // Money has moved, or is committed and being retried. Either way this
    // mandate must survive.
    case 'active':
    case 'halted':
    case 'pending':
      return { kind: 'paid', sub };
    case 'cancelled':
    case 'completed':
    case 'expired':
      return { kind: 'dead' };
  }
}

/**
 * Bring a local row into line with a provider subscription that has already
 * been charged, when the browser never delivered the confirmation.
 *
 * No signature is required because nothing the client sent is being trusted:
 * the provider's own record of the subscription is what is being read.
 */
function reconcilePaidAttempt(row: SubscriptionRow, sub: ProviderSubscription): void {
  if (sub.status === 'active') {
    activate(row, {
      nextBillingDate: providerNextBillingDate(sub) ?? fallbackNextBillingDate(),
      customerId: sub.customerId,
    });
    console.info(`[billing] reconciled unconfirmed payment for subscription ${sub.id}`);
    return;
  }

  // halted / pending — the mandate is committed but the charge is unresolved.
  updateSubscription(row.id, { status: 'payment_failed' });
}

/**
 * Retire an attempt that is known not to have been charged.
 *
 * The caller must have established that — this cancels at the provider, and
 * cancelling a paid mandate would leave the customer charged for a plan they
 * no longer hold. `alreadyTerminal` skips the provider call for an attempt the
 * provider has itself already finished with.
 */
async function retirePending(
  pending: SubscriptionRow,
  alreadyTerminal = false,
): Promise<void> {
  updateSubscription(pending.id, { status: 'expired' });
  if (!pending.provider_subscription_id || alreadyTerminal) return;
  try {
    await cancelSubscription(pending.provider_subscription_id, false);
  } catch (err) {
    console.warn(
      `[billing] could not cancel abandoned attempt ${pending.provider_subscription_id}`,
      describeProviderError(err),
    );
  }
}

/* --- Verification -------------------------------------------------------------- */

/**
 * The only route from a completed checkout to an entitlement.
 *
 * Four things must hold, and a failure in any of them leaves the subscription
 * unactivated: the subscription belongs to this user, the signature is valid,
 * the payment is actually captured at the provider, and the amount matches the
 * plan's price in our own catalogue.
 */
export async function confirmPayment(input: {
  userId: string;
  paymentId: string;
  providerSubscriptionId: string;
  signature: string;
}): Promise<SubscriptionView> {
  const row = subscriptionByProviderId(input.providerSubscriptionId);

  // Ownership. A valid signature for someone else's subscription must not
  // activate anything on this account.
  if (!row || row.user_id !== input.userId) {
    throw errors.verificationFailed({ reason: 'unknown-or-foreign-subscription' });
  }

  const signatureValid = verifySubscriptionPaymentSignature({
    paymentId: input.paymentId,
    subscriptionId: input.providerSubscriptionId,
    signature: input.signature,
    keySecret: env.razorpay.keySecret,
  });

  if (!signatureValid) {
    markPaymentFailed(row);
    throw errors.verificationFailed({ reason: 'signature-mismatch' });
  }

  const payment = await fetchPayment(input.paymentId);

  // `captured` only. An `authorized` payment is money held, not money taken,
  // and it auto-voids after a few days — nothing here would ever re-check it,
  // so accepting it granted a paid month for a charge that never settled. When
  // a payment is still authorising, verification fails, the UI says "still
  // being processed", and the subscription.charged webhook activates the plan
  // once capture actually happens.
  if (payment.status !== 'captured') {
    markPaymentFailed(row);
    recordPayment({
      id: payment.id,
      userId: row.user_id,
      subscriptionId: row.id,
      providerSubscriptionId: row.provider_subscription_id,
      orderId: payment.orderId,
      planId: row.plan_id,
      amount: payment.amount,
      currency: payment.currency,
      status: 'failed',
      method: payment.method,
      description: `${planById(row.plan_id).name} plan`,
    });
    throw errors.verificationFailed({ reason: `payment-status-${payment.status}` });
  }

  const plan = planById(row.plan_id);
  // Currency as well as amount: 399 of a weaker unit is not ₹399.
  if (payment.amount !== plan.priceInPaise || payment.currency !== plan.currency) {
    markPaymentFailed(row);
    throw errors.amountMismatch(plan.priceInPaise, payment.amount);
  }

  // The old plan goes before the new one arrives, so the customer is never
  // holding two live mandates. Done before activation because a failure here
  // that silently left both running is worse than one that stops the switch.
  await cancelSupersededPlan(row);

  let providerSub: ProviderSubscription | null = null;
  try {
    providerSub = await fetchSubscription(input.providerSubscriptionId);
  } catch {
    // Non-fatal: the payment is verified. The billing date is refined by the
    // subscription.activated webhook.
  }

  activate(row, {
    paymentId: payment.id,
    // The row's own date before the fallback: on a replayed confirmation whose
    // `fetchSubscription` happens to fail, the fallback would otherwise
    // overwrite the provider's real period end with now-plus-a-month.
    nextBillingDate:
      providerNextBillingDate(providerSub) ?? row.next_billing_date ?? fallbackNextBillingDate(),
    customerId: providerSub?.customerId ?? null,
  });

  recordPayment({
    id: payment.id,
    userId: row.user_id,
    subscriptionId: row.id,
    providerSubscriptionId: row.provider_subscription_id,
    orderId: payment.orderId,
    planId: row.plan_id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'captured',
    method: payment.method,
    description: `${planById(row.plan_id).name} plan`,
  });

  return resolveSubscription(row.user_id);
}

function markPaymentFailed(row: SubscriptionRow): void {
  if (row.status === 'active') return; // A renewal problem must not revoke a live plan here.
  updateSubscription(row.id, { status: 'payment_failed' });
}

/**
 * Cancel whatever plan this one replaces. Runs before activation so a plan
 * change cannot produce two concurrent mandates.
 */
async function cancelSupersededPlan(incoming: SubscriptionRow): Promise<void> {
  const live = subscriptionByStatus(incoming.user_id, 'active');
  if (!live || live.id === incoming.id) return;

  if (live.provider_subscription_id) {
    try {
      await cancelSubscription(live.provider_subscription_id, false);
    } catch (err) {
      // The new plan is paid for; refusing to switch would be worse. Logged
      // loudly because it needs reconciling against the provider by hand.
      console.error(
        `[billing] RECONCILE: plan change for user ${live.user_id} could not cancel ` +
          `superseded subscription ${live.provider_subscription_id}`,
        describeProviderError(err),
      );
    }
  }

  const direction = comparePlans(live.plan_id, incoming.plan_id);
  updateSubscription(live.id, {
    status: 'cancelled',
    cancellation_date: isoDate(),
    cancel_at_period_end: 0,
    next_billing_date: null,
  });
  console.info(
    `[billing] user ${live.user_id} ${direction}: ${live.plan_id} → ${incoming.plan_id}`,
  );
}

/**
 * The single place a subscription becomes active.
 *
 * Wrapped in a transaction with the demotion of any other active row, because
 * the `one_active_per_user` index would otherwise reject the update and leave
 * a paid customer on the free tier.
 */
function activate(
  row: SubscriptionRow,
  opts: { paymentId?: string | null; nextBillingDate?: string | null; customerId?: string | null },
): SubscriptionRow {
  const apply = getDb().transaction(() => {
    const others = getDb()
      .prepare<[string, string], { id: string }>(
        `SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND id != ?`,
      )
      .all(row.user_id, row.id);

    for (const other of others) {
      updateSubscription(other.id, {
        status: 'cancelled',
        cancellation_date: isoDate(),
        cancel_at_period_end: 0,
        next_billing_date: null,
      });
    }

    // Clearing the cancellation is only right when this row is genuinely
    // coming back to life. On a row that is already active and marked to stop
    // at period end, a replayed confirmation used to silently un-cancel it —
    // the customer keeps their own valid signature, so they could replay it —
    // leaving the UI promising a renewal Razorpay will never charge.
    const reviving = row.status !== 'active';

    return updateSubscription(row.id, {
      status: 'active',
      start_date: row.start_date ?? isoDate(),
      next_billing_date: opts.nextBillingDate ?? row.next_billing_date,
      latest_payment_id: opts.paymentId ?? row.latest_payment_id,
      payment_customer_id: opts.customerId ?? row.payment_customer_id,
      cancel_at_period_end: reviving ? 0 : row.cancel_at_period_end,
      cancellation_date: reviving ? null : row.cancellation_date,
    });
  });

  return apply();
}

/* --- Cancellation --------------------------------------------------------------- */

/**
 * Cancel the active plan. By default at the end of the period the customer has
 * already paid for — taking away access that was paid for the same afternoon
 * would be theft dressed up as a state machine.
 */
export async function cancelForUser(
  userId: string,
  atPeriodEnd = true,
): Promise<SubscriptionView> {
  const live = subscriptionByStatus(userId, 'active');
  if (!live) throw errors.noSubscription();

  if (live.provider_subscription_id) {
    await cancelSubscription(live.provider_subscription_id, atPeriodEnd);
  }

  if (atPeriodEnd && live.next_billing_date) {
    // Stays `active` — and therefore entitled — until the period runs out, at
    // which point the entitlement resolver expires it into freemium.
    updateSubscription(live.id, {
      cancel_at_period_end: 1,
      cancellation_date: isoDate(),
    });
  } else {
    updateSubscription(live.id, {
      status: 'cancelled',
      cancel_at_period_end: 0,
      cancellation_date: isoDate(),
      next_billing_date: null,
    });
  }

  return resolveSubscription(userId);
}

/* --- Webhooks -------------------------------------------------------------------- */

interface WebhookSubscriptionEntity {
  id?: string;
  status?: string;
  current_end?: number | null;
  charge_at?: number | null;
  customer_id?: string | null;
  notes?: Record<string, string> | null;
}

interface WebhookPaymentEntity {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string | null;
  order_id?: string | null;
  subscription_id?: string | null;
}

export interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    subscription?: { entity?: WebhookSubscriptionEntity };
    payment?: { entity?: WebhookPaymentEntity };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
  };
}

/** Statuses a charge may legitimately activate. Terminal rows stay terminal. */
const ACTIVATABLE_STATUSES: readonly StoredStatus[] = ['pending', 'active', 'payment_failed'];

/** Has an ISO instant already gone by? A null date has not. */
function hasPassed(isoInstant: string | null): boolean {
  if (!isoInstant) return false;
  const at = new Date(isoInstant).getTime();
  return !Number.isNaN(at) && Date.now() > at;
}

/** Write a failed charge into the payment history without touching the plan. */
function recordFailedAttempt(
  row: SubscriptionRow,
  payEntity: WebhookPaymentEntity | undefined,
  providerSubscriptionId: string | undefined,
): void {
  if (!payEntity?.id || payEntity.amount === undefined) return;
  recordPayment({
    id: payEntity.id,
    userId: row.user_id,
    subscriptionId: row.id,
    providerSubscriptionId: providerSubscriptionId ?? null,
    orderId: payEntity.order_id ?? null,
    planId: row.plan_id,
    amount: payEntity.amount,
    currency: payEntity.currency ?? 'INR',
    status: 'failed',
    method: payEntity.method ?? null,
    description: `${planById(row.plan_id).name} plan — payment failed`,
  });
}

/**
 * Apply a verified webhook. The provider's state wins: this is the source of
 * truth for renewals, failures and cancellations made outside the app.
 *
 * Returns a short description of what it did, which is what gets stored
 * against the event id for support to read later.
 */
export function applyWebhook(payload: RazorpayWebhookPayload): string {
  const event = payload.event ?? 'unknown';
  const subEntity = payload.payload?.subscription?.entity;
  const payEntity = payload.payload?.payment?.entity;

  const providerSubscriptionId =
    subEntity?.id ?? payEntity?.subscription_id ?? undefined;

  const row = providerSubscriptionId
    ? subscriptionByProviderId(providerSubscriptionId)
    : undefined;

  switch (event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      if (!row) return `no local subscription for ${providerSubscriptionId ?? 'unknown'}`;

      // Only a live-ish row may be activated. A terminal row must not be
      // resurrected by a late or redelivered charge: doing so granted a free
      // month on a finished subscription and — because `activate` demotes any
      // other active row — knocked the customer's genuinely live plan out.
      if (!ACTIVATABLE_STATUSES.includes(row.status)) {
        return `ignored ${event} for a ${row.status} subscription`;
      }

      const nextBillingDate =
        unixToIsoDate(subEntity?.current_end) ??
        unixToIsoDate(subEntity?.charge_at) ??
        row.next_billing_date ??
        fallbackNextBillingDate();

      activate(row, {
        paymentId: payEntity?.id ?? null,
        nextBillingDate,
        customerId: subEntity?.customer_id ?? null,
      });

      if (payEntity?.id && payEntity.amount !== undefined) {
        recordPayment({
          id: payEntity.id,
          userId: row.user_id,
          subscriptionId: row.id,
          providerSubscriptionId: providerSubscriptionId ?? null,
          orderId: payEntity.order_id ?? null,
          planId: row.plan_id,
          amount: payEntity.amount,
          currency: payEntity.currency ?? 'INR',
          status: 'captured',
          method: payEntity.method ?? null,
          description: `${planById(row.plan_id).name} plan`,
        });
      }
      return `${row.plan_id} active until ${nextBillingDate.slice(0, 10)}`;
    }

    case 'subscription.pending':
    case 'subscription.halted':
    case 'payment.failed': {
      if (!row) return `no local subscription for ${providerSubscriptionId ?? 'unknown'}`;

      // A failed charge does not cancel the month already paid for. Razorpay's
      // `pending` state means "retrying", and the first retry used to drop a
      // paying customer to freemium the same second — which also made the
      // renewal grace window unreachable, because there was no longer an
      // `active` row for it to apply to. An out-of-order failure arriving
      // after a successful renewal is caught by the same test.
      const paidThrough = row.next_billing_date;
      if (paidThrough && !hasPassed(paidThrough)) {
        recordFailedAttempt(row, payEntity, providerSubscriptionId);
        return `${row.plan_id} charge failed; paid period runs to ${paidThrough.slice(0, 10)}`;
      }

      updateSubscription(row.id, { status: 'payment_failed' });

      if (payEntity?.id && payEntity.amount !== undefined) {
        recordPayment({
          id: payEntity.id,
          userId: row.user_id,
          subscriptionId: row.id,
          providerSubscriptionId: providerSubscriptionId ?? null,
          orderId: payEntity.order_id ?? null,
          planId: row.plan_id,
          amount: payEntity.amount,
          currency: payEntity.currency ?? 'INR',
          status: 'failed',
          method: payEntity.method ?? null,
          description: `${planById(row.plan_id).name} plan — payment failed`,
        });
      }
      return `${row.plan_id} marked payment_failed`;
    }

    case 'subscription.cancelled': {
      if (!row) return `no local subscription for ${providerSubscriptionId ?? 'unknown'}`;

      // A cancellation made outside this app — from Razorpay's dashboard, say —
      // still leaves a period the customer has paid for. Nulling the billing
      // date used to end access on the spot AND destroy the only record of when
      // the paid period ran to, which is the same promise `cancelForUser`
      // keeps. Mapped to the same representation: still active, marked to stop.
      const periodEnd = unixToIsoDate(subEntity?.current_end) ?? row.next_billing_date;

      if (periodEnd && !hasPassed(periodEnd)) {
        updateSubscription(row.id, {
          cancel_at_period_end: 1,
          cancellation_date: isoDate(),
          next_billing_date: periodEnd,
        });
        return `${row.plan_id} cancelled — access retained until ${periodEnd.slice(0, 10)}`;
      }

      updateSubscription(row.id, {
        status: 'cancelled',
        cancellation_date: isoDate(),
        cancel_at_period_end: 0,
        next_billing_date: null,
      });
      return `${row.plan_id} cancelled`;
    }

    case 'subscription.completed':
    case 'subscription.expired': {
      if (!row) return `no local subscription for ${providerSubscriptionId ?? 'unknown'}`;
      updateSubscription(row.id, { status: 'expired', next_billing_date: null });
      return `${row.plan_id} expired — account returns to freemium`;
    }

    // `refund.created` fires when a refund is merely initiated, and one that
    // later fails would already have ended the plan with no way back. Only a
    // processed refund is money actually returned.
    case 'refund.created':
      return 'refund initiated — no action until it is processed';

    case 'refund.processed': {
      const refund = payload.payload?.refund?.entity;
      const paymentId = refund?.payment_id;
      if (!paymentId) return 'refund without a payment id';

      const charge = paymentById(paymentId);
      if (!charge) return `refund for an unknown payment ${paymentId}`;

      // A refund payload need not name the subscription. The stored charge
      // does, so a full refund is never missed for want of a field.
      const refunded =
        row ??
        (charge.provider_subscription_id
          ? subscriptionByProviderId(charge.provider_subscription_id)
          : undefined);

      if (refund?.amount === undefined) {
        console.error(
          `[billing] RECONCILE: refund for ${paymentId} carried no amount; plan left untouched`,
        );
        return `refund for ${paymentId} had no amount — needs manual review`;
      }

      // A partial refund is a goodwill gesture, not an unwinding of the month.
      // Cancelling the plan over ₹50 off ₹399 took away a period that was paid
      // for and could not be restored.
      if (refund.amount < charge.amount) {
        return `partial refund of ${refund.amount} on ${paymentId} — plan unchanged`;
      }

      markPaymentRefunded(paymentId);

      // A fully refunded charge is not a paid period. Ending the plan is the
      // honest consequence; leaving it active would be giving the service away.
      if (refunded && refunded.status === 'active') {
        updateSubscription(refunded.id, {
          status: 'cancelled',
          cancellation_date: isoDate(),
          cancel_at_period_end: 0,
          next_billing_date: null,
        });
      }
      return `payment ${paymentId} fully refunded`;
    }

    default:
      return `no handler for ${event}`;
  }
}
