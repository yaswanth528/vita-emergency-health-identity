import { createHmac, timingSafeEqual } from 'node:crypto';

/* ============================================================================
   Razorpay signatures
   ----------------------------------------------------------------------------
   Pure crypto, deliberately separated from the network client so these two
   functions are exercised for real by the test suite rather than mocked past.
   They are the only thing standing between a POST from a browser and a paid
   plan, so "it was mocked in CI" is not an acceptable state for them.

   The two schemes are NOT the same string, and getting them the wrong way
   round is the classic Razorpay integration bug:

     subscription payment   HMAC(payment_id + '|' + subscription_id, key_secret)
     one-time order         HMAC(order_id   + '|' + payment_id,      key_secret)

   This integration bills through Subscriptions, so the first is what applies.
   ========================================================================== */

/** Constant-time comparison of two hex digests. */
function digestsMatch(expectedHex: string, providedHex: string): boolean {
  if (typeof providedHex !== 'string') return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  if (expected.length === 0 || expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Verify the handshake Razorpay Checkout hands back after a subscription's
 * first successful charge.
 */
export function verifySubscriptionPaymentSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  keySecret: string;
}): boolean {
  if (!input.paymentId || !input.subscriptionId || !input.signature || !input.keySecret) {
    return false;
  }
  const expected = createHmac('sha256', input.keySecret)
    .update(`${input.paymentId}|${input.subscriptionId}`)
    .digest('hex');
  return digestsMatch(expected, input.signature);
}

/**
 * Verify a webhook delivery against the raw request body.
 *
 * The body must be the exact bytes received. Verifying a re-serialised JSON
 * object silently fails the moment key order or number formatting differs,
 * which is why the webhook route is mounted with a raw body parser.
 */
export function verifyWebhookSignature(input: {
  rawBody: Buffer | string;
  signature: string | undefined;
  webhookSecret: string;
}): boolean {
  if (!input.signature || !input.webhookSecret) return false;
  const expected = createHmac('sha256', input.webhookSecret)
    .update(input.rawBody)
    .digest('hex');
  return digestsMatch(expected, input.signature);
}
