import { CloudUpload, FileText, Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AIProcessing } from '@/components/system/AIProcessing';
import { Badge, Card, FieldLabel, SectionHeader, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { documents } from '@/data/documents';
import { extractions, rejectedExtractions } from '@/data/extractions';
import { useOpenConflicts, useVita } from '@/hooks/useVita';
import { CONFIDENCE_THRESHOLD } from '@/lib/aiService';
import { fileSize } from '@/lib/format';

/* ============================================================================
   AI processing
   ----------------------------------------------------------------------------
   The screen that answers a judge's real question: "what is the AI actually
   doing here, beyond summarising a PDF?"

   Answer, made visible: structure, terminology binding, reconciliation across
   time, conflict detection, and a refusal to assert anything below threshold.
   ========================================================================== */

export default function Ingest() {
  const [ran, setRan] = useState(false);
  const conflicts = useOpenConflicts();
  const { openConflict } = useVita();

  return (
    <>
      <PageHeader
        eyebrow="Intelligence layer"
        title="AI processing"
        description="Fragmented documents in, structured and reconciled clinical context out. Nothing here diagnoses; the work is making existing records usable."
      />

      <PageBody className="space-y-9">
        {/* --- Queue -------------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={`${documents.length} in queue`}
            title="Source documents"
            action={
              <Link to="/app/documents" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Open document centre
              </Link>
            }
          />

          <div className="mt-4 rounded-lg border border-dashed border-line-strong bg-canvas-sunk/50 px-5 py-6">
            <div className="flex flex-col items-center text-center">
              <CloudUpload className="size-5 text-ink-300" />
              <p className="mt-2.5 text-[13.5px] font-medium text-ink-700">
                Drop a prescription, discharge summary, lab report or scan
              </p>
              <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-500">
                PDF, JPG or PNG. Handwritten scans are accepted and routed through OCR — with a lower
                acceptance threshold applied to what they assert.
              </p>
            </div>
          </div>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2.5 rounded-md border border-line bg-white px-3 py-2.5"
              >
                <FileText className="size-3.5 shrink-0 text-ink-300" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-800">
                  {d.filename}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-ink-400">
                  {fileSize(d.sizeKb)}
                </span>
                <Badge tone={d.status === 'needs-review' ? 'caution' : 'neutral'}>
                  {d.pages}p
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        {/* --- Pipeline ----------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Ingest → Extract → Reconcile → Graph → Snapshot"
            title="Processing pipeline"
            description="Each stage reports countable output. If a number here is unimpressive, that is information too."
          />
          <div className="mt-4">
            <AIProcessing onComplete={() => setRan(true)} />
          </div>
        </section>

        {/* --- What reconciliation found ------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow="Reconciliation output"
            title="What the pipeline refused to decide"
            description="The most important behaviour in a clinical AI system is knowing when to stop."
          />

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Card accent="caution" className="hatch-caution">
              <div className="flex items-start gap-2.5">
                <Scale className="mt-0.5 size-4 shrink-0 text-caution-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-ink-900">
                    {conflicts.length} conflicting record{conflicts.length === 1 ? '' : 's'}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    Sources disagree. No recency heuristic, no confidence tie-break, no silent merge —
                    both records stay visible until a clinician records a decision.
                  </p>
                  <div className="mt-3 space-y-2">
                    {conflicts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openConflict(c.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-caution-100 bg-white px-3 py-2 text-left transition-colors hover:border-caution-300"
                      >
                        <span className="min-w-0 truncate text-[12.5px] font-medium text-ink-800">
                          {c.subject}
                        </span>
                        <span className="shrink-0 font-mono text-[10.5px] text-caution-600">
                          {c.claims.length} sources
                        </span>
                      </button>
                    ))}
                    {conflicts.length === 0 && (
                      <p className="text-[12.5px] text-verified-600">
                        All conflicts have been verified by a clinician in this session.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card accent="caution">
              <div className="flex items-start gap-2.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-ink-900">
                    {rejectedExtractions.length} value withheld below threshold
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    Extracted, scored under {CONFIDENCE_THRESHOLD}%, and deliberately not written into
                    the health graph.
                  </p>
                  <div className="mt-3 space-y-2">
                    {rejectedExtractions.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-md border border-caution-100 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate font-mono text-[12px] text-ink-800">
                            “{e.surfaceForm}”
                          </span>
                          <span className="shrink-0 font-mono text-[11px] font-semibold text-caution-600">
                            {e.confidence}%
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] text-ink-500">{e.normalised}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* --- Result ------------------------------------------------------- */}
        <section>
          <SectionHeader eyebrow="Output" title="What this produced" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResultStat label="Entities extracted" value={String(extractions.length)} />
            <ResultStat
              label="Terminology-bound"
              value={String(extractions.filter((e) => e.coding).length)}
              sub="RxNorm · SNOMED · LOINC · ICD-10"
            />
            <ResultStat label="Source systems merged" value={String(new Set(documents.map((d) => d.source)).size)} />
            <ResultStat label="Values auto-resolved" value="0" sub="by design" tone="caution" />
          </div>

          <Card accent="accent" className="mt-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-ink-900">Where the model sits</h3>
                <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
                  Extraction, normalisation and reconciliation are model work. Interpretation is not.
                  PULSE never produces a diagnosis, a treatment recommendation, or a medication change
                  — it produces a structured, sourced, timestamped view of what other clinicians have
                  already recorded.
                </p>
                {ran && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/app/profile" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                      See the health graph
                    </Link>
                    <Link to="/emergency" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                      See the emergency snapshot
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>
      </PageBody>
    </>
  );
}

function ResultStat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'caution';
}) {
  return (
    <Card>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={
          'mt-1.5 text-[26px] font-semibold leading-none tabular-nums ' +
          (tone === 'caution' ? 'text-caution-600' : 'text-ink-900')
        }
      >
        {value}
      </div>
      {sub && <p className="mt-1.5 text-[11.5px] text-ink-400">{sub}</p>}
    </Card>
  );
}
