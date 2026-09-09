import {
  ArrowRight,
  CalendarClock,
  FileStack,
  Plus,
  ScanLine,
  Share2,
  ShieldCheck,
  Siren,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllergyAlert, MedicationCard } from '@/components/clinical';
import { EvidenceBadge } from '@/components/evidence/EvidenceBadge';
import { Badge, Card, FieldLabel, Progress, SectionHeader, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { activeMedications, allergies, conditions } from '@/data/clinical';
import { activeGrants } from '@/data/consent';
import { documents } from '@/data/documents';
import { kavita } from '@/data/patient';
import { timeline } from '@/data/timeline';
import { useOpenConflicts, useVita } from '@/hooks/useVita';
import { formatDate, relativeAge } from '@/lib/format';

/* ============================================================================
   Patient dashboard
   ----------------------------------------------------------------------------
   Written for the patient, not the clinician. The question it answers is
   "is my record in good order and who can see it", not "what is wrong with me".
   The clinical detail lives one level down in the health profile.
   ========================================================================== */

export default function Dashboard() {
  const conflicts = useOpenConflicts();
  const { openEvidence } = useVita();
  const recentEvents = timeline.slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Patient"
        title={`Good morning, ${kavita.fullName.split(' ')[0]}`}
        description="Your longitudinal health profile is assembled from every linked source. You control who can see it, and for how long."
        actions={
          <>
            <Link to="/app/ingest" className={buttonClasses({ variant: 'secondary' })}>
              <Plus className="size-[15px]" />
              Add medical record
            </Link>
            <Link to="/emergency" className={buttonClasses({ variant: 'primary' })}>
              <Siren className="size-[15px]" />
              Emergency profile
            </Link>
          </>
        }
      />

      <PageBody className="space-y-8">
        {/* --- Status strip ------------------------------------------------- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Profile completeness"
            value={`${kavita.profileCompleteness}%`}
            sub={`${documents.length} sources linked`}
            progress={kavita.profileCompleteness}
          />
          <StatusCard
            label="Source freshness"
            value={`${kavita.sourceFreshnessDays} days`}
            sub={`Latest ${formatDate('2026-08-19')}`}
            tone="verified"
          />
          <StatusCard
            label="Active access grants"
            value={String(activeGrants.length)}
            sub="1 emergency · 1 caregiver · 1 lab"
            href="/app/consent"
          />
          <StatusCard
            label="Needs your attention"
            value={String(conflicts.length)}
            sub={conflicts.length ? 'Conflicting records' : 'Nothing outstanding'}
            tone={conflicts.length ? 'caution' : 'verified'}
            href="/app/ingest"
          />
        </div>

        {/* --- Quick actions ------------------------------------------------ */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            to="/emergency"
            icon={<Siren className="size-4" />}
            title="Emergency profile"
            detail="What a clinician sees if you cannot speak"
            emphasis
          />
          <QuickAction
            to="/app/consent"
            icon={<Share2 className="size-4" />}
            title="Share access"
            detail="Grant scoped, time-boxed access"
          />
          <QuickAction
            to="/app/timeline"
            icon={<CalendarClock className="size-4" />}
            title="Health timeline"
            detail={`${timeline.length} events since 2016`}
          />
          <QuickAction
            to="/app/ingest"
            icon={<Plus className="size-4" />}
            title="Add medical record"
            detail="Upload and process a document"
          />
        </div>

        {/* --- Conflicts ---------------------------------------------------- */}
        {conflicts.length > 0 && (
          <Card accent="caution" className="hatch-caution">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution-600" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-ink-900">
                  {conflicts.length} record{conflicts.length > 1 ? 's' : ''} need clinician
                  verification
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                  Two of your sources disagree. VITA has not chosen between them — both versions stay
                  visible until a clinician confirms which is correct.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {conflicts.map((c) => (
                    <ConflictChip key={c.id} id={c.id} subject={c.subject} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* --- Critical + medications --------------------------------------- */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section>
              <SectionHeader
                eyebrow="Always surfaced first"
                title="Critical information"
                description="These are the facts released to an authorised clinician before anything else."
              />
              <div className="mt-4 space-y-3">
                {allergies.map((a) => (
                  <AllergyAlert key={a.id} allergy={a} />
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card>
                    <FieldLabel>Blood group</FieldLabel>
                    <div className="mt-1.5 text-[28px] font-semibold leading-none text-ink-900">
                      {kavita.bloodGroup.value}
                    </div>
                    <div className="mt-3">
                      <EvidenceBadge fact={kavita.bloodGroup} claimLabel="Blood group" />
                    </div>
                  </Card>
                  <Card>
                    <FieldLabel>Emergency contact</FieldLabel>
                    <div className="mt-1.5 text-[15px] font-semibold text-ink-900">
                      {kavita.emergencyContacts[0].name}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {kavita.emergencyContacts[0].relationship} ·{' '}
                      {kavita.emergencyContacts[0].phoneMasked}
                    </p>
                    <Link
                      to="/app/caregiver"
                      className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-600 hover:underline"
                    >
                      Manage caregiver access
                      <ArrowRight className="size-3" />
                    </Link>
                  </Card>
                </div>
              </div>
            </section>

            <section>
              <SectionHeader
                eyebrow={`${activeMedications.length} active`}
                title="Current medications"
                action={
                  <Link
                    to="/app/profile"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
                  >
                    Full profile
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <div className="mt-4 space-y-2.5">
                {activeMedications.map((m) => (
                  <MedicationCard key={m.id} medication={m} />
                ))}
              </div>
            </section>
          </div>

          {/* --- Right rail --------------------------------------------------- */}
          <div className="space-y-6">
            <section>
              <SectionHeader eyebrow="Recent" title="Health activity" />
              <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white shadow-card">
                <ul className="divide-y divide-line">
                  {recentEvents.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => e.evidenceId && openEvidence(e.evidenceId, e.title)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-canvas-sunk"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[13px] font-medium text-ink-900">
                            {e.title}
                          </span>
                          <span className="shrink-0 font-mono text-[10.5px] text-ink-400">
                            {relativeAge(e.date)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-ink-500">
                          {e.facility ?? 'Recorded from source document'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/app/timeline"
                  className="flex items-center justify-between border-t border-line bg-canvas-sunk px-4 py-2.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:text-ink-900"
                >
                  View full timeline
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </section>

            <section>
              <SectionHeader eyebrow="Managed" title="Conditions" />
              <div className="mt-4 space-y-1.5">
                {conditions
                  .filter((c) => c.status === 'active')
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3.5 py-2.5"
                    >
                      <span className="truncate text-[13px] font-medium text-ink-800">
                        {c.name.value}
                      </span>
                      {c.controlMarker && (
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-500">
                          {c.controlMarker.value.split(' · ')[0]}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </section>

            <Card accent="accent">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" />
                <div>
                  <h3 className="text-[13.5px] font-semibold text-ink-900">Permissioned by default</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                    Nobody sees your record without a grant, every grant expires, and every read is
                    logged with a name against it.
                  </p>
                  <Link
                    to="/app/consent"
                    className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-600 hover:underline"
                  >
                    Review who has access
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* --- Documents ---------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={`${documents.length} linked`}
            title="Recent records"
            action={
              <Link
                to="/app/documents"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
              >
                All documents
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.slice(0, 3).map((d) => (
              <Link key={d.id} to={`/app/documents/${d.id}`}>
                <Card interactive className="h-full">
                  <div className="flex items-start gap-2.5">
                    <FileStack className="mt-0.5 size-4 shrink-0 text-ink-300" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12.5px] font-medium text-ink-900">
                        {d.filename}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-500">
                        {formatDate(d.date)} · {d.source}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral" mono>
                          {d.entityCount} entities
                        </Badge>
                        <Badge tone={d.status === 'processed' ? 'verified' : 'caution'}>
                          {d.status === 'processed' ? 'Processed' : 'Needs review'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </PageBody>
    </>
  );
}

/* --- Local components -------------------------------------------------------- */

function StatusCard({
  label,
  value,
  sub,
  progress,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: string;
  sub: string;
  progress?: number;
  tone?: 'neutral' | 'caution' | 'verified';
  href?: string;
}) {
  const body = (
    <Card interactive={Boolean(href)} className="h-full">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={
          'mt-1.5 text-[24px] font-semibold leading-none tabular-nums ' +
          (tone === 'caution' ? 'text-caution-600' : tone === 'verified' ? 'text-verified-600' : 'text-ink-900')
        }
      >
        {value}
      </div>
      {progress !== undefined && <Progress value={progress} tone="neutral" className="mt-3" />}
      <p className="mt-2 text-[12px] text-ink-500">{sub}</p>
    </Card>
  );
  return href ? <Link to={href}>{body}</Link> : body;
}

function QuickAction({
  to,
  icon,
  title,
  detail,
  emphasis,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        'group flex items-start gap-3 rounded-lg border px-4 py-3.5 transition-[border-color,box-shadow] duration-150 ' +
        (emphasis
          ? 'border-critical-100 bg-critical-50 hover:border-critical-300'
          : 'border-line bg-white shadow-card hover:border-ink-200 hover:shadow-raised')
      }
    >
      <span className={'mt-0.5 shrink-0 ' + (emphasis ? 'text-critical-500' : 'text-ink-400')}>
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={
            'block text-[13.5px] font-semibold leading-tight ' +
            (emphasis ? 'text-critical-700' : 'text-ink-900')
          }
        >
          {title}
        </span>
        <span
          className={
            'mt-0.5 block text-[12px] leading-snug ' +
            (emphasis ? 'text-critical-600/80' : 'text-ink-500')
          }
        >
          {detail}
        </span>
      </span>
    </Link>
  );
}

function ConflictChip({ id, subject }: { id: string; subject: string }) {
  const { openConflict } = useVita();
  return (
    <button
      onClick={() => openConflict(id)}
      className="inline-flex items-center gap-1.5 rounded-sm border border-caution-300 bg-white px-2 py-1 text-[12px] font-medium text-caution-600 transition-colors hover:bg-caution-50"
    >
      <ScanLine className="size-3" />
      {subject}
    </button>
  );
}
