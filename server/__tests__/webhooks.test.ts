import { createHmac } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ============================================================================
   Webhook handling
   ----------------------------------------------------------------------------
   Signature verification, replay protection, and the state each event moves a
   subscription into. Razorpay retries on any non-2xx, so at-least-once
   delivery is the normal case — duplicates are tested as the rule rather than
   an edge case.
   ========================================================================== */

vi.mock('../razorpay.js', () => ({
  createSubscription: vi.fn(),
  fetchSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  fetchPayment: vi.fn(),
  describeProviderError: (err: unknown) => ({ message: String(err) }),
  unixToIsoDate: (seconds?: number | null) =>
    seconds ? new Date(seconds * 1000).toISOString() : null,
}));

import { createApp } from '../app.js';
import { resetDbForTests } from '../db.js';
import { resolveSubscription } from '../entitlements.js';
import {
  ensureUser,
  insertSubscription,
  paymentsForUser,
  subscriptionByProviderId,
  updateSubscription,
  webhookEventSeen,
} from '../store.js';

const WEBHOOK_SECRET = 'fake_webhook_secret_for_tests';
const USER = {
  id: 'usr-patient-kavita',
  role: 'patient' as const,
  name: 'Kavita Menon',
  email: 'kavita.menon@example.com',
};
const PROVIDER_SUB = 'sub_webhook_001';

let app: Express;
let localSubscriptionId: string;

const unix = (offsetDays: number) =>
  Math.floor((Date.now() + offsetDays * 86_400_000) / 1000);

function deliver(
  body: unknown,
  options: { eventId?: string; signature?: string; secret?: string } = {},
) {
  const raw = JSON.stringify(body);
  const signature =
    options.signature ??
    createHmac('sha256', options.secret ?? WEBHOOK_SECRET).update(raw).digest('hex');

  const req = request(app)
    .post('/api/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('x-razorpay-signature', signature);

  if (options.eventId !== undefined) req.set('x-razorpay-event-id', options.eventId);
  return req.send(raw);
}

const subscriptionEvent = (event: string, entity: Record<string, unknown> = {}) => ({
  event,
  payload: {
    subscription: {
      entity: { id: PROVIDER_SUB, status: 'active', current_end: unix(30), ...entity },
    },
  },
});

const chargedEvent = (paymentId: string, amount = 19_900) => ({
  event: 'subscription.charged',
  payload: {
    subscription: { entity: { id: PROVIDER_SUB, status: 'active', current_end: unix(30) } },
    payment: {
      entity: {
        id: paymentId,
        amount,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        subscription_id: PROVIDER_SUB,
      },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  resetDbForTests();
  app = createApp();

  ensureUser(USER);
  const row = insertSubscription({
    userId: USER.id,
    planId: 'individual',
    status: 'pending',
    amount: 19_900,
    providerSubscriptionId: PROVIDER_SUB,
    providerPlanId: 'plan_test_individual',
  });
  localSubscriptionId = row.id;
});

/* --- Signature ------------------------------------------------------------------- */

describe('signature verification', () => {
  it('accepts a correctly signed delivery', async () => {
    const res = await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_1' });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('rejects an unsigned delivery and changes nothing', async () => {
    const raw = JSON.stringify(subscriptionEvent('subscription.activated'));
    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .send(raw);

    expect(res.status).toBe(400);
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
  });

  it('rejects a delivery signed with the wrong secret', async () => {
    const res = await deliver(subscriptionEvent('subscription.activated'), {
      eventId: 'evt_wrong',
      secret: 'attacker_secret',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('webhook_invalid');
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
  });

  /** The attack this endpoint exists to stop: an unsigned free upgrade. */
  it('cannot be used to activate a plan without a valid signature', async () => {
    await deliver(subscriptionEvent('subscription.activated'), {
      eventId: 'evt_forged',
      signature: 'ff'.repeat(32),
    }).expect(400);

    expect(resolveSubscription(USER.id).status).not.toBe('active');
  });

  it('rejects a body altered after signing', async () => {
    const original = subscriptionEvent('subscription.activated');
    const signature = createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(original))
      .digest('hex');

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(JSON.stringify({ ...original, event: 'subscription.charged' }));

    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON that is nonetheless correctly signed', async () => {
    const raw = '{ not json';
    const signature = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(raw);

    expect(res.status).toBe(400);
  });
});

/* --- Idempotency ------------------------------------------------------------------ */

describe('idempotency', () => {
  it('processes the first delivery and skips the replay', async () => {
    const first = await deliver(chargedEvent('pay_dup_1'), { eventId: 'evt_dup' }).expect(200);
    const second = await deliver(chargedEvent('pay_dup_1'), { eventId: 'evt_dup' }).expect(200);

    expect(first.body.duplicate).toBeUndefined();
    expect(second.body.duplicate).toBe(true);
    expect(webhookEventSeen('evt_dup')).toBe(true);
  });

  /** The one that would actually cost money: a replay must not double-charge. */
  it('records a replayed charge exactly once', async () => {
    await deliver(chargedEvent('pay_once'), { eventId: 'evt_charge' }).expect(200);
    await deliver(chargedEvent('pay_once'), { eventId: 'evt_charge' }).expect(200);
    await deliver(chargedEvent('pay_once'), { eventId: 'evt_charge' }).expect(200);

    expect(paymentsForUser(USER.id)).toHaveLength(1);
  });

  it('treats a distinct event id carrying the same payment as one payment', async () => {
    // Razorpay can send activated and charged for the same first payment.
    await deliver(chargedEvent('pay_same'), { eventId: 'evt_a' }).expect(200);
    await deliver(chargedEvent('pay_same'), { eventId: 'evt_b' }).expect(200);

    // Two events processed, but the payment id is the primary key.
    expect(paymentsForUser(USER.id)).toHaveLength(1);
  });

  it('falls back to hashing the body when no event id is sent', async () => {
    const first = await deliver(chargedEvent('pay_nohdr')).expect(200);
    const second = await deliver(chargedEvent('pay_nohdr')).expect(200);

    expect(first.body.duplicate).toBeUndefined();
    expect(second.body.duplicate).toBe(true);
  });

  it('does not confuse two genuinely different events', async () => {
    await deliver(chargedEvent('pay_m1'), { eventId: 'evt_m1' }).expect(200);
    const second = await deliver(chargedEvent('pay_m2'), { eventId: 'evt_m2' }).expect(200);

    expect(second.body.duplicate).toBeUndefined();
    expect(paymentsForUser(USER.id)).toHaveLength(2);
  });
});

/* --- State transitions -------------------------------------------------------------- */

describe('subscription.activated', () => {
  it('activates the plan and sets the next billing date', async () => {
    await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);

    const view = resolveSubscription(USER.id);
    expect(view.status).toBe('active');
    expect(view.plan).toBe('individual');
    expect(view.nextBillingDate).not.toBeNull();
    expect(view.entitlements).toContain('ai-extraction');
  });
});

describe('subscription.charged', () => {
  it('renews the period and records the charge', async () => {
    await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
    await deliver(chargedEvent('pay_renewal'), { eventId: 'evt_renew' }).expect(200);

    const view = resolveSubscription(USER.id);
    expect(view.status).toBe('active');

    const payments = paymentsForUser(USER.id);
    expect(payments[0]).toMatchObject({ id: 'pay_renewal', status: 'captured', amount: 19_900 });
  });

  /** A cancelled subscription must not be resurrected by a late renewal. */
  it('is ignored for a subscription the customer already cancelled', async () => {
    updateSubscription(localSubscriptionId, {
      status: 'cancelled',
      cancel_at_period_end: 0,
      next_billing_date: null,
    });

    await deliver(chargedEvent('pay_late'), { eventId: 'evt_late' }).expect(200);

    expect(subscriptionByProviderId(PROVIDER_SUB)?.status).toBe('cancelled');
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
  });
});

describe('payment failure events', () => {
  const failureEvent = (event: string) => ({
    event,
    payload: {
      subscription: { entity: { id: PROVIDER_SUB, status: 'halted' } },
      payment: {
        entity: {
          id: `pay_failed_${event}`,
          amount: 19_900,
          currency: 'INR',
          status: 'failed',
          method: 'card',
          subscription_id: PROVIDER_SUB,
        },
      },
    },
  });

  /**
   * Razorpay's `pending` means "the charge failed, we are retrying". It must
   * not take away a month the customer has already paid for — and the same
   * test catches a stale failure event arriving after a successful renewal has
   * moved the billing date forward.
   */
  it.each(['subscription.pending', 'subscription.halted', 'payment.failed'])(
    '%s keeps the plan while the paid period is still running',
    async (event) => {
      await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
      await deliver(failureEvent(event), { eventId: `evt_${event}` }).expect(200);

      const view = resolveSubscription(USER.id);
      expect(view.status).toBe('active');
      expect(view.plan).toBe('individual');
      expect(view.entitlements).toContain('ai-extraction');

      // The attempt is still recorded, so the history shows what happened.
      expect(paymentsForUser(USER.id).some((p) => p.status === 'failed')).toBe(true);
    },
  );

  it.each(['subscription.pending', 'subscription.halted', 'payment.failed'])(
    '%s drops the account to freemium once the paid period has ended',
    async (event) => {
      await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
      // The renewal that failed was due yesterday, so nothing is paid for now.
      updateSubscription(subscriptionByProviderId(PROVIDER_SUB)!.id, {
        next_billing_date: new Date(Date.now() - 86_400_000).toISOString(),
      });

      await deliver(failureEvent(event), { eventId: `evt_${event}` }).expect(200);

      const view = resolveSubscription(USER.id);
      expect(view.status).toBe('payment_failed');
      expect(view.plan).toBe('freemium');
      expect(view.entitlements).not.toContain('ai-extraction');
      // Emergency access survives a failed payment.
      expect(view.entitlements).toContain('emergency-profile');
      expect(paymentsForUser(USER.id).some((p) => p.status === 'failed')).toBe(true);
    },
  );
});

describe('subscription.cancelled', () => {
  /**
   * A cancellation from Razorpay's own dashboard still leaves a paid period.
   * It maps onto the same representation `cancelForUser` uses, rather than
   * ending access on the spot.
   */
  it('retains access to the period already paid for', async () => {
    await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
    await deliver(subscriptionEvent('subscription.cancelled', { status: 'cancelled' }), {
      eventId: 'evt_cancel',
    }).expect(200);

    const row = subscriptionByProviderId(PROVIDER_SUB);
    expect(row?.cancel_at_period_end).toBe(1);
    expect(row?.cancellation_date).not.toBeNull();
    expect(row?.next_billing_date).not.toBeNull();

    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('individual');
    expect(view.cancelAtPeriodEnd).toBe(true);
    expect(view.entitlements).toContain('ai-extraction');
  });

  it('cancels outright when the paid period has already ended', async () => {
    await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
    await deliver(
      subscriptionEvent('subscription.cancelled', {
        status: 'cancelled',
        current_end: unix(-1),
      }),
      { eventId: 'evt_cancel_past' },
    ).expect(200);

    const row = subscriptionByProviderId(PROVIDER_SUB);
    expect(row?.status).toBe('cancelled');
    expect(row?.next_billing_date).toBeNull();
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
  });
});

describe('subscription end of life', () => {
  it.each(['subscription.completed', 'subscription.expired'])(
    '%s returns the account to freemium',
    async (event) => {
      await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
      await deliver(subscriptionEvent(event, { status: 'completed' }), {
        eventId: `evt_${event}`,
      }).expect(200);

      expect(subscriptionByProviderId(PROVIDER_SUB)?.status).toBe('expired');
      expect(resolveSubscription(USER.id).plan).toBe('freemium');
    },
  );
});

describe('refund.processed', () => {
  it('marks the payment refunded and ends the plan', async () => {
    await deliver(subscriptionEvent('subscription.activated'), { eventId: 'evt_act' }).expect(200);
    await deliver(chargedEvent('pay_to_refund'), { eventId: 'evt_charge' }).expect(200);

    await deliver(
      {
        event: 'refund.processed',
        payload: {
          refund: { entity: { id: 'rfnd_1', payment_id: 'pay_to_refund', amount: 19_900 } },
          payment: { entity: { id: 'pay_to_refund', subscription_id: PROVIDER_SUB } },
        },
      },
      { eventId: 'evt_refund' },
    ).expect(200);

    expect(paymentsForUser(USER.id)[0].status).toBe('refunded');
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
  });

  it('ignores a refund for a payment it has never seen', async () => {
    const res = await deliver(
      {
        event: 'refund.processed',
        payload: { refund: { entity: { id: 'rfnd_x', payment_id: 'pay_unknown' } } },
      },
      { eventId: 'evt_refund_unknown' },
    );

    expect(res.status).toBe(200);
  });
});

describe('unhandled and unmatched events', () => {
  it('accepts a verified event with no handler rather than making the provider retry', async () => {
    const res = await deliver(
      { event: 'invoice.paid', payload: {} },
      { eventId: 'evt_unhandled' },
    );
    expect(res.status).toBe(200);
  });

  it('accepts an event for a subscription it does not know about', async () => {
    const res = await deliver(
      {
        event: 'subscription.charged',
        payload: { subscription: { entity: { id: 'sub_not_ours', status: 'active' } } },
      },
      { eventId: 'evt_foreign' },
    );

    expect(res.status).toBe(200);
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
  });
});
