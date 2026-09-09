import path from 'node:path';
import process from 'node:process';
import { PLANS, type PlanId } from '../shared/plans.js';

/* ============================================================================
   Environment
   ----------------------------------------------------------------------------
   Everything secret lives here and nowhere else. Nothing in this module is
   importable from the browser bundle — `shared/` is the only code both tiers
   share, and it holds no credentials.

   Missing configuration fails loudly in production and degrades to a clearly
   labelled unconfigured state in development, so a developer who has not yet
   pasted their test keys gets an explanatory error from the checkout endpoint
   rather than a signature mismatch three steps later.
   ========================================================================== */

/** `.env` at the repository root. Absent in CI and in tests, which is fine. */
function loadDotEnv(): void {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {
    // No .env file. Real environment variables still apply.
  }
}

loadDotEnv();

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isTest = nodeEnv === 'test' || process.env.VITEST === 'true';
const isProduction = nodeEnv === 'production';

function required(name: string, fallbackForNonProduction: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (isProduction) {
    throw new Error(
      `${name} is not set. Refusing to start in production without it — payment verification depends on it.`,
    );
  }
  return fallbackForNonProduction;
}

/** Razorpay plan ids, resolved from the env keys the catalogue names. */
function razorpayPlanIds(): Partial<Record<PlanId, string>> {
  const out: Partial<Record<PlanId, string>> = {};
  for (const plan of Object.values(PLANS)) {
    if (!plan.razorpayPlanEnvKey) continue;
    const value = process.env[plan.razorpayPlanEnvKey];
    if (value && value.length > 0) out[plan.id] = value;
  }
  return out;
}

const keyId = process.env.PAYMENT_KEY_ID ?? '';
const keySecret = process.env.PAYMENT_KEY_SECRET ?? '';
const webhookSecret = process.env.WEBHOOK_SECRET ?? '';

export const env = {
  nodeEnv,
  isTest,
  isProduction,
  port: Number(process.env.PORT ?? 4000),

  /** Signs the session cookie. A fixed dev value keeps sessions across restarts. */
  sessionSecret: required('SESSION_SECRET', 'pulse-development-session-secret-not-for-production'),

  /** SQLite file. `:memory:` in tests so each run starts clean. */
  databaseUrl: isTest ? ':memory:' : (process.env.DATABASE_URL ?? path.resolve(process.cwd(), 'data/pulse.sqlite')),

  razorpay: {
    keyId,
    keySecret,
    webhookSecret,
    planIds: razorpayPlanIds(),
    /** Test keys are issued as `rzp_test_*`; live keys as `rzp_live_*`. */
    mode: keyId.startsWith('rzp_live_') ? ('live' as const) : ('test' as const),
    configured: keyId.length > 0 && keySecret.length > 0,
    webhookConfigured: webhookSecret.length > 0,
  },

  /**
   * Origins allowed to call the API with credentials. Empty means same-origin
   * only, which is what the Vite dev proxy and a single-origin deployment want.
   */
  allowedOrigins: (process.env.APP_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  cookie: {
    name: 'pulse_session',
    /** Cross-origin deployments need `none`; a proxied single origin wants `lax`. */
    sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
} as const;

/** Razorpay plan id for a paid plan, or undefined when unconfigured. */
export function razorpayPlanIdFor(planId: PlanId): string | undefined {
  return env.razorpay.planIds[planId];
}
