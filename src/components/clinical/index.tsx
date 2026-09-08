import { ArrowUp, Ban, CircleAlert, Pill, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Card, FieldLabel, type Surface } from '@/components/ui';
import { EvidenceBadge } from '@/components/evidence/EvidenceBadge';
import { formatDate, relativeAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Allergy, Condition, LabTrend, Medication } from '@/types';

/* ============================================================================
   Clinical components
   Shared between the warm application surface and the dark emergency surface.
   Every one of them renders an EvidenceBadge — there is no variant that shows
   a clinical value without its provenance.
   ========================================================================== */

/* --- AllergyAlert ------------------------------------------------------------- */

/**
 * The most important component in the product.
 *
 * In `emergency` size it is deliberately larger than anything else on screen.
 * A clinician glancing at this display for one second should read exactly one
 * word, and it should be the right one.
 */
export function AllergyAlert({
  allergy,
  size = 'standard',
  surface = 'light',
}: {
  allergy: Allergy;
  size?: 'standard' | 'emergency';
  surface?: Surface;
}) {
  const isEmergency = size === 'emergency';
  const dark = surface === 'dark';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border',
        dark
          ? 'border-critical-500/50 bg-gradient-to-br from-critical-700/25 via-ink-850 to-ink-850'
          : 'border-critical-100 bg-critical-50',
        isEmergency ? 'p-5 sm:p-6' : 'p-4',
      )}
    >
      {/* Left signal bar */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          dark ? 'bg-critical-bright' : 'bg-critical-500',
        )}
      />

      <div className="flex items-start gap-3 pl-2">
        <CircleAlert
          className={cn(
            'shrink-0',
            isEmergency ? 'mt-1 size-5 sm:size-6' : 'mt-0.5 size-4',
            dark ? 'text-critical-bright' : 'text-critical-500',
          )}
          strokeWidth={2.2}
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'label-xs flex items-center gap-2',
              dark ? 'text-critical-300' : 'text-critical-600',
            )}
          >
            Critical allergy
            {isEmergency && (
              <span
                className={cn(
                  'size-1.5 rounded-full pulse-dot',
                  dark ? 'bg-critical-bright' : 'bg-critical-500',
                )}
                aria-hidden
              />
            )}
          </div>

          <h3
            className={cn(
              'mt-1.5 font-semibold leading-none tracking-[-0.03em]',
              isEmergency ? 'text-[34px] sm:text-[46px]' : 'text-[20px]',
              dark ? 'text-white' : 'text-critical-700',
            )}
          >
            {allergy.substance.value.toUpperCase()}
          </h3>

          <p
            className={cn(
              'mt-2 leading-snug',
              isEmergency ? 'text-[14px] sm:text-[15px]' : 'text-[13px]',
              dark ? 'text-critical-300' : 'text-critical-600',
            )}
          >
            {allergy.reaction.value}
          </p>

          {allergy.crossReactive && allergy.crossReactive.length > 0 && (
            <div className="mt-3">
              <FieldLabel surface={surface} className={cn(dark ? 'text-ink-400' : 'text-critical-600/70')}>
                Also avoid · {allergy.drugClass}
              </FieldLabel>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {allergy.crossReactive.map((x) => (
                  <span
                    key={x}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[11px] font-medium',
                      dark
                        ? 'border-critical-700/60 bg-critical-700/20 text-critical-300'
                        : 'border-critical-100 bg-white text-critical-600',
                    )}
                  >
                    <Ban className="size-2.5" />
                    {x}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <EvidenceBadge
              fact={allergy.substance}
              claimLabel={`${allergy.substance.value} allergy`}
              surface={surface}
            />
            <span className={cn('text-[11px]', dark ? 'text-ink-500' : 'text-critical-600/60')}>
              recorded {relativeAge(allergy.recordedOn)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- MedicationCard ------------------------------------------------------------ */

export function MedicationCard({
  medication,
  surface = 'light',
  compact = false,
}: {
  medication: Medication;
  surface?: Surface;
  compact?: boolean;
}) {
  const dark = surface === 'dark';
  const changed = medication.status === 'changed';
  const discontinued = medication.status === 'discontinued';

  return (
    <div
      className={cn(
        'rounded-md border px-3.5 py-3 transition-colors',
        dark
          ? changed
            ? 'border-caution-500/40 bg-caution-500/[0.07]'
            : 'border-ink-700/70 bg-ink-800/40'
          : changed
            ? 'border-caution-100 bg-caution-50/50'
            : 'border-line bg-white',
        discontinued && 'opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={cn(
                'font-semibold leading-tight',
                compact ? 'text-[14px]' : 'text-[15px]',
                dark ? 'text-white' : 'text-ink-900',
                discontinued && 'line-through decoration-1',
              )}
            >
              {medication.name.value}
            </span>
            <span
              className={cn(
                'font-mono font-medium tabular-nums',
                compact ? 'text-[13px]' : 'text-[14px]',
                dark ? 'text-ink-200' : 'text-ink-700',
              )}
            >
              {medication.dose.value}
            </span>
            {changed && (
              <Badge tone="caution" surface={surface}>
                <ArrowUp className="size-2.5" />
                changed
              </Badge>
            )}
            {discontinued && (
              <Badge tone="neutral" surface={surface}>
                discontinued
              </Badge>
            )}
          </div>

          <p className={cn('mt-1 text-[12.5px]', dark ? 'text-ink-400' : 'text-ink-500')}>
            {medication.frequency.value} · {medication.route} · {medication.indication}
          </p>

          {changed && medication.previousDose && (
            <p
              className={cn(
                'mt-1.5 font-mono text-[11.5px]',
                dark ? 'text-caution-300' : 'text-caution-600',
              )}
            >
              {medication.previousDose} → {medication.dose.value} on{' '}
              {medication.changedOn ? formatDate(medication.changedOn) : '—'}
            </p>
          )}

          {!compact && medication.cautions && medication.cautions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {medication.cautions.map((c) => (
                <li
                  key={c}
                  className={cn(
                    'flex items-start gap-1.5 text-[11.5px] leading-snug',
                    dark ? 'text-ink-400' : 'text-ink-500',
                  )}
                >
                  <span className={cn('mt-1 size-1 shrink-0 rounded-full', dark ? 'bg-ink-500' : 'bg-ink-300')} />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Pill
          className={cn('mt-0.5 size-3.5 shrink-0', dark ? 'text-ink-600' : 'text-ink-300')}
          strokeWidth={2}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <EvidenceBadge
          fact={medication.dose}
          claimLabel={`${medication.name.value} ${medication.dose.value}`}
          surface={surface}
          detail={compact ? 'compact' : 'full'}
        />
      </div>
    </div>
  );
}

/* --- ConditionCard -------------------------------------------------------------- */

export function ConditionCard({
  condition,
  surface = 'light',
  compact = false,
}: {
  condition: Condition;
  surface?: Surface;
  compact?: boolean;
}) {
  const dark = surface === 'dark';
  const tone =
    condition.severity === 'critical' ? 'critical' : condition.severity === 'significant' ? 'caution' : 'neutral';

  return (
    <div
      className={cn(
        'rounded-md border px-3.5 py-3',
        dark ? 'border-ink-700/70 bg-ink-800/40' : 'border-line bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                'font-semibold leading-tight',
                compact ? 'text-[13.5px]' : 'text-[14.5px]',
                dark ? 'text-white' : 'text-ink-900',
              )}
            >
              {condition.name.value}
            </span>
            {condition.code && (
              <span className={cn('font-mono text-[10.5px]', dark ? 'text-ink-500' : 'text-ink-400')}>
                {condition.code}
              </span>
            )}
          </div>
          {condition.controlMarker && (
            <p
              className={cn(
                'mt-1 font-mono text-[12px] tabular-nums',
                dark ? 'text-ink-300' : 'text-ink-600',
              )}
            >
              {condition.controlMarker.value}
            </p>
          )}
          {!compact && condition.notes && (
            <p className={cn('mt-1.5 text-[12px] leading-snug', dark ? 'text-ink-400' : 'text-ink-500')}>
              {condition.notes}
            </p>
          )}
        </div>
        {tone !== 'neutral' && (
          <span
            className={cn(
              'mt-1.5 size-1.5 shrink-0 rounded-full',
              tone === 'critical'
                ? dark
                  ? 'bg-critical-bright'
                  : 'bg-critical-500'
                : dark
                  ? 'bg-caution-bright'
                  : 'bg-caution-500',
            )}
            aria-label={condition.severity}
          />
        )}
      </div>
      <div className="mt-2.5">
        <EvidenceBadge
          fact={condition.controlMarker ?? condition.name}
          claimLabel={condition.name.value}
          surface={surface}
          detail={compact ? 'compact' : 'full'}
        />
      </div>
    </div>
  );
}

/* --- Lab trend sparkline --------------------------------------------------------- */

/**
 * Direction over time, not a single number. In a handover the useful sentence
 * is "HbA1c has been drifting up for two years", never "HbA1c is 7.4".
 */
export function LabTrendCard({ trend, surface = 'light' }: { trend: LabTrend; surface?: Surface }) {
  const dark = surface === 'dark';
  const values = trend.series.map((s) => s.value);
  const min = Math.min(...values, trend.referenceHigh);
  const max = Math.max(...values, trend.referenceHigh);
  const span = max - min || 1;
  const w = 220;
  const h = 44;
  const points = trend.series.map((s, i) => {
    const x = (i / (trend.series.length - 1)) * w;
    const y = h - ((s.value - min) / span) * h;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const refY = h - ((trend.referenceHigh - min) / span) * h;
  const last = trend.series[trend.series.length - 1];
  const first = trend.series[0];
  const delta = last.value - first.value;
  const worsening = trend.direction === 'worsening';

  return (
    <Card surface={surface} padded={false} className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <FieldLabel surface={surface}>{trend.analyte}</FieldLabel>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-[24px] font-semibold leading-none tabular-nums',
                dark ? 'text-white' : 'text-ink-900',
              )}
            >
              {last.value}
            </span>
            <span className={cn('text-[12px]', dark ? 'text-ink-400' : 'text-ink-500')}>{trend.unit}</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[11px] font-medium',
              worsening
                ? dark
                  ? 'border-caution-500/40 bg-caution-500/10 text-caution-300'
                  : 'border-caution-100 bg-caution-50 text-caution-600'
                : dark
                  ? 'border-verified-500/40 bg-verified-500/10 text-verified-300'
                  : 'border-verified-100 bg-verified-50 text-verified-600',
            )}
          >
            {worsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta > 0 ? '+' : ''}
            {delta.toFixed(delta % 1 === 0 ? 0 : 1)} over {trend.series.length} results
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-11 w-full" preserveAspectRatio="none" aria-hidden>
        <line
          x1="0"
          x2={w}
          y1={refY}
          y2={refY}
          strokeDasharray="3 3"
          className={dark ? 'stroke-ink-600' : 'stroke-ink-200'}
          strokeWidth="1"
        />
        <path
          d={path}
          fill="none"
          strokeWidth="1.75"
          className={
            worsening
              ? dark
                ? 'stroke-caution-bright'
                : 'stroke-caution-500'
              : dark
                ? 'stroke-verified-bright'
                : 'stroke-verified-500'
          }
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === points.length - 1 ? 2.6 : 1.6}
            className={
              worsening
                ? dark
                  ? 'fill-caution-bright'
                  : 'fill-caution-500'
                : dark
                  ? 'fill-verified-bright'
                  : 'fill-verified-500'
            }
          />
        ))}
      </svg>

      <div
        className={cn(
          'flex items-center justify-between border-t px-4 py-2.5 font-mono text-[10.5px]',
          dark ? 'border-ink-700/60 text-ink-500' : 'border-line text-ink-400',
        )}
      >
        <span>{formatDate(first.takenOn)}</span>
        <span>
          REF {trend.referenceLow}–{trend.referenceHigh} {trend.unit}
        </span>
        <span>{formatDate(last.takenOn)}</span>
      </div>
    </Card>
  );
}
