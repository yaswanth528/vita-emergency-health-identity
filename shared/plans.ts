/* ============================================================================
   PULSE — plan catalogue
   ----------------------------------------------------------------------------
   The single source of truth for what a plan costs and what it unlocks.
   Imported by BOTH the browser bundle and the API server, so a price can never
   drift between the card the user reads and the amount the server validates.

   Money is held in paise as an integer. Rupees as a float would eventually
   produce a 198.99999 and a payment that fails signature-independent amount
   checks for no visible reason.

   This module must stay dependency-free and side-effect-free — it is imported
   into the client bundle. Razorpay's own plan ids are deployment-specific, so
   they are named here and resolved from the environment by the server only.
   ========================================================================== */

export type PlanId = 'freemium' | 'individual' | 'family';

export const PLAN_IDS: readonly PlanId[] = ['freemium', 'individual', 'family'];

/**
 * A capability the application checks before showing or doing something.
 *
 * The emergency capabilities are listed here and granted to every plan,
 * including the free one. That is a deliberate product constraint rather than
 * an oversight: the entire argument for this product is that an unconscious
 * patient's allergy list reaches the clinician treating them. Putting that
 * behind a card form would make the product indefensible, so the paid tiers
 * sell depth — extraction, longitudinal history, delegation — and never
 * emergency reachability.
 */
export type Feature =
  | 'emergency-profile'
  | 'emergency-activation'
  | 'health-profile'
  | 'document-storage'
  | 'ai-extraction'
  | 'longitudinal-timeline'
  | 'health-graph'
  | 'caregiver-access'
  | 'audit-export'
  | 'family-profiles';

/** Display order on the pricing cards. */
export const FEATURE_ORDER: readonly Feature[] = [
  'emergency-profile',
  'emergency-activation',
  'health-profile',
  'document-storage',
  'ai-extraction',
  'longitudinal-timeline',
  'health-graph',
  'caregiver-access',
  'audit-export',
  'family-profiles',
];

export const FEATURE_LABELS: Record<Feature, string> = {
  'emergency-profile': 'Emergency health profile',
  'emergency-activation': 'Emergency activation and break-glass alerts',
  'health-profile': 'Health profile, medications and conditions',
  'document-storage': 'Document library',
  'ai-extraction': 'AI extraction with provenance on every value',
  'longitudinal-timeline': 'Longitudinal timeline across sources',
  'health-graph': 'Reconciled health graph and conflict detection',
  'caregiver-access': 'Caregiver delegation',
  'audit-export': 'Consent and audit trail export',
  'family-profiles': 'Multiple family member profiles',
};

export interface Plan {
  id: PlanId;
  name: string;
  /** Integer paise. ₹199 is 19900. */
  priceInPaise: number;
  currency: 'INR';
  billingInterval: 'monthly';
  /** One line under the price. */
  tagline: string;
  /** Button label, as specified by the business model. */
  cta: string;
  /** Individual is the recommended plan and is highlighted. */
  recommended: boolean;
  /** How many people one subscription covers. */
  seats: number;
  /** Cap on newly uploaded documents. `null` is unlimited. */
  documentLimit: number | null;
  /** Higher rank is a richer plan — used to tell an upgrade from a downgrade. */
  rank: number;
  features: readonly Feature[];
  /**
   * Environment variable holding this plan's Razorpay plan id. Razorpay plans
   * are created per account, so the id belongs to the deployment, not here.
   */
  razorpayPlanEnvKey: string | null;
}

const FREE_FEATURES: readonly Feature[] = [
  'emergency-profile',
  'emergency-activation',
  'health-profile',
  'document-storage',
];

const INDIVIDUAL_FEATURES: readonly Feature[] = [
  ...FREE_FEATURES,
  'ai-extraction',
  'longitudinal-timeline',
  'health-graph',
  'caregiver-access',
  'audit-export',
];

const FAMILY_FEATURES: readonly Feature[] = [...INDIVIDUAL_FEATURES, 'family-profiles'];

export const PLANS: Record<PlanId, Plan> = {
  freemium: {
    id: 'freemium',
    name: 'Freemium',
    priceInPaise: 0,
    currency: 'INR',
    billingInterval: 'monthly',
    tagline: 'Free forever. Your emergency profile is never paywalled.',
    cta: 'Get Started',
    recommended: false,
    seats: 1,
    documentLimit: 5,
    rank: 0,
    features: FREE_FEATURES,
    razorpayPlanEnvKey: null,
  },
  individual: {
    id: 'individual',
    name: 'Individual',
    priceInPaise: 19_900,
    currency: 'INR',
    billingInterval: 'monthly',
    tagline: 'One person, the whole record reconciled and sourced.',
    cta: 'Choose Individual',
    recommended: true,
    seats: 1,
    documentLimit: null,
    rank: 1,
    features: INDIVIDUAL_FEATURES,
    razorpayPlanEnvKey: 'RAZORPAY_PLAN_INDIVIDUAL',
  },
  family: {
    id: 'family',
    name: 'Family',
    priceInPaise: 39_900,
    currency: 'INR',
    billingInterval: 'monthly',
    tagline: 'Up to five members, each with their own consent controls.',
    cta: 'Choose Family',
    recommended: false,
    seats: 5,
    documentLimit: null,
    rank: 2,
    features: FAMILY_FEATURES,
    razorpayPlanEnvKey: 'RAZORPAY_PLAN_FAMILY',
  },
};

/** Every plan in display order. */
export const PLAN_LIST: readonly Plan[] = PLAN_IDS.map((id) => PLANS[id]);

export const DEFAULT_PLAN_ID: PlanId = 'freemium';

/* --- Guards and lookups ------------------------------------------------------ */

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

/** Throws on an unknown id — callers validating client input should use `isPlanId` first. */
export function planById(id: PlanId): Plan {
  return PLANS[id];
}

export function isPaidPlan(id: PlanId): boolean {
  return PLANS[id].priceInPaise > 0;
}

export function planIncludes(id: PlanId, feature: Feature): boolean {
  return PLANS[id].features.includes(feature);
}

/**
 * How one plan relates to another. Used to decide whether a plan change needs
 * a new subscription and whether to describe it as an upgrade.
 */
export function comparePlans(from: PlanId, to: PlanId): 'same' | 'upgrade' | 'downgrade' {
  const a = PLANS[from].rank;
  const b = PLANS[to].rank;
  if (a === b) return 'same';
  return b > a ? 'upgrade' : 'downgrade';
}

/* --- Formatting -------------------------------------------------------------- */

/**
 * "₹199" / "₹0" / "₹199.50".
 *
 * Paise are only shown when they are non-zero, because every price in this
 * catalogue is a whole rupee and "₹199.00" reads like a rounding artefact.
 */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "₹199/month" — the price as the pricing card says it. */
export function formatPlanPrice(plan: Plan): string {
  return `${formatInr(plan.priceInPaise)}/month`;
}

/**
 * The checklist a pricing card renders: every feature, with whether it is in.
 *
 * Two rows are quantified from the plan rather than taken from the label map.
 * They are only quantified when the plan actually has the capability — an
 * excluded row saying "up to 1 family member profiles" describes a limit that
 * does not exist, and reads as a bug rather than an exclusion.
 */
export function planFeatureRows(id: PlanId): { feature: Feature; label: string; included: boolean }[] {
  const plan = PLANS[id];

  return FEATURE_ORDER.map((feature) => {
    const included = plan.features.includes(feature);

    let label = FEATURE_LABELS[feature];
    if (feature === 'document-storage' && included) {
      label =
        plan.documentLimit === null
          ? 'Unlimited document uploads'
          : `Up to ${plan.documentLimit} document uploads`;
    } else if (feature === 'family-profiles' && included) {
      label = `Up to ${plan.seats} family member profiles`;
    }

    return { feature, label, included };
  });
}
