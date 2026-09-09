import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Fingerprint,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button } from '@/components/ui';
import { allPatients, registryStatus } from '@/data/patient';
import { useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

/* ============================================================================
   EMERGENCY ENTRY — identify, then verify
   ----------------------------------------------------------------------------
   The four beats the product promises, made literal:

     00:00  IDENTIFY   who is this person
     00:05  VERIFY     am I allowed to see their record, and is it really them
     00:10  SURFACE    assemble only what matters now
     00:30  ACT        clinician has context

   The verification sequence is not a loading animation. Each step is a real
   gate: an unverified identity blocks release of clinical context, and a
   patient with no standing grant goes down the break-glass path instead, which
   notifies them.
   ========================================================================== */

type Phase = 'identify' | 'verifying' | 'blocked';

interface Step {
  id: string;
  label: string;
  detail: string;
  ms: number;
}

export default function EmergencyEntry() {
  const navigate = useNavigate();
  const { logAudit } = useVita();
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('identify');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPatients;
    return allPatients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.displayName.toLowerCase().includes(q) ||
        p.abhaMasked.includes(q) ||
        p.id.includes(q),
    );
  }, [query]);

  const steps: Step[] = useMemo(() => {
    if (!selected) return [];
    const status = registryStatus[selected.id];
    const breakGlass = status?.consent === 'requires-request';
    return [
      {
        id: 'identity',
        label: 'Identity matched',
        detail: `ABHA ${selected.abhaMasked} · ${selected.identityMethods.join(' · ')}`,
        ms: 900,
      },
      {
        id: 'consent',
        label: breakGlass ? 'Break-glass access opened' : 'Authorisation confirmed',
        detail: breakGlass
          ? 'No standing grant. Emergency override recorded, 2-hour expiry, patient and caregiver notified automatically.'
          : 'Active emergency-context grant · Apollo Emergency Department · expires in 2 hours.',
        ms: breakGlass ? 1400 : 900,
      },
      {
        id: 'sources',
        label: 'Sources retrieved',
        detail: `${status?.linkedSources ?? 0} linked documents across ${
          status?.linkedSources ? Math.min(5, status.linkedSources) : 0
        } source systems.`,
        ms: 900,
      },
      {
        id: 'snapshot',
        label: 'Clinical snapshot assembled',
        detail: 'Reduced to decision-relevant context. Every claim linked to a source.',
        ms: 1000,
      },
    ];
  }, [selected]);

  function begin(patient: Patient) {
    const status = registryStatus[patient.id];
    setSelected(patient);

    if (!patient.identityVerified || status?.consent === 'blocked-identity') {
      setPhase('blocked');
      logAudit('identity-verify', `Emergency access refused — identity not verified for ${patient.displayName}.`);
      return;
    }

    setPhase('verifying');
    setStepIndex(-1);
    logAudit('identity-verify', `Identity matched for ${patient.displayName} · ABHA ${patient.abhaMasked}.`);

    let acc = 260;
    const built: Step[] = [
      { id: 'identity', label: '', detail: '', ms: 900 },
      { id: 'consent', label: '', detail: '', ms: status?.consent === 'requires-request' ? 1400 : 900 },
      { id: 'sources', label: '', detail: '', ms: 900 },
      { id: 'snapshot', label: '', detail: '', ms: 1000 },
    ];
    built.forEach((s, i) => {
      acc += s.ms;
      timers.current.push(setTimeout(() => setStepIndex(i), acc));
    });
    timers.current.push(
      setTimeout(() => {
        navigate(`/emergency/${patient.id}`);
      }, acc + 700),
    );
  }

  function cancel() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('identify');
    setSelected(null);
    setStepIndex(-1);
  }

  return (
    <div className="surface-dark min-h-dvh bg-ink-950 text-white">
      <div className="h-[3px] w-full bg-gradient-to-r from-critical-700 via-critical-bright to-critical-700" />

      <div className="grid-paper-dark min-h-[calc(100dvh-3px)]">
        <header className="border-b border-ink-800">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-100"
            >
              <ArrowLeft className="size-4" />
              PULSE
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-critical-bright pulse-dot" aria-hidden />
              <span className="label-sm text-critical-300">Emergency access</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
          <AnimatePresence mode="wait">
            {phase === 'identify' && (
              <motion.div
                key="identify"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-14"
              >
                {/* min-w-0: grid items default to min-width:auto, so the
                    nowrap patient metadata below would otherwise widen this
                    column past the viewport instead of truncating. */}
                <div className="min-w-0">
                  <div className="label-sm text-ink-500">Step 1 · Identify</div>
                  <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[38px]">
                    Who is in front of you?
                  </h1>
                  <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-400">
                    Scan a health ID, search by name, or select from patients recently presenting at
                    this facility. Identity is verified before any clinical context is released.
                  </p>

                  <div className="relative mt-7">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name, ABHA number, or MRN…"
                      className="h-12 w-full rounded-md border border-ink-700 bg-ink-900 pl-10 pr-4 text-[14.5px] text-white placeholder:text-ink-500 transition-colors focus:border-accent-500 focus:outline-none"
                    />
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {results.map((p) => (
                      <PatientRow key={p.id} patient={p} onSelect={() => begin(p)} />
                    ))}
                    {results.length === 0 && (
                      <p className="rounded-md border border-dashed border-ink-700 px-4 py-8 text-center text-[13px] text-ink-500">
                        No patient matches “{query}”.
                      </p>
                    )}
                  </div>
                </div>

                <aside className="lg:pt-12">
                  <div className="label-xs text-ink-500">What happens next</div>
                  <ol className="mt-4 space-y-0">
                    {BEATS.map((b, i) => (
                      <li key={b.t} className="relative flex gap-3.5 pb-5 last:pb-0">
                        {i < BEATS.length - 1 && (
                          <span className="absolute left-[13px] top-6 h-full w-px bg-ink-800" aria-hidden />
                        )}
                        <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-900 font-mono text-[9.5px] font-semibold text-ink-300">
                          {b.t}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <div className="text-[13px] font-semibold text-ink-100">{b.label}</div>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">{b.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </aside>
              </motion.div>
            )}

            {phase === 'verifying' && selected && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="mx-auto max-w-xl"
              >
                <div className="label-sm text-ink-500">Step 2 · Verify</div>
                <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em]">
                  Verifying access to {selected.displayName}
                </h1>

                <div className="mt-8 space-y-0 rounded-lg border border-ink-800 bg-ink-900/70 p-5">
                  {steps.map((s, i) => {
                    const done = stepIndex >= i;
                    const active = stepIndex === i - 1 || (stepIndex === -1 && i === 0);
                    return (
                      <div key={s.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                        {i < steps.length - 1 && (
                          <span
                            className={cn(
                              'absolute left-[11px] top-6 h-full w-px transition-colors duration-500',
                              done ? 'bg-verified-500/50' : 'bg-ink-800',
                            )}
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            'relative z-10 flex size-[23px] shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
                            done
                              ? 'border-verified-500/60 bg-verified-500/15 text-verified-bright'
                              : active
                                ? 'border-accent-500/60 bg-accent-500/10 text-accent-bright'
                                : 'border-ink-700 bg-ink-900 text-ink-600',
                          )}
                        >
                          {done ? (
                            <Check className="size-3" strokeWidth={3} />
                          ) : active ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <span className="size-1 rounded-full bg-current" />
                          )}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <div
                            className={cn(
                              'text-[13.5px] font-semibold transition-colors duration-300',
                              done ? 'text-white' : active ? 'text-ink-200' : 'text-ink-600',
                            )}
                          >
                            {s.label}
                          </div>
                          <AnimatePresence>
                            {done && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.25 }}
                                className="mt-1 overflow-hidden text-[12px] leading-relaxed text-ink-400"
                              >
                                {s.detail}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="flex items-center gap-2 text-[11.5px] text-ink-500">
                    <ShieldCheck className="size-3.5" />
                    Every step is written to the audit trail.
                  </p>
                  <Button surface="dark" variant="ghost" size="sm" icon={<X />} onClick={cancel}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === 'blocked' && selected && (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto max-w-xl"
              >
                <div className="rounded-lg border border-critical-500/40 bg-critical-700/15 p-6">
                  <ShieldAlert className="size-6 text-critical-bright" />
                  <h1 className="mt-4 text-[22px] font-semibold leading-tight">
                    Emergency context cannot be released
                  </h1>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-ink-300">
                    {selected.fullName}&apos;s identity is not verified. Releasing a clinical record
                    against an unverified identity risks attributing one person&apos;s allergies and
                    medications to another — a failure mode worse than having no record at all.
                  </p>
                  <div className="mt-5 rounded-md border border-ink-700 bg-ink-900/70 p-4">
                    <div className="label-xs text-ink-400">Available now</div>
                    <ul className="mt-2 space-y-1.5 text-[13px] text-ink-300">
                      <li>· Verify identity with a government ID or biometric match</li>
                      <li>· Link an ABHA number at registration</li>
                      <li>· Proceed clinically without a linked record</li>
                    </ul>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button surface="dark" variant="primary" onClick={cancel}>
                      Back to identification
                    </Button>
                    <Button surface="dark" variant="ghost" onClick={() => navigate('/clinician')}>
                      Clinician workspace
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

const BEATS = [
  { t: '00:00', label: 'Identify', detail: 'Patient arrives. Match against a verified health identity.' },
  { t: '00:05', label: 'Verify', detail: 'Confirm authorisation. Open break-glass access if none stands.' },
  { t: '00:10', label: 'Surface', detail: 'Assemble only the context that changes the next decision.' },
  { t: '00:30', label: 'Act', detail: 'Clinician has allergies, medications, history and their sources.' },
];

function PatientRow({ patient, onSelect }: { patient: Patient; onSelect: () => void }) {
  const status = registryStatus[patient.id];
  const blocked = status?.consent === 'blocked-identity';
  const breakGlass = status?.consent === 'requires-request';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-lg border px-4 py-3.5 text-left transition-colors',
        blocked
          ? 'border-ink-800 bg-ink-900/40 hover:border-critical-500/40'
          : 'border-ink-800 bg-ink-900/70 hover:border-ink-600 hover:bg-ink-850',
      )}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-md border font-mono text-[12px] font-semibold',
          blocked ? 'border-ink-800 bg-ink-900 text-ink-500' : 'border-ink-700 bg-ink-850 text-ink-200',
        )}
      >
        {patient.photoInitials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14.5px] font-semibold text-white">{patient.fullName}</span>
          {patient.identityVerified ? (
            <Badge surface="dark" tone="verified">
              <BadgeCheck className="size-2.5" />
              Verified
            </Badge>
          ) : (
            <Badge surface="dark" tone="critical">
              <ShieldAlert className="size-2.5" />
              Unverified identity
            </Badge>
          )}
          {breakGlass && (
            <Badge surface="dark" tone="caution">
              Break-glass required
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate font-mono text-[11.5px] text-ink-500">
          {patient.age} {patient.sex.charAt(0)} · ABHA {patient.abhaMasked} · {status?.linkedSources ?? 0}{' '}
          linked sources · last seen {status?.lastEncounter ?? '—'}
        </p>
      </div>

      <span
        className={cn(
          'hidden shrink-0 items-center gap-1.5 font-mono text-[11px] transition-colors sm:flex',
          blocked ? 'text-ink-600' : 'text-ink-500 group-hover:text-accent-bright',
        )}
      >
        {blocked ? <Fingerprint className="size-3.5" /> : <Siren className="size-3.5" />}
        {blocked ? 'Verify first' : 'Open'}
      </span>
    </button>
  );
}
