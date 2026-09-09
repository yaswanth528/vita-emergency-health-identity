import {
  ArrowRight,
  FileImage,
  FileText,
  FlaskConical,
  Hospital,
  Pill,
  Plus,
  Search,
  Stethoscope,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadButton } from '@/components/system/DocumentUploader';
import { Badge, Card, EmptyState, FieldLabel, Tabs, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { documentKindLabel, documents } from '@/data/documents';
import { extractionsFor } from '@/data/extractions';
import { fileSize, formatDate, relativeAge } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DocumentKind, MedicalDocument } from '@/types';

/* ============================================================================
   Document centre
   ----------------------------------------------------------------------------
   Sorted newest-first because recency is the dominant question a clinician asks
   of a document pile. Processing state is shown honestly: "needs review" is a
   normal outcome, not a failure to hide.
   ========================================================================== */

const kindIcon: Record<DocumentKind, typeof FileText> = {
  prescription: Pill,
  'discharge-summary': Hospital,
  'lab-report': FlaskConical,
  imaging: FileImage,
  'clinical-note': Stethoscope,
  immunisation: FileText,
};

type Filter = 'all' | 'processed' | 'needs-review';

export default function Documents() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => (filter === 'all' ? true : filter === 'processed' ? d.status === 'processed' : d.status === 'needs-review'))
      .filter(
        (d) =>
          !q ||
          d.filename.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q) ||
          documentKindLabel[d.kind].toLowerCase().includes(q),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [query, filter]);

  const needsReview = documents.filter((d) => d.status === 'needs-review').length;
  const totalEntities = documents.reduce((s, d) => s + d.entityCount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Sources"
        title="Documents"
        description={`${documents.length} source documents from ${new Set(documents.map((d) => d.source)).size} systems. ${totalEntities} structured entities extracted, every one traceable back to a page.`}
        actions={
          <>
            <UploadButton />
            <Link to="/app/ingest" className={buttonClasses({ variant: 'primary' })}>
              <Plus className="size-[15px]" />
              Add record
            </Link>
          </>
        }
      />

      <PageBody className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search filename, source or type…"
              className="h-10 w-full rounded-md border border-line-strong bg-white pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 transition-colors focus:border-accent-500 focus:outline-none"
            />
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: documents.length },
            { id: 'processed', label: 'Processed', count: documents.length - needsReview },
            { id: 'needs-review', label: 'Needs review', count: needsReview },
          ]}
          active={filter}
          onChange={(id) => setFilter(id as Filter)}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No documents match"
            description="Try a different search term or filter."
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </div>
        )}

        <Card accent="accent" className="mt-6">
          <FieldLabel>How documents become clinical context</FieldLabel>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-600">
            Each file is ingested, parsed, and passed through clinical entity extraction. Entities
            scoring below the 85% acceptance threshold are flagged for review rather than written
            into the health graph — which is why one handwritten prescription here sits at{' '}
            <span className="font-mono">needs review</span> instead of quietly contributing a wrong
            dose.
          </p>
          <Link
            to="/app/ingest"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
          >
            Watch the pipeline run
            <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </PageBody>
    </>
  );
}

function DocumentRow({ doc }: { doc: MedicalDocument }) {
  const Icon = kindIcon[doc.kind];
  const entities = extractionsFor(doc.id);
  const rejected = entities.filter((e) => e.confidence < 85).length;

  return (
    <Link to={`/app/documents/${doc.id}`}>
      <Card interactive padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3.5">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-md border',
              doc.status === 'needs-review'
                ? 'border-caution-100 bg-caution-50 text-caution-600'
                : 'border-line bg-canvas-sunk text-ink-500',
            )}
          >
            <Icon className="size-4" />
          </div>

          <div className="min-w-[180px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-mono text-[13px] font-medium text-ink-900">
                {doc.filename}
              </span>
              <Badge tone={doc.status === 'needs-review' ? 'caution' : 'verified'}>
                {doc.status === 'needs-review' ? 'Needs review' : 'Processed'}
              </Badge>
            </div>
            <p className="mt-1 truncate text-[12.5px] text-ink-500">
              {documentKindLabel[doc.kind]} · {doc.source}
              {doc.author && ` · ${doc.author}`}
            </p>
          </div>

          <dl className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
            <MiniStat label="Date" value={formatDate(doc.date)} sub={relativeAge(doc.date)} />
            <MiniStat label="Entities" value={String(doc.entityCount)} sub={rejected ? `${rejected} withheld` : 'all accepted'} />
            <MiniStat
              label="Mean conf."
              value={`${doc.meanConfidence}%`}
              sub={`${doc.pages}p · ${fileSize(doc.sizeKb)}`}
            />
          </dl>

          <ArrowRight className="hidden size-4 shrink-0 text-ink-300 sm:block" />
        </div>
      </Card>
    </Link>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-[84px]">
      <dt className="label-xs text-ink-400">{label}</dt>
      <dd className="mt-1 font-mono text-[12.5px] font-medium tabular-nums text-ink-900">{value}</dd>
      {sub && <dd className="text-[11px] text-ink-400">{sub}</dd>}
    </div>
  );
}
