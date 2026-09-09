import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_LABELS, PLANS, type Feature } from '@shared/plans';
import { Badge, Card, FieldLabel } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';

/* ============================================================================
   Premium gate
   ----------------------------------------------------------------------------
   Hides a paid capability and says which plan carries it.

   This is presentation only, and the code should be read that way. The server
   checks the same entitlement on every request that does anything, so removing
   this component in a debugger reveals an empty panel, not a paid feature. The
   equivalent server-side guard is `requireFeature` in server/entitlements.ts.

   The locked state names the feature and the price instead of showing a
   generic upsell, because a lock that does not say what it is guarding is just
   a dead end.
   ========================================================================== */

/** The cheapest plan that includes a feature — what the upsell should offer. */
function cheapestPlanWith(feature: Feature) {
  return Object.values(PLANS)
    .filter((plan) => plan.features.includes(feature))
    .sort((a, b) => a.priceInPaise - b.priceInPaise)[0];
}

export function PremiumGate({
  feature,
  title,
  children,
}: {
  feature: Feature;
  /** Overrides the catalogue label when the surrounding page needs its own wording. */
  title?: string;
  children: ReactNode;
}) {
  const { has } = useSubscription();

  if (has(feature)) return <>{children}</>;

  const plan = cheapestPlanWith(feature);
  const label = title ?? FEATURE_LABELS[feature];

  return (
    <Card accent="caution" className="hatch-caution">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-caution-100 bg-caution-50 text-caution-600">
          <Lock className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-ink-900">{label}</h3>
            {plan && <Badge tone="caution">{plan.name} plan</Badge>}
          </div>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-600">
            This is part of a paid plan. Your emergency profile, allergies and blood group stay
            available to clinicians on every plan, including the free one — this unlocks the
            longitudinal record built on top of them.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex h-9 items-center rounded-md bg-ink-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink-800"
            >
              {plan ? `See plans from ₹${plan.priceInPaise / 100}/month` : 'See plans'}
            </Link>
            <FieldLabel>Cancel any time</FieldLabel>
          </div>
        </div>
      </div>
    </Card>
  );
}
