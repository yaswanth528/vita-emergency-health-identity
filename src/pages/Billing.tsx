import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Check,
  CreditCard,
  Download,
  Info,
  Loader2,
  Receipt,
  Siren,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PLAN_LIST,
  comparePlans,
  formatInr,
  isPaidPlan,
  planById,
  type PlanId,
} from '@shared/plans';
import { SUBSCRIPTION_STATUS_LABELS, type SubscriptionStatus } from '@shared/subscription';
import { Badge, Card, EmptyState, FieldLabel, SectionHeader, Stat, type Tone } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { ApiError } from '@/lib/api';

/* ============================================================================
   Plan & billing
   ----------------------------------------------------------------------------
   Everything the account owner is owed an answer to: what they are on, what it
   costs, when they are next charged, what has been charged before, and how to
   stop it.

   Every value on this page comes from `GET /api/subscription` — the same
   resolver the paywalls use — so the plan described here and the plan enforced
   elsewhere cannot disagree.
   ========================================================================== */

const STATUS_TONE: Record<SubscriptionStatus, Tone> = {
  free: 'neutral',
  active: 'verified',
  pending: 'caution',
  payment_failed: 'critical',
  cancelled: 'caution',
  expired: 'neutral',
};

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

/** Razorpay reports methods lowercase. CSS `capitalize` would render "Upi". */
const ACRONYM_METHODS = new Set(['upi', 'emi', 'nach', 'emandate']);

function formatMethod(method: string | null): string {
  if (!method) return '—';
  return ACRONYM_METHODS.has(method.toLowerCase())
    ? method.toUpperCase()
    : method.charAt(0).toUpperCase() + method.slice(1);
}

export default function Billing() {
  const { subscription, loading, error, payments, loadPayments, cancel, refresh, paymentsStatus } =
    useSubscription();

  // A probe still in flight is not a failure, so it must not grey out the
  // upgrade buttons or claim the billing service is down.
  const paymentsBlocked = paymentsStatus === 'unavailable';

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const currentPlanId: PlanId = subscription?.plan ?? 'freemium';
  const currentPlan = planById(currentPlanId);
  const status = subscription?.status ?? 'free';
  const onPaidPlan = isPaidPlan(currentPlanId) && status === 'active';

  const doCancel = async () => {
    setCancelling(true);
    setActionError(null);
    try {
      await cancel(true);
      await loadPayments();
      setConfirmingCancel(false);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'We could not cancel the plan. Nothing has changed.',
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Plan & billing"
        description="What you are on, what it costs, and how to change or stop it."
        actions={
          <Link
            to="/pricing"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-4 text-[13.5px] font-medium text-ink-800 transition-colors hover:bg-canvas-sunk"
          >
            Compare plans
          </Link>
        }
      />

      <PageBody className="space-y-9">
        {loading && !subscription && (
          <Card>
            <p className="flex items-center gap-2 text-[13px] text-ink-500">
              <Loader2 className="size-3.5 animate-spin" />
              Loading your plan…
            </p>
          </Card>
        )}

        {error && (
          <Card accent="critical">
            <FieldLabel>Could not load your plan</FieldLabel>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{error}</p>
          </Card>
        )}

        {paymentsBlocked && !subscription && !loading && (
          <Card accent="caution">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-caution-600" />
              <div>
                <h2 className="text-[13.5px] font-semibold text-ink-900">
                  Billing service unavailable
                </h2>
                <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
                  This deployment has no billing service reachable, so no plan can be read or
                  changed here. Every free capability — including your emergency profile — works
                  normally.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* --- Current plan --------------------------------------------------- */}
        <section>
          <SectionHeader eyebrow="Current" title="Your plan" />

          <Card
            accent={onPaidPlan ? 'verified' : 'none'}
            className="mt-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[20px] font-semibold text-ink-900">{currentPlan.name}</h3>
                  <Badge tone={STATUS_TONE[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>
                  {subscription?.cancelAtPeriodEnd && (
                    <Badge tone="caution">Ends {formatDate(subscription.nextBillingDate)}</Badge>
                  )}
                </div>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-500">
                  {status === 'free'
                    ? "You're currently on the Free plan."
                    : currentPlan.tagline}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 border-t border-line pt-5 sm:grid-cols-3">
              <Stat
                label="Monthly price"
                value={formatInr(subscription?.status === 'free' ? 0 : currentPlan.priceInPaise)}
                sub={currentPlan.priceInPaise === 0 ? 'Free forever' : 'Billed monthly in INR'}
              />
              <Stat
                label={subscription?.cancelAtPeriodEnd ? 'Access until' : 'Next billing date'}
                value={
                  <span className="text-[19px]">
                    {formatDate(subscription?.nextBillingDate ?? null)}
                  </span>
                }
                sub={
                  subscription?.cancelAtPeriodEnd
                    ? 'Then returns to Freemium'
                    : onPaidPlan
                      ? 'Renews automatically'
                      : 'No upcoming charge'
                }
                tone={subscription?.cancelAtPeriodEnd ? 'caution' : 'neutral'}
              />
              <Stat
                label="Started"
                value={<span className="text-[19px]">{formatDate(subscription?.startDate ?? null)}</span>}
                sub={
                  subscription?.cancellationDate
                    ? `Cancelled ${formatDate(subscription.cancellationDate)}`
                    : 'Members covered: ' + (subscription?.seats ?? currentPlan.seats)
                }
              />
            </div>
          </Card>

          {status === 'payment_failed' && (
            <Card accent="critical" className="mt-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical-500" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13.5px] font-semibold text-ink-900">
                    Your last payment did not go through
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    Your account is on Freemium until a payment succeeds. Your emergency profile is
                    unaffected and remains available to clinicians.
                  </p>
                  {subscription?.subscribedPlan && (
                    <Link
                      to={`/subscribe/${subscription.subscribedPlan}`}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-ink-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink-800"
                    >
                      <CreditCard className="size-3.5" />
                      Retry payment
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          )}

          {subscription?.pendingPlan && status !== 'pending' && (
            <Card accent="caution" className="mt-3">
              <FieldLabel>Awaiting payment</FieldLabel>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
                A change to {planById(subscription.pendingPlan).name} is started but not paid for.
                Nothing has been charged and your current plan is unaffected.{' '}
                <Link
                  to={`/subscribe/${subscription.pendingPlan}`}
                  className="font-medium text-accent-600 hover:underline"
                >
                  Finish payment
                </Link>
              </p>
            </Card>
          )}
        </section>

        {/* --- Change plan ------------------------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow="Change"
            title={status === 'free' ? 'Upgrade your plan' : 'Change your plan'}
            description={
              status === 'free'
                ? 'Your emergency profile stays free on every plan. These add the record built on top of it.'
                : 'Changing plan starts a new monthly subscription and cancels the current one once payment succeeds — never both at once.'
            }
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PLAN_LIST.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const direction = comparePlans(currentPlanId, plan.id);
              const blocked = isPaidPlan(plan.id) && paymentsBlocked;

              return (
                <Card key={plan.id} accent={isCurrent ? 'verified' : 'none'} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-ink-900">{plan.name}</h3>
                    {isCurrent && <Badge tone="verified">Current</Badge>}
                  </div>
                  <div className="mt-2.5 text-[22px] font-semibold leading-none tnum text-ink-900">
                    {formatInr(plan.priceInPaise)}
                    <span className="ml-1 text-[12px] font-medium text-ink-400">/mo</span>
                  </div>

                  <div className="mt-4 flex-1" />

                  {isCurrent ? (
                    <span className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-verified-50 text-[13px] font-medium text-verified-600 ring-1 ring-inset ring-verified-100">
                      <Check className="size-3.5" />
                      Your plan
                    </span>
                  ) : plan.id === 'freemium' ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(true)}
                      disabled={!onPaidPlan}
                      className="inline-flex h-9 w-full items-center justify-center rounded-md border border-line-strong bg-white text-[13px] font-medium text-ink-700 transition-colors hover:bg-canvas-sunk disabled:opacity-40"
                    >
                      Downgrade to Freemium
                    </button>
                  ) : (
                    <Link
                      to={blocked ? '#' : `/subscribe/${plan.id}`}
                      aria-disabled={blocked}
                      onClick={(e) => blocked && e.preventDefault()}
                      className={
                        'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors ' +
                        (blocked
                          ? 'pointer-events-none bg-ink-100 text-ink-400'
                          : 'bg-ink-900 text-white hover:bg-ink-800')
                      }
                    >
                      {direction === 'upgrade' ? 'Upgrade' : 'Switch'}
                      {!blocked && <ArrowUpRight className="size-3.5" />}
                    </Link>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* --- Cancellation ------------------------------------------------------ */}
        {onPaidPlan && !subscription?.cancelAtPeriodEnd && (
          <section>
            <SectionHeader eyebrow="Cancellation" title="Cancel your subscription" />

            {confirmingCancel ? (
              <Card accent="critical" className="mt-4">
                <h3 className="text-[14px] font-semibold text-ink-900">
                  Cancel {currentPlan.name}?
                </h3>
                <ul className="mt-3 space-y-2">
                  {[
                    `You keep ${currentPlan.name} until ${formatDate(subscription?.nextBillingDate ?? null)} — the period you have already paid for.`,
                    'After that the account returns to Freemium automatically.',
                    'No records are deleted. Documents you have added stay readable.',
                    'Your emergency profile continues to work exactly as it does now.',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[12.5px] text-ink-600">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-critical-500" />
                      {line}
                    </li>
                  ))}
                </ul>

                {actionError && (
                  <p className="mt-3.5 text-[12.5px] leading-relaxed text-critical-600">{actionError}</p>
                )}

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={doCancel}
                    disabled={cancelling}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-critical-600 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-critical-700 disabled:opacity-50"
                  >
                    {cancelling && <Loader2 className="size-3.5 animate-spin" />}
                    Cancel at period end
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingCancel(false);
                      setActionError(null);
                    }}
                    disabled={cancelling}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-4 text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-canvas-sunk"
                  >
                    <X className="size-3.5" />
                    Keep my plan
                  </button>
                </div>
              </Card>
            ) : (
              <Card className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-xl text-[13px] leading-relaxed text-ink-500">
                    Cancelling stops the next charge. You keep {currentPlan.name} until the end of
                    the month you have paid for, then return to Freemium.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    className="inline-flex h-10 shrink-0 items-center rounded-md border border-critical-100 bg-critical-50 px-4 text-[13.5px] font-medium text-critical-700 transition-colors hover:bg-critical-100/70"
                  >
                    Cancel subscription
                  </button>
                </div>
              </Card>
            )}
          </section>
        )}

        {subscription?.cancelAtPeriodEnd && (
          <Card accent="caution">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-caution-600" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-ink-900">
                  Cancelled — active until {formatDate(subscription.nextBillingDate)}
                </h3>
                <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
                  You will not be charged again. {currentPlan.name} keeps working until then, and
                  the account returns to Freemium afterwards. To stay on {currentPlan.name}, start
                  it again from Compare plans.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* --- Payment history --------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="History"
            title="Payment history"
            description="Every attempt, including the ones that failed."
            action={
              subscription?.entitlements.includes('audit-export') ? (
                <a
                  href={`${(import.meta.env.VITE_API_URL as string | undefined) ?? '/api'}/subscription/export`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-white px-3.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-canvas-sunk"
                >
                  <Download className="size-3.5" />
                  Export
                </a>
              ) : undefined
            }
          />

          {payments.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<Receipt />}
                title="No payments yet"
                description={
                  status === 'free'
                    ? 'The Free plan does not require payment, so there is nothing to show here.'
                    : 'Payments will appear here as soon as one is processed.'
                }
              />
            </div>
          ) : (
            <Card padded={false} className="mt-4 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-canvas-sunk/60">
                      {['Date', 'Plan', 'Amount', 'Method', 'Status'].map((h) => (
                        <th key={h} className="label-xs px-4 py-2.5 text-ink-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-mono text-[11.5px] text-ink-600">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-ink-800">
                          {p.planId ? planById(p.planId).name : '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium tnum text-ink-900">
                          {formatInr(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-ink-500">
                          {formatMethod(p.method)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              p.status === 'captured'
                                ? 'verified'
                                : p.status === 'refunded'
                                  ? 'caution'
                                  : 'critical'
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>

        <Card accent="critical">
          <div className="flex items-start gap-3">
            <Siren className="mt-0.5 size-4 shrink-0 text-critical-500" />
            <div>
              <FieldLabel>Never affected by billing</FieldLabel>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">
                Allergies, blood group, active medications, conditions and emergency contacts are
                released to authorised clinicians under break-glass on every plan — including
                Freemium, a cancelled plan and a failed payment. Emergency reachability is not a
                billable feature of this product.
              </p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-3 text-[12.5px] font-medium text-accent-600 hover:underline"
              >
                Refresh plan status
              </button>
            </div>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
