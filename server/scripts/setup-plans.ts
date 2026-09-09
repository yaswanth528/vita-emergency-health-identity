import process from 'node:process';
import Razorpay from 'razorpay';
import { PLAN_LIST, formatInr } from '../../shared/plans.js';
import { env } from '../env.js';

/* ============================================================================
   One-time Razorpay plan creation
   ----------------------------------------------------------------------------
   Razorpay plans belong to a Razorpay account, so their ids cannot be checked
   into this repository. This script creates one plan per paid tier from the
   shared catalogue — so the amount on Razorpay is definitionally the amount in
   `shared/plans.ts` — and prints the environment lines to paste into `.env`.

   Run it once per environment (test, then live):
     npm run razorpay:setup
   ========================================================================== */

async function main(): Promise<void> {
  if (!env.razorpay.configured) {
    console.error(
      'PAYMENT_KEY_ID and PAYMENT_KEY_SECRET must be set. Copy .env.example to .env first.',
    );
    process.exit(1);
  }

  const rzp = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  const lines: string[] = [];

  console.info(`Creating plans in Razorpay ${env.razorpay.mode} mode…\n`);

  for (const plan of PLAN_LIST) {
    if (!plan.razorpayPlanEnvKey || plan.priceInPaise === 0) continue;

    const existing = process.env[plan.razorpayPlanEnvKey];
    if (existing) {
      console.info(`${plan.name}: already configured as ${existing} — skipping.`);
      lines.push(`${plan.razorpayPlanEnvKey}=${existing}`);
      continue;
    }

    const created = await rzp.plans.create({
      period: plan.billingInterval,
      interval: 1,
      item: {
        name: `PULSE ${plan.name}`,
        description: plan.tagline,
        amount: plan.priceInPaise,
        currency: plan.currency,
      },
      notes: { planId: plan.id, app: 'pulse' },
    });

    console.info(
      `${plan.name}: created ${created.id} at ${formatInr(plan.priceInPaise)}/month`,
    );
    lines.push(`${plan.razorpayPlanEnvKey}=${created.id}`);
  }

  console.info('\nAdd these to your .env:\n');
  console.info(lines.join('\n'));
}

main().catch((err: unknown) => {
  const e = err as { error?: { description?: string }; message?: string };
  console.error('\nPlan creation failed:', e?.error?.description ?? e?.message ?? err);
  process.exit(1);
});
