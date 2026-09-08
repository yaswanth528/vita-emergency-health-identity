import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Play, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, FieldLabel, Progress } from '@/components/ui';
import { pipelineStages, runPipeline, type StageProgress } from '@/lib/aiService';
import { cn } from '@/lib/utils';
import type { PipelineStageId } from '@/types';

/* ============================================================================
   AIProcessing
   ----------------------------------------------------------------------------
   Deliberately not a spinner with the word "AI" next to it.

   Each stage states what it is doing and then reports countable results —
   "41 medical entities extracted", "2 conflicts detected — held for clinician
   verification". Every number is computed from the actual fixture data, so the
   display stays true if the data changes.

   The stage that matters most is Reconcile, and the line that matters most in
   it is "0 values auto-resolved".
   ========================================================================== */

type Status = 'idle' | 'running' | 'complete';

export function AIProcessing({
  autoStart = false,
  onComplete,
}: {
  autoStart?: boolean;
  onComplete?: () => void;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string[]>>({});
  const cancelRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    cancelRef.current?.();
    setRevealed({});
    setProgress(null);
    setStatus('running');
    cancelRef.current = runPipeline(
      (p) => {
        setProgress(p);
        setRevealed((prev) => ({ ...prev, [p.stage.id]: p.revealed }));
      },
      () => {
        setStatus('complete');
        onComplete?.();
      },
    );
  }, [onComplete]);

  useEffect(() => {
    if (autoStart) start();
    return () => cancelRef.current?.();
  }, [autoStart, start]);

  const stageState = (_id: PipelineStageId, index: number): 'pending' | 'active' | 'done' => {
    if (status === 'complete') return 'done';
    if (!progress) return index === 0 && status === 'running' ? 'active' : 'pending';
    if (index < progress.stageIndex) return 'done';
    if (index === progress.stageIndex) return progress.done ? 'done' : 'active';
    return 'pending';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <FieldLabel>Pipeline</FieldLabel>
          <p className="mt-1.5 text-[13px] text-ink-500">
            {status === 'idle' && 'Ready to process 8 queued documents.'}
            {status === 'running' && `Running — ${progress?.stage.label ?? 'starting'}…`}
            {status === 'complete' && 'Complete. Health graph rebuilt and snapshot regenerated.'}
          </p>
        </div>
        <Button
          variant={status === 'complete' ? 'secondary' : 'primary'}
          icon={status === 'complete' ? <RotateCcw /> : status === 'running' ? <Loader2 className="animate-spin" /> : <Play />}
          onClick={start}
          disabled={status === 'running'}
        >
          {status === 'complete' ? 'Run again' : status === 'running' ? 'Processing…' : 'Run pipeline'}
        </Button>
      </div>

      <ol className="space-y-2.5">
        {pipelineStages.map((stage, i) => {
          const state = stageState(stage.id, i);
          const lines = revealed[stage.id] ?? [];
          const pct =
            state === 'done' ? 100 : state === 'active' ? (progress?.progress ?? 0) * 100 : 0;

          return (
            <li key={stage.id}>
              <Card
                padded={false}
                className={cn(
                  'overflow-hidden transition-[border-color,opacity] duration-300',
                  state === 'pending' && 'opacity-55',
                  state === 'active' && 'border-accent-300',
                )}
              >
                <div className="flex items-start gap-3.5 px-4 py-3.5">
                  <StageMarker index={i} state={state} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-ink-900">{stage.label}</h3>
                      {state === 'active' && (
                        <Badge tone="accent">running</Badge>
                      )}
                      {state === 'done' && <Badge tone="verified">done</Badge>}
                    </div>
                    <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
                      {stage.description}
                    </p>

                    {(state === 'active' || state === 'done') && (
                      <Progress
                        value={pct}
                        tone={state === 'done' ? 'verified' : 'accent'}
                        className="mt-3"
                      />
                    )}

                    <AnimatePresence initial={false}>
                      {lines.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 space-y-1.5"
                        >
                          {lines.map((line) => {
                            // Three kinds of result line, and the distinction
                            // matters. "2 conflicts detected" needs attention.
                            // "0 values auto-resolved" is the system behaving
                            // correctly, so it must not be dressed as a fault.
                            const kind = line.includes('auto-resolved')
                              ? 'principle'
                              : line.includes('withheld') || line.includes('conflicts detected')
                                ? 'attention'
                                : 'ok';
                            return (
                              <motion.li
                                key={line}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.22 }}
                                className={cn(
                                  'flex items-start gap-2 font-mono text-[11.5px] leading-snug',
                                  kind === 'attention'
                                    ? 'text-caution-600'
                                    : kind === 'principle'
                                      ? 'font-medium text-ink-900'
                                      : 'text-ink-600',
                                )}
                              >
                                {kind === 'attention' ? (
                                  <TriangleAlert className="mt-px size-3 shrink-0" />
                                ) : kind === 'principle' ? (
                                  <ShieldCheck className="mt-px size-3 shrink-0 text-ink-700" />
                                ) : (
                                  <Check className="mt-px size-3 shrink-0 text-verified-500" />
                                )}
                                {line}
                                {kind === 'principle' && (
                                  <span className="ml-1 shrink-0 not-italic text-ink-400">
                                    · by design
                                  </span>
                                )}
                              </motion.li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageMarker({ index, state }: { index: number; state: 'pending' | 'active' | 'done' }) {
  return (
    <div
      className={cn(
        'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold transition-colors duration-300',
        state === 'done'
          ? 'border-verified-100 bg-verified-50 text-verified-600'
          : state === 'active'
            ? 'border-accent-300 bg-accent-50 text-accent-600'
            : 'border-line bg-canvas-sunk text-ink-400',
      )}
    >
      {state === 'done' ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : state === 'active' ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        String(index + 1).padStart(2, '0')
      )}
    </div>
  );
}
