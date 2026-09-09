import { ArrowDownRight, ArrowUpRight, Check, Minus, Sparkles } from 'lucide-react';
import { formatInr, planFeatureRows, type Plan, type PlanId } from '@shared/plans';
import { Badge, Card, FieldLabel } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ============================================================================
   Plan card
   ----------------------------------------------------------------------------
   Follows the product's existing colour discipline rather than inventing a
   pricing-page palette: interaction stays blue, so the recommended plan is
   accent-bordered; brand green still means verified, so it marks an included
   capability and the plan you are actually on.

   Excluded features are shown struck through rather than omitted. "Nothing
   shown" and "nothing included" are different claims, and the rest of this
   application already refuses to conflate them.
   ========================================================================== */

export type PlanCardState = 'current' | 'available' | 'upgrade' | 'downgrade' | 'pending';

const STATE_BADGE: Record<PlanCardState, { label: string; tone: 'verified' | 'accent' | 'caution' } | null> = {
  current: { label: 'Current plan', tone: 'verified' },
  pending: { label: 'Awaiting payment', tone: 'caution' },
  upgrade: null,
  downgrade: null,
  available: null,
};

export function PlanCard({
  plan,
  state,
  busy = false,
  disabled = false,
  disabledReason,
  onSelect,
}: {
  plan: Plan;
  state: PlanCardState;
  busy?: boolean;
  disabled?: boolean;
  /** Shown under the button so a dead control always explains itself. */
  disabledReason?: string;
  onSelect: (planId: PlanId) => void;
}) {
  const rows = planFeatureRows(plan.id);
  const badge = STATE_BADGE[state];
  const isCurrent = state === 'current';

  const label =
    state === 'current'
      ? 'Your current plan'
      : state === 'upgrade'
        ? `Upgrade to ${plan.name}`
        : state === 'downgrade'
          ? `Switch to ${plan.name}`
          : plan.cta;

  return (
    <Card
      accent={plan.recommended ? 'accent' : 'none'}
      className={cn(
        'flex flex-col',
        plan.recommended && 'border-accent-300 shadow-raised lg:-mt-3 lg:mb-3',
        isCurrent && 'border-verified-300',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-semibold text-ink-900">{plan.name}</h3>
            {plan.recommended && (
              <Badge tone="accent">
                <Sparkles className="size-2.5" />
                Recommended
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{plan.tagline}</p>
        </div>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tnum text-ink-900">
          {formatInr(plan.priceInPaise)}
        </span>
        <span className="text-[13.5px] font-medium text-ink-400">/month</span>
      </div>
      <FieldLabel className="mt-2">
        {plan.priceInPaise === 0
          ? 'Free forever · no payment required'
          : `Billed monthly in INR · ${plan.seats === 1 ? '1 member' : `up to ${plan.seats} members`}`}
      </FieldLabel>

      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        disabled={disabled || busy || isCurrent}
        className={cn(
          'mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-[14px] font-medium',
          'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
          plan.recommended
            ? 'bg-accent-500 text-white hover:bg-accent-600'
            : 'bg-ink-900 text-white hover:bg-ink-800',
          isCurrent && 'bg-verified-50 text-verified-600 ring-1 ring-inset ring-verified-100',
        )}
      >
        {busy ? 'Opening checkout…' : label}
        {state === 'upgrade' && !busy && <ArrowUpRight className="size-4" />}
        {state === 'downgrade' && !busy && <ArrowDownRight className="size-4" />}
      </button>

      {disabled && disabledReason && (
        <p className="mt-2 text-center text-[12px] leading-snug text-caution-600">{disabledReason}</p>
      )}

      <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
        {rows.map((row) => (
          <li key={row.feature} className="flex items-start gap-2.5">
            {row.included ? (
              <Check className="mt-[2px] size-3.5 shrink-0 text-verified-500" />
            ) : (
              <Minus className="mt-[2px] size-3.5 shrink-0 text-ink-300" />
            )}
            <span
              className={cn(
                'text-[12.5px] leading-snug',
                row.included ? 'text-ink-700' : 'text-ink-400 line-through decoration-ink-200',
              )}
            >
              {row.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
