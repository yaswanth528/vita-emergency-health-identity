import {
  Activity,
  BedDouble,
  FileText,
  FlaskConical,
  type LucideIcon,
  Pill,
  Scissors,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { Badge, type Surface } from '@/components/ui';
import { conditionById, medicationById } from '@/data/clinical';
import { documentById } from '@/data/documents';
import { eventKindLabel, groupByYear } from '@/data/timeline';
import { useVita } from '@/hooks/useVita';
import { formatDayMonth, relativeAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HealthEvent, HealthEventKind } from '@/types';

/* ============================================================================
   Timeline
   ----------------------------------------------------------------------------
   The output of `buildHealthTimeline()`, rendered.

   Each event exposes its links — the medications, conditions and documents it
   touches — because the reason this is worth building is that it is a graph.
   A clinician reading "Cardiac admission, 2023" should be able to see in the
   same glance that three of the four current drugs start there.
   ========================================================================== */

const kindIcon: Record<HealthEventKind, LucideIcon> = {
  'medication-change': Activity,
  'medication-start': Pill,
  diagnosis: Stethoscope,
  admission: BedDouble,
  procedure: Scissors,
  lab: FlaskConical,
  consultation: Stethoscope,
  immunisation: Syringe,
  document: FileText,
};

export function Timeline({
  events,
  surface = 'light',
  compact = false,
}: {
  events: HealthEvent[];
  surface?: Surface;
  compact?: boolean;
}) {
  const groups = groupByYear(events);
  const dark = surface === 'dark';

  return (
    <div className="space-y-8">
      {groups.map(({ year, events: yearEvents }) => (
        <section key={year}>
          <div className="mb-3.5 flex items-center gap-3">
            <h3
              className={cn(
                'font-mono text-[13px] font-semibold tracking-wider',
                dark ? 'text-ink-300' : 'text-ink-700',
              )}
            >
              {year}
            </h3>
            <span className={cn('h-px flex-1', dark ? 'bg-ink-800' : 'bg-line')} />
            <span className={cn('font-mono text-[11px]', dark ? 'text-ink-500' : 'text-ink-400')}>
              {yearEvents.length} event{yearEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          <ol className="relative">
            {/* The rail */}
            <span
              className={cn(
                'absolute bottom-4 left-[15px] top-3 w-px',
                dark ? 'bg-ink-800' : 'bg-line',
              )}
              aria-hidden
            />
            {yearEvents.map((e) => (
              <TimelineRow key={e.id} event={e} surface={surface} compact={compact} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineRow({
  event,
  surface,
  compact,
}: {
  event: HealthEvent;
  surface: Surface;
  compact: boolean;
}) {
  const { openEvidence } = useVita();
  const dark = surface === 'dark';
  const Icon = kindIcon[event.kind];

  const meds = event.links?.medications?.map(medicationById).filter(Boolean) ?? [];
  const conds = event.links?.conditions?.map(conditionById).filter(Boolean) ?? [];
  const docs = event.links?.documents?.map(documentById).filter(Boolean) ?? [];

  return (
    <li className="relative flex gap-4 pb-4 last:pb-0">
      <span
        className={cn(
          'relative z-10 mt-1 flex size-[31px] shrink-0 items-center justify-center rounded-full border',
          event.major
            ? dark
              ? 'border-critical-500/50 bg-critical-700/25 text-critical-300'
              : 'border-critical-100 bg-critical-50 text-critical-600'
            : dark
              ? 'border-ink-700 bg-ink-850 text-ink-400'
              : 'border-line bg-white text-ink-400',
        )}
      >
        <Icon className="size-3.5" />
      </span>

      <div
        className={cn(
          'min-w-0 flex-1 rounded-lg border px-4 py-3.5 transition-colors',
          dark ? 'border-ink-800 bg-ink-900/70' : 'border-line bg-white shadow-card',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'font-mono text-[11px] font-medium',
                  dark ? 'text-ink-400' : 'text-ink-400',
                )}
              >
                {formatDayMonth(event.date)}
              </span>
              <Badge tone="neutral" surface={surface}>
                {eventKindLabel[event.kind]}
              </Badge>
              {event.major && (
                <Badge tone="critical" surface={surface}>
                  Major
                </Badge>
              )}
            </div>
            <h4
              className={cn(
                'mt-1.5 text-[14.5px] font-semibold leading-snug',
                dark ? 'text-white' : 'text-ink-900',
              )}
            >
              {event.title}
            </h4>
          </div>
          <span
            className={cn(
              'shrink-0 font-mono text-[10.5px]',
              dark ? 'text-ink-600' : 'text-ink-400',
            )}
          >
            {relativeAge(event.date)}
          </span>
        </div>

        {!compact && (
          <p className={cn('mt-1.5 text-[12.5px] leading-relaxed', dark ? 'text-ink-400' : 'text-ink-600')}>
            {event.detail}
          </p>
        )}

        {event.facility && (
          <p className={cn('mt-1.5 text-[11.5px]', dark ? 'text-ink-500' : 'text-ink-400')}>
            {event.facility}
          </p>
        )}

        {/* Graph edges */}
        {!compact && (meds.length > 0 || conds.length > 0 || docs.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {conds.map((c) => (
              <span
                key={c!.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[10.5px] font-medium',
                  dark ? 'border-ink-700 bg-ink-800 text-ink-300' : 'border-line bg-canvas-sunk text-ink-600',
                )}
              >
                <Stethoscope className="size-2.5" />
                {c!.name.value}
              </span>
            ))}
            {meds.map((m) => (
              <span
                key={m!.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[10.5px] font-medium',
                  dark ? 'border-ink-700 bg-ink-800 text-ink-300' : 'border-line bg-canvas-sunk text-ink-600',
                )}
              >
                <Pill className="size-2.5" />
                {m!.name.value}
              </span>
            ))}
            {docs.map((d) => (
              <span
                key={d!.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] font-mono text-[10px]',
                  dark ? 'border-ink-700 bg-ink-800 text-ink-400' : 'border-line bg-canvas-sunk text-ink-500',
                )}
              >
                <FileText className="size-2.5" />
                {d!.filename}
              </span>
            ))}
          </div>
        )}

        {event.evidenceId && (
          <button
            onClick={() => openEvidence(event.evidenceId!, event.title)}
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors',
              dark ? 'text-accent-bright hover:text-white' : 'text-accent-600 hover:text-accent-700',
            )}
          >
            View evidence
          </button>
        )}
      </div>
    </li>
  );
}
