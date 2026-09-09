import {
  ArrowLeft,
  CreditCard,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { comparePlans, formatInr, isPlanId, planById } from '@shared/plans';
import { Wordmark } from '@/components/system/Wordmark';
import { Badge, Card, FieldLabel, Rule } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { useVita } from '@/hooks/useVita';
import { ApiError } from '@/lib/api';
import { openRazorpayCheckout } from '@/lib/razorpayCheckout';

/* ============================================================================
   Checkout
   ----------------------------------------------------------------------------
   The order summary, and the one button that opens the provider's hosted
   checkout. No card fields exist on this page or anywhere else in this
   codebase — Razorpay collects them inside its own iframe, which is why this
   application never handles a PAN, a CVV or a UPI PIN.

   The amount shown here is read from the shared catalogue, and the amount
   charged is read by the server from the same catalogue. This page cannot
   influence the price: it sends a plan id and nothing else.
   ========================================================================== */

type Phase = 'ready' | 'opening' | 'verifying' | 'dismissed';

export default function Checkout() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user, signInAs } = useVita();
  const {
    subscription,
    plan: currentPlan,
    paymentsStatus,
    providerMode,
    startCheckout,
    verifyPayment,
    refresh,
  } = useSubscription();

  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  if (!isPlanId(planId) || planId === 'freemium') {
    return <Navigate to="/pricing" replace />;
  }

  const plan = planById(planId);
  const alreadyOnPlan = subscription?.status === 'active' && currentPlan === planId;
  const direction = subscription ? comparePlans(currentPlan, planId) : 'upgrade';

  const signIn = async () => {
    setSigningIn(true);
    try {
      await signInAs('patient');
      await refresh();
    } finally {
      setSigningIn(false);
    }
  };

  const pay = useCallback(async () => {
    setError(null);
    setPhase('opening');

    // Tracked locally rather than read back from `phase`: state set inside this
    // closure is not visible to it, so the catch below would always see 'ready'
    // and route a verification failure to the wrong place.
    let money: 'not-taken' | 'taken' = 'not-taken';

    try {
      const session = await startCheckout(planId);
      const outcome = await openRazorpayCheckout(session);

      if (outcome.kind === 'dismissed') {
        setPhase('dismissed');
        return;
      }

      if (outcome.kind === 'failed') {
        navigate('/subscribe/failed', {
          replace: true,
          state: { planId, reason: outcome.description },
        });
        return;
      }

      // Paid at the provider. Still not entitled — the server has to agree.
      money = 'taken';
      setPhase('verifying');
      await verifyPayment(outcome.handoff);
      navigate(`/subscribe/success?plan=${planId}`, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'We could not open the payment window. You have not been charged.';

      // Once the provider has taken the payment, a failure is materially
      // different from never having started, and needs the page that explains
      // an unverified charge rather than an inline "try again".
      if (money === 'taken') {
        navigate('/subscribe/failed', { replace: true, state: { planId, reason: message } });
        return;
      }

      setError(message);
      setPhase('ready');
    }
  }, [navigate, planId, startCheckout, verifyPayment]);

  const busy = phase === 'opening' || phase === 'verifying';

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/pricing" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <Wordmark className="h-[17px]" />
          </Link>
          <Badge tone="neutral">
            <Lock className="size-2.5" />
            Secure checkout
          </Badge>
        </div>
      </header>

      <main className="grid-paper flex-1">
        <div className="mx-auto max-w-[760px] px-5 py-10 sm:px-8 sm:py-14">
          <div className="label-xs text-ink-400">Checkout</div>
          <h1 className="mt-3 text-[27px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
            {direction === 'downgrade' ? `Switch to ${plan.name}` : `${plan.name} plan`}
          </h1>

          <Card className="mt-7">
            <FieldLabel>Order summary</FieldLabel>

            <div className="mt-3.5 flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink-900">PULSE {plan.name}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">{plan.tagline}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[24px] font-semibold leading-none tnum text-ink-900">
                  {formatInr(plan.priceInPaise)}
                </div>
                <div className="mt-1 font-mono text-[11px] text-ink-400">per month</div>
              </div>
            </div>

            <Rule className="my-4" />

            <dl className="space-y-2.5">
              <Row label="Billing" value="Monthly, recurring until cancelled" />
              <Row label="Currency" value="INR (₹)" />
              <Row label="Members covered" value={plan.seats === 1 ? '1' : `Up to ${plan.seats}`} />
              {subscription?.status === 'active' && direction !== 'same' && (
                <Row
                  label="Replaces"
                  value={`${planById(currentPlan).name} — cancelled automatically once this is paid`}
                />
              )}
            </dl>
          </Card>

          {/* --- Gates, in the order they actually block ------------------- */}

          {!user ? (
            <Card accent="accent" className="mt-4">
              <div className="flex items-start gap-3.5">
                <UserRound className="mt-0.5 size-4 shrink-0 text-accent-600" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-semibold text-ink-900">Sign in to continue</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    A subscription belongs to an account, so the server needs to know who is paying
                    before it will create a payment.
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={signIn}
                      disabled={signingIn}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-ink-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
                    >
                      {signingIn && <Loader2 className="size-3.5 animate-spin" />}
                      Continue as Kavita Menon
                    </button>
                    <Link to="/login" className="text-[12.5px] font-medium text-accent-600 hover:underline">
                      Choose a different account
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ) : alreadyOnPlan ? (
            <Card accent="verified" className="mt-4">
              <div className="flex items-start gap-3.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-verified-500" />
                <div>
                  <h2 className="text-[14px] font-semibold text-ink-900">
                    You are already on {plan.name}
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    Nothing to pay. Your plan renews on its own.
                  </p>
                  <Link
                    to="/app/billing"
                    className="mt-3 inline-flex text-[13px] font-medium text-accent-600 hover:underline"
                  >
                    Manage your plan
                  </Link>
                </div>
              </div>
            </Card>
          ) : paymentsStatus === 'unavailable' ? (
            <Card accent="caution" className="mt-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-4 shrink-0 text-caution-600" />
                <div>
                  <h2 className="text-[14px] font-semibold text-ink-900">
                    Payments are unavailable
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-600">
                    The billing service is not reachable, so checkout is disabled rather than opened
                    and then failed. You have not been charged.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {phase === 'dismissed' && (
                <Card accent="caution" className="mt-4">
                  <h2 className="text-[14px] font-semibold text-ink-900">
                    You closed the payment window
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    Nothing was charged and no plan was started. You can pick up where you left off.
                  </p>
                </Card>
              )}

              {error && (
                <Card accent="critical" className="mt-4">
                  <h2 className="text-[14px] font-semibold text-ink-900">Payment not started</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{error}</p>
                </Card>
              )}

              <button
                type="button"
                onClick={pay}
                disabled={busy}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md bg-ink-900 text-[15px] font-medium text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                {phase === 'verifying'
                  ? 'Verifying your payment…'
                  : phase === 'opening'
                    ? 'Opening checkout…'
                    : phase === 'dismissed'
                      ? `Try again — pay ${formatInr(plan.priceInPaise)}`
                      : `Pay ${formatInr(plan.priceInPaise)}`}
              </button>

              {providerMode === 'test' && (
                <p className="mt-2.5 text-center font-mono text-[11px] text-caution-600">
                  Razorpay test mode · no real money moves
                </p>
              )}
            </>
          )}

          <div className="mt-8 space-y-2.5">
            <Assurance
              icon={<Lock className="size-3.5" />}
              text="Card, UPI and bank details are entered inside Razorpay's checkout and never reach this application. Nothing about your payment instrument is stored here."
            />
            <Assurance
              icon={<ShieldCheck className="size-3.5" />}
              text="Your plan is activated only after the server re-checks the payment signature with Razorpay and confirms the amount against its own price list."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className="text-[12.5px] font-medium text-ink-800">{value}</dd>
    </div>
  );
}

function Assurance({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-white px-4 py-3">
      <span className="mt-0.5 shrink-0 text-verified-500">{icon}</span>
      <p className="text-[12px] leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}
