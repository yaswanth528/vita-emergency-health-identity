import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FileStack,
  Inbox,
  Pill,
  Plus,
  Share2,
  ShieldCheck,
  Siren,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmergencyButton } from '@/components/system/EmergencyControls';
import { ConnectedClinicianCard, TrustRow } from '@/components/system/PlatformUI';
import { Badge, Card, FieldLabel, Progress, SectionHeader, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { activeMedications, conditions } from '@/data/clinical';
import { documents } from '@/data/documents';
import { kavita } from '@/data/patient';
import { clinicianById, patientUser, seedConnections } from '@/data/platform';
import { timeline } from '@/data/timeline';
import { useNotifications, useOpenConflicts, useVita } from '@/hooks/useVita';
import { formatDate, relativeAge } from '@/lib/format';
import { consentScopeLabel } from '@/data/consent';

/* ============================================================================
   Patient overview
   ----------------------------------------------------------------------------
   Written for the patient, not the clinician. The question it answers is "is my
   record in order and who can see it", never "what is wrong with me".

   The emergency control sits high and is the only loud element on the page.
   Everything else is deliberately calm — a patient checking their record on a
   normal Tuesday should not be met with an alarm.
   ========================================================================== */

export default function Dashboard() {
  const conflicts = useOpenConflicts();
  const { openEvidence, grants, requests, emergencies } = useVita();
  const { notifications, unread } = useNotifications(patientUser.id);

  const pendingRequests = requests.filter(
    (r) => r.patientId === kavita.id && r.status === 'pending',
  );
  const activeGrants = grants.filter((g) => g.status === 'active');
  const myEmergencies = emergencies.filter((e) => e.patientId === kavita.id);
  const connections = seedConnections.filter((c) => c.patientId === kavita.id);

  /* Recent activity is assembled from real store objects, not a fixture — so it
     reflects what actually happened in this session. */
  const activity = [
    ...myEmergencies.map((e) => ({
      when: e.startedAt,
      text:
        e.status === 'active'
          ? 'You activated an emergency. Your care team was notified.'
          : 'Emergency stood down.',
      tone: 'critical' as const,
    })),
    ...notifications.slice(0, 4).map((n) => ({
      when: n.createdAt,
      text: n.title,
      tone: n.priority === 'high' ? ('critical' as const) : ('neutral' as const),
    })),
    ...timeline.slice(0, 3).map((e) => ({
      when: relativeAge(e.date),
      text: e.title,
      tone: 'neutral' as const,
    })),
  ].slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Your health identity"
        title={`Good morning, ${kavita.fullName.split(' ')[0]}`}
        description="Your record is assembled from every linked source. You decide who sees it, what they see, and for how long."
        actions={
          <>
            <Link to="/app/ingest" className={buttonClasses({ variant: 'secondary' })}>
              <Plus className="size-[15px]" />
              Add record
            </Link>
            <Link to="/app/consent" className={buttonClasses({ variant: 'primary' })}>
              <Share2 className="size-[15px]" />
              Share access
            </Link>
          </>
        }
      />

      <PageBody className="space-y-8">
        {/* --- Emergency control ------------------------------------------- */}
        <EmergencyButton patientId={kavita.id} />

        {/* --- Health status ------------------------------------------------ */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Emergency profile"
            value="Ready"
            tone="verified"
            sub="Allergies, blood group, medications and history all populated"
            href="/app/emergency-profile"
          />
          <StatusCard
            label="Identity"
            value="Verified"
            tone="verified"
            sub={`ABHA ${kavita.abhaMasked}`}
            icon={<BadgeCheck className="size-3.5" />}
          />
          <StatusCard
            label="Profile completeness"
            value={`${kavita.profileCompleteness}%`}
            progress={kavita.profileCompleteness}
            sub={`${documents.length} sources linked · ${kavita.sourceFreshnessDays} days fresh`}
          />
          <StatusCard
            label="Needs your decision"
            value={String(pendingRequests.length)}
            tone={pendingRequests.length ? 'caution' : 'verified'}
            sub={pendingRequests.length ? 'Access requests waiting' : 'Nothing waiting on you'}
            href="/app/requests"
          />
        </div>

        {/* --- Quick actions ------------------------------------------------ */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/app/emergency-profile" icon={<Siren className="size-4" />} title="Emergency profile" detail="What clinicians see if you can't speak" />
          <QuickAction to="/app/ingest" icon={<Plus className="size-4" />} title="Upload a record" detail="Prescription, lab report or scan" />
          <QuickAction to="/app/medications" icon={<Pill className="size-4" />} title="My medications" detail={`${activeMedications.length} active`} />
          <QuickAction to="/app/timeline" icon={<CalendarClock className="size-4" />} title="Health timeline" detail={`${timeline.length} events since 2016`} />
        </div>

        {/* --- Requests needing a decision ---------------------------------- */}
        {pendingRequests.length > 0 && (
          <Card accent="caution" className="hatch-caution">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <Inbox className="mt-0.5 size-4 shrink-0 text-caution-600" />
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-ink-900">
                    {pendingRequests.length} clinician
                    {pendingRequests.length === 1 ? '' : 's'} asking for access
                  </h3>
                  <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-ink-600">
                    Nothing has been shared. Each request names exactly what it wants and for how
                    long — you can decline without giving a reason.
                  </p>
                </div>
              </div>
              <Link to="/app/requests" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                Review requests
              </Link>
            </div>
          </Card>
        )}

        {/* --- Conflicts ------------------------------------------------------ */}
        {conflicts.length > 0 && (
          <Card accent="caution">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution-600" />
              <div>
                <h3 className="text-[14px] font-semibold text-ink-900">
                  {conflicts.length} record{conflicts.length > 1 ? 's' : ''} need clinician
                  verification
                </h3>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
                  Two of your sources disagree. PULSE has not chosen between them — both stay
                  visible until a clinician confirms which is correct.
                </p>
                <Link
                  to="/app/ingest"
                  className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-600 hover:underline"
                >
                  See what reconciliation found
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* --- Connected care + activity ------------------------------------ */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section>
            <SectionHeader
              eyebrow={`${activeGrants.length} active grants`}
              title="Connected care"
              description="Clinicians who currently hold access, and what each of them can see."
              action={
                <Link
                  to="/app/consent"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
                >
                  Manage
                  <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <div className="mt-4 space-y-2.5">
              {connections.map((c) => {
                const clinician = clinicianById(c.clinicianId);
                const grant = activeGrants.find((g) => g.granteeName === clinician?.name);
                return (
                  <ConnectedClinicianCard
                    key={c.id}
                    clinicianId={c.clinicianId}
                    scope={grant ? consentScopeLabel[grant.scope] : 'No active access'}
                    status={grant ? 'active' : 'connected only'}
                    expires={grant ? grant.expiresAt : 'Nothing shared'}
                  />
                );
              })}
            </div>
          </section>

          <div className="space-y-6">
            <section>
              <SectionHeader
                eyebrow={unread > 0 ? `${unread} unread` : 'Recent'}
                title="Activity"
                action={
                  <Link
                    to="/app/notifications"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
                  >
                    All
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <Card className="mt-4" padded={false}>
                <ul className="divide-y divide-line">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 px-4 py-3">
                      <span
                        className={
                          'mt-1.5 size-1.5 shrink-0 rounded-full ' +
                          (a.tone === 'critical' ? 'bg-critical-500' : 'bg-ink-200')
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-[12.5px] leading-snug text-ink-800">{a.text}</p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">{a.when}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
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
                  <h3 className="text-[13.5px] font-semibold text-ink-900">
                    Permissioned by default
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                    Nobody sees your record without a grant, every grant expires, and every read is
                    logged with a name against it.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* --- Documents ------------------------------------------------------ */}
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

        <Card>
          <TrustRow
            items={[
              'Identity verified',
              'You control every grant',
              'All access time-limited',
              'Every read logged',
            ]}
          />
          <button
            onClick={() => openEvidence('ev-allergy-penicillin', 'Penicillin allergy')}
            className="mt-3 text-[12.5px] font-medium text-accent-600 hover:underline"
          >
            See what “source-backed” means for one of your records
          </button>
        </Card>
      </PageBody>
    </>
  );
}

/* --- Local components ---------------------------------------------------------- */

function StatusCard({
  label,
  value,
  sub,
  progress,
  tone = 'neutral',
  href,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  progress?: number;
  tone?: 'neutral' | 'caution' | 'verified';
  href?: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <Card interactive={Boolean(href)} className="h-full">
      <FieldLabel className="flex items-center gap-1.5">
        {icon}
        {label}
      </FieldLabel>
      <div
        className={
          'mt-1.5 text-[22px] font-semibold leading-none tabular-nums ' +
          (tone === 'caution'
            ? 'text-caution-600'
            : tone === 'verified'
              ? 'text-verified-600'
              : 'text-ink-900')
        }
      >
        {value}
      </div>
      {progress !== undefined && <Progress value={progress} tone="neutral" className="mt-3" />}
      <p className="mt-2 text-[12px] leading-snug text-ink-500">{sub}</p>
    </Card>
  );
  return href ? <Link to={href}>{body}</Link> : body;
}

function QuickAction({
  to,
  icon,
  title,
  detail,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-lg border border-line bg-white px-4 py-3.5 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-ink-200 hover:shadow-raised"
    >
      <span className="mt-0.5 shrink-0 text-ink-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold leading-tight text-ink-900">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">{detail}</span>
      </span>
    </Link>
  );
}
