import { Router } from 'express';
import { PLAN_LIST, formatPlanPrice, planFeatureRows } from '../../shared/plans.js';

/* ============================================================================
   Plan catalogue
   ----------------------------------------------------------------------------
   The authoritative price list. The pricing page can render from the shared
   module without a round trip — it is literally the same file — but every
   amount that reaches the provider is read from here, server-side, so a
   tampered request body cannot buy Family at the Individual price.
   ========================================================================== */

export const plansRouter = Router();

plansRouter.get('/', (_req, res) => {
  res.json({
    currency: 'INR',
    billingInterval: 'monthly',
    plans: PLAN_LIST.map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceInPaise: plan.priceInPaise,
      priceLabel: formatPlanPrice(plan),
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      tagline: plan.tagline,
      cta: plan.cta,
      recommended: plan.recommended,
      seats: plan.seats,
      documentLimit: plan.documentLimit,
      features: plan.features,
      featureRows: planFeatureRows(plan.id),
    })),
  });
});
