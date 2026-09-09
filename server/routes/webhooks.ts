import { createHash } from 'node:crypto';
import express, { Router } from 'express';
import { env } from '../env.js';
import { verifyWebhookSignature } from '../razorpay-signature.js';
import { claimWebhookEvent, finishWebhookEvent, releaseWebhookEvent } from '../store.js';
import { applyWebhook, type RazorpayWebhookPayload } from '../subscription-service.js';

/* ============================================================================
   Webhooks
   ----------------------------------------------------------------------------
   The source of truth for subscription state. Renewals, dunning, and a
   cancellation made from Razorpay's own dashboard never pass through this
   application's UI, so anything that trusts only the checkout handoff will
   drift out of date within a month.

   Three properties this endpoint has to hold:

     1. Verified. The HMAC is computed over the exact bytes received, which is
        why this router is mounted with a raw body parser ahead of the JSON one.
     2. Idempotent. The event id is inserted as a primary key before any state
        is touched; a replay loses the race and is skipped. Razorpay retries on
        any non-2xx, so at-least-once delivery is the normal case, not an edge.
     3. Quiet. A verified event this integration has no handler for is a 200,
        not an error to be retried for a day.
   ========================================================================== */

export const webhookRouter = Router();

// The raw parser matches every content type on purpose: a misconfigured
// content type must not cause Express to hand the verifier a re-serialised
// body, because the signature would then fail for a reason invisible in logs.
webhookRouter.post(
  '/razorpay',
  express.raw({ type: () => true, limit: '1mb' }),
  (req, res) => {
    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = req.header('x-razorpay-signature');

    if (!env.razorpay.webhookConfigured) {
      // Refuse rather than accept unverifiable events: a webhook endpoint that
      // processes anything when its secret is missing is a way to grant plans
      // for free to whoever finds the URL.
      console.error('[webhook] WEBHOOK_SECRET is not set — rejecting delivery');
      res.status(503).json({ error: { code: 'provider_unconfigured', message: 'Not configured.' } });
      return;
    }

    const valid = verifyWebhookSignature({
      rawBody,
      signature,
      webhookSecret: env.razorpay.webhookSecret,
    });

    if (!valid) {
      console.warn('[webhook] signature verification failed');
      res.status(400).json({ error: { code: 'webhook_invalid', message: 'Invalid signature.' } });
      return;
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      res.status(400).json({ error: { code: 'webhook_invalid', message: 'Malformed payload.' } });
      return;
    }

    const eventType = payload.event ?? 'unknown';
    // Razorpay sends an event id; hashing the verified body is a correct
    // fallback because the signature already proves the bytes are authentic.
    const eventId =
      req.header('x-razorpay-event-id') ??
      `sha256:${createHash('sha256').update(rawBody).digest('hex')}`;

    if (!claimWebhookEvent(eventId, eventType)) {
      console.info(`[webhook] duplicate ${eventType} ${eventId} — skipped`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    try {
      const outcome = applyWebhook(payload);
      finishWebhookEvent(eventId, 'processed', outcome);
      console.info(`[webhook] ${eventType} → ${outcome}`);
      res.status(200).json({ received: true });
    } catch (err) {
      // Release the claim, or the retry Razorpay is about to send would be
      // rejected as a duplicate and the event would never be applied at all.
      releaseWebhookEvent(eventId);
      console.error(`[webhook] ${eventType} failed — claim released for retry`, err);
      res.status(500).json({ error: { code: 'internal', message: 'Processing failed.' } });
    }
  },
);
