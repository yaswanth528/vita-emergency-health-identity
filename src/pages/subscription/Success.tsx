import { ArrowRight, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatInr, isPlanId, planById } from '@shared/plans';
import { SUBSCRIPTION_STATUS_LABELS } from '@shared/subscription';
import { Wordmark } from '@/components/system/Wordmark';
import { Badge, Card, FieldLabel, Rule } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';

/* ============================================================================
   Payment confirmation
   ----------------------------------------------------------------------------
   This page does not know whether the payment worked, and does not guess.

   It re-reads the subscription from the server and renders one of three
   states. "Payment successful" appears only when the server reports `active` —
   arriving at this URL, with any query string you like, proves nothing and
   unlocks nothing. Everything shown below the tick comes from that same
   server response rather than from the parameters that got us here.
   ========================================================================== */

/** Total wait before giving up on a webhook that has not landed yet. */
const CONFIRMATION_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1500;

export default function SubscriptionSuccess() {
  const [params] = useSearchParams();
  const { subscription, refresh } = useSubscription();
  const [settling, setSettling] = useState(true);

  const requestedPlan = params.get('plan');
  const expectedPlan = isPlanId(requestedPlan) ? planById(requestedPlan) : null;

  /**
   * Poll briefly. Verification usually resolves before this page mounts, but a
   * subscription whose activation is arriving by webhook can take a moment,
   * and "awaiting confirmation" is a better answer than a premature failure.
   */
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      await refresh();
      if (cancelled) return;
      attempts += 1;
      if (attempts >= CONFIRMATION_ATTEMPTS) {
        setSettling(false);
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) void tick();
      }, RETRY_DELAY_MS);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const confirmed = subscription?.status === 'active';
  const awaiting = !confirmed && (settling || subscription?.status === 'pending');

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/90">
        <div className="mx-auto flex max-w-[640px] items-center px-5 py-3.5 sm:px-8">
          <Link to="/app/dashboard">
            <Wordmark className="h-[17px]" />
          </Link>
        </div>
      </header>

      <main className="grid-paper flex-1">
        <div className="mx-auto max-w-[640px] px-5 py-12 sm:px-8 sm:py-16">
          {confirmed && subscription ? (
            <>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-8 text-verified-500" />
                <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
                  Payment successful
                </h1>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
                Verified by our server with Razorpay. Your plan is active.
              </p>

              <Card accent="verified" className="mt-7">
                <FieldLabel>Confirmed by the server</FieldLabel>
                <dl className="mt-3.5 space-y-3">
                  <Row label="Plan" value={planById(subscription.plan).name} />
                  <Row label="Amount" value={`${formatInr(subscription.priceInPaise)}/month`} />
                  <Row
                    label="Status"
                    value={
                      <Badge tone="verified">{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</Badge>
                    }
                  />
                  {subscription.nextBillingDate && (
                    <Row
                      label="Next billing date"
                      value={new Date(subscription.nextBillingDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    />
                  )}
                </dl>

                <Rule className="my-4" />
                <p className="text-[12px] leading-relaxed text-ink-500">
                  A receipt is available under Plan &amp; billing, along with your payment history
                  and the option to change or cancel the plan at any time.
                </p>
              </Card>

              <Link
                to="/app/dashboard"
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink-900 text-[15px] font-medium text-white transition-colors hover:bg-ink-800"
              >
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/app/billing"
                className="mt-2.5 block text-center text-[13px] font-medium text-accent-600 hover:underline"
              >
                View plan &amp; billing
              </Link>
            </>
          ) : awaiting ? (
            <>
              <div className="flex items-center gap-3">
                {settling ? (
                  <Loader2 className="size-7 animate-spin text-ink-400" />
                ) : (
                  <Clock className="size-7 text-caution-500" />
                )}
                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
                  Confirming your payment
                </h1>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
                Your payment is still being processed by the bank. We do not activate a plan until
                the payment is confirmed, so nothing is unlocked yet — and nothing further will be
                charged.
              </p>

              <Card accent="caution" className="mt-7">
                <FieldLabel>What happens next</FieldLabel>
                <ul className="mt-3 space-y-2.5">
                  {[
                    'If the payment clears, your plan activates on its own — no action needed.',
                    'If it does not, you will not be charged and the account stays on Freemium.',
                    'Your payment history will show the outcome either way.',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[12.5px] text-ink-600">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-caution-500" />
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/app/billing"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-ink-900 px-5 text-[14px] font-medium text-white transition-colors hover:bg-ink-800"
                >
                  Check plan &amp; billing
                </Link>
                <Link
                  to="/app/dashboard"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-line-strong bg-white px-5 text-[14px] font-medium text-ink-800 transition-colors hover:bg-canvas-sunk"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <XCircle className="size-7 text-critical-500" />
                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
                  No active plan on this account
                </h1>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
                We could not confirm a payment for{' '}
                {expectedPlan ? `the ${expectedPlan.name} plan` : 'this plan'}. You have not been
                charged, and your account remains on Freemium — including full emergency access.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-ink-900 px-5 text-[14px] font-medium text-white transition-colors hover:bg-ink-800"
                >
                  Back to plans
                </Link>
                <Link
                  to="/app/dashboard"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-line-strong bg-white px-5 text-[14px] font-medium text-ink-800 transition-colors hover:bg-canvas-sunk"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className="text-[13px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}
