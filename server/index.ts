import { createApp } from './app.js';
import { env } from './env.js';

/* ============================================================================
   Entry point
   ----------------------------------------------------------------------------
   Says out loud whether payments are actually configured. A billing server
   that starts silently with no keys is a server that fails at the one moment
   somebody is trying to give you money.
   ========================================================================== */

const app = createApp();

app.listen(env.port, () => {
  console.info(`[pulse-api] listening on http://localhost:${env.port}`);

  if (!env.razorpay.configured) {
    console.warn(
      '[pulse-api] PAYMENT_KEY_ID / PAYMENT_KEY_SECRET are not set — checkout will return ' +
        '"payments unavailable". Copy .env.example to .env and add your Razorpay test keys.',
    );
  } else {
    console.info(`[pulse-api] Razorpay ${env.razorpay.mode} mode`);
    const missing = ['individual', 'family'].filter((p) => !env.razorpay.planIds[p as 'individual']);
    if (missing.length > 0) {
      console.warn(
        `[pulse-api] no Razorpay plan id for: ${missing.join(', ')} — run \`npm run razorpay:setup\``,
      );
    }
  }

  if (!env.razorpay.webhookConfigured) {
    console.warn('[pulse-api] WEBHOOK_SECRET is not set — webhook deliveries will be rejected.');
  }
});
