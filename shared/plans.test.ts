import { describe, expect, it } from 'vitest';
import {
  PLANS,
  PLAN_IDS,
  PLAN_LIST,
  comparePlans,
  formatInr,
  formatPlanPrice,
  isPaidPlan,
  isPlanId,
  planFeatureRows,
  planIncludes,
} from './plans.js';

/* ============================================================================
   Plan catalogue
   ----------------------------------------------------------------------------
   These assertions pin the business model down. If a price moves, this file is
   where it has to be changed on purpose rather than by accident — which is the
   whole reason the amounts live in one module.
   ========================================================================== */

describe('prices', () => {
  it('matches the specified business model exactly', () => {
    expect(PLANS.freemium.priceInPaise).toBe(0);
    expect(PLANS.individual.priceInPaise).toBe(19_900);
    expect(PLANS.family.priceInPaise).toBe(39_900);
  });

  it('renders whole rupees without a decimal tail', () => {
    expect(formatInr(0)).toBe('₹0');
    expect(formatInr(19_900)).toBe('₹199');
    expect(formatInr(39_900)).toBe('₹399');
  });

  it('shows paise only when they are non-zero', () => {
    expect(formatInr(19_950)).toBe('₹199.50');
  });

  it('labels the price the way the pricing card reads it', () => {
    expect(formatPlanPrice(PLANS.individual)).toBe('₹199/month');
    expect(formatPlanPrice(PLANS.family)).toBe('₹399/month');
  });

  it('holds every amount as an integer number of paise', () => {
    for (const plan of PLAN_LIST) {
      expect(Number.isInteger(plan.priceInPaise)).toBe(true);
    }
  });

  it('bills every plan monthly in INR', () => {
    for (const plan of PLAN_LIST) {
      expect(plan.currency).toBe('INR');
      expect(plan.billingInterval).toBe('monthly');
    }
  });
});

describe('plan id validation', () => {
  it('accepts only the three known ids', () => {
    expect(PLAN_IDS).toEqual(['freemium', 'individual', 'family']);
    for (const id of PLAN_IDS) expect(isPlanId(id)).toBe(true);
  });

  it.each([
    'FREEMIUM',
    'premium',
    'individual ',
    '',
    'freemium; DROP TABLE subscriptions',
    null,
    undefined,
    42,
    { id: 'individual' },
    ['individual'],
  ])('rejects %p', (value) => {
    expect(isPlanId(value)).toBe(false);
  });
});

describe('paid vs free', () => {
  it('treats only the two priced plans as paid', () => {
    expect(isPaidPlan('freemium')).toBe(false);
    expect(isPaidPlan('individual')).toBe(true);
    expect(isPaidPlan('family')).toBe(true);
  });
});

describe('entitlements per plan', () => {
  it('keeps the emergency path on every plan, including free', () => {
    for (const id of PLAN_IDS) {
      expect(planIncludes(id, 'emergency-profile')).toBe(true);
      expect(planIncludes(id, 'emergency-activation')).toBe(true);
    }
  });

  it('locks the depth features out of freemium', () => {
    expect(planIncludes('freemium', 'ai-extraction')).toBe(false);
    expect(planIncludes('freemium', 'longitudinal-timeline')).toBe(false);
    expect(planIncludes('freemium', 'health-graph')).toBe(false);
    expect(planIncludes('freemium', 'caregiver-access')).toBe(false);
    expect(planIncludes('freemium', 'audit-export')).toBe(false);
  });

  it('gives Individual everything except family profiles', () => {
    expect(planIncludes('individual', 'ai-extraction')).toBe(true);
    expect(planIncludes('individual', 'longitudinal-timeline')).toBe(true);
    expect(planIncludes('individual', 'audit-export')).toBe(true);
    expect(planIncludes('individual', 'family-profiles')).toBe(false);
  });

  it('makes Family a superset of Individual', () => {
    for (const feature of PLANS.individual.features) {
      expect(PLANS.family.features).toContain(feature);
    }
    expect(planIncludes('family', 'family-profiles')).toBe(true);
  });

  it('caps free uploads and leaves paid plans uncapped', () => {
    expect(PLANS.freemium.documentLimit).toBe(5);
    expect(PLANS.individual.documentLimit).toBeNull();
    expect(PLANS.family.documentLimit).toBeNull();
  });

  it('covers one member on Individual and five on Family', () => {
    expect(PLANS.individual.seats).toBe(1);
    expect(PLANS.family.seats).toBe(5);
  });
});

describe('upgrade and downgrade direction', () => {
  it('reads a richer plan as an upgrade', () => {
    expect(comparePlans('freemium', 'individual')).toBe('upgrade');
    expect(comparePlans('freemium', 'family')).toBe('upgrade');
    expect(comparePlans('individual', 'family')).toBe('upgrade');
  });

  it('reads a cheaper plan as a downgrade', () => {
    expect(comparePlans('family', 'individual')).toBe('downgrade');
    expect(comparePlans('individual', 'freemium')).toBe('downgrade');
  });

  it('reads the same plan as neither', () => {
    for (const id of PLAN_IDS) expect(comparePlans(id, id)).toBe('same');
  });
});

describe('pricing card rows', () => {
  it('lists every feature with an explicit included flag', () => {
    const rows = planFeatureRows('freemium');
    expect(rows.length).toBeGreaterThan(0);
    // Excluded features are present and marked, not omitted.
    expect(rows.some((r) => !r.included)).toBe(true);
    expect(rows.every((r) => typeof r.label === 'string' && r.label.length > 0)).toBe(true);
  });

  it('states the upload cap in words on the card', () => {
    expect(planFeatureRows('freemium').find((r) => r.feature === 'document-storage')?.label).toBe(
      'Up to 5 document uploads',
    );
    expect(planFeatureRows('individual').find((r) => r.feature === 'document-storage')?.label).toBe(
      'Unlimited document uploads',
    );
  });

  it('quantifies family profiles only on the plan that has them', () => {
    expect(planFeatureRows('family').find((r) => r.feature === 'family-profiles')?.label).toBe(
      'Up to 5 family member profiles',
    );
    // Individual covers one person, so an "up to 1 profiles" exclusion would be
    // describing a limit that does not exist.
    expect(planFeatureRows('individual').find((r) => r.feature === 'family-profiles')?.label).toBe(
      'Multiple family member profiles',
    );
    expect(planFeatureRows('freemium').find((r) => r.feature === 'family-profiles')?.label).toBe(
      'Multiple family member profiles',
    );
  });

  it('marks Individual as the recommended plan, and only Individual', () => {
    expect(PLAN_LIST.filter((p) => p.recommended).map((p) => p.id)).toEqual(['individual']);
  });

  it('uses the call-to-action labels the business model specifies', () => {
    expect(PLANS.freemium.cta).toBe('Get Started');
    expect(PLANS.individual.cta).toBe('Choose Individual');
    expect(PLANS.family.cta).toBe('Choose Family');
  });
});
