import { defineConfig } from 'vitest/config';

/* ============================================================================
   Test configuration
   ----------------------------------------------------------------------------
   The billing tier is what needs covering, so these run in Node with no DOM.

   The Razorpay credentials below are fake but structurally real, and that
   matters: the signature tests compute HMACs against `PAYMENT_KEY_SECRET` and
   `WEBHOOK_SECRET` for real rather than mocking the crypto. Only the network
   client is stubbed.

   `DATABASE_URL` is ignored — env.ts forces `:memory:` under test, so every
   file gets its own empty database and the suite cannot depend on order.
   ========================================================================== */

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      PAYMENT_KEY_ID: 'rzp_test_fakekeyid',
      PAYMENT_KEY_SECRET: 'fake_key_secret_for_tests',
      WEBHOOK_SECRET: 'fake_webhook_secret_for_tests',
      RAZORPAY_PLAN_INDIVIDUAL: 'plan_test_individual',
      RAZORPAY_PLAN_FAMILY: 'plan_test_family',
      SESSION_SECRET: 'fake_session_secret_for_tests',
    },
  },
});
