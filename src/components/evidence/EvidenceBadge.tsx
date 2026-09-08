import { AlertTriangle, CircleCheck, Clock3, FileText, TriangleAlert, UserRoundCheck } from 'lucide-react';
import { documentById } from '@/data/documents';
import { getEvidence } from '@/data/evidence';
import { useVita } from '@/hooks/useVita';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SourcedFact, VerificationState } from '@/types';
import type { Surface } from '@/components/ui';

/* ============================================================================
   EvidenceBadge
   ----------------------------------------------------------------------------
   The single most-used component in the product. It renders the provenance of
   one claim and opens the source on click.

   It takes a `SourcedFact`, not a string. That is the enforcement mechanism:
   a developer cannot render a medical value through this component without
   also having an evidence id to hand.
   ========================================================================== */

const stateMeta: Record<
  VerificationState,
  { label: string; icon: typeof CircleCheck; light: string; dark: string }
> = {
  'clinician-verified': {
    label: 'Clinician verified',
    icon: UserRoundCheck,
    light: 'text-verified-600 border-verified-100 bg-verified-50 hover:border-verified-300',
    dark: 'text-verified-300 border-verified-500/40 bg-verified-500/10 hover:border-verified-500/70',
  },
  'source-backed': {
    label: 'Source-backed',
    icon: FileText,
    light: 'text-ink-500 border-ink-100 bg-ink-50 hover:border-ink-300 hover:text-ink-700',
    dark: 'text-ink-300 border-ink-700 bg-ink-800 hover:border-ink-500 hover:text-white',
  },
  conflicted: {
    label: 'Conflicting records',
    icon: TriangleAlert,
    light: 'text-caution-600 border-caution-100 bg-caution-50 hover:border-caution-300',
    dark: 'text-caution-300 border-caution-500/40 bg-caution-500/10 hover:border-caution-500/70',
  },
  stale: {
    label: 'Ageing source',
    icon: Clock3,
    light: 'text-ink-400 border-ink-100 bg-canvas-sunk hover:border-ink-300',
    dark: 'text-ink-400 border-ink-700 bg-ink-800/60 hover:border-ink-500',
  },
  'self-reported': {
    label: 'Self-reported',
    icon: AlertTriangle,
    light: 'text-caution-600 border-caution-100 bg-caution-50/60 hover:border-caution-300',
    dark: 'text-caution-300 border-caution-500/30 bg-caution-500/5 hover:border-caution-500/60',
  },
};

export function EvidenceBadge({
  fact,
  claimLabel,
  surface = 'light',
  /** `full` shows document + date + confidence; `compact` shows confidence only. */
  detail = 'full',
  className,
}: {
  fact: SourcedFact<string> | SourcedFact<never> | { evidenceId: string; confidence: number; state: VerificationState };
  claimLabel?: string;
  surface?: Surface;
  detail?: 'full' | 'compact';
  className?: string;
}) {
  const { openEvidence, openConflict, conflicts } = useVita();
  const ev = getEvidence(fact.evidenceId);
  const doc = ev ? documentById(ev.documentId) : undefined;

  const conflictId = 'conflictId' in fact ? (fact as SourcedFact).conflictId : undefined;
  const conflict = conflictId ? conflicts.find((c) => c.id === conflictId) : undefined;

  /**
   * Once a clinician records a decision on a conflict, every badge bound to it
   * must stop saying "conflict" — otherwise the interface keeps warning about
   * something that has been resolved, and the warning stops meaning anything.
   * The conflict itself stays openable, so both sources remain one tap away.
   */
  const state =
    conflict?.status === 'clinician-verified' ? 'clinician-verified' : fact.state;
  const isConflict = state === 'conflicted';

  const meta = stateMeta[state];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (conflictId) openConflict(conflictId);
        else openEvidence(fact.evidenceId, claimLabel);
      }}
      title={
        isConflict
          ? 'Sources disagree — open to compare'
          : `${doc?.filename ?? 'Source'} · ${ev ? formatDate(ev.documentDate) : ''} · ${fact.confidence}% confidence`
      }
      className={cn(
        'group inline-flex max-w-full items-center gap-1.5 rounded-sm border px-1.5 py-[3px]',
        'text-[11px] font-medium leading-none transition-colors duration-150',
        surface === 'light' ? meta.light : meta.dark,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" strokeWidth={2.1} />
      {detail === 'full' && doc && (
        <>
          <span className="truncate font-mono text-[10.5px] tracking-tight">{doc.filename}</span>
          <span className={cn('shrink-0', surface === 'light' ? 'text-ink-300' : 'text-ink-600')}>·</span>
          <span className="shrink-0 font-mono text-[10.5px]">
            {ev ? formatDate(ev.documentDate).replace(/ (\d{4})$/, " '$1").replace("'20", "'") : '—'}
          </span>
          <span className={cn('shrink-0', surface === 'light' ? 'text-ink-300' : 'text-ink-600')}>·</span>
        </>
      )}
      <span className="shrink-0 font-mono text-[10.5px] tabular-nums">{fact.confidence}%</span>
      {isConflict && <span className="shrink-0 font-semibold uppercase tracking-wide">· conflict</span>}
    </button>
  );
}

/* --- Confidence meter -------------------------------------------------------- */

/**
 * A bar rather than a number alone, because "96%" means little without a sense
 * of where the acceptance threshold sits. The threshold is drawn on the track.
 */
export function ConfidenceMeter({
  value,
  threshold = 85,
  surface = 'light',
  showLabel = true,
  className,
}: {
  value: number;
  threshold?: number;
  surface?: Surface;
  showLabel?: boolean;
  className?: string;
}) {
  const below = value < threshold;
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className={cn('label-xs', surface === 'light' ? 'text-ink-400' : 'text-ink-400')}>
            Extraction confidence
          </span>
          <span
            className={cn(
              'font-mono text-[13px] font-semibold tabular-nums',
              below
                ? surface === 'light'
                  ? 'text-caution-600'
                  : 'text-caution-300'
                : surface === 'light'
                  ? 'text-ink-900'
                  : 'text-white',
            )}
          >
            {value}%
          </span>
        </div>
      )}
      <div
        className={cn(
          'relative h-1.5 w-full overflow-hidden rounded-full',
          surface === 'light' ? 'bg-ink-100' : 'bg-ink-700',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            below ? 'bg-caution-500' : surface === 'light' ? 'bg-ink-800' : 'bg-verified-bright',
          )}
          style={{ width: `${value}%` }}
        />
        <div
          className={cn(
            'absolute top-0 h-full w-px',
            surface === 'light' ? 'bg-ink-400' : 'bg-ink-300',
          )}
          style={{ left: `${threshold}%` }}
          aria-hidden
        />
      </div>
      {showLabel && (
        <div
          className={cn(
            'mt-1 font-mono text-[10px] tracking-wide',
            surface === 'light' ? 'text-ink-400' : 'text-ink-500',
          )}
        >
          ACCEPTANCE THRESHOLD {threshold}%
          {below && ' · WITHHELD FROM GRAPH'}
        </div>
      )}
    </div>
  );
}
