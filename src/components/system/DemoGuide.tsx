import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';

/* ============================================================================
   DemoGuide
   ----------------------------------------------------------------------------
   A two-minute guided walkthrough, for a judge with no context and no patience.

   It navigates the real application rather than playing a recording, and where
   a step is about an interaction (opening the evidence drawer) it performs that
   interaction, so what is being demonstrated is the product itself.
   ========================================================================== */

interface Step {
  route: string;
  title: string;
  detail: string;
  /** Optional side effect, e.g. opening the evidence drawer. */
  action?: 'open-evidence' | 'open-conflict';
}

const STEPS: Step[] = [
  {
    route: '/',
    title: 'The problem',
    detail:
      'The information already exists — it just is not where the decision is. Right now the patient is the integration layer.',
  },
  {
    route: '/emergency',
    title: 'Identify',
    detail:
      'A clinician identifies the patient. Note the registry is not uniform: one patient needs break-glass, one cannot be released at all because their identity is unverified.',
  },
  {
    route: '/emergency/pt-4491',
    title: 'Emergency Mode',
    detail:
      'Identity verified, authorisation confirmed, snapshot assembled. One dominant fact: PENICILLIN — anaphylaxis. Then blood group, four active medications, conditions, major history, freshness.',
  },
  {
    route: '/emergency/pt-4491',
    title: 'Every claim has evidence',
    detail:
      'The recent medication change opens its source: Prescription_12Aug.pdf, 12 Aug 2026, 96% confidence, with the cited line highlighted in the original document.',
    action: 'open-evidence',
  },
  {
    route: '/emergency/pt-4491',
    title: 'Conflicts are not resolved',
    detail:
      'Two prescriptions disagree about the statin dose. PULSE shows both and stops — no recency rule, no confidence tie-break. A clinician decides, and their name goes on the decision.',
    action: 'open-conflict',
  },
  {
    route: '/app/timeline',
    title: 'How the history was built',
    detail:
      'Ten years reconstructed from eight documents across seven systems, with each event linked to the medications and conditions it touches. This is a graph, not a folder.',
  },
  {
    route: '/app/ingest',
    title: 'What the AI actually did',
    detail:
      'Ingest, extract, reconcile, build graph, synthesise — with countable outputs at each stage. The line that matters: 0 values auto-resolved.',
  },
  {
    route: '/app/consent',
    title: 'Permissioned and auditable',
    detail:
      'Who has access, why, what exactly they can see, and when it expires. The audit trail below now contains the evidence you opened two steps ago.',
  },
  {
    route: '/emergency/pt-4491',
    title: 'Source-backed. Permissioned. Fast.',
    detail:
      'Back where a clinician needs to be — with the context, and with a way to check every word of it.',
  },
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { openEvidence, openConflict, closeViewer } = useVita();

  const onEmergency = location.pathname.startsWith('/emergency/');
  const step = STEPS[index];

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    const s = STEPS[clamped];
    setIndex(clamped);
    closeViewer();
    if (location.pathname !== s.route) navigate(s.route);
    if (s.action) {
      // Let the route settle before opening the drawer over it.
      window.setTimeout(() => {
        if (s.action === 'open-evidence')
          openEvidence('ev-dose-change', 'Atorvastatin increased 10 mg → 20 mg');
        if (s.action === 'open-conflict') openConflict('cfl-atorvastatin');
      }, 420);
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
        // Above the evidence drawer (z-50): steps 4 and 5 open the drawer, and
        // on a phone it covers the full width — the Next control has to stay
        // reachable or the walkthrough dead-ends.
        'fixed left-4 z-[60] print:hidden',
        onEmergency ? 'bottom-[76px] sm:bottom-[74px]' : 'bottom-4',
      )}
    >
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="pill"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
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
            className="surface-dark w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ink-700 bg-ink-900/97 shadow-raised backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-ink-800 px-3.5 py-2.5">
              <span className="label-xs text-ink-400">
                Guided demo · {index + 1} of {STEPS.length}
              </span>
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
