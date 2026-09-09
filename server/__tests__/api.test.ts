import { createHmac } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ============================================================================
   Subscription API
   ----------------------------------------------------------------------------
   End to end over HTTP, with only the provider's network calls stubbed. The
   signature verification, the entitlement resolver, the database and the
   duplicate guards are all the real implementations.
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

import { DEMO_IDENTITIES } from '../../shared/identities.js';
import { createApp } from '../app.js';
import { resetDbForTests } from '../db.js';
import * as provider from '../razorpay.js';
import { ensureUser } from '../store.js';
import { openCheckout } from '../subscription-service.js';

const createSubscription = vi.mocked(provider.createSubscription);
const fetchSubscription = vi.mocked(provider.fetchSubscription);
const cancelSubscription = vi.mocked(provider.cancelSubscription);
const fetchPayment = vi.mocked(provider.fetchPayment);

const KEY_SECRET = 'fake_key_secret_for_tests';
const SUB_ID = 'sub_provider_001';
const PAYMENT_ID = 'pay_provider_001';

const signHandoff = (paymentId: string, subscriptionId: string, secret = KEY_SECRET) =>
  createHmac('sha256', secret).update(`${paymentId}|${subscriptionId}`).digest('hex');

const providerSub = (overrides: Partial<provider.ProviderSubscription> = {}) => ({
  id: SUB_ID,
  status: 'created' as const,
  planId: 'plan_test_individual',
  currentEnd: Math.floor(Date.now() / 1000) + 30 * 86_400,
  chargeAt: Math.floor(Date.now() / 1000) + 30 * 86_400,
  customerId: 'cust_001',
  shortUrl: null,
  ...overrides,
});

const capturedPayment = (amount: number) => ({
  id: PAYMENT_ID,
  amount,
  currency: 'INR',
  status: 'captured',
  method: 'upi',
  orderId: null,
  subscriptionId: SUB_ID,
});

let app: Express;

/** Signs in and returns an agent that keeps the session cookie. */
async function signedIn(role: 'patient' | 'clinician' = 'patient') {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ role }).expect(200);
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDbForTests();
  app = createApp();

  createSubscription.mockResolvedValue(providerSub());
  fetchSubscription.mockResolvedValue(providerSub({ status: 'active' }));
  cancelSubscription.mockResolvedValue(providerSub({ status: 'cancelled' }));
  fetchPayment.mockResolvedValue(capturedPayment(19_900));
});

/* --- Plan catalogue ------------------------------------------------------------ */

describe('GET /api/plans', () => {
  it('is public and states the authoritative prices', async () => {
    const res = await request(app).get('/api/plans').expect(200);

    const prices = Object.fromEntries(
      (res.body.plans as { id: string; priceInPaise: number }[]).map((p) => [p.id, p.priceInPaise]),
    );
    expect(prices).toEqual({ freemium: 0, individual: 19_900, family: 39_900 });
  });
});

/* --- Authentication ------------------------------------------------------------ */

describe('authentication', () => {
  it('refuses to describe a subscription without a session', async () => {
    const res = await request(app).get('/api/subscription').expect(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('refuses to start a checkout without a session', async () => {
    await request(app).post('/api/subscription/checkout').send({ planId: 'individual' }).expect(401);
  });

  it('establishes a session that later requests can use', async () => {
    const agent = await signedIn();
    const res = await agent.get('/api/auth/me').expect(200);
    expect(res.body.user.id).toBe('usr-patient-kavita');
  });

  it('rejects a forged session cookie', async () => {
    await request(app)
      .get('/api/subscription')
      .set('Cookie', 'pulse_session=usr-patient-kavita.forged')
      .expect(401);
  });

  it('ends the session on logout', async () => {
    const agent = await signedIn();
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/subscription').expect(401);
  });
});

/* --- Plan validation ----------------------------------------------------------- */

describe('plan validation at checkout', () => {
  it.each([
    ['an unknown plan', { planId: 'enterprise' }],
    ['a case-mangled plan', { planId: 'Individual' }],
    ['a missing plan', {}],
    ['a non-string plan', { planId: 99 }],
    ['an injected plan', { planId: "individual'; DROP TABLE subscriptions; --" }],
  ])('rejects %s', async (_label, body) => {
    const agent = await signedIn();
    const res = await agent.post('/api/subscription/checkout').send(body).expect(400);
    expect(res.body.error.code).toBe('invalid_plan');
    expect(createSubscription).not.toHaveBeenCalled();
  });

  it('rejects a checkout for the free plan', async () => {
    const agent = await signedIn();
    const res = await agent.post('/api/subscription/checkout').send({ planId: 'freemium' });
    expect(res.status).toBe(400);
    expect(createSubscription).not.toHaveBeenCalled();
  });

  /** The core "never trust the client" case. */
  it('ignores an amount supplied by the client', async () => {
    const agent = await signedIn();
    const res = await agent
      .post('/api/subscription/checkout')
      .send({ planId: 'family', amount: 100, priceInPaise: 100 })
      .expect(200);

    expect(res.body.checkout.amount).toBe(39_900);
  });
});

/* --- Checkout ------------------------------------------------------------------- */

describe('POST /api/subscription/checkout', () => {
  it('returns a session with the publishable key and no secret', async () => {
    const agent = await signedIn();
    const res = await agent
      .post('/api/subscription/checkout')
      .send({ planId: 'individual' })
      .expect(200);

    expect(res.body.checkout.keyId).toBe('rzp_test_fakekeyid');
    expect(res.body.checkout.subscriptionId).toBe(SUB_ID);
    expect(res.body.checkout.amount).toBe(19_900);

    const serialised = JSON.stringify(res.body);
    expect(serialised).not.toContain(KEY_SECRET);
    expect(serialised).not.toContain('fake_webhook_secret_for_tests');
  });

  it('grants nothing while the payment is only pending', async () => {
    const agent = await signedIn();
    await agent.post('/api/subscription/checkout').send({ planId: 'individual' }).expect(200);

    const res = await agent.get('/api/subscription').expect(200);
    expect(res.body.subscription.plan).toBe('freemium');
    expect(res.body.subscription.pendingPlan).toBe('individual');
    expect(res.body.subscription.entitlements).not.toContain('ai-extraction');
  });

  /** Clicking the button three times must not create three mandates. */
  it('reuses an unpaid attempt at the same plan', async () => {
    const agent = await signedIn();
    fetchSubscription.mockResolvedValue(providerSub({ status: 'created' }));

    const first = await agent.post('/api/subscription/checkout').send({ planId: 'individual' });
    const second = await agent.post('/api/subscription/checkout').send({ planId: 'individual' });
    const third = await agent.post('/api/subscription/checkout').send({ planId: 'individual' });

    expect(createSubscription).toHaveBeenCalledTimes(1);
    expect(second.body.checkout.reused).toBe(true);
    expect(third.body.checkout.subscriptionId).toBe(first.body.checkout.subscriptionId);
  });

  /**
   * Two requests racing for the same account. The pending slot is reserved
   * before Razorpay is called, so the loser fails having created nothing —
   * rather than leaving a second mandate on the customer's card that no row
   * in this database points at.
   */
  it('creates only one mandate when two checkouts race', async () => {
    // Driven through the service rather than HTTP: supertest requests do not
    // dispatch until awaited, which cannot produce a genuine overlap.
    const user = ensureUser(DEMO_IDENTITIES.patient);

    let releaseProvider: (() => void) | undefined;
    createSubscription.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        releaseProvider = resolve;
      });
      return providerSub();
    });

    const first = openCheckout(user, 'individual');
    // Yield so the first call reserves its slot and parks on the provider.
    await new Promise((r) => setImmediate(r));

    await expect(openCheckout(user, 'individual')).rejects.toMatchObject({
      code: 'checkout_in_flight',
    });
    expect(createSubscription).toHaveBeenCalledTimes(1);

    releaseProvider?.();
    await expect(first).resolves.toMatchObject({ subscriptionId: SUB_ID, reused: false });
  });

  it('releases the reserved slot when the provider fails, so a retry works', async () => {
    const agent = await signedIn();
    createSubscription.mockRejectedValueOnce(new Error('provider down'));

    const failed = await agent.post('/api/subscription/checkout').send({ planId: 'individual' });
    expect(failed.status).toBeGreaterThanOrEqual(400);

    // A stuck `pending` row here would lock the account out of paying at all.
    createSubscription.mockResolvedValue(providerSub());
    const retried = await agent.post('/api/subscription/checkout').send({ planId: 'individual' });
    expect(retried.status).toBe(200);
    expect(retried.body.checkout.subscriptionId).toBe(SUB_ID);
  });

  it('retires an unpaid attempt when a different plan is chosen', async () => {
    const agent = await signedIn();
    fetchSubscription.mockResolvedValue(providerSub({ status: 'created' }));

    await agent.post('/api/subscription/checkout').send({ planId: 'individual' }).expect(200);
    createSubscription.mockResolvedValue(providerSub({ id: 'sub_provider_002' }));
    const res = await agent.post('/api/subscription/checkout').send({ planId: 'family' }).expect(200);

    expect(cancelSubscription).toHaveBeenCalledWith(SUB_ID, false);
    expect(res.body.checkout.subscriptionId).toBe('sub_provider_002');
    expect(res.body.checkout.reused).toBe(false);
  });
});

/* --- Verification ---------------------------------------------------------------- */

describe('POST /api/subscription/verify', () => {
  async function startCheckout(planId: 'individual' | 'family' = 'individual') {
    const agent = await signedIn();
    await agent.post('/api/subscription/checkout').send({ planId }).expect(200);
    return agent;
  }

  it('activates the plan for a correctly signed, correctly priced payment', async () => {
    const agent = await startCheckout();

    const res = await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: PAYMENT_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
      })
      .expect(200);

    expect(res.body.subscription.status).toBe('active');
    expect(res.body.subscription.plan).toBe('individual');
    expect(res.body.subscription.entitlements).toContain('ai-extraction');
    expect(res.body.subscription.nextBillingDate).not.toBeNull();
  });

  it('refuses a forged signature and activates nothing', async () => {
    const agent = await startCheckout();

    const res = await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: PAYMENT_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_signature: 'deadbeef'.repeat(8),
      })
      .expect(400);

    expect(res.body.error.code).toBe('verification_failed');

    const after = await agent.get('/api/subscription').expect(200);
    expect(after.body.subscription.plan).toBe('freemium');
    expect(after.body.subscription.status).toBe('payment_failed');
  });

  it('refuses a signature made with the wrong secret', async () => {
    const agent = await startCheckout();

    await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: PAYMENT_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID, 'attacker_secret'),
      })
      .expect(400);

    const after = await agent.get('/api/subscription');
    expect(after.body.subscription.plan).toBe('freemium');
  });

  /**
   * A valid signature over an underpayment. The amount is checked against the
   * catalogue independently, so paying ₹1 for Family gets nothing.
   */
  it('refuses a payment whose amount does not match the plan', async () => {
    const agent = await startCheckout('family');
    fetchPayment.mockResolvedValue(capturedPayment(100));

    const res = await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: PAYMENT_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
      })
      .expect(400);

    expect(res.body.error.code).toBe('invalid_amount');
    // The safe message must not leak the expected figure back to the caller.
    expect(res.body.error.message).not.toContain('39900');

    const after = await agent.get('/api/subscription');
    expect(after.body.subscription.plan).toBe('freemium');
  });

  it('refuses a payment the provider does not report as captured', async () => {
    const agent = await startCheckout();
    fetchPayment.mockResolvedValue({ ...capturedPayment(19_900), status: 'failed' });

    await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: PAYMENT_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
      })
      .expect(400);

    const after = await agent.get('/api/subscription');
    expect(after.body.subscription.plan).toBe('freemium');
  });

  /** Ownership: a valid handoff for someone else's subscription is not mine. */
  it("refuses to activate another account's subscription", async () => {
    await startCheckout();
    const other = request.agent(app);
    await other.post('/api/auth/login').send({ role: 'clinician' }).expect(200);

    const res = await other
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: PAYMENT_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
      })
      .expect(400);

    expect(res.body.error.code).toBe('verification_failed');
    const mine = await other.get('/api/subscription');
    expect(mine.body.subscription.plan).toBe('freemium');
  });

  it('rejects an incomplete confirmation', async () => {
    const agent = await startCheckout();
    await agent
      .post('/api/subscription/verify')
      .send({ razorpay_payment_id: PAYMENT_ID })
      .expect(400);
  });

  it('records the payment in history once activated', async () => {
    const agent = await startCheckout();
    await agent.post('/api/subscription/verify').send({
      razorpay_payment_id: PAYMENT_ID,
      razorpay_subscription_id: SUB_ID,
      razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
    });

    const res = await agent.get('/api/subscription/payments').expect(200);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0]).toMatchObject({
      id: PAYMENT_ID,
      amount: 19_900,
      status: 'captured',
      planId: 'individual',
    });
  });
});

/* --- Feature gating -------------------------------------------------------------- */

describe('server-side feature gating', () => {
  it('refuses a paid endpoint on the free plan', async () => {
    const agent = await signedIn();
    const res = await agent.get('/api/subscription/export').expect(402);
    expect(res.body.error.code).toBe('feature_locked');
  });

  it('allows it once the plan is genuinely active', async () => {
    const agent = await signedIn();
    await agent.post('/api/subscription/checkout').send({ planId: 'individual' });
    await agent.post('/api/subscription/verify').send({
      razorpay_payment_id: PAYMENT_ID,
      razorpay_subscription_id: SUB_ID,
      razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
    });

    const res = await agent.get('/api/subscription/export').expect(200);
    expect(res.body.subscription.plan).toBe('individual');
  });

  it('refuses it without a session at all', async () => {
    await request(app).get('/api/subscription/export').expect(401);
  });
});

/* --- Cancellation ---------------------------------------------------------------- */

describe('POST /api/subscription/cancel', () => {
  async function activeIndividual() {
    const agent = await signedIn();
    await agent.post('/api/subscription/checkout').send({ planId: 'individual' });
    await agent.post('/api/subscription/verify').send({
      razorpay_payment_id: PAYMENT_ID,
      razorpay_subscription_id: SUB_ID,
      razorpay_signature: signHandoff(PAYMENT_ID, SUB_ID),
    });
    return agent;
  }

  it('keeps access to the period already paid for', async () => {
    const agent = await activeIndividual();

    const res = await agent.post('/api/subscription/cancel').send({ atPeriodEnd: true }).expect(200);

    expect(cancelSubscription).toHaveBeenCalledWith(SUB_ID, true);
    expect(res.body.subscription.cancelAtPeriodEnd).toBe(true);
    expect(res.body.subscription.status).toBe('active');
    // Still entitled — this month is paid for.
    expect(res.body.subscription.entitlements).toContain('ai-extraction');
    expect(res.body.subscription.cancellationDate).not.toBeNull();
  });

  it('revokes immediately when asked to', async () => {
    const agent = await activeIndividual();

    const res = await agent.post('/api/subscription/cancel').send({ atPeriodEnd: false }).expect(200);

    expect(cancelSubscription).toHaveBeenCalledWith(SUB_ID, false);
    expect(res.body.subscription.status).toBe('cancelled');
    expect(res.body.subscription.plan).toBe('freemium');
    expect(res.body.subscription.entitlements).not.toContain('ai-extraction');
  });

  it('refuses when there is nothing to cancel', async () => {
    const agent = await signedIn();
    const res = await agent.post('/api/subscription/cancel').send({}).expect(404);
    expect(res.body.error.code).toBe('no_subscription');
  });

  it('leaves the emergency capabilities intact after cancelling', async () => {
    const agent = await activeIndividual();
    const res = await agent.post('/api/subscription/cancel').send({ atPeriodEnd: false });

    expect(res.body.subscription.entitlements).toContain('emergency-profile');
    expect(res.body.subscription.entitlements).toContain('emergency-activation');
  });
});

/* --- Upgrade and downgrade -------------------------------------------------------- */

describe('plan changes', () => {
  async function activate(planId: 'individual' | 'family', subId: string, amount: number) {
    const agent = await signedIn();
    createSubscription.mockResolvedValue(providerSub({ id: subId }));
    fetchSubscription.mockResolvedValue(providerSub({ id: subId, status: 'active' }));
    fetchPayment.mockResolvedValue({ ...capturedPayment(amount), id: `pay_${subId}` });

    await agent.post('/api/subscription/checkout').send({ planId }).expect(200);
    await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: `pay_${subId}`,
        razorpay_subscription_id: subId,
        razorpay_signature: signHandoff(`pay_${subId}`, subId),
      })
      .expect(200);
    return agent;
  }

  it('upgrades Individual to Family and cancels the old mandate', async () => {
    const agent = await activate('individual', 'sub_ind', 19_900);

    createSubscription.mockResolvedValue(providerSub({ id: 'sub_fam' }));
    fetchSubscription.mockResolvedValue(providerSub({ id: 'sub_fam', status: 'active' }));
    fetchPayment.mockResolvedValue({ ...capturedPayment(39_900), id: 'pay_sub_fam' });

    await agent.post('/api/subscription/checkout').send({ planId: 'family' }).expect(200);
    const res = await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: 'pay_sub_fam',
        razorpay_subscription_id: 'sub_fam',
        razorpay_signature: signHandoff('pay_sub_fam', 'sub_fam'),
      })
      .expect(200);

    expect(res.body.subscription.plan).toBe('family');
    expect(res.body.subscription.entitlements).toContain('family-profiles');
    // The superseded subscription is cancelled at the provider, not left running.
    expect(cancelSubscription).toHaveBeenCalledWith('sub_ind', false);
  });

  it('downgrades Family to Individual and drops the family capability', async () => {
    const agent = await activate('family', 'sub_fam', 39_900);

    createSubscription.mockResolvedValue(providerSub({ id: 'sub_ind' }));
    fetchSubscription.mockResolvedValue(providerSub({ id: 'sub_ind', status: 'active' }));
    fetchPayment.mockResolvedValue({ ...capturedPayment(19_900), id: 'pay_sub_ind' });

    await agent.post('/api/subscription/checkout').send({ planId: 'individual' }).expect(200);
    const res = await agent
      .post('/api/subscription/verify')
      .send({
        razorpay_payment_id: 'pay_sub_ind',
        razorpay_subscription_id: 'sub_ind',
        razorpay_signature: signHandoff('pay_sub_ind', 'sub_ind'),
      })
      .expect(200);

    expect(res.body.subscription.plan).toBe('individual');
    expect(res.body.subscription.entitlements).not.toContain('family-profiles');
    expect(res.body.subscription.entitlements).toContain('ai-extraction');
    expect(cancelSubscription).toHaveBeenCalledWith('sub_fam', false);
  });

  it('refuses a checkout for the plan already active', async () => {
    const agent = await activate('individual', 'sub_ind', 19_900);

    const res = await agent.post('/api/subscription/checkout').send({ planId: 'individual' }).expect(409);
    expect(res.body.error.code).toBe('already_subscribed');
  });

  it('never leaves two subscriptions active at once', async () => {
    const agent = await activate('individual', 'sub_ind', 19_900);

    createSubscription.mockResolvedValue(providerSub({ id: 'sub_fam' }));
    fetchSubscription.mockResolvedValue(providerSub({ id: 'sub_fam', status: 'active' }));
    fetchPayment.mockResolvedValue({ ...capturedPayment(39_900), id: 'pay_sub_fam' });

    await agent.post('/api/subscription/checkout').send({ planId: 'family' });
    await agent.post('/api/subscription/verify').send({
      razorpay_payment_id: 'pay_sub_fam',
      razorpay_subscription_id: 'sub_fam',
      razorpay_signature: signHandoff('pay_sub_fam', 'sub_fam'),
    });

    // One resolved plan, and it is the new one.
    const res = await agent.get('/api/subscription').expect(200);
    expect(res.body.subscription.plan).toBe('family');
    expect(res.body.subscription.status).toBe('active');
  });
});

/* --- Error surfaces ---------------------------------------------------------------- */

describe('error responses', () => {
  it('never leaks provider internals to the client', async () => {
    const agent = await signedIn();
    createSubscription.mockRejectedValue(
      new Error('Razorpay 401: key_secret invalid for rzp_test_fakekeyid'),
    );

    const res = await agent.post('/api/subscription/checkout').send({ planId: 'individual' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    const serialised = JSON.stringify(res.body);
    expect(serialised).not.toContain('key_secret');
    expect(serialised).not.toContain(KEY_SECRET);
  });

  it('answers an unknown endpoint with a structured error', async () => {
    const res = await request(app).get('/api/nonsense').expect(404);
    expect(res.body.error.code).toBe('invalid_request');
  });

  it('reports whether payments are configured, without leaking the secret', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.payments).toMatchObject({ configured: true, mode: 'test' });
    expect(JSON.stringify(res.body)).not.toContain(KEY_SECRET);
  });
});
