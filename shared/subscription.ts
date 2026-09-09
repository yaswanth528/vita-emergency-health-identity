// Type-only, so this import is erased at compile time and the `.js` extension
// (required by the server's NodeNext resolution) never reaches a bundler.
import type { Feature, PlanId } from './plans.js';

/* ============================================================================
   Subscription contract
   ----------------------------------------------------------------------------
   The wire shapes the API returns and the browser consumes. Both sides import
   these, so a field the UI reads is a field the server actually promises.

   The browser is never the authority on any of it. `SubscriptionView.plan` is
   what the server resolved from its own row, and `entitlements` is the result
   of running the entitlement helper server-side — the client's job is to
   render it, not to compute it.
   ========================================================================== */

/**
 * `pending` is the state between "checkout opened" and "payment verified".
 * It grants nothing. That is the whole reason it is a distinct state rather
 * than an optimistic `active`.
 */
export type SubscriptionStatus =
  | 'free'
  | 'active'
  | 'pending'
  | 'payment_failed'
  | 'cancelled'
  | 'expired';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  free: 'Free plan',
  active: 'Active',
  pending: 'Awaiting payment',
  payment_failed: 'Payment failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export interface SubscriptionView {
  /** The plan the server has decided this user is entitled to, right now. */
  plan: PlanId;
  status: SubscriptionStatus;
  /** The plan that was paid for, which differs from `plan` once it lapses. */
  subscribedPlan: PlanId | null;
  priceInPaise: number;
  currency: string;
  billingInterval: 'monthly';
  startDate: string | null;
  /** ISO date of the next charge, or of the end of a cancelled paid period. */
  nextBillingDate: string | null;
  cancellationDate: string | null;
  /** True when cancelled but still inside a period that was already paid for. */
  cancelAtPeriodEnd: boolean;
  /** Set only while a plan change is awaiting payment. */
  pendingPlan: PlanId | null;
  /** Server-computed. The client renders this and never derives its own. */
  entitlements: Feature[];
  seats: number;
  documentLimit: number | null;
}

export interface PaymentRecord {
  id: string;
  planId: PlanId | null;
  amount: number;
  currency: string;
  status: 'captured' | 'failed' | 'refunded';
  method: string | null;
  description: string | null;
  createdAt: string;
}

/** What the browser needs to open Razorpay Checkout. No secrets in here. */
export interface CheckoutSession {
  keyId: string;
  subscriptionId: string;
  planId: PlanId;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string };
  /** True when an existing unpaid attempt was handed back instead of a new one. */
  reused: boolean;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
