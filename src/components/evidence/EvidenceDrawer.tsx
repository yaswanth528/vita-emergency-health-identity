import {
  ArrowUpRight,
  Cpu,
  FileText,
  Fingerprint,
  Scale,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, FieldLabel, Rule } from '@/components/ui';
import { ConfidenceMeter } from '@/components/evidence/EvidenceBadge';
import { documentById, documentKindLabel } from '@/data/documents';
import { conflictKindLabel } from '@/data/conflicts';
import { getEvidence } from '@/data/evidence';
import { useVita } from '@/hooks/useVita';
import { formatDate, relativeAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Conflict, Evidence, MedicalDocument } from '@/types';

/* ============================================================================
   EvidenceDrawer — the "show me where that came from" surface
   ----------------------------------------------------------------------------
   Opens over any screen, including Emergency Mode. Two modes:

     evidence  -> one claim, one source, highlighted in the original document
     conflict  -> two sources side by side, and no opinion about which is right
   ========================================================================== */

/** Loose match so the highlighted span survives whitespace differences. */
function isHighlighted(line: string, excerpt: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const l = norm(line);
  const e = norm(excerpt);
  if (l.length < 6) return false;
  if (e.includes(l)) return true;
  // Match on a distinctive leading fragment for long lines.
  const head = l.slice(0, Math.min(28, l.length));
  return head.length > 10 && e.includes(head);
}

export function EvidenceDrawer() {
  const { viewer, closeViewer, claimLabel, conflicts } = useVita();

  /**
   * The panel stays mounted and slides with a CSS transition rather than an
   * AnimatePresence exit. Exit animations in this build do not reliably settle,
   * which left the drawer stranded half-open over the page underneath — and an
   * overlay that might not close is worse than one that does not animate.
   *
   * `shown` lags `viewer` by the slide duration so the content does not blank
   * out while the panel is still on screen.
   */
  const open = viewer !== null;
  const [shown, setShown] = useState(viewer);
  useEffect(() => {
    if (viewer) {
      setShown(viewer);
      return;
    }
    const t = setTimeout(() => setShown(null), 300);
    return () => clearTimeout(t);
  }, [viewer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closeViewer]);

  const evidenceItem = shown?.kind === 'evidence' ? getEvidence(shown.evidenceId) : undefined;
  const doc = evidenceItem ? documentById(evidenceItem.documentId) : undefined;
  const conflict =
    shown?.kind === 'conflict' ? conflicts.find((c) => c.id === shown.conflictId) : undefined;

  return (
    <>
      <div
        onClick={closeViewer}
        aria-hidden={!open}
        className={cn(
          'fixed inset-0 z-40 bg-ink-950/45 backdrop-blur-[1.5px] transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Evidence"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col bg-canvas shadow-drawer',
          'transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="label-xs mb-1.5 flex items-center gap-1.5 text-ink-400">
              {conflict ? (
                <>
                  <Scale className="size-3" /> Conflicting records
                </>
              ) : (
                <>
                  <Fingerprint className="size-3" /> Evidence
                </>
              )}
            </div>
            <h2 className="truncate text-[15px] font-semibold text-ink-900">
              {claimLabel ?? conflict?.subject ?? 'Source record'}
            </h2>
          </div>
          <button
            onClick={closeViewer}
            aria-label="Close evidence"
            className="-mr-1 -mt-1 shrink-0 rounded-md p-2 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-800"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conflict && <ConflictBody conflict={conflict} />}
          {evidenceItem && doc && <EvidenceBody evidence={evidenceItem} doc={doc} />}
        </div>

        <footer className="border-t border-line bg-white px-5 py-3">
          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-400">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-ink-300" />
            <span>
              PULSE reports what its sources say and where they say it. It does not diagnose,
              recommend treatment, or alter medication records.
            </span>
          </p>
        </footer>
      </aside>
    </>
  );
}

/* --- Evidence mode ----------------------------------------------------------- */

function EvidenceBody({ evidence, doc }: { evidence: Evidence; doc: MedicalDocument }) {
  const pageRef = useRef<HTMLPreElement>(null);
  const citedRef = useRef<HTMLDivElement>(null);

  /**
   * Centre the cited line in the document pane.
   *
   * Scrolling the container directly rather than calling `scrollIntoView` —
   * the latter would also scroll the drawer body, pulling the extracted value
   * out of view, which is the one thing that must stay on screen.
   */
  useEffect(() => {
    const pane = pageRef.current;
    const line = citedRef.current;
    if (!pane || !line) return;
    pane.scrollTop = Math.max(0, line.offsetTop - pane.clientHeight / 2 + line.clientHeight / 2);
  }, [evidence.id]);

  let firstHitTaken = false;

  return (
    <div className="space-y-5 p-5">
      {/* The extracted value, stated plainly */}
      <div className="rounded-lg border border-line bg-white p-4 shadow-card">
        <FieldLabel>Extracted value</FieldLabel>
        <p className="mt-2 text-[17px] font-semibold leading-snug text-ink-900">
          {evidence.extractedValue}
        </p>
        <Rule className="my-4" />
        <ConfidenceMeter value={evidence.confidence} />
      </div>

      {/* Where it came from */}
      <div>
        <FieldLabel className="mb-2">Source document</FieldLabel>
        <Link
          to={`/app/documents/${doc.id}`}
          className="group flex items-start gap-3 rounded-lg border border-line bg-white p-3.5 shadow-card transition-[border-color,box-shadow] hover:border-ink-200 hover:shadow-raised"
        >
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk">
            <FileText className="size-4 text-ink-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-[12.5px] font-medium text-ink-900">
                {doc.filename}
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-ink-300 transition-colors group-hover:text-ink-600" />
            </div>
            <p className="mt-1 text-[12px] text-ink-500">
              {documentKindLabel[doc.kind]} · page {evidence.page} of {doc.pages} · {doc.source}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge mono>{formatDate(evidence.documentDate)}</Badge>
              <Badge tone="neutral">{relativeAge(evidence.documentDate)}</Badge>
              {doc.author && <Badge tone="neutral">{doc.author}</Badge>}
            </div>
          </div>
        </Link>
      </div>

      {/* The original, with the cited span highlighted */}
      <div>
        <FieldLabel className="mb-2">Original document · page {evidence.page}</FieldLabel>
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-line bg-canvas-sunk px-3 py-2">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-400">
              Rendered source
            </span>
            <span className="font-mono text-[10.5px] text-ink-400">
              highlighted = cited span
            </span>
          </div>
          {/* `relative` so the cited line's offsetTop is measured against this
              pane rather than the fixed drawer, which is what the centring
              calculation below assumes. */}
          <pre
            ref={pageRef}
            className="relative max-h-[300px] overflow-auto px-3 py-3 font-mono text-[11px] leading-[1.65] text-ink-600"
          >
            {doc.renderedText.map((line, i) => {
              const hit = isHighlighted(line, evidence.excerpt);
              const isFirstHit = hit && !firstHitTaken;
              if (isFirstHit) firstHitTaken = true;
              return (
                <div
                  key={i}
                  ref={isFirstHit ? citedRef : undefined}
                  className={cn(
                    'whitespace-pre-wrap px-1',
                    hit && 'rounded-xs bg-caution-100/70 font-medium text-ink-900 ring-1 ring-caution-300/60',
                  )}
                >
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      {/* Verbatim excerpt, for when the rendered page is long */}
      <div>
        <FieldLabel className="mb-2">Cited text</FieldLabel>
        <blockquote className="rounded-md border-l-2 border-caution-300 bg-caution-50/60 px-3.5 py-3 font-mono text-[11.5px] leading-relaxed text-ink-700">
          {evidence.excerpt}
        </blockquote>
      </div>

      {/* Extraction provenance — who asserted this, and how */}
      <div>
        <FieldLabel className="mb-2">Extraction provenance</FieldLabel>
        <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white text-[12.5px] shadow-card">
          <ProvRow icon={<Cpu className="size-3.5" />} label="Extractor" value={evidence.extractor} mono />
          <ProvRow label="Method" value={methodLabel[evidence.method]} />
          <ProvRow label="Processed on" value={formatDate(evidence.extractedAt)} />
          <ProvRow label="Document date" value={formatDate(evidence.documentDate)} />
          <ProvRow label="Page" value={`${evidence.page} of ${doc.pages}`} />
        </dl>
      </div>
    </div>
  );
}

const methodLabel: Record<Evidence['method'], string> = {
  'ocr+ner': 'OCR + clinical named-entity recognition',
  'layout-parse': 'Layout-aware structured parse',
  'table-extract': 'Table extraction with unit binding',
  'clinician-entered': 'Entered directly by a clinician',
  'patient-entered': 'Entered by patient or caregiver',
  'hie-sync': 'Structured feed from source system',
};

function ProvRow({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <dt className="flex items-center gap-1.5 text-ink-500">
        {icon}
        {label}
      </dt>
      <dd className={cn('truncate text-right text-ink-900', mono && 'font-mono text-[11.5px]')}>
        {value}
      </dd>
    </div>
  );
}

/* --- Conflict mode ------------------------------------------------------------ */

function ConflictBody({ conflict }: { conflict: Conflict }) {
  const { openEvidence, verifyConflict } = useVita();
  const resolved = conflict.status === 'clinician-verified';

  return (
    <div className="space-y-5 p-5">
      <div
        className={cn(
          'rounded-lg border p-4',
          resolved ? 'border-verified-100 bg-verified-50' : 'hatch-caution border-caution-100 bg-caution-50',
        )}
      >
        <div className="flex items-start gap-2.5">
          <TriangleAlert
            className={cn('mt-0.5 size-4 shrink-0', resolved ? 'text-verified-600' : 'text-caution-600')}
          />
          <div className="min-w-0">
            <p
              className={cn(
                'text-[13.5px] font-semibold',
                resolved ? 'text-verified-600' : 'text-caution-600',
              )}
            >
              {resolved
                ? 'Verified by clinician'
                : `${conflictKindLabel[conflict.kind]} — clinician verification required`}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
              {resolved
                ? `${conflict.resolvedBy} confirmed "${conflict.resolvedValue}" as the value to act on. Both source records remain visible below and in the audit trail.`
                : 'Two sources disagree. PULSE has not selected a value and will not do so — both records are shown as they were written.'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <FieldLabel className="mb-2">Why this matters</FieldLabel>
        <p className="text-[13px] leading-relaxed text-ink-600">{conflict.clinicalRelevance}</p>
      </div>

      <div>
        <FieldLabel className="mb-2">Sources in disagreement</FieldLabel>
        <div className="space-y-2.5">
          {conflict.claims.map((claim, i) => {
            const doc = documentById(claim.documentId);
            const isChosen = resolved && conflict.resolvedValue === claim.value;
            return (
              <div
                key={`${claim.evidenceId}-${i}`}
                className={cn(
                  'rounded-lg border bg-white p-3.5 shadow-card transition-colors',
                  isChosen ? 'border-verified-300 ring-1 ring-verified-100' : 'border-line',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="label-xs text-ink-400">{claim.label}</div>
                    <p className="mt-1.5 text-[15px] font-semibold leading-snug text-ink-900">
                      {claim.value}
                    </p>
                  </div>
                  {isChosen && (
                    <Badge tone="verified" className="shrink-0">
                      Confirmed
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge mono>{doc?.filename ?? claim.documentId}</Badge>
                  <Badge mono>{formatDate(claim.documentDate)}</Badge>
                  <Badge mono tone={claim.confidence >= 85 ? 'neutral' : 'caution'}>
                    {claim.confidence}%
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2.5 -ml-2"
                  icon={<FileText />}
                  onClick={() => openEvidence(claim.evidenceId, claim.value)}
                >
                  View source
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {!resolved && (
        <div className="rounded-lg border border-line bg-white p-4 shadow-card">
          <FieldLabel>Clinician verification</FieldLabel>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
            Confirming a value records your name, the value you confirmed and the time against this
            record. It does not delete the other source.
          </p>
          <div className="mt-3.5 flex flex-col gap-2">
            {conflict.claims.map((claim, i) => (
              <Button
                key={i}
                size="sm"
                variant="secondary"
                block
                className="justify-between"
                onClick={() => verifyConflict(conflict.id, claim.value, 'Dr. Meera Rao')}
              >
                <span className="truncate">Confirm: {claim.value}</span>
                <span className="label-xs shrink-0 text-ink-400">record</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
