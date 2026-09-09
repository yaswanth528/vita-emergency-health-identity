import { randomUUID } from 'node:crypto';
import type { PlanId } from '../shared/plans.js';
import { getDb, nowIso } from './db.js';

/* ============================================================================
   Store
   ----------------------------------------------------------------------------
   Every SQL statement in the application lives here, so the routes read as
   business logic and there is one place to look when the schema moves.

   Note what is absent: there is no `free` row. A free user is a user with no
   paid subscription row, which means the free tier cannot drift out of sync
   with itself and there is no migration to write when someone lapses.
   ========================================================================== */

export type StoredStatus = 'active' | 'pending' | 'payment_failed' | 'cancelled' | 'expired';

export interface UserRow {
  id: string;
  role: 'patient' | 'clinician';
  name: string;
  email: string;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: StoredStatus;
  payment_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_plan_id: string | null;
  latest_payment_id: string | null;
  amount: number;
  currency: string;
  billing_interval: string;
  start_date: string | null;
  next_billing_date: string | null;
  /** SQLite has no boolean; 0 or 1. */
  cancel_at_period_end: number;
  cancellation_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider_subscription_id: string | null;
  order_id: string | null;
  plan_id: PlanId | null;
  amount: number;
  currency: string;
  status: 'captured' | 'failed' | 'refunded';
  method: string | null;
  description: string | null;
  created_at: string;
}

/* --- Users -------------------------------------------------------------------- */

export function findUserById(id: string): UserRow | undefined {
  return getDb().prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id);
}

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb().prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?').get(email);
}

/**
 * Insert-or-fetch by email. Used by the demo sign-in, which must land on the
 * same user row every time so a subscription survives signing out.
 */
export function ensureUser(input: {
  id: string;
  role: 'patient' | 'clinician';
  name: string;
  email: string;
}): UserRow {
  const existing = findUserByEmail(input.email);
  if (existing) return existing;

  getDb()
    .prepare(
      `INSERT INTO users (id, role, name, email, created_at) VALUES (@id, @role, @name, @email, @created_at)`,
    )
    .run({ ...input, created_at: nowIso() });

  return findUserById(input.id)!;
}

/* --- Subscriptions ------------------------------------------------------------ */

export function subscriptionById(id: string): SubscriptionRow | undefined {
  return getDb()
    .prepare<[string], SubscriptionRow>('SELECT * FROM subscriptions WHERE id = ?')
    .get(id);
}

export function subscriptionByProviderId(providerId: string): SubscriptionRow | undefined {
  return getDb()
    .prepare<[string], SubscriptionRow>(
      'SELECT * FROM subscriptions WHERE provider_subscription_id = ?',
    )
    .get(providerId);
}

export function subscriptionByStatus(
  userId: string,
  status: StoredStatus,
): SubscriptionRow | undefined {
  return getDb()
    .prepare<[string, string], SubscriptionRow>(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(userId, status);
}

/**
 * The row that decides what the user can do. `active` first; failing that the
 * most recent row, so a cancelled-but-still-paid period and a lapsed plan are
 * both visible to the entitlement resolver.
 */
export function governingSubscription(userId: string): SubscriptionRow | undefined {
  return (
    subscriptionByStatus(userId, 'active') ??
    getDb()
      .prepare<[string], SubscriptionRow>(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status != 'pending'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(userId)
  );
}

export function insertSubscription(input: {
  userId: string;
  planId: PlanId;
  status: StoredStatus;
  amount: number;
  currency?: string;
  paymentCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPlanId?: string | null;
}): SubscriptionRow {
  const id = `sub_${randomUUID()}`;
  const at = nowIso();

  getDb()
    .prepare(
      `INSERT INTO subscriptions (
         id, user_id, plan_id, status, payment_customer_id, provider_subscription_id,
         provider_plan_id, amount, currency, billing_interval, created_at, updated_at
       ) VALUES (
         @id, @user_id, @plan_id, @status, @payment_customer_id, @provider_subscription_id,
         @provider_plan_id, @amount, @currency, 'monthly', @created_at, @created_at
       )`,
    )
    .run({
      id,
      user_id: input.userId,
      plan_id: input.planId,
      status: input.status,
      payment_customer_id: input.paymentCustomerId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      provider_plan_id: input.providerPlanId ?? null,
      amount: input.amount,
      currency: input.currency ?? 'INR',
      created_at: at,
    });

  return subscriptionById(id)!;
}

type SubscriptionPatch = Partial<{
  status: StoredStatus;
  latest_payment_id: string | null;
  payment_customer_id: string | null;
  provider_subscription_id: string | null;
  start_date: string | null;
  next_billing_date: string | null;
  cancel_at_period_end: number;
  cancellation_date: string | null;
  amount: number;
  plan_id: PlanId;
}>;

export function updateSubscription(id: string, patch: SubscriptionPatch): SubscriptionRow {
  const keys = Object.keys(patch) as (keyof SubscriptionPatch)[];
  if (keys.length > 0) {
    const assignments = keys.map((k) => `${k} = @${k}`).join(', ');
    getDb()
      .prepare(`UPDATE subscriptions SET ${assignments}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...patch, id, updated_at: nowIso() });
  }
  return subscriptionById(id)!;
}

/* --- Payments ----------------------------------------------------------------- */

/**
 * Idempotent by construction: the payment id is the primary key, so a webhook
 * replay and a verify call reporting the same charge collapse into one row.
 */
export function recordPayment(input: {
  id: string;
  userId: string;
  subscriptionId: string | null;
  providerSubscriptionId: string | null;
  orderId: string | null;
  planId: PlanId | null;
  amount: number;
  currency: string;
  status: PaymentRow['status'];
  method?: string | null;
  description?: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO payments (
         id, user_id, subscription_id, provider_subscription_id, order_id, plan_id,
         amount, currency, status, method, description, created_at
       ) VALUES (
         @id, @user_id, @subscription_id, @provider_subscription_id, @order_id, @plan_id,
         @amount, @currency, @status, @method, @description, @created_at
       )
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         method = COALESCE(excluded.method, payments.method),
         subscription_id = COALESCE(excluded.subscription_id, payments.subscription_id)`,
    )
    .run({
      id: input.id,
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      provider_subscription_id: input.providerSubscriptionId,
      order_id: input.orderId,
      plan_id: input.planId,
      amount: input.amount,
      currency: input.currency,
      status: input.status,
      method: input.method ?? null,
      description: input.description ?? null,
      created_at: nowIso(),
    });
}

export function paymentById(id: string): PaymentRow | undefined {
  return getDb().prepare<[string], PaymentRow>('SELECT * FROM payments WHERE id = ?').get(id);
}

export function markPaymentRefunded(id: string): void {
  getDb().prepare(`UPDATE payments SET status = 'refunded' WHERE id = ?`).run(id);
}

export function paymentsForUser(userId: string, limit = 50): PaymentRow[] {
  return getDb()
    .prepare<[string, number], PaymentRow>(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .all(userId, limit);
}

/* --- Webhook idempotency ------------------------------------------------------- */

/**
 * Claim an event id for processing. Returns false when this delivery has been
 * seen before, which is the whole replay defence — the caller must not act on
 * a false.
 */
export function claimWebhookEvent(eventId: string, eventType: string): boolean {
  const result = getDb()
    .prepare(
      `INSERT INTO webhook_events (event_id, event_type, received_at, status)
       VALUES (?, ?, ?, 'skipped')
       ON CONFLICT(event_id) DO NOTHING`,
    )
    .run(eventId, eventType, nowIso());
  return result.changes === 1;
}

/**
 * Give up a claim so the provider's retry can process the event.
 *
 * Called when handling threw. Without this the failed delivery would keep its
 * row, every retry would be rejected as a duplicate, and the event would be
 * lost — the exact failure mode idempotency is supposed to prevent.
 */
export function releaseWebhookEvent(eventId: string): void {
  getDb().prepare('DELETE FROM webhook_events WHERE event_id = ?').run(eventId);
}

export function finishWebhookEvent(
  eventId: string,
  status: 'processed' | 'skipped' | 'error',
  note?: string,
): void {
  getDb()
    .prepare(
      `UPDATE webhook_events SET status = ?, processed_at = ?, note = ? WHERE event_id = ?`,
    )
    .run(status, nowIso(), note ?? null, eventId);
}

export function webhookEventSeen(eventId: string): boolean {
  const row = getDb()
    .prepare<[string], { event_id: string }>(
      'SELECT event_id FROM webhook_events WHERE event_id = ?',
    )
    .get(eventId);
  return row !== undefined;
}
