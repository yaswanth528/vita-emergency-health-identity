import { useMemo, useState } from 'react';
import { Timeline } from '@/components/clinical/Timeline';
import { Card, EmptyState, FieldLabel, Tabs } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { documents } from '@/data/documents';
import { timeline } from '@/data/timeline';
import { cn } from '@/lib/utils';

/* ============================================================================
   Health timeline
   ----------------------------------------------------------------------------
   Ten years reconstructed from documents that were never meant to be read
   together. The filters are the ones a clinician actually uses at handover:
   what changed, what put her in hospital, what the numbers did.
   ========================================================================== */

type Filter = 'all' | 'major' | 'medication-change' | 'lab';

export default function TimelinePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const events = useMemo(() => {
    if (filter === 'all') return timeline;
    if (filter === 'major') return timeline.filter((e) => e.major);
    if (filter === 'medication-change')
      return timeline.filter((e) => e.kind === 'medication-change' || e.kind === 'medication-start');
    return timeline.filter((e) => e.kind === 'lab');
  }, [filter]);

  const years = timeline.map((e) => Number(e.date.slice(0, 4)));
  const span = Math.max(...years) - Math.min(...years);
  const edgeCount = timeline.reduce((sum, e) => {
    const l = e.links;
    if (!l) return sum;
    return sum + (l.medications?.length ?? 0) + (l.conditions?.length ?? 0) + (l.documents?.length ?? 0);
  }, 0);

  return (
    <>
      <PageHeader
        eyebrow="Longitudinal history"
        title="Health timeline"
        description="Reconstructed by the reconciliation stage from every linked source. Each event carries its own evidence and its links into the health graph."
      />

      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Events" value={String(timeline.length)} />
          <SummaryStat label="Years reconstructed" value={String(span)} sub={`${Math.min(...years)}–${Math.max(...years)}`} />
          <SummaryStat label="Source documents" value={String(documents.length)} sub={`${new Set(documents.map((d) => d.source)).size} systems`} />
          <SummaryStat label="Graph edges" value={String(edgeCount)} sub="event ↔ entity links" />
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: 'Everything', count: timeline.length },
            { id: 'major', label: 'Major history', count: timeline.filter((e) => e.major).length },
            {
              id: 'medication-change',
              label: 'Medication changes',
              count: timeline.filter((e) => e.kind === 'medication-change' || e.kind === 'medication-start').length,
            },
            { id: 'lab', label: 'Labs', count: timeline.filter((e) => e.kind === 'lab').length },
          ]}
          active={filter}
          onChange={(id) => setFilter(id as Filter)}
        />

        {events.length === 0 ? (
          <EmptyState title="No events in this view" />
        ) : (
          <Timeline events={events} />
        )}

        <Card accent="accent">
          <FieldLabel>Why this is a timeline and not a folder</FieldLabel>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">
            Eight documents from seven systems arrive with no shared identifiers, inconsistent drug
            spellings and three different date formats. Reconciliation resolves the entities, orders
            them, and links each one to the conditions and medications it affects. The result answers
            questions a folder cannot — such as why three of the four current medications all begin on
            the same day in May 2023.
          </p>
        </Card>
      </PageBody>
    </>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <FieldLabel>{label}</FieldLabel>
      <div className={cn('mt-1.5 text-[26px] font-semibold leading-none tabular-nums text-ink-900')}>
        {value}
      </div>
      {sub && <p className="mt-1.5 font-mono text-[11px] text-ink-400">{sub}</p>}
    </Card>
  );
}
