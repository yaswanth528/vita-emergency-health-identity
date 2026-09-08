import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  Droplet,
  FileStack,
  HeartPulse,
  History,
  LogOut,
  Phone,
  Scale,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AllergyAlert, ConditionCard, MedicationCard } from '@/components/clinical';
import { EvidenceBadge } from '@/components/evidence/EvidenceBadge';
import { Badge, Button, FieldLabel } from '@/components/ui';
import { allergies, conditions, implants } from '@/data/clinical';
import { documents } from '@/data/documents';
import { activeMedications } from '@/data/clinical';
import { patientById } from '@/data/patient';
import { majorHistory, recentChanges } from '@/data/timeline';
import { useOpenConflicts, useVita } from '@/hooks/useVita';
import { elapsed, formatDate, freshnessBand, freshnessLabel, relativeAge } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ============================================================================
   EMERGENCY MODE
   ----------------------------------------------------------------------------
   This screen has one job: put the six or seven facts that change the next
   decision in front of a clinician who has roughly ten seconds and no context.

   Design consequences of that job:
     - Dark surface. It is not the application; it is a different mode, and it
       should be obvious at a glance which one you are in.
     - One dominant element. The allergy is set at 46px because nothing else on
       this screen is allowed to compete with it.
     - No navigation chrome, no search, no settings. There is nowhere to go.
     - Everything is one tap from its source. Speed is worthless without trust.
     - Absent data is stated, never implied. An empty section says "none
       recorded", because "nothing shown" and "nothing exists" are different
       claims and only one of them is safe.
   ========================================================================== */

export default function EmergencyMode() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const patient = patientById(patientId ?? '');
  const { openEvidence, setEmergencyActive, logAudit } = useVita();
  const openConflicts = useOpenConflicts();
  const [seconds, setSeconds] = useState(0);
  // StrictMode invokes mount effects twice in development. An audit trail that
  // shows the same access logged twice undermines the exact claim this screen
  // is making, so the write is guarded rather than left to the build mode.
  const logged = useRef(false);

  useEffect(() => {
    setEmergencyActive(true);
    if (!logged.current) {
      logged.current = true;
      logAudit(
        'emergency-access',
        'Emergency profile opened. Snapshot assembled from 8 linked sources.',
      );
    }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(t);
      setEmergencyActive(false);
    };
    // Intentionally runs once per emergency session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshness = useMemo(
    () => (patient ? freshnessBand(patient.sourceFreshnessDays) : 'stale'),
    [patient],
  );

  if (!patient) return <Navigate to="/emergency" replace />;

  const recentChange = recentChanges[0];

  return (
    <div className="surface-dark min-h-dvh bg-ink-950 text-white">
      {/* Critical top rule — the one piece of pure ornament, and it earns its
          place by making the mode unmistakable in peripheral vision. */}
      <div className="h-[3px] w-full bg-gradient-to-r from-critical-700 via-critical-bright to-critical-700" />

      <div className="grid-paper-dark">
        {/* --- Header ------------------------------------------------------- */}
        <header className="border-b border-ink-800 bg-ink-950/85 backdrop-blur-sm">
          {/* On a phone the mode label and session clock hold the first line and
              the patient identity wraps to its own; from `sm` up it is one row.
              Cramming identity between them at 375px made the name unreadable,
              which is the one thing this bar must never do. */}
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:flex-nowrap sm:gap-x-6 sm:px-6 sm:py-3.5">
            <div className="order-1 flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-critical-bright pulse-dot" aria-hidden />
              <span className="label-sm text-critical-300">Emergency mode</span>
            </div>

            <div className="order-2 hidden h-6 w-px bg-ink-800 sm:block" />

            <div className="order-3 flex w-full min-w-0 items-center gap-3 sm:order-2 sm:w-auto sm:flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ink-700 bg-ink-850 font-mono text-[12px] font-semibold text-ink-200">
                {patient.photoInitials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-[16px] font-semibold leading-tight">
                    {patient.displayName}
                  </h1>
                  {patient.identityVerified && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-verified-500/40 bg-verified-500/10 px-1.5 py-[3px] text-[10.5px] font-semibold uppercase tracking-wider text-verified-300">
                      <BadgeCheck className="size-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="truncate font-mono text-[11px] text-ink-400">
                  {patient.age} {patient.sex.charAt(0)} · ABHA {patient.abhaMasked} · MRN APL-449120
                </p>
              </div>
            </div>

            <div className="order-2 ml-auto flex items-center gap-4 sm:order-3">
              <div className="text-right">
                <div className="label-xs text-ink-500">Session</div>
                <div className="font-mono text-[15px] font-semibold tabular-nums text-ink-100">
                  {elapsed(seconds)}
                </div>
              </div>
              <Button
                surface="dark"
                variant="ghost"
                size="sm"
                icon={<LogOut />}
                onClick={() => navigate('/clinician')}
              >
                <span className="hidden sm:inline">Exit</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 sm:px-6 sm:py-6">
          {/* --- Row 1: the things that can kill ---------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            className="grid gap-3 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              {allergies.length > 0 ? (
                <AllergyAlert allergy={allergies[0]} size="emergency" surface="dark" />
              ) : (
                <NoneRecorded label="Allergies" note="No allergy recorded in any linked source." />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              {/* Blood group */}
              <Tile>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <TileLabel icon={<Droplet className="size-3" />}>Blood group</TileLabel>
                    <div className="mt-2 text-[38px] font-semibold leading-none tracking-tight">
                      {patient.bloodGroup.value}
                    </div>
                  </div>
                  <div className="text-right">
                    <TileLabel>Organ donor</TileLabel>
                    <div className="mt-2 text-[13px] font-medium text-ink-200">
                      {patient.organDonor ? 'Registered' : 'Not registered'}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <EvidenceBadge
                    fact={patient.bloodGroup}
                    claimLabel={`Blood group ${patient.bloodGroup.value}`}
                    surface="dark"
                  />
                </div>
              </Tile>

              {/* Source freshness */}
              <Tile>
                <TileLabel icon={<Clock3 className="size-3" />}>Source freshness</TileLabel>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[30px] font-semibold leading-none tabular-nums">
                    {patient.sourceFreshnessDays}
                  </span>
                  <span className="text-[13px] text-ink-400">days</span>
                  <Badge
                    surface="dark"
                    tone={freshness === 'current' ? 'verified' : freshness === 'recent' ? 'neutral' : 'caution'}
                    className="ml-auto"
                  >
                    {freshnessLabel[freshness]}
                  </Badge>
                </div>
                <p className="mt-2 text-[11.5px] leading-snug text-ink-400">
                  Most recent source {formatDate('2026-08-19')} · {documents.length} documents from{' '}
                  {new Set(documents.map((d) => d.source)).size} systems
                </p>
              </Tile>
            </div>
          </motion.div>

          {/* --- Recent change ---------------------------------------------- */}
          {recentChange && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.06, ease: [0.22, 0.61, 0.36, 1] }}
              onClick={() =>
                recentChange.evidenceId && openEvidence(recentChange.evidenceId, recentChange.title)
              }
              className="group mt-3 flex w-full items-center gap-3.5 rounded-lg border border-caution-500/40 bg-caution-500/[0.08] px-4 py-3.5 text-left transition-colors hover:border-caution-500/70 hover:bg-caution-500/[0.13]"
            >
              <Activity className="size-4 shrink-0 text-caution-bright" strokeWidth={2.2} />
              <div className="min-w-0 flex-1">
                <div className="label-xs text-caution-300">Recent change · last 30 days</div>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-white">
                  Atorvastatin increased 10 mg → 20 mg
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-300">
                  {formatDate(recentChange.date)} · {relativeAge(recentChange.date)} ·{' '}
                  {recentChange.facility}
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-caution-300 sm:flex">
                View source
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          )}

          {/* --- Conflicts --------------------------------------------------- */}
          {openConflicts.length > 0 && <ConflictBanner count={openConflicts.length} />}

          {/* --- Row 2: current state ---------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-3 grid gap-3 lg:grid-cols-12"
          >
            {/* Medications */}
            <section className="lg:col-span-5">
              <Tile padded={false}>
                <TileHeader
                  icon={<HeartPulse className="size-3.5" />}
                  title="Active medications"
                  count={activeMedications.length}
                />
                <div className="space-y-2 p-3">
                  {activeMedications.map((m) => (
                    <MedicationCard key={m.id} medication={m} surface="dark" compact />
                  ))}
                </div>
              </Tile>
            </section>

            {/* Conditions */}
            <section className="lg:col-span-4">
              <Tile padded={false}>
                <TileHeader
                  icon={<Stethoscope className="size-3.5" />}
                  title="Active conditions"
                  count={conditions.filter((c) => c.status === 'active').length}
                />
                <div className="space-y-2 p-3">
                  {conditions
                    .filter((c) => c.status === 'active')
                    .map((c) => (
                      <ConditionCard key={c.id} condition={c} surface="dark" compact />
                    ))}
                </div>
              </Tile>
            </section>

            {/* History, implants, contact */}
            <section className="space-y-3 lg:col-span-3">
              <Tile padded={false}>
                <TileHeader icon={<History className="size-3.5" />} title="Major history" count={majorHistory.length} />
                <ul className="divide-y divide-ink-800">
                  {majorHistory.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => e.evidenceId && openEvidence(e.evidenceId, e.title)}
                        className="group w-full px-3.5 py-2.5 text-left transition-colors hover:bg-ink-800/60"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-ink-100">
                            {e.title}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-ink-500">
                            {e.date.slice(0, 4)}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Tile>

              {implants.length > 0 && (
                <Tile>
                  <TileLabel icon={<ScanLine className="size-3" />}>Implanted device</TileLabel>
                  {implants.map((im) => (
                    <p key={im} className="mt-2 text-[12.5px] font-medium leading-snug text-ink-100">
                      {im}
                    </p>
                  ))}
                  <p className="mt-2 text-[11.5px] leading-snug text-caution-300">
                    Verify device card before MR imaging.
                  </p>
                </Tile>
              )}
            </section>
          </motion.div>

          {/* --- Row 3: contacts --------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            {patient.emergencyContacts.map((c) => (
              <Tile key={c.phone}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <TileLabel icon={<Phone className="size-3" />}>
                      {c.isCaregiver ? 'Emergency contact · caregiver' : 'Emergency contact'}
                    </TileLabel>
                    <p className="mt-1.5 truncate text-[14px] font-semibold text-white">{c.name}</p>
                    <p className="text-[12px] text-ink-400">{c.relationship}</p>
                  </div>
                  <div className="text-right">
                    <div className="whitespace-nowrap font-mono text-[14px] font-medium tabular-nums text-ink-100">
                      {c.phoneMasked}
                    </div>
                    <a
                      href={`tel:${c.phone.replace(/\s/g, '')}`}
                      className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-bright hover:underline"
                    >
                      Reveal & call
                      <ArrowUpRight className="size-3" />
                    </a>
                  </div>
                </div>
              </Tile>
            ))}
          </motion.div>

          {/* --- Honest gaps -------------------------------------------------- */}
          <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-500">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            <span>
              This snapshot reflects {documents.length} linked sources only. Absence of a record here is
              not evidence of absence of a condition. VITA does not diagnose, recommend treatment, or
              alter medication records — it reports what its sources say and where they say it.
            </span>
          </p>
        </main>
      </div>

      {/* --- Sticky action bar ---------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-3 sm:px-6">
          <Button
            surface="dark"
            variant="primary"
            size="md"
            icon={<FileStack />}
            onClick={() => navigate('/app/timeline')}
            className="flex-1 sm:flex-none"
          >
            View full context
          </Button>
          <Button
            surface="dark"
            variant="secondary"
            size="md"
            icon={<Scale />}
            onClick={() => navigate('/app/documents')}
            className="flex-1 sm:flex-none"
          >
            View sources
          </Button>
          <div className="ml-auto hidden items-center gap-2 font-mono text-[11px] text-ink-500 md:flex">
            <span className="text-verified-bright">●</span> Break-glass access · expires 10:41 ·
            <Link to="/app/consent" className="underline decoration-ink-600 underline-offset-2 hover:text-ink-300">
              audit trail
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Local building blocks --------------------------------------------------- */

function Tile({
  children,
  padded = true,
  className,
}: {
  children: React.ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-ink-800 bg-ink-900/80 backdrop-blur-[2px]',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

function TileLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="label-xs flex items-center gap-1.5 text-ink-400">
      {icon}
      {children}
    </div>
  );
}

function TileHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
      <div className="label-xs flex items-center gap-1.5 text-ink-400">
        {icon}
        {title}
      </div>
      <span className="font-mono text-[13px] font-semibold tabular-nums text-ink-200">{count}</span>
    </div>
  );
}

function NoneRecorded({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/80 p-5">
      <FieldLabel surface="dark">{label}</FieldLabel>
      <p className="mt-2 text-[20px] font-semibold text-ink-300">None recorded</p>
      <p className="mt-1.5 text-[12.5px] text-ink-500">{note}</p>
    </div>
  );
}

function ConflictBanner({ count }: { count: number }) {
  const { openConflict } = useVita();
  const conflicts = useOpenConflicts();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.09 }}
      className="hatch-caution mt-3 rounded-lg border border-caution-500/40 bg-caution-500/[0.06] px-4 py-3.5"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution-bright" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-caution-300">
            Conflicting records detected — clinician verification required
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
            {count === 1 ? 'One value has' : `${count} values have`} disagreeing sources. VITA has not
            selected between them.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {conflicts.map((c) => (
              <button
                key={c.id}
                onClick={() => openConflict(c.id)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-caution-500/50 bg-ink-900 px-2 py-1 text-[11.5px] font-medium text-caution-300 transition-colors hover:bg-caution-500/15"
              >
                {c.subject}
                <ChevronRight className="size-3" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
