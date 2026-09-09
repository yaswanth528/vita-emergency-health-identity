import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  verifySubscriptionPaymentSignature,
  verifyWebhookSignature,
} from '../razorpay-signature.js';

/* ============================================================================
   Signature verification
   ----------------------------------------------------------------------------
   Real HMACs, no mocks. These two functions are the entire barrier between an
   HTTP POST and a paid plan, so testing them against a stub would be testing
   nothing.
   ========================================================================== */

const KEY_SECRET = 'fake_key_secret_for_tests';
const WEBHOOK_SECRET = 'fake_webhook_secret_for_tests';

const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('hex');

describe('subscription payment signature', () => {
  const paymentId = 'pay_test123';
  const subscriptionId = 'sub_test456';

  it('accepts a correctly signed handoff', () => {
    expect(
      verifySubscriptionPaymentSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`, KEY_SECRET),
        keySecret: KEY_SECRET,
      }),
    ).toBe(true);
  });

  /**
   * The order-payment scheme is `order_id|payment_id` — the reverse of this
   * one. Accepting it here would mean accepting a signature produced for a
   * different exchange, so it has to fail.
   */
  it('rejects the operands in the reverse order', () => {
    expect(
      verifySubscriptionPaymentSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${subscriptionId}|${paymentId}`, KEY_SECRET),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    expect(
      verifySubscriptionPaymentSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`, 'not_the_secret'),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects a signature bound to a different payment', () => {
    expect(
      verifySubscriptionPaymentSignature({
        paymentId: 'pay_someoneelse',
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`, KEY_SECRET),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects a signature bound to a different subscription', () => {
    expect(
      verifySubscriptionPaymentSignature({
        paymentId,
        subscriptionId: 'sub_someoneelse',
        signature: sign(`${paymentId}|${subscriptionId}`, KEY_SECRET),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['not hex', 'zzzz-not-a-digest'],
    ['truncated', sign(`${paymentId}|${subscriptionId}`, KEY_SECRET).slice(0, 32)],
    ['padded', `${sign(`${paymentId}|${subscriptionId}`, KEY_SECRET)}00`],
  ])('rejects a %s signature without throwing', (_label, signature) => {
    expect(() =>
      verifySubscriptionPaymentSignature({ paymentId, subscriptionId, signature, keySecret: KEY_SECRET }),
    ).not.toThrow();
    expect(
      verifySubscriptionPaymentSignature({ paymentId, subscriptionId, signature, keySecret: KEY_SECRET }),
    ).toBe(false);
  });

  it('rejects when any field is missing', () => {
    expect(
      verifySubscriptionPaymentSignature({
        paymentId: '',
        subscriptionId,
        signature: 'abc',
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);

    expect(
      verifySubscriptionPaymentSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`, KEY_SECRET),
        keySecret: '',
      }),
    ).toBe(false);
  });
});

describe('webhook signature', () => {
  const rawBody = Buffer.from(
    JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: {} } } }),
  );

  it('accepts a delivery signed over the exact bytes received', () => {
    expect(
      verifyWebhookSignature({
        rawBody,
        signature: sign(rawBody.toString(), WEBHOOK_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(true);
  });

  /**
   * The reason the webhook route uses a raw body parser. Re-serialising the
   * JSON changes the bytes, and the signature no longer matches even though
   * the object is equivalent.
   */
  it('rejects a body that has been re-serialised', () => {
    const parsed = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    const reserialised = JSON.stringify({ payload: parsed.payload, event: parsed.event });

    expect(reserialised).not.toBe(rawBody.toString());
    expect(
      verifyWebhookSignature({
        rawBody: reserialised,
        signature: sign(rawBody.toString(), WEBHOOK_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects a body altered after signing', () => {
    const tampered = Buffer.from(rawBody.toString().replace('charged', 'activated'));
    expect(
      verifyWebhookSignature({
        rawBody: tampered,
        signature: sign(rawBody.toString(), WEBHOOK_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects a delivery signed with the API key secret instead of the webhook secret', () => {
    expect(
      verifyWebhookSignature({
        rawBody,
        signature: sign(rawBody.toString(), KEY_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects an unsigned delivery', () => {
    expect(
      verifyWebhookSignature({ rawBody, signature: undefined, webhookSecret: WEBHOOK_SECRET }),
    ).toBe(false);
  });

  it('rejects everything when no webhook secret is configured', () => {
    expect(
      verifyWebhookSignature({
        rawBody,
        signature: sign(rawBody.toString(), ''),
        webhookSecret: '',
      }),
    ).toBe(false);
  });
});
