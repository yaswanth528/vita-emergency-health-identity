import type { NextFunction, Request, Response } from 'express';
import { DEFAULT_PLAN_ID, PLANS, type Feature, type PlanId } from '../shared/plans.js';
import type { SubscriptionStatus, SubscriptionView } from '../shared/subscription.js';
import { errors } from './errors.js';
import { governingSubscription, subscriptionByStatus, updateSubscription } from './store.js';
import type { SubscriptionRow } from './store.js';

/* ============================================================================
   Entitlements
   ----------------------------------------------------------------------------
   The one place in the system that answers "may this user do X". Every route,
   every gate and every UI badge resolves through `resolveSubscription`, so
   there is exactly one definition of what "subscribed" means and no chance of
   a route disagreeing with the dashboard that describes it.

   Two rules do the real work:

     1. `pending` and `payment_failed` grant nothing. Reaching the success page
        is not a payment; only a verified charge moves a row to `active`.
     2. A cancelled subscription keeps its entitlements until the period the
        user already paid for runs out, and then silently becomes freemium.
   ========================================================================== */

/**
 * Days past `next_billing_date` before an unrenewed subscription is treated as
 * expired. Absorbs webhook lag and retry windows; without it a delivery delayed
 * past midnight would briefly lock a paying customer out of their own record.
 */
const RENEWAL_GRACE_DAYS = 3;

const DAY_MS = 86_400_000;

function isPast(isoDateString: string | null, graceDays = 0): boolean {
  if (!isoDateString) return false;
  const due = new Date(isoDateString).getTime();
  if (Number.isNaN(due)) return false;
  return Date.now() > due + graceDays * DAY_MS;
}

const freeView = (pendingPlan: PlanId | null): SubscriptionView => ({
  plan: DEFAULT_PLAN_ID,
  status: 'free',
  subscribedPlan: null,
  priceInPaise: PLANS[DEFAULT_PLAN_ID].priceInPaise,
  currency: 'INR',
  billingInterval: 'monthly',
  startDate: null,
  nextBillingDate: null,
  cancellationDate: null,
  cancelAtPeriodEnd: false,
  pendingPlan,
  entitlements: [...PLANS[DEFAULT_PLAN_ID].features],
  seats: PLANS[DEFAULT_PLAN_ID].seats,
  documentLimit: PLANS[DEFAULT_PLAN_ID].documentLimit,
});

/**
 * Expire a row whose paid period has ended, so the caller below only ever
 * reasons about a current row. Returns the row as it now stands.
 */
function settleLapsed(row: SubscriptionRow): SubscriptionRow {
  if (row.status === 'expired' || row.status === 'pending') return row;

  const endsAtPeriodEnd = row.status === 'cancelled' || row.cancel_at_period_end === 1;
  const lapsed = endsAtPeriodEnd
    ? isPast(row.next_billing_date)
    : isPast(row.next_billing_date, RENEWAL_GRACE_DAYS);

  if (!lapsed) return row;
  return updateSubscription(row.id, { status: 'expired' });
}

/**
 * The authoritative view of what a user is entitled to. Never derived from
 * anything the client sent.
 */
export function resolveSubscription(userId: string): SubscriptionView {
  const pending = subscriptionByStatus(userId, 'pending');
  const pendingPlan = pending?.plan_id ?? null;

  const governing = governingSubscription(userId);
  if (!governing) return freeView(pendingPlan);

  const row = settleLapsed(governing);
  const plan = PLANS[row.plan_id];

  // Only `active` confers the paid plan. Everything else falls back to free
  // while still reporting what was subscribed, so the dashboard can explain
  // itself instead of just showing "Freemium" after a failed renewal.
  const entitled = row.status === 'active';
  const effectivePlan: PlanId = entitled ? row.plan_id : DEFAULT_PLAN_ID;
  const effective = PLANS[effectivePlan];

  return {
    plan: effectivePlan,
    status: row.status as SubscriptionStatus,
    subscribedPlan: row.plan_id,
    priceInPaise: plan.priceInPaise,
    currency: row.currency,
    billingInterval: 'monthly',
    startDate: row.start_date,
    nextBillingDate: row.next_billing_date,
    cancellationDate: row.cancellation_date,
    cancelAtPeriodEnd: row.cancel_at_period_end === 1,
    pendingPlan,
    entitlements: [...effective.features],
    seats: effective.seats,
    documentLimit: effective.documentLimit,
  };
}

/**
 * Does this user currently have access to this feature?
 *
 * This is the function the rest of the application is meant to call. It reads
 * the database every time on purpose — a cached entitlement is a way to keep
 * serving a plan someone has already cancelled.
 */
export function hasFeature(userId: string, feature: Feature): boolean {
  return resolveSubscription(userId).entitlements.includes(feature);
}

/** Route guard built on the same helper, so an endpoint cannot drift from the UI. */
export function requireFeature(feature: Feature) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userId = req.userId;
    if (!userId) return next(errors.unauthenticated());
    if (!hasFeature(userId, feature)) return next(errors.featureLocked(feature));
    next();
  };
}
