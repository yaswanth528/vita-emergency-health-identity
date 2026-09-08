import { ArrowLeft, Ban, FileText, Layers, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ConfidenceMeter } from '@/components/evidence/EvidenceBadge';
import { Badge, Card, FieldLabel, Tabs } from '@/components/ui';
import { PageBody } from '@/layouts/AppShell';
import { documentById, documentKindLabel } from '@/data/documents';
import { evidence } from '@/data/evidence';
import { extractionsFor } from '@/data/extractions';
import { CONFIDENCE_THRESHOLD } from '@/lib/aiService';
import { useVita } from '@/hooks/useVita';
import { fileSize, formatDate, relativeAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AIExtraction } from '@/types';

/* ============================================================================
   Document detail — original beside extraction
   ----------------------------------------------------------------------------
   The two panes are side by side rather than tabbed, because the whole point is
   comparison. Selecting an extracted entity highlights the line it came from in
   the original, so "where did that come from" is answered by looking, not by
   trusting.
   ========================================================================== */

const entityTypeLabel: Record<AIExtraction['entityType'], string> = {
  medication: 'Medication',
  dosage: 'Dosage',
  condition: 'Diagnosis',
  allergy: 'Allergy',
  procedure: 'Procedure',
  date: 'Date',
  'lab-value': 'Lab value',
  vital: 'Vital sign',
};

export default function DocumentDetail() {
  const { documentId } = useParams();
  const doc = documentById(documentId ?? '');
  const { openEvidence, logAudit } = useVita();
  const [selected, setSelected] = useState<AIExtraction | null>(null);
  const [tab, setTab] = useState<'accepted' | 'withheld'>('accepted');

  const entities = useMemo(() => (doc ? extractionsFor(doc.id) : []), [doc]);
  const accepted = entities.filter((e) => e.confidence >= CONFIDENCE_THRESHOLD);
  const withheld = entities.filter((e) => e.confidence < CONFIDENCE_THRESHOLD);

  /** Evidence rows that cite this document — the reverse index. */
  const citations = useMemo(
    () => (doc ? Object.values(evidence).filter((e) => e.documentId === doc.id) : []),
    [doc],
  );

  if (!doc) return <Navigate to="/app/documents" replace />;

  const shown = tab === 'accepted' ? accepted : withheld;

  const highlightLine = (line: string) => {
    if (!selected) return false;
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    return norm(line).includes(norm(selected.surfaceForm).slice(0, 18));
  };

  return (
    <PageBody className="space-y-6">
      <Link
        to="/app/documents"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" />
        All documents
      </Link>

      {/* --- Header --------------------------------------------------------- */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <FileText className="size-4 text-ink-400" />
          <h1 className="font-mono text-[19px] font-semibold text-ink-900">{doc.filename}</h1>
          <Badge tone={doc.status === 'needs-review' ? 'caution' : 'verified'}>
            {doc.status === 'needs-review' ? 'Needs review' : 'Processed'}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Type" value={documentKindLabel[doc.kind]} />
          <Meta label="Document date" value={formatDate(doc.date)} sub={relativeAge(doc.date)} />
          <Meta label="Source" value={doc.source} />
          <Meta label="Channel" value={doc.channel.replace('-', ' ')} capitalise />
          <Meta label="Pages / size" value={`${doc.pages} · ${fileSize(doc.sizeKb)}`} />
          <Meta label="Entities" value={`${accepted.length} accepted`} sub={`${withheld.length} withheld`} />
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* --- Original ----------------------------------------------------- */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-canvas-sunk px-4 py-2.5">
            <span className="label-xs text-ink-400">Original document</span>
            <span className="font-mono text-[10.5px] text-ink-400">
              {selected ? 'highlighted = selected entity' : 'select an entity to locate it'}
            </span>
          </div>
          <pre className="max-h-[560px] overflow-auto bg-white px-4 py-4 font-mono text-[11px] leading-[1.7] text-ink-600">
            {doc.renderedText.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'whitespace-pre-wrap px-1 transition-colors duration-200',
                  highlightLine(line) &&
                    'rounded-xs bg-caution-100 font-medium text-ink-900 ring-1 ring-caution-300',
                )}
              >
                {line || ' '}
              </div>
            ))}
          </pre>
        </Card>

        {/* --- Extraction --------------------------------------------------- */}
        <div className="space-y-4">
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas-sunk px-4 py-2.5">
              <span className="label-xs flex items-center gap-1.5 text-ink-400">
                <Layers className="size-3" />
                AI-extracted information
              </span>
              <span className="font-mono text-[10.5px] text-ink-400">
                mean {doc.meanConfidence}%
              </span>
            </div>

            <div className="px-4 pt-2">
              <Tabs
                tabs={[
                  { id: 'accepted', label: 'Accepted', count: accepted.length },
                  { id: 'withheld', label: 'Withheld', count: withheld.length },
                ]}
                active={tab}
                onChange={(id) => setTab(id as 'accepted' | 'withheld')}
              />
            </div>

            {tab === 'withheld' && withheld.length > 0 && (
              <div className="hatch-caution border-b border-caution-100 bg-caution-50/60 px-4 py-3">
                <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-600">
                  <TriangleAlert className="mt-px size-3.5 shrink-0 text-caution-600" />
                  <span>
                    These entities scored below the {CONFIDENCE_THRESHOLD}% acceptance threshold and
                    were <strong className="font-semibold">not</strong> written into the health graph.
                    Guessing a dose is worse than admitting the scan was unreadable.
                  </span>
                </p>
              </div>
            )}

            {shown.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-ink-400">
                {tab === 'withheld' ? 'Everything in this document met the threshold.' : 'No entities.'}
              </p>
            ) : (
              <ul className="max-h-[420px] divide-y divide-line overflow-auto">
                {shown.map((e) => {
                  const isSel = selected?.id === e.id;
                  const below = e.confidence < CONFIDENCE_THRESHOLD;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => {
                          setSelected(isSel ? null : e);
                          if (!isSel) logAudit('document-open', `Entity located in ${doc.filename}: "${e.surfaceForm}".`);
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors',
                          isSel ? 'bg-accent-50' : 'hover:bg-canvas-sunk',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge tone={below ? 'caution' : 'neutral'}>
                                {entityTypeLabel[e.entityType]}
                              </Badge>
                              {e.coding && (
                                <Badge mono tone="accent">
                                  {e.coding.system} {e.coding.code}
                                </Badge>
                              )}
                              {below && (
                                <Badge tone="caution">
                                  <Ban className="size-2.5" />
                                  withheld
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1.5 text-[13.5px] font-semibold text-ink-900">
                              {e.normalised}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-ink-400">
                              from “{e.surfaceForm}” · page {e.page}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 font-mono text-[13px] font-semibold tabular-nums',
                              below ? 'text-caution-600' : 'text-ink-700',
                            )}
                          >
                            {e.confidence}%
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {selected && (
            <Card>
              <FieldLabel>Selected entity</FieldLabel>
              <p className="mt-2 text-[15px] font-semibold text-ink-900">{selected.normalised}</p>
              <p className="mt-1 font-mono text-[11.5px] text-ink-500">
                surface form: “{selected.surfaceForm}”
              </p>
              <div className="mt-3.5">
                <ConfidenceMeter value={selected.confidence} threshold={CONFIDENCE_THRESHOLD} />
              </div>
            </Card>
          )}

          {/* Reverse index: which claims in the profile cite this document */}
          {citations.length > 0 && (
            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-line bg-canvas-sunk px-4 py-2.5">
                <span className="label-xs text-ink-400">
                  Claims in the profile citing this document · {citations.length}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {citations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => openEvidence(c.id, c.extractedValue)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-canvas-sunk"
                    >
                      <span className="truncate text-[12.5px] font-medium text-ink-800">
                        {c.extractedValue}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-400">
                        p{c.page} · {c.confidence}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </PageBody>
  );
}

function Meta({
  label,
  value,
  sub,
  capitalise,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Only for machine-cased values like "patient-upload" — never for prose. */
  capitalise?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="label-xs text-ink-400">{label}</dt>
      <dd
        className={cn(
          'mt-1 truncate text-[13px] font-medium text-ink-900',
          capitalise && 'capitalize',
        )}
      >
        {value}
      </dd>
      {sub && <dd className="truncate text-[11px] text-ink-400">{sub}</dd>}
    </div>
  );
}
