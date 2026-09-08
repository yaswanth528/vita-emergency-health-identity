import {
  Ban,
  Building2,
  Check,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Siren,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Badge, Card, FieldLabel, type Surface } from '@/components/ui';
import { auditActionLabel, consentScopeLabel } from '@/data/consent';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AuditEvent, ConsentGrant, GranteeRole } from '@/types';

/* ============================================================================
   ConsentPanel & AuditLog
   ----------------------------------------------------------------------------
   Two ideas made visible:

   1. A grant is defined by what it withholds as much as by what it exposes.
      Both lists are rendered, side by side, at equal weight.

   2. Break-glass is a state, not a loophole. It is labelled, time-boxed, and
      it notifies the patient. Hiding emergency override would be the dishonest
      design; showing it is what makes the rest believable.
   ========================================================================== */

const roleIcon: Record<GranteeRole, typeof UserRound> = {
  clinician: UserRound,
  caregiver: UsersRound,
  facility: Building2,
  specialist: UserRound,
};

export function ConsentPanel({
  grant,
  onRevoke,
}: {
  grant: ConsentGrant;
  onRevoke?: (id: string) => void;
}) {
  const Icon = roleIcon[grant.granteeRole];
  const isBreakGlass = grant.basis === 'break-glass';
  const isActive = grant.status === 'active';

  return (
    <Card
      accent={isBreakGlass && isActive ? 'critical' : isActive ? 'verified' : 'none'}
      className={cn(!isActive && 'opacity-70')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md border',
              isBreakGlass && isActive
                ? 'border-critical-100 bg-critical-50 text-critical-600'
                : 'border-line bg-canvas-sunk text-ink-500',
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold text-ink-900">{grant.granteeName}</h3>
              <StatusBadge status={grant.status} />
              {isBreakGlass && (
                <Badge tone="critical">
                  <Siren className="size-2.5" />
                  Break-glass
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-500">{grant.organisation}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{grant.purpose}</p>
          </div>
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-1">
          <div>
            <dt className="label-xs text-ink-400">Scope</dt>
            <dd className="mt-1 text-[12.5px] font-medium text-ink-900">
              {consentScopeLabel[grant.scope]}
            </dd>
          </div>
          <div>
            <dt className="label-xs flex items-center gap-1 text-ink-400">
              <Clock3 className="size-2.5" />
              Expires
            </dt>
            <dd
              className={cn(
                'mt-1 font-mono text-[12px]',
                isBreakGlass && isActive ? 'font-semibold text-critical-600' : 'text-ink-700',
              )}
            >
              {grant.expiresAt}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <FieldLabel className="flex items-center gap-1.5">
            <Eye className="size-3" />
            Can see
          </FieldLabel>
          <ul className="mt-2 space-y-1">
            {grant.visibleData.length === 0 && (
              <li className="text-[12.5px] text-ink-400">Nothing — access has ended.</li>
            )}
            {grant.visibleData.map((v) => (
              <li key={v} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-700">
                <Check className="mt-0.5 size-3 shrink-0 text-verified-500" />
                {v}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <FieldLabel className="flex items-center gap-1.5">
            <EyeOff className="size-3" />
            Cannot see
          </FieldLabel>
          <ul className="mt-2 space-y-1">
            {grant.withheldData.map((v) => (
              <li key={v} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-500">
                <Ban className="mt-0.5 size-3 shrink-0 text-ink-300" />
                {v}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-mono text-[11px] text-ink-400">
          Granted {grant.grantedAt} · basis: {grant.basis.replace('-', ' ')}
        </span>
        {isActive && onRevoke && (
          <button
            onClick={() => onRevoke(grant.id)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-2 py-1 text-[12px] font-medium text-ink-600 transition-colors hover:border-critical-300 hover:bg-critical-50 hover:text-critical-600"
          >
            <KeyRound className="size-3" />
            Revoke access
          </button>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ConsentGrant['status'] }) {
  const map = {
    active: { tone: 'verified', label: 'Active' },
    expired: { tone: 'neutral', label: 'Expired' },
    revoked: { tone: 'critical', label: 'Revoked' },
    pending: { tone: 'caution', label: 'Pending' },
  } as const;
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/* --- AuditLog ---------------------------------------------------------------- */

const actionIcon: Record<AuditEvent['action'], typeof FileText> = {
  'emergency-access': Siren,
  'profile-view': Eye,
  'medication-view': Eye,
  'document-open': FileText,
  'evidence-view': Fingerprint,
  'consent-grant': KeyRound,
  'consent-revoke': Ban,
  'identity-verify': ShieldCheck,
  'conflict-verify': Check,
  export: Building2,
};

export function AuditLog({
  events,
  surface = 'light',
  /** Marks entries created in the current browser session. */
  liveCount = 0,
}: {
  events: AuditEvent[];
  surface?: Surface;
  liveCount?: number;
}) {
  const dark = surface === 'dark';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        dark ? 'border-ink-800 bg-ink-900' : 'border-line bg-white shadow-card',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b px-4 py-2.5',
          dark ? 'border-ink-800 bg-ink-850' : 'border-line bg-canvas-sunk',
        )}
      >
        <span className={cn('label-xs', dark ? 'text-ink-400' : 'text-ink-400')}>
          Access log · append-only
        </span>
        <span className={cn('font-mono text-[10.5px]', dark ? 'text-ink-500' : 'text-ink-400')}>
          {events.length} entries
        </span>
      </div>

      <ol className={cn('divide-y', dark ? 'divide-ink-800' : 'divide-line')}>
        {events.map((e, i) => {
          const Icon = actionIcon[e.action];
          const isLive = i < liveCount;
          return (
            <li
              key={e.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3',
                isLive && (dark ? 'bg-accent-500/[0.06]' : 'bg-accent-50/50'),
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border',
                  e.action === 'emergency-access' || e.action === 'consent-grant'
                    ? dark
                      ? 'border-critical-700/60 bg-critical-700/20 text-critical-300'
                      : 'border-critical-100 bg-critical-50 text-critical-600'
                    : dark
                      ? 'border-ink-700 bg-ink-850 text-ink-400'
                      : 'border-line bg-canvas-sunk text-ink-400',
                )}
              >
                <Icon className="size-3" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      'font-mono text-[12px] font-semibold tabular-nums',
                      dark ? 'text-ink-200' : 'text-ink-900',
                    )}
                  >
                    {e.time}
                  </span>
                  <span
                    className={cn(
                      'text-[13px] font-medium',
                      dark ? 'text-white' : 'text-ink-900',
                    )}
                  >
                    {auditActionLabel[e.action]}
                  </span>
                  {isLive && (
                    <Badge tone="accent" surface={surface}>
                      this session
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-1 text-[12.5px] leading-relaxed',
                    dark ? 'text-ink-400' : 'text-ink-600',
                  )}
                >
                  {e.detail}
                </p>
                <p
                  className={cn(
                    'mt-1 font-mono text-[10.5px]',
                    dark ? 'text-ink-600' : 'text-ink-400',
                  )}
                >
                  {formatDate(e.date)} · {e.actor} ({e.actorRole})
                  {e.organisation ? ` · ${e.organisation}` : ''}
                  {e.ipHint ? ` · ${e.ipHint}` : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
