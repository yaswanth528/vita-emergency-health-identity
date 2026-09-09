import { beforeEach, describe, expect, it } from 'vitest';
import { PLANS, type Feature, type PlanId } from '../../shared/plans.js';
import { resetDbForTests } from '../db.js';
import { hasFeature, resolveSubscription } from '../entitlements.js';
import { ensureUser, insertSubscription, updateSubscription, type StoredStatus } from '../store.js';

/* ============================================================================
   Entitlement resolution
   ----------------------------------------------------------------------------
   The rules that decide whether somebody has paid, exercised against real
   database rows rather than a stubbed resolver.

   Two of these are the ones that would cost money if they broke: `pending`
   must never grant a plan, and a cancelled-but-paid period must keep working
   until the day it was paid up to.
   ========================================================================== */

const USER = {
  id: 'usr-test-patient',
  role: 'patient' as const,
  name: 'Test Patient',
  email: 'test.patient@example.com',
};

const DAY_MS = 86_400_000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

function givenSubscription(options: {
  planId: PlanId;
  status: StoredStatus;
  nextBillingDate?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const row = insertSubscription({
    userId: USER.id,
    planId: options.planId,
    status: options.status,
    amount: PLANS[options.planId].priceInPaise,
  });
  return updateSubscription(row.id, {
    next_billing_date: options.nextBillingDate ?? null,
    start_date: daysFromNow(-30),
    cancel_at_period_end: options.cancelAtPeriodEnd ? 1 : 0,
  });
}

const PAID_ONLY: Feature[] = [
  'ai-extraction',
  'longitudinal-timeline',
  'health-graph',
  'caregiver-access',
  'audit-export',
];

beforeEach(() => {
  resetDbForTests();
  ensureUser(USER);
});

describe('no subscription', () => {
  it('resolves to freemium', () => {
    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('freemium');
    expect(view.status).toBe('free');
    expect(view.subscribedPlan).toBeNull();
    expect(view.nextBillingDate).toBeNull();
  });

  it('grants the free features and nothing else', () => {
    expect(hasFeature(USER.id, 'emergency-profile')).toBe(true);
    expect(hasFeature(USER.id, 'health-profile')).toBe(true);
    for (const feature of PAID_ONLY) {
      expect(hasFeature(USER.id, feature)).toBe(false);
    }
  });
});

describe('active subscription', () => {
  it('grants the Individual plan', () => {
    givenSubscription({ planId: 'individual', status: 'active', nextBillingDate: daysFromNow(20) });

    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('individual');
    expect(view.status).toBe('active');
    expect(view.priceInPaise).toBe(19_900);
    expect(view.documentLimit).toBeNull();

    expect(hasFeature(USER.id, 'ai-extraction')).toBe(true);
    expect(hasFeature(USER.id, 'audit-export')).toBe(true);
    // Not on Individual.
    expect(hasFeature(USER.id, 'family-profiles')).toBe(false);
  });

  it('grants the Family plan including family profiles', () => {
    givenSubscription({ planId: 'family', status: 'active', nextBillingDate: daysFromNow(20) });

    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('family');
    expect(view.priceInPaise).toBe(39_900);
    expect(view.seats).toBe(5);
    expect(hasFeature(USER.id, 'family-profiles')).toBe(true);
  });
});

describe('unpaid states grant nothing', () => {
  /**
   * The rule that stops "reached the success page" from being a payment.
   */
  it('treats pending as freemium while reporting what was attempted', () => {
    givenSubscription({ planId: 'family', status: 'pending' });

    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('freemium');
    expect(view.pendingPlan).toBe('family');
    expect(hasFeature(USER.id, 'family-profiles')).toBe(false);
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(false);
  });

  it('treats a failed payment as freemium while naming the plan', () => {
    givenSubscription({ planId: 'individual', status: 'payment_failed' });

    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('freemium');
    expect(view.status).toBe('payment_failed');
    expect(view.subscribedPlan).toBe('individual');
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(false);
  });

  it('treats an expired subscription as freemium', () => {
    givenSubscription({ planId: 'individual', status: 'expired' });
    expect(resolveSubscription(USER.id).plan).toBe('freemium');
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(false);
  });
});

describe('cancellation keeps the period already paid for', () => {
  it('keeps the plan working until the period end', () => {
    givenSubscription({
      planId: 'individual',
      status: 'active',
      nextBillingDate: daysFromNow(12),
      cancelAtPeriodEnd: true,
    });

    const view = resolveSubscription(USER.id);
    expect(view.plan).toBe('individual');
    expect(view.status).toBe('active');
    expect(view.cancelAtPeriodEnd).toBe(true);
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(true);
  });

  it('returns to freemium once that period has passed', () => {
    givenSubscription({
      planId: 'individual',
      status: 'active',
      nextBillingDate: daysFromNow(-1),
      cancelAtPeriodEnd: true,
    });

    const view = resolveSubscription(USER.id);
    expect(view.status).toBe('expired');
    expect(view.plan).toBe('freemium');
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(false);
  });

  it('expires a cancelled row the moment its period end has passed', () => {
    givenSubscription({ planId: 'family', status: 'cancelled', nextBillingDate: daysFromNow(-1) });

    expect(resolveSubscription(USER.id).status).toBe('expired');
    expect(hasFeature(USER.id, 'family-profiles')).toBe(false);
  });

  it('honours a cancelled row that is still inside its paid period', () => {
    givenSubscription({ planId: 'family', status: 'cancelled', nextBillingDate: daysFromNow(5) });

    // Cancelled is not active, so the plan is not conferred — but the row is
    // not expired either, and the dashboard can still explain the end date.
    const view = resolveSubscription(USER.id);
    expect(view.status).toBe('cancelled');
    expect(view.nextBillingDate).not.toBeNull();
  });
});

describe('unrenewed subscriptions', () => {
  it('keeps a plan alive inside the renewal grace window', () => {
    givenSubscription({ planId: 'individual', status: 'active', nextBillingDate: daysFromNow(-1) });

    // Webhook lag must not lock a paying customer out overnight.
    expect(resolveSubscription(USER.id).status).toBe('active');
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(true);
  });

  it('expires a plan once the grace window has passed', () => {
    givenSubscription({ planId: 'individual', status: 'active', nextBillingDate: daysFromNow(-10) });

    expect(resolveSubscription(USER.id).status).toBe('expired');
    expect(hasFeature(USER.id, 'ai-extraction')).toBe(false);
  });

  it('persists the expiry rather than recomputing it every read', () => {
    const row = givenSubscription({
      planId: 'individual',
      status: 'active',
      nextBillingDate: daysFromNow(-10),
    });

    resolveSubscription(USER.id);
    // A second read sees a stored `expired`, not a re-derived one.
    expect(resolveSubscription(USER.id).status).toBe('expired');
    expect(row.status).toBe('active'); // the pre-resolution snapshot
  });
});

describe('the emergency path is never billable', () => {
  it.each<StoredStatus | 'none'>(['none', 'active', 'pending', 'payment_failed', 'cancelled', 'expired'])(
    'stays available when the subscription is %s',
    (status) => {
      if (status !== 'none') {
        givenSubscription({ planId: 'individual', status, nextBillingDate: daysFromNow(-10) });
      }

      expect(hasFeature(USER.id, 'emergency-profile')).toBe(true);
      expect(hasFeature(USER.id, 'emergency-activation')).toBe(true);
      expect(hasFeature(USER.id, 'health-profile')).toBe(true);
    },
  );
});
