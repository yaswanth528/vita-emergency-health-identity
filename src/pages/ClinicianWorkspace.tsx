import {
  BadgeCheck,
  Clock3,
  FileStack,
  KeyRound,
  Search,
  ShieldAlert,
  Siren,
  Stethoscope,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, buttonClasses } from '@/components/ui';
import { Wordmark } from '@/components/system/Wordmark';
import { allPatients, registryStatus } from '@/data/patient';
import { useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

/* ============================================================================
   Clinician workspace
   ----------------------------------------------------------------------------
   The professional surface: patient lookup, authorisation state, and one route
   into Emergency Mode.

   The registry is deliberately not uniform. One patient is fully linked, one
   has no standing grant and needs break-glass, one has almost no sources, and
   one cannot be released at all because their identity is unverified. A demo
   where every record is perfect proves nothing about the system's judgement.
   ========================================================================== */

export default function ClinicianWorkspace() {
  const [query, setQuery] = useState('');
  const [requested, setRequested] = useState<string[]>([]);
  const navigate = useNavigate();
  const { logAudit } = useVita();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPatients;
    return allPatients.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.abhaMasked.includes(q) || p.id.includes(q),
    );
  }, [query]);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* --- Workspace chrome --------------------------------------------- */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Wordmark className="h-[17px]" />
            </Link>
            <span className="hidden h-5 w-px bg-line sm:block" />
            <span className="label-xs hidden text-ink-400 sm:block">Clinician workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[13px] font-semibold leading-tight text-ink-900">Dr. Meera Rao</p>
              <p className="font-mono text-[10.5px] text-ink-400">
                Apollo Emergency Dept · TSMC 41207
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-md bg-ink-900 font-mono text-[11px] font-semibold text-white">
              MR
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="label-xs mb-2.5 text-ink-400">Emergency department · 09 Sep 2026</div>
            <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.028em] text-ink-900">
              Identify a patient
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-500">
              Search the health-identity registry. Clinical context is released only against a
              verified identity and an active or break-glass authorisation.
            </p>
          </div>
          <Link to="/emergency" className={buttonClasses({ variant: 'critical' })}>
            <Siren className="size-[15px]" />
            Open Emergency Mode
          </Link>
        </div>

        <div className="relative mt-7">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient name, ABHA number or MRN…"
            className="h-12 w-full rounded-md border border-line-strong bg-white pl-10 pr-4 text-[14.5px] text-ink-900 placeholder:text-ink-400 transition-colors focus:border-accent-500 focus:outline-none"
          />
        </div>

        <div className="mt-5 space-y-3">
          {results.length === 0 && (
            <EmptyState
              icon={<Search />}
              title={`No patient matches “${query}”`}
              description="Try an ABHA number, or register the patient at triage if they are not in the registry."
            />
          )}
          {results.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              requested={requested.includes(p.id)}
              onRequest={() => {
                setRequested((prev) => [...prev, p.id]);
                logAudit(
                  'consent-grant',
                  `Break-glass access requested for ${p.displayName}. Patient and registered caregiver notified.`,
                );
              }}
              onOpen={() => navigate(`/clinician/${p.id}`)}
            />
          ))}
        </div>

        {/* --- Working principles ------------------------------------------- */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <PrincipleCard
            icon={<BadgeCheck className="size-4" />}
            title="Identity before data"
            detail="An unverified identity blocks release. Attributing one patient's allergies to another is worse than having no record."
          />
          <PrincipleCard
            icon={<Clock3 className="size-4" />}
            title="Access expires"
            detail="Break-glass grants last two hours and notify the patient the moment they open."
          />
          <PrincipleCard
            icon={<FileStack className="size-4" />}
            title="Every claim is sourced"
            detail="Nothing on the clinical snapshot is asserted without the document, page and date behind it."
          />
        </div>
      </main>
    </div>
  );
}

/* --- PatientCard --------------------------------------------------------- */

export function PatientCard({
  patient,
  requested,
  onRequest,
  onOpen,
}: {
  patient: Patient;
  requested: boolean;
  onRequest: () => void;
  onOpen: () => void;
}) {
  const status = registryStatus[patient.id];
  const blocked = status.consent === 'blocked-identity';
  const needsRequest = status.consent === 'requires-request' && !requested;
  const canOpen = !blocked && (status.consent === 'active' || requested);

  return (
    <Card
      accent={blocked ? 'none' : status.consent === 'active' ? 'verified' : 'caution'}
      className={cn(blocked && 'opacity-75')}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-md border font-mono text-[13px] font-semibold',
              blocked ? 'border-line bg-canvas-sunk text-ink-400' : 'border-line bg-ink-900 text-white',
            )}
          >
            {patient.photoInitials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-semibold text-ink-900">{patient.fullName}</h3>
              {patient.identityVerified ? (
                <Badge tone="verified">
                  <BadgeCheck className="size-2.5" />
                  Identity verified
                </Badge>
              ) : (
                <Badge tone="critical">
                  <ShieldAlert className="size-2.5" />
                  Unverified
                </Badge>
              )}
              {requested && <Badge tone="caution">Break-glass active</Badge>}
            </div>
            <p className="mt-1 font-mono text-[11.5px] text-ink-400">
              {patient.age} {patient.sex.charAt(0)} · ABHA {patient.abhaMasked} · {patient.id}
            </p>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-500">{status.note}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <dl className="flex gap-6">
            <div>
              <dt className="label-xs text-ink-400">Sources</dt>
              <dd className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-ink-900">
                {status.linkedSources}
              </dd>
            </div>
            <div>
              <dt className="label-xs text-ink-400">Freshness</dt>
              <dd className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-ink-900">
                {patient.sourceFreshnessDays}d
              </dd>
            </div>
            <div className="hidden sm:block">
              <dt className="label-xs text-ink-400">Last encounter</dt>
              <dd className="mt-1 text-[12px] text-ink-700">{status.lastEncounter}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {blocked && (
              <Button size="sm" variant="secondary" icon={<ShieldAlert />} disabled>
                Verify identity first
              </Button>
            )}
            {needsRequest && (
              <Button size="sm" variant="secondary" icon={<KeyRound />} onClick={onRequest}>
                Request break-glass access
              </Button>
            )}
            {canOpen && (
              <>
                <Button size="sm" variant="secondary" icon={<Stethoscope />} onClick={onOpen}>
                  Clinical snapshot
                </Button>
                <Link
                  to={`/emergency/${patient.id}`}
                  className={buttonClasses({ variant: 'critical', size: 'sm' })}
                >
                  <Siren className="size-[15px]" />
                  Emergency Mode
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PrincipleCard({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Card>
      <span className="text-ink-400">{icon}</span>
      <h3 className="mt-2.5 text-[13.5px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{detail}</p>
    </Card>
  );
}
