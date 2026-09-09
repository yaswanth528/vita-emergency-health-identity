import {
  Ban,
  ChevronDown,
  CloudUpload,
  FileImage,
  FileText,
  Loader2,
  ScanLine,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button, Card, FieldLabel, Progress } from '@/components/ui';
import { ACCEPTANCE_THRESHOLD, nerTypeLabel } from '@/lib/clinicalNer';
import { readMethodLabel } from '@/lib/docReader';
import { useVita } from '@/hooks/useVita';
import { fileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/types/platform';

/* ============================================================================
   DocumentUploader
   ----------------------------------------------------------------------------
   Click-to-browse, drag-and-drop, validation with reasons — and the file is
   genuinely read: pdf.js for a text layer, Tesseract for a scan, then clinical
   extraction over the characters that actually came out.

   Every entity below is shown with the real line it was found on. That is the
   point: provenance for a document the user supplied five seconds ago is the
   same kind of object as provenance for the prepared demo set.
   ========================================================================== */

export function DocumentUploader() {
  const { uploads, addUploads, removeUpload } = useVita();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<{ name: string; why: string }[]>([]);

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setRejected(addUploads(Array.from(list)).rejected);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = ''; // so the same file can be chosen twice
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
        className={cn(
          'w-full rounded-lg border border-dashed px-5 py-8 transition-colors duration-150',
          dragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-line-strong bg-canvas-sunk/50 hover:border-ink-300 hover:bg-canvas-sunk',
        )}
      >
        <div className="flex flex-col items-center text-center">
          <CloudUpload
            className={cn('size-6 transition-colors', dragging ? 'text-accent-600' : 'text-ink-300')}
          />
          <p className="mt-3 text-[14px] font-medium text-ink-800">
            {dragging ? 'Drop to read' : 'Drop files here, or click to browse'}
          </p>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-500">
            PDFs are read from their text layer. Photographs and scans go through OCR in your
            browser — the file never leaves this device. Up to 25 MB each.
          </p>
        </div>
      </button>

      {rejected.length > 0 && (
        <Card accent="caution">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-900">
                {rejected.length} file{rejected.length === 1 ? '' : 's'} not added
              </p>
              <ul className="mt-1.5 space-y-1">
                {rejected.map((r) => (
                  <li key={r.name} className="truncate text-[12.5px] text-ink-600">
                    <span className="font-mono">{r.name}</span> — {r.why}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setRejected([])}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-800"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </Card>
      )}

      {uploads.length > 0 && (
        <div className="space-y-2.5">
          <FieldLabel>Your documents</FieldLabel>
          {uploads.map((u) => (
            <UploadRow key={u.id} upload={u} onRemove={() => removeUpload(u.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --- One uploaded document --------------------------------------------------- */

function UploadRow({ upload: u, onRemove }: { upload: UploadedFile; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [showText, setShowText] = useState(false);

  const accepted = (u.entities ?? []).filter((e) => e.confidence >= ACCEPTANCE_THRESHOLD);
  const withheld = (u.entities ?? []).filter((e) => e.confidence < ACCEPTANCE_THRESHOLD);

  return (
    <Card
      padded={false}
      accent={u.status === 'failed' ? 'critical' : u.status === 'read' ? 'verified' : 'none'}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk text-ink-500">
          {u.kind === 'pdf' ? <FileText className="size-4" /> : <FileImage className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12.5px] font-medium text-ink-900">{u.name}</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">
            {fileSize(u.sizeKb)} · added {u.addedAt}
            {u.readMethod && ` · ${readMethodLabel[u.readMethod]}`}
            {u.pages && ` · ${u.pages.length} page${u.pages.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {u.status === 'read' && (
          <>
            <Badge tone="verified">{accepted.length} entities</Badge>
            {withheld.length > 0 && <Badge tone="caution">{withheld.length} withheld</Badge>}
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-[11.5px] font-medium text-ink-600 transition-colors hover:border-ink-300"
            >
              {open ? 'Hide' : 'What was read'}
              <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
            </button>
          </>
        )}
        {u.status === 'failed' && <Badge tone="critical">Could not read</Badge>}
        {(u.status === 'reading' || u.status === 'queued') && (
          <Badge tone="neutral">
            <Loader2 className="size-2.5 animate-spin" />
            {u.status === 'queued' ? 'Queued' : 'Reading'}
          </Badge>
        )}

        <button
          onClick={onRemove}
          aria-label={`Remove ${u.name}`}
          className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-critical-600"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Live progress */}
      {u.progress && (
        <div className="border-t border-line px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] capitalize text-ink-500">{u.progress.stage}</span>
            <span className="font-mono text-[11px] tabular-nums text-ink-400">
              {u.progress.pct}%
            </span>
          </div>
          <Progress value={u.progress.pct} tone="accent" className="mt-1.5" />
        </div>
      )}

      {/* Failure — stated, not glossed */}
      {u.status === 'failed' && (
        <div className="border-t border-critical-100 bg-critical-50/60 px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-ink-700">{u.readError}</p>
          <p className="mt-1.5 text-[11.5px] text-ink-500">
            No entities were produced from this file. Nothing has been added to the health graph.
          </p>
        </div>
      )}

      {/* What was actually read */}
      {u.status === 'read' && open && (
        <div className="border-t border-line bg-canvas-sunk/40 px-4 py-3.5">
          <dl className="mb-3 flex flex-wrap gap-x-8 gap-y-2">
            <Stat label="Read via" value={u.readMethod ? readMethodLabel[u.readMethod] : '—'} />
            <Stat
              label={u.readMethod === 'pdf-text' ? 'Text fidelity' : 'OCR confidence'}
              value={`${u.readConfidence ?? 0}%`}
            />
            <Stat label="Mean entity confidence" value={`${u.meanConfidence ?? 0}%`} />
            <Stat label="Accepted / withheld" value={`${accepted.length} / ${withheld.length}`} />
          </dl>

          {accepted.length === 0 && withheld.length === 0 && (
            <p className="rounded-md border border-line bg-white px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-600">
              The document was read successfully, but nothing in it matched a clinical entity this
              extractor recognises. That is a real result, not an error — the text is below if you
              want to check it.
            </p>
          )}

          {accepted.length > 0 && (
            <EntityList
              title={`Accepted — written to the health graph`}
              entities={accepted}
              tone="ok"
            />
          )}

          {withheld.length > 0 && (
            <div className="mt-3">
              <div className="hatch-caution mb-2 rounded-md border border-caution-100 bg-caution-50/60 px-3 py-2">
                <p className="flex items-start gap-2 text-[11.5px] leading-snug text-ink-600">
                  <Ban className="mt-px size-3 shrink-0 text-caution-600" />
                  Below the {ACCEPTANCE_THRESHOLD}% acceptance threshold. Flagged for review, not
                  written into the graph — a guessed dose is worse than an admitted gap.
                </p>
              </div>
              <EntityList title="Withheld" entities={withheld} tone="warn" />
            </div>
          )}

          <button
            onClick={() => setShowText((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-600 hover:underline"
          >
            <ScanLine className="size-3" />
            {showText ? 'Hide extracted text' : 'Show the text that was extracted'}
          </button>

          {showText && (
            <pre className="mt-2 max-h-[280px] overflow-auto rounded-md border border-line bg-white px-3 py-3 font-mono text-[11px] leading-[1.7] text-ink-600">
              {(u.pages ?? []).map((page, i) => (
                <div key={i}>
                  {u.pages!.length > 1 && (
                    <div className="mb-1 mt-3 first:mt-0 text-[10px] uppercase tracking-wider text-ink-400">
                      Page {i + 1}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{page || '(no text on this page)'}</div>
                </div>
              ))}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-xs text-ink-400">{label}</dt>
      <dd className="mt-1 font-mono text-[12.5px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function EntityList({
  title,
  entities,
  tone,
}: {
  title: string;
  entities: NonNullable<UploadedFile['entities']>;
  tone: 'ok' | 'warn';
}) {
  return (
    <div>
      <FieldLabel className="mb-1.5">{title}</FieldLabel>
      <ul className="space-y-1.5">
        {entities.map((e) => (
          <li
            key={e.id}
            className="rounded-md border border-line bg-white px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone === 'ok' ? 'neutral' : 'caution'}>{nerTypeLabel[e.type]}</Badge>
              <span className="text-[13px] font-semibold text-ink-900">{e.normalised}</span>
              {e.coding && (
                <Badge tone="accent" mono>
                  {e.coding.system} {e.coding.code}
                </Badge>
              )}
              <span
                className={cn(
                  'ml-auto font-mono text-[11.5px] font-semibold tabular-nums',
                  tone === 'ok' ? 'text-ink-700' : 'text-caution-600',
                )}
              >
                {e.confidence}%
              </span>
            </div>
            {/* The real line from the real document — this is the provenance. */}
            <p className="mt-1.5 truncate font-mono text-[10.5px] text-ink-400">
              page {e.page}, line {e.lineIndex + 1} · “{e.line.trim()}”
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --- Compact button for the documents page ------------------------------------ */

export function UploadButton() {
  const { addUploads } = useVita();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) addUploads(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <Button variant="secondary" icon={<CloudUpload />} onClick={() => inputRef.current?.click()}>
        Upload
      </Button>
    </>
  );
}
