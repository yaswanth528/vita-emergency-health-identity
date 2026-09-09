import { ArrowLeft, Info, ShieldCheck, Siren } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PLAN_LIST, comparePlans, type PlanId } from '@shared/plans';
import { PlanCard, type PlanCardState } from '@/components/subscription/PlanCard';
import { Wordmark } from '@/components/system/Wordmark';
import { Badge, Card, FieldLabel } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { useVita } from '@/hooks/useVita';

/* ============================================================================
   Pricing
   ----------------------------------------------------------------------------
   Three plans, and one claim made prominently because it is the honest one:
   the emergency path is free on every tier. A product whose entire argument is
   that an unconscious patient's allergy list should reach the clinician cannot
   then make that the paid feature.

   What the paid tiers sell is depth — extraction, reconciliation, longitudinal
   history, delegation. The card checklists say exactly which, including what
   each plan leaves out.
   ========================================================================== */

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useVita();
  const { subscription, plan: currentPlan, paymentsStatus, providerMode } = useSubscription();

  // Only a confirmed 'unavailable' disables a plan. While the probe is still in
  // flight the buttons stay live, so the page does not flash a false warning.
  const paymentsBlocked = paymentsStatus === 'unavailable';

  const stateFor = (planId: PlanId): PlanCardState => {
    if (subscription?.pendingPlan === planId) return 'pending';
    if (!user || !subscription) return 'available';
    if (currentPlan === planId) return 'current';
    return comparePlans(currentPlan, planId) === 'upgrade' ? 'upgrade' : 'downgrade';
  };

  const select = (planId: PlanId) => {
    if (planId === 'freemium') {
      navigate(user ? '/app/dashboard' : '/login');
      return;
    }
    navigate(`/subscribe/${planId}`);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <Wordmark className="h-[17px]" />
          </Link>
          {user ? (
            <Link
              to="/app/billing"
              className="text-[13px] font-medium text-accent-600 hover:underline"
            >
              Manage your plan
            </Link>
          ) : (
            <Link to="/login" className="text-[13px] font-medium text-accent-600 hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="grid-paper flex-1">
        <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
          <div className="max-w-2xl">
            <div className="label-xs text-ink-400">Plans</div>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[38px]">
              Your emergency profile is free. Always.
            </h1>
            <p className="mt-3.5 text-[14.5px] leading-relaxed text-ink-500">
              Allergies, blood group and emergency contacts reach a clinician on every plan,
              including the free one. The paid plans are for the record built on top of that — the
              extraction, the reconciliation, and the history that makes it trustworthy.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-2.5">
            <Badge tone="critical">
              <Siren className="size-2.5" />
              Emergency access never paywalled
            </Badge>
            <Badge tone="verified">
              <ShieldCheck className="size-2.5" />
              Cancel any time · keep access to the period you paid for
            </Badge>
            {providerMode === 'test' && <Badge tone="caution">Payments in test mode</Badge>}
          </div>

          {paymentsBlocked && (
            <Card accent="caution" className="mt-6">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-4 shrink-0 text-caution-600" />
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink-900">
                    Paid plans are not available on this deployment
                  </h2>
                  <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
                    The billing service is not reachable, so checkout is disabled rather than
                    offered and then failed. Every free capability below works exactly as it does
                    normally. Running the API locally with Razorpay test keys enables the paid
                    flow — <span className="font-mono text-[11.5px]">.env.example</span> lists what
                    it needs.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="mt-8 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PLAN_LIST.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                state={stateFor(plan.id)}
                disabled={plan.priceInPaise > 0 && paymentsBlocked}
                disabledReason={
                  plan.priceInPaise > 0 && paymentsBlocked
                    ? 'Billing service unavailable'
                    : undefined
                }
                onSelect={select}
              />
            ))}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Note
              title="You are never charged without verification"
              detail="Reaching the confirmation page does not grant a plan. Access is unlocked only after the server has re-checked the payment signature and the amount against its own price list."
            />
            <Note
              title="Cancelling keeps what you paid for"
              detail="Cancel and the plan stays active until the end of the month you have already paid for. After that the account returns to Freemium on its own — nothing is deleted."
            />
            <Note
              title="Your records are not held hostage"
              detail="Documents you have already added stay readable on the free plan. The upload cap applies to new uploads, not to the record you already own."
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-7 sm:px-8">
          <p className="font-mono text-[11px] text-ink-400">
            Prototype · synthetic patient data · not for clinical use
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-500">
            <Link to="/emergency" className="hover:text-ink-900">
              Emergency Mode
            </Link>
            <Link to="/app/consent" className="hover:text-ink-900">
              Consent &amp; audit
            </Link>
            <Link to="/app/settings" className="hover:text-ink-900">
              Security
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Note({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <FieldLabel>Good to know</FieldLabel>
      <h3 className="mt-2 text-[13.5px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{detail}</p>
    </Card>
  );
}
