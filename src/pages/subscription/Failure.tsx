import { AlertTriangle, ArrowLeft, RotateCcw, Siren } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { isPlanId, planById } from '@shared/plans';
import { Wordmark } from '@/components/system/Wordmark';
import { Card, FieldLabel } from '@/components/ui';

/* ============================================================================
   Payment failure
   ----------------------------------------------------------------------------
   The one thing this page must get right is the sentence about money. A
   customer who cannot tell whether they have been charged will call their
   bank, so the copy states both possibilities plainly instead of choosing the
   reassuring one.

   No technical detail is shown. The reason rendered here is whatever the
   server judged safe to say; signature mismatches and provider error codes
   stay in the server log where they belong.
   ========================================================================== */

interface FailureState {
  planId?: string;
  reason?: string;
}

export default function SubscriptionFailure() {
  const location = useLocation();
  const state = (location.state ?? {}) as FailureState;
  const plan = isPlanId(state.planId) ? planById(state.planId) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/90">
        <div className="mx-auto flex max-w-[640px] items-center px-5 py-3.5 sm:px-8">
          <Link to="/pricing" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <Wordmark className="h-[17px]" />
          </Link>
        </div>
      </header>

      <main className="grid-paper flex-1">
        <div className="mx-auto max-w-[640px] px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-7 text-critical-500" />
            <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
              Payment could not be completed
            </h1>
          </div>

          <p className="mt-3.5 text-[14.5px] leading-relaxed text-ink-600">
            Your payment could not be completed. You have not been charged, or your payment is still
            being processed. No plan has been activated.
          </p>

          {state.reason && (
            <Card accent="critical" className="mt-6">
              <FieldLabel>What we were told</FieldLabel>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-700">{state.reason}</p>
            </Card>
          )}

          <Card className="mt-4">
            <FieldLabel>If money did leave your account</FieldLabel>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
              A payment that was taken but not confirmed is reversed by the bank automatically,
              usually within five to seven working days. Your payment history will show it either
              way — we do not delete failed attempts.
            </p>
          </Card>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={plan ? `/subscribe/${plan.id}` : '/pricing'}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-ink-900 px-5 text-[14px] font-medium text-white transition-colors hover:bg-ink-800"
            >
              <RotateCcw className="size-4" />
              {plan ? `Try ${plan.name} again` : 'Back to plans'}
            </Link>
            <Link
              to="/app/billing"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-line-strong bg-white px-5 text-[14px] font-medium text-ink-800 transition-colors hover:bg-canvas-sunk"
            >
              Plan &amp; billing
            </Link>
          </div>

          <Card accent="critical" className="mt-8">
            <div className="flex items-start gap-3">
              <Siren className="mt-0.5 size-4 shrink-0 text-critical-500" />
              <div>
                <h2 className="text-[13.5px] font-semibold text-ink-900">
                  Your emergency profile is unaffected
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                  Allergies, blood group, active medications and emergency contacts remain available
                  to clinicians under break-glass on every plan, including Freemium. A failed
                  payment never closes that path.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
