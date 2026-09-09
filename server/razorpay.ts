import Razorpay from 'razorpay';
import { env } from './env.js';
import { errors } from './errors.js';

/* ============================================================================
   Razorpay client
   ----------------------------------------------------------------------------
   Chosen over Stripe/Paddle because the billing currency is INR and the buyers
   are in India: Razorpay settles INR domestically, supports UPI autopay, cards,
   net banking and wallets in one checkout, and — the deciding factor for a
   monthly plan — has a first-class Subscriptions API with renewal webhooks,
   so recurring billing is not something this codebase has to schedule itself.

   Only this module talks to the provider. Everything above it deals in our own
   subscription rows, which is what makes the integration replaceable.
   ========================================================================== */

/** Monthly billing for ten years. Razorpay requires a finite cycle count. */
const TOTAL_BILLING_CYCLES = 120;

let client: Razorpay | null = null;

function razorpay(): Razorpay {
  if (!env.razorpay.configured) throw errors.providerUnconfigured();
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
}

/** Reduce a provider error to something safe to log and useless to an attacker. */
export function describeProviderError(err: unknown): Record<string, unknown> {
  const e = err as { statusCode?: number; error?: { code?: string; description?: string } };
  return {
    statusCode: e?.statusCode,
    code: e?.error?.code,
    description: e?.error?.description,
  };
}

export interface ProviderSubscription {
  id: string;
  status:
    | 'created'
    | 'authenticated'
    | 'active'
    | 'pending'
    | 'halted'
    | 'cancelled'
    | 'completed'
    | 'expired';
  planId: string;
  /** Unix seconds. Absent until the first charge succeeds. */
  currentEnd: number | null;
  chargeAt: number | null;
  customerId: string | null;
  shortUrl: string | null;
}

export interface ProviderPayment {
  id: string;
  /** Paise. */
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  orderId: string | null;
  subscriptionId: string | null;
}

/* --- Subscriptions ------------------------------------------------------------- */

export async function createSubscription(input: {
  razorpayPlanId: string;
  notes: Record<string, string>;
}): Promise<ProviderSubscription> {
  try {
    const sub = await razorpay().subscriptions.create({
      plan_id: input.razorpayPlanId,
      total_count: TOTAL_BILLING_CYCLES,
      // Razorpay's own email/SMS about the mandate. Harmless, and it gives the
      // customer a record of the authorisation independent of this app.
      customer_notify: 1,
      quantity: 1,
      notes: input.notes,
    });
    return toProviderSubscription(sub);
  } catch (err) {
    throw errors.checkoutFailed(describeProviderError(err));
  }
}

export async function fetchSubscription(id: string): Promise<ProviderSubscription> {
  try {
    return toProviderSubscription(await razorpay().subscriptions.fetch(id));
  } catch (err) {
    throw errors.checkoutFailed(describeProviderError(err));
  }
}

export async function cancelSubscription(
  id: string,
  atCycleEnd: boolean,
): Promise<ProviderSubscription> {
  try {
    return toProviderSubscription(await razorpay().subscriptions.cancel(id, atCycleEnd));
  } catch (err) {
    throw errors.cancellationFailed(describeProviderError(err));
  }
}

/* --- Payments ------------------------------------------------------------------ */

/**
 * Fetched server-side so the amount that was actually charged can be compared
 * against the plan's price. The browser reports a payment id; it does not get
 * to report what that payment was worth.
 */
export async function fetchPayment(id: string): Promise<ProviderPayment> {
  try {
    const p = (await razorpay().payments.fetch(id)) as unknown as {
      id: string;
      amount: number | string;
      currency: string;
      status: string;
      method?: string;
      order_id?: string | null;
      subscription_id?: string | null;
    };
    return {
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      method: p.method ?? null,
      orderId: p.order_id ?? null,
      subscriptionId: p.subscription_id ?? null,
    };
  } catch (err) {
    throw errors.verificationFailed(describeProviderError(err));
  }
}

/* --- Mapping -------------------------------------------------------------------- */

function toProviderSubscription(sub: {
  id: string;
  status: ProviderSubscription['status'];
  plan_id: string;
  current_end?: number | null;
  charge_at?: number | null;
  customer_id?: string | null;
  short_url?: string | null;
}): ProviderSubscription {
  return {
    id: sub.id,
    status: sub.status,
    planId: sub.plan_id,
    currentEnd: sub.current_end ?? null,
    chargeAt: sub.charge_at ?? null,
    customerId: sub.customer_id ?? null,
    shortUrl: sub.short_url ?? null,
  };
}

/** Unix seconds to an ISO date, for the billing dates we store. */
export function unixToIsoDate(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  const d = new Date(seconds * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
