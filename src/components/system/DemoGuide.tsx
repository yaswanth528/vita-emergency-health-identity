import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Stethoscope, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { kavita } from '@/data/patient';
import { clinicianUser } from '@/data/platform';
import { useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/platform';

/* ============================================================================
   DemoGuide
   ----------------------------------------------------------------------------
   A guided walkthrough of the connected loop, for a judge with no context.

   It drives the real application and the real store: when a step says the
   patient activates an emergency, it calls `activateEmergency`, which is the
   same function the patient's own button calls. The clinician's alert then
   appears because the state genuinely changed — not because the next slide
   says so.
   ========================================================================== */

type Action = 'activate-emergency' | 'break-glass' | 'open-evidence' | 'open-conflict';

interface Step {
  as?: Role;
  route: string;
  title: string;
  detail: string;
  action?: Action;
}

const STEPS: Step[] = [
  {
    route: '/',
    title: 'The problem',
    detail:
      'The information already exists — it just is not where the decision is. Right now the patient is the integration layer.',
  },
  {
    as: 'patient',
    route: '/app/dashboard',
    title: 'The patient owns the record',
    detail:
      'Kavita Menon signs in. Emergency profile ready, identity verified, and a pending access request she has not answered. Nothing is shared yet.',
  },
  {
    as: 'patient',
    route: '/app/dashboard',
    title: 'She activates an emergency',
    detail:
      'One press, after a confirmation that spells out what it does and does not do. It alerts her care circle — it releases nothing on its own.',
    action: 'activate-emergency',
  },
  {
    as: 'clinician',
    route: '/clinician',
    title: 'It lands on the clinician board',
    detail:
      'Same session, other side. Dr. Rao did not refresh anything — the alert is the same object the patient just created.',
  },
  {
    as: 'clinician',
    route: '/emergency/pt-4491',
    title: 'Break glass, with a reason',
    detail:
      'Opening the context needs a written reason, expires in two hours, and notifies the patient. Then: PENICILLIN — anaphylaxis, blood group, four medications, conditions, major history.',
    action: 'break-glass',
  },
  {
    as: 'clinician',
    route: '/emergency/pt-4491',
    title: 'Every claim has evidence',
    detail:
      'The recent medication change opens its source: Prescription_12Aug.pdf, 12 Aug 2026, 96% confidence, with the cited line highlighted in the original.',
    action: 'open-evidence',
  },
  {
    as: 'clinician',
    route: '/emergency/pt-4491',
    title: 'Conflicts are not resolved',
    detail:
      'Two prescriptions disagree on the statin dose. PULSE shows both and stops — no recency rule, no tie-break. A clinician decides, and their name goes on it.',
    action: 'open-conflict',
  },
  {
    as: 'patient',
    route: '/app/notifications',
    title: 'The patient is told',
    detail:
      'Back on her side, unprompted: “Dr. Arjun Rao accessed your emergency health context”, with the reason he typed and the expiry. This is the loop closing.',
  },
  {
    as: 'patient',
    route: '/app/consent',
    title: 'Permissioned and auditable',
    detail:
      'The break-glass grant is now listed, live, revocable, with an expiry. The audit trail below contains the reads you just made from the other side.',
  },
  {
    route: '/',
    title: 'Source-backed. Permissioned. Fast.',
    detail:
      'Two products over one record. The patient owns it, the clinician borrows it with a reason, and the trail shows exactly what happened.',
  },
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    openEvidence,
    openConflict,
    closeViewer,
    signInAs,
    activateEmergency,
    openEmergencyContext,
    emergencies,
  } = useVita();

  const onEmergency = location.pathname.startsWith('/emergency/');
  const step = STEPS[index];

  const runAction = (a: Action) => {
    if (a === 'activate-emergency') {
      const already = emergencies.some((e) => e.patientId === kavita.id && e.status === 'active');
      if (!already) activateEmergency(kavita.id, 'Hyderabad · approximate');
    }
    if (a === 'break-glass') {
      openEmergencyContext(
        kavita.id,
        clinicianUser.clinicianId!,
        'Patient unconscious and unable to provide history.',
      );
    }
    if (a === 'open-evidence')
      openEvidence('ev-dose-change', 'Atorvastatin increased 10 mg → 20 mg');
    if (a === 'open-conflict') openConflict('cfl-atorvastatin');
  };

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    const s = STEPS[clamped];
    setIndex(clamped);
    closeViewer();
    if (s.as) signInAs(s.as);
    if (location.pathname !== s.route) navigate(s.route);
    if (s.action) {
      // Let the route settle before mutating state or opening the drawer.
      window.setTimeout(() => runAction(s.action!), 430);
    }
  };

  const start = () => {
    setOpen(true);
    setIndex(0);
    if (location.pathname !== STEPS[0].route) navigate(STEPS[0].route);
  };

  return (
    <div
      className={cn(
        // Above the evidence drawer (z-50): several steps open it, and on a
        // phone it covers the full width — Next has to stay reachable.
        'fixed left-4 z-[80] print:hidden',
        onEmergency ? 'bottom-[76px] sm:bottom-[74px]' : 'bottom-4',
      )}
    >
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.button
            key="pill"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            onClick={start}
            className="surface-dark inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/95 px-3.5 py-2 text-[12.5px] font-medium text-ink-100 shadow-raised backdrop-blur-sm transition-colors hover:bg-ink-800"
          >
            <Play className="size-3 fill-current" />
            Guided demo
            <span className="font-mono text-[10.5px] text-ink-500">2 min</span>
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="surface-dark absolute bottom-0 left-0 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ink-700 bg-ink-900/97 shadow-raised backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-ink-800 px-3.5 py-2.5">
              <span className="label-xs text-ink-400">
                Guided demo · {index + 1} of {STEPS.length}
              </span>
              <div className="flex items-center gap-2">
                {step.as && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[10px] font-semibold uppercase tracking-wider',
                      step.as === 'patient'
                        ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                        : 'border-critical-500/40 bg-critical-500/10 text-critical-300',
                    )}
                  >
                    {step.as === 'patient' ? (
                      <UserRound className="size-2.5" />
                    ) : (
                      <Stethoscope className="size-2.5" />
                    )}
                    {step.as}
                  </span>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    closeViewer();
                  }}
                  aria-label="Close guided demo"
                  className="rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="px-3.5 py-3.5">
              <h3 className="text-[14px] font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{step.detail}</p>
            </div>

            <div className="flex items-center gap-2 border-t border-ink-800 px-3.5 py-2.5">
              <div className="flex flex-1 gap-1" aria-hidden>
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-0.5 flex-1 rounded-full transition-colors',
                      i <= index ? 'bg-critical-bright' : 'bg-ink-700',
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() => go(index - 1)}
                disabled={index === 0}
                aria-label="Previous step"
                className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                onClick={() => (index === STEPS.length - 1 ? setOpen(false) : go(index + 1))}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-950 transition-colors hover:bg-ink-100"
              >
                {index === STEPS.length - 1 ? 'Finish' : 'Next'}
                {index < STEPS.length - 1 && <ChevronRight className="size-3.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
