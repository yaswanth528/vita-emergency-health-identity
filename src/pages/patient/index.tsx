import { ArrowRight, Bell, Inbox, Pill, Send, ShieldCheck, Siren } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AllergyAlert, MedicationCard } from '@/components/clinical';
import { EmergencyButton } from '@/components/system/EmergencyControls';
import { RequestCard, TrustRow } from '@/components/system/PlatformUI';
import { EvidenceBadge } from '@/components/evidence/EvidenceBadge';
import { Badge, Card, EmptyState, FieldLabel, SectionHeader, Tabs, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { activeMedications, allergies, conditions, implants, medications } from '@/data/clinical';
import { kavita } from '@/data/patient';
import { patientUser } from '@/data/platform';
import { majorHistory, recentChanges } from '@/data/timeline';
import { useNotifications, useVita } from '@/hooks/useVita';
import { formatDate, freshnessBand, freshnessLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ============================================================================
   REQUEST CENTRE — patient side
   ----------------------------------------------------------------------------
   The only screen in the product where an access decision can be made. A
   clinician's request centre shows the same objects with no decision buttons.
   ========================================================================== */

type Tab = 'incoming' | 'answered' | 'all';

export function PatientRequests() {
  const { requests } = useVita();
  const [tab, setTab] = useState<Tab>('incoming');

  const mine = requests.filter((r) => r.patientId === kavita.id);
  const pending = mine.filter((r) => r.status === 'pending');
  const answered = mine.filter((r) => r.status !== 'pending');
  const shown = tab === 'incoming' ? pending : tab === 'answered' ? answered : mine;

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="Requests"
        description="Clinicians asking to see part of your record. Nothing is shared until you say yes, and you never have to give a reason for saying no."
      />
      <PageBody className="space-y-6">
        <Tabs
          tabs={[
            { id: 'incoming', label: 'Awaiting you', count: pending.length },
            { id: 'answered', label: 'Answered', count: answered.length },
            { id: 'all', label: 'All', count: mine.length },
          ]}
          active={tab}
          onChange={(id) => setTab(id as Tab)}
        />

        <div className="space-y-3">
          {shown.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title={tab === 'incoming' ? 'Nothing waiting on you' : 'Nothing here yet'}
              description={
                tab === 'incoming'
                  ? 'Requests appear here the moment a clinician asks. You will also get a notification.'
                  : undefined
              }
            />
          ) : (
            shown.map((r) => <RequestCard key={r.id} request={r} viewer="patient" />)
          )}
        </div>

        <Card accent="accent">
          <FieldLabel>How to read a request</FieldLabel>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">
            Every request names the exact data categories being asked for and how long access would
            last. Approving creates a grant that expires by itself — you do not have to remember to
            switch it off. You can revoke it at any point before then from Access &amp; consent, and
            the clinician is told when you do.
          </p>
          <Link
            to="/app/consent"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
          >
            Review who has access now
            <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </PageBody>
    </>
  );
}

/* ============================================================================
   NOTIFICATIONS — patient side
   ========================================================================== */

export function PatientNotifications() {
  const { notifications, unread, markNotificationRead, markAllRead } = useNotifications(
    patientUser.id,
  );

  return (
    <>
      <PageHeader
        eyebrow={unread > 0 ? `${unread} unread` : 'All caught up'}
        title="Notifications"
        description="You are told when someone asks for access, when they are granted it, and every time your emergency context is opened."
        actions={
          unread > 0 ? (
            <button onClick={markAllRead} className={buttonClasses({ variant: 'secondary' })}>
              Mark all read
            </button>
          ) : undefined
        }
      />
      <PageBody>
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell />} title="Nothing yet" />
        ) : (
          <ul className="space-y-2.5">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link to={n.href ?? '/app/dashboard'} onClick={() => markNotificationRead(n.id)}>
                  <Card
                    interactive
                    accent={n.priority === 'high' ? 'critical' : 'none'}
                    className={cn(!n.read && 'bg-accent-50/40')}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          n.priority === 'high'
                            ? 'bg-critical-500'
                            : n.read
                              ? 'bg-ink-200'
                              : 'bg-accent-500',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink-900">{n.title}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
                        <p className="mt-1.5 font-mono text-[10.5px] text-ink-400">{n.createdAt}</p>
                      </div>
                      <ArrowRight className="ml-auto mt-1 size-4 shrink-0 text-ink-300" />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}

/* ============================================================================
   EMERGENCY PROFILE — what a clinician would see
   ----------------------------------------------------------------------------
   Shown to the patient in the calm surface, so they can check it before they
   ever need it. Same content the clinician gets; different framing.
   ========================================================================== */

export function PatientEmergencyProfile() {
  const freshness = freshnessBand(kavita.sourceFreshnessDays);
  const change = recentChanges[0];

  return (
    <>
      <PageHeader
        eyebrow="Ready"
        title="Emergency profile"
        description="Exactly what an authorised clinician sees if you cannot speak for yourself. Nothing more than this is released in an emergency."
        actions={
          <Link to="/emergency" className={buttonClasses({ variant: 'secondary' })}>
            <Siren className="size-[15px]" />
            Preview the clinician view
          </Link>
        }
      />
      <PageBody className="space-y-7">
        <Card accent="verified">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <FieldLabel>Status</FieldLabel>
              <p className="mt-1.5 text-[20px] font-semibold text-verified-600">Ready</p>
              <p className="mt-1 text-[12.5px] text-ink-500">
                Every section below is populated and source-backed.
              </p>
            </div>
            <dl className="flex flex-wrap gap-8">
              <div>
                <dt className="label-xs text-ink-400">Blood group</dt>
                <dd className="mt-1 text-[20px] font-semibold text-ink-900">
                  {kavita.bloodGroup.value}
                </dd>
              </div>
              <div>
                <dt className="label-xs text-ink-400">Source freshness</dt>
                <dd className="mt-1 text-[20px] font-semibold tabular-nums text-ink-900">
                  {kavita.sourceFreshnessDays}d
                </dd>
                <dd className="mt-1">
                  <Badge tone={freshness === 'current' ? 'verified' : 'caution'}>
                    {freshnessLabel[freshness]}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <section>
          <SectionHeader eyebrow="Released first" title="Critical" />
          <div className="mt-4 space-y-3">
            {allergies.map((a) => (
              <AllergyAlert key={a.id} allergy={a} />
            ))}
          </div>
        </section>

        {change && (
          <section>
            <SectionHeader eyebrow="Last 30 days" title="Recent change" />
            <Card accent="caution" className="hatch-caution mt-4">
              <p className="text-[15px] font-semibold text-ink-900">{change.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{change.detail}</p>
              <p className="mt-2 font-mono text-[11px] text-ink-400">
                {formatDate(change.date)} · {change.facility}
              </p>
            </Card>
          </section>
        )}

        <section>
          <SectionHeader eyebrow={`${activeMedications.length} active`} title="Medications" />
          <div className="mt-4 space-y-2.5">
            {activeMedications.map((m) => (
              <MedicationCard key={m.id} medication={m} compact />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Active" title="Conditions" />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {conditions
              .filter((c) => c.status === 'active')
              .map((c) => (
                <Card key={c.id}>
                  <p className="text-[14px] font-semibold text-ink-900">{c.name.value}</p>
                  {c.controlMarker && (
                    <p className="mt-1 font-mono text-[12px] text-ink-600">
                      {c.controlMarker.value}
                    </p>
                  )}
                  <div className="mt-2.5">
                    <EvidenceBadge
                      fact={c.controlMarker ?? c.name}
                      claimLabel={c.name.value}
                      detail="compact"
                    />
                  </div>
                </Card>
              ))}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow={`${majorHistory.length} events`} title="Major history" />
          <Card className="mt-4" padded={false}>
            <ul className="divide-y divide-line">
              {majorHistory.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span className="text-[13.5px] font-medium text-ink-900">{e.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-400">
                    {e.date.slice(0, 4)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {implants.length > 0 && (
          <section>
            <SectionHeader eyebrow="In your body" title="Implanted devices" />
            <Card accent="caution" className="mt-4">
              {implants.map((i) => (
                <p key={i} className="text-[13.5px] font-medium text-ink-900">
                  {i}
                </p>
              ))}
            </Card>
          </section>
        )}

        <section>
          <SectionHeader eyebrow="Withheld even in an emergency" title="What is never released" />
          <Card className="mt-4">
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {[
                'Mental health records',
                'Reproductive and sexual health history',
                'Your full lifetime document archive',
                'Billing and insurance records',
              ].map((w) => (
                <li key={w} className="flex items-start gap-2 text-[13px] text-ink-600">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </PageBody>
    </>
  );
}

/* ============================================================================
   MEDICATIONS
   ========================================================================== */

export function PatientMedications() {
  const active = medications.filter((m) => m.status !== 'discontinued');
  const stopped = medications.filter((m) => m.status === 'discontinued');

  return (
    <>
      <PageHeader
        eyebrow={`${active.length} active · ${stopped.length} stopped`}
        title="Medications"
        description="Reconciled from every prescription linked to your profile. Each dose shows the document it came from."
        actions={
          <Link to="/app/ingest" className={buttonClasses({ variant: 'secondary' })}>
            <Pill className="size-[15px]" />
            Add a prescription
          </Link>
        }
      />
      <PageBody className="space-y-8">
        <section>
          <SectionHeader eyebrow="Taking now" title="Active" />
          <div className="mt-4 space-y-2.5">
            {active.map((m) => (
              <MedicationCard key={m.id} medication={m} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Kept, not deleted"
            title="Stopped"
            description="A drug you stopped last year is still relevant to a reaction today, so it stays on the record."
          />
          <div className="mt-4 space-y-2.5">
            {stopped.map((m) => (
              <MedicationCard key={m.id} medication={m} />
            ))}
          </div>
        </section>

        <Card accent="accent">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" />
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink-900">
                One of these has disagreeing sources
              </h3>
              <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
                Two prescriptions give different doses for atorvastatin. PULSE shows both rather than
                picking one, and flags it for a clinician to confirm. Until then, both are visible to
                anyone you authorise.
              </p>
              <Link
                to="/app/ingest"
                className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-600 hover:underline"
              >
                See what reconciliation found
              </Link>
            </div>
          </div>
        </Card>
      </PageBody>
    </>
  );
}

/* --- Shared: the quick trust strip used on the patient overview -------------- */

export function PatientTrustStrip() {
  return (
    <Card>
      <TrustRow
        items={[
          'Identity verified',
          'You control every grant',
          'All access time-limited',
          'Every read logged',
        ]}
      />
    </Card>
  );
}

export { EmergencyButton, Send };
