import { CloudUpload, FileImage, FileText, Info, TriangleAlert, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button, Card, FieldLabel } from '@/components/ui';
import { useVita } from '@/hooks/useVita';
import { fileSize } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ============================================================================
   DocumentUploader
   ----------------------------------------------------------------------------
   A real uploader: a hidden file input for click-to-browse, drag-and-drop for
   the obvious gesture, type and size validation, and a visible reason whenever
   a file is turned away.

   What it deliberately does NOT do is pretend to read the file. There is no
   document AI behind this prototype, so an uploaded PDF contributes its real
   metadata — name, size, type — and nothing else. Every number derived from it
   is labelled as simulated at the point it is displayed.

   Claiming to have extracted "18 medical entities" from a file nobody parsed
   would be exactly the behaviour this product exists to argue against.
   ========================================================================== */

export function DocumentUploader() {
  const { uploads, addUploads, removeUpload } = useVita();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<{ name: string; why: string }[]>([]);

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const result = addUploads(Array.from(list));
    setRejected(result.rejected);
  };

  const queued = uploads.filter((u) => u.status === 'queued');

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
          // Reset so choosing the same file twice still fires a change event.
          e.target.value = '';
        }}
      />

      {/* The drop zone is a real button so it is keyboard-reachable, not just
          a div that happens to respond to a click. */}
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
            {dragging ? 'Drop to add' : 'Drop files here, or click to browse'}
          </p>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-500">
            Prescriptions, discharge summaries, lab reports or photographs of handwritten scripts.
            PDF, PNG, JPG or WebP, up to 25 MB each.
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
        <div>
          <FieldLabel className="mb-2">
            Your uploads · {queued.length} queued, {uploads.length - queued.length} processed
          </FieldLabel>
          <ul className="space-y-2">
            {uploads.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-md border border-line bg-white px-3.5 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk text-ink-500">
                  {u.kind === 'pdf' ? (
                    <FileText className="size-3.5" />
                  ) : (
                    <FileImage className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12.5px] font-medium text-ink-900">
                    {u.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">
                    {fileSize(u.sizeKb)} · added {u.addedAt}
                  </p>
                </div>
                <Badge tone={u.status === 'processed' ? 'verified' : 'caution'}>
                  {u.status === 'processed' ? 'Processed' : 'Queued'}
                </Badge>
                <button
                  onClick={() => removeUpload(u.id)}
                  aria-label={`Remove ${u.name}`}
                  className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-critical-600"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploads.length > 0 && (
        <Card accent="caution" className="hatch-caution">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-caution-600" />
            <div>
              <p className="text-[13px] font-semibold text-ink-900">
                Your file is not actually read in this prototype
              </p>
              <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-600">
                PULSE records what it genuinely knows about your upload — its name, size and type —
                and stops there. There is no document AI behind this build, so nothing claims to
                have parsed the page. The pipeline below runs against the eight prepared source
                documents; any count shown against your own file is a stand-in and is labelled as
                one. Wiring in a real extractor means replacing four functions in{' '}
                <code className="rounded-xs bg-canvas-sunk px-1 py-0.5 font-mono text-[11.5px]">
                  lib/aiService.ts
                </code>
                , not changing this screen.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Small variant for the documents page. */
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
