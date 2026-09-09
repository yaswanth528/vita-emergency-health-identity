import {
  ArrowRight,
  Ban,
  Bell,
  CheckCircle2,
  Search,
  Send,
  ShieldCheck,
  Siren,
  UserPlus,
  UserRoundSearch,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Timeline } from '@/components/clinical/Timeline';
import { BreakGlassDialog, EmergencyAlertBanner } from '@/components/system/EmergencyControls';
import { AuditLog } from '@/components/system/ConsentPanel';
import { RequestAccessDialog, RequestCard, TrustRow } from '@/components/system/PlatformUI';
import { Badge, Button, Card, EmptyState, FieldLabel, SectionHeader, Tabs, buttonClasses } from '@/components/ui';
import { ClinicianPageBody, ClinicianPageHeader } from '@/layouts/ClinicianShell';
import { allPatients, patientById, registryStatus } from '@/data/patient';
import { clinicianUser, unlinkedArrivals } from '@/data/platform';
import { majorHistory, timeline } from '@/data/timeline';
import { useEmergencyAlerts, useNotifications, useVita } from '@/hooks/useVita';
import { sinceLabel } from '@/lib/elapsed';
import { cn } from '@/lib/utils';

const CLINICIAN_ID = clinicianUser.clinicianId!;

/* ============================================================================
   EMERGENCY BOARD
   ========================================================================== */

export function EmergencyBoard() {
  const alerts = useEmergencyAlerts();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [breakGlass, setBreakGlass] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const bgPatient = breakGlass ? patientById(breakGlass) : null;

  return (
    <>
      <ClinicianPageHeader
        eyebrow="Live"
        title="Emergency"
        description="Patients who have raised the alarm. Opening a context here is break-glass: it needs a written reason, it expires in two hours, and the patient is told immediately."
      />
      <ClinicianPageBody className="space-y-6">
        {alerts.length === 0 ? (
          <EmptyState
            icon={<Siren />}
            title="No active emergencies"
            description="This board stays empty until a connected patient activates an emergency from their own device."
            action={
              <Link to="/clinician" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Back to overview
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {alerts.map((e) => {
              const p = patientById(e.patientId);
              return (
                <div key={e.id} className="space-y-2.5">
                  <EmergencyAlertBanner
                    patientName={p?.fullName ?? e.patientId}
                    startedAt={e.startedAt}
                    minutesAgo={sinceLabel(e.startedAtMs, now)}
                    onOpen={() => setBreakGlass(e.patientId)}
                  />
                  <Card>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <FieldLabel>Raised by</FieldLabel>
                        <p className="mt-1.5 text-[13px] text-ink-900">
                          The patient, from their own device
                        </p>
                      </div>
                      <div>
                        <FieldLabel>Location</FieldLabel>
                        <p className="mt-1.5 text-[13px] text-ink-900">
                          {e.location ?? 'Not shared'}
                        </p>
                      </div>
                      <div>
                        <FieldLabel>Context opened</FieldLabel>
                        <p className="mt-1.5 text-[13px] text-ink-900">
                          {e.accessedBy.length === 0
                            ? 'Not yet — nothing released'
                            : `${e.accessedBy.length} time${e.accessedBy.length === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </ClinicianPageBody>

      {bgPatient && (
        <BreakGlassDialog
          open
          onClose={() => setBreakGlass(null)}
          patientId={bgPatient.id}
          patientName={bgPatient.fullName}
          clinicianId={CLINICIAN_ID}
          onGranted={() => navigate(`/emergency/${bgPatient.id}`)}
        />
      )}
    </>
  );
}

/* ============================================================================
   REQUEST CENTRE
   ========================================================================== */

type ReqTab = 'pending' | 'approved' | 'declined' | 'all';

export function ClinicianRequests() {
  const { requests, grants } = useVita();
  const [tab, setTab] = useState<ReqTab>('pending');

  const mine = requests.filter((r) => r.clinicianId === CLINICIAN_ID);
  const shown = tab === 'all' ? mine : mine.filter((r) => r.status === tab);
  const activeGrants = grants.filter(
    (g) => g.status === 'active' && g.granteeName === clinicianUser.name,
  );

  return (
    <>
      <ClinicianPageHeader
        eyebrow="Access"
        title="Requests"
        description="What you have asked for, and what you were given. You cannot approve anything on this page — that is the patient's decision, taken on their own screen."
      />
      <ClinicianPageBody className="space-y-8">
        <section>
          <Tabs
            tabs={[
              { id: 'pending', label: 'Pending', count: mine.filter((r) => r.status === 'pending').length },
              { id: 'approved', label: 'Approved', count: mine.filter((r) => r.status === 'approved').length },
              { id: 'declined', label: 'Declined', count: mine.filter((r) => r.status === 'declined').length },
              { id: 'all', label: 'All', count: mine.length },
            ]}
            active={tab}
            onChange={(id) => setTab(id as ReqTab)}
            className="mb-4"
          />
          <div className="space-y-2.5">
            {shown.length === 0 ? (
              <EmptyState icon={<Send />} title={`No ${tab === 'all' ? '' : tab} requests`} />
            ) : (
              shown.map((r) => <RequestCard key={r.id} request={r} viewer="clinician" />)
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow={`${activeGrants.length} live`}
            title="Access you currently hold"
            description="Each of these expires by itself. None of them can be extended from this side."
          />
          <div className="mt-4 space-y-2.5">
            {activeGrants.length === 0 ? (
              <EmptyState icon={<ShieldCheck />} title="You hold no active access" />
            ) : (
              activeGrants.map((g) => (
                <Card key={g.id} accent={g.basis === 'break-glass' ? 'critical' : 'verified'}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14.5px] font-semibold text-ink-900">{g.scope}</h3>
                        {g.basis === 'break-glass' && (
                          <Badge tone="critical">
                            <Siren className="size-2.5" />
                            Break-glass
                          </Badge>
                        )}
                        <Badge tone="verified">Active</Badge>
                      </div>
                      <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-ink-600">
                        {g.purpose}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-ink-400">
                        Granted {g.grantedAt} · {g.expiresAt}
                      </p>
                    </div>
                    <div className="min-w-[200px]">
                      <FieldLabel>Withheld from you</FieldLabel>
                      <ul className="mt-1.5 space-y-1">
                        {g.withheldData.slice(0, 3).map((w) => (
                          <li key={w} className="flex items-start gap-1.5 text-[11.5px] text-ink-500">
                            <Ban className="mt-0.5 size-2.5 shrink-0 text-ink-300" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </ClinicianPageBody>
    </>
  );
}

/* ============================================================================
   NEW PATIENT
   ========================================================================== */

export function NewPatient() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allPatients.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.abhaMasked.includes(q),
    );
  }, [query]);

  const reqPatient = requesting ? patientById(requesting) : null;

  return (
    <>
      <ClinicianPageHeader
        eyebrow="Triage"
        title="New patient"
        description="Search the health-identity registry before creating anything. Most arrivals already have a record somewhere — the problem is finding it, not making another one."
      />
      <ClinicianPageBody className="space-y-6">
        <Card>
          <FieldLabel>Search the registry</FieldLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearched(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && setSearched(true)}
                placeholder="Patient name or ABHA number…"
                className="h-11 w-full rounded-md border border-line-strong bg-white pl-10 pr-4 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none"
              />
            </div>
            <Button variant="primary" icon={<UserRoundSearch />} onClick={() => setSearched(true)}>
              Search
            </Button>
          </div>
          <p className="mt-2.5 text-[11.5px] text-ink-400">
            Try “Kavita” for an existing profile, or “Rahul” for an arrival with nothing linked.
          </p>
        </Card>

        {searched && results.length > 0 && (
          <section>
            <SectionHeader eyebrow="Match found" title="Existing health profile" />
            <div className="mt-4 space-y-2.5">
              {results.map((p) => {
                const status = registryStatus[p.id];
                return (
                  <Card key={p.id} accent="verified">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink-900 font-mono text-[13px] font-semibold text-white">
                          {p.photoInitials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15.5px] font-semibold text-ink-900">{p.fullName}</h3>
                            <Badge tone="verified">
                              <CheckCircle2 className="size-2.5" />
                              Verified identity
                            </Badge>
                          </div>
                          <p className="mt-1 font-mono text-[11.5px] text-ink-400">
                            {p.age} {p.sex.charAt(0)} · ABHA {p.abhaMasked}
                          </p>
                          <p className="mt-2 text-[12.5px] text-ink-600">
                            {status?.linkedSources ?? 0} linked sources. Existing health profile
                            available — you still need the patient&apos;s authorisation to read it.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Send />}
                          onClick={() => setRequesting(p.id)}
                        >
                          Request access
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/clinician/patients/${p.id}`)}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {searched && results.length === 0 && query.trim() && (
          <section>
            <SectionHeader eyebrow="No match" title="No existing profile found" />
            <Card className="mt-4">
              <p className="text-[13px] leading-relaxed text-ink-600">
                Nothing in the registry matches “{query.trim()}”. That is a real answer, not a
                failure — proceed on clinical assessment, and offer the patient a way to link a
                profile so the next clinician is not in the same position.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-line bg-canvas-sunk px-4 py-3.5">
                  <h4 className="text-[13.5px] font-semibold text-ink-900">
                    Create a temporary encounter record
                  </h4>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
                    Local to this presentation. Not a health identity, and it surfaces nothing from
                    elsewhere.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" icon={<UserPlus />}>
                    Create encounter record
                  </Button>
                </div>
                <div className="rounded-md border border-line bg-canvas-sunk px-4 py-3.5">
                  <h4 className="text-[13.5px] font-semibold text-ink-900">
                    Invite the patient to create a profile
                  </h4>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
                    Sends an enrolment link. They own it; you get access only if they grant it.
                  </p>
                  <Button
                    variant={invited ? 'secondary' : 'primary'}
                    size="sm"
                    className="mt-3"
                    disabled={invited}
                    onClick={() => setInvited(true)}
                  >
                    {invited ? 'Invitation sent' : 'Send invitation'}
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        <section>
          <SectionHeader eyebrow="At triage now" title="Unlinked arrivals" />
          <div className="mt-4 space-y-2.5">
            {unlinkedArrivals.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[14.5px] font-semibold text-ink-900">{a.name}</h3>
                    <p className="mt-0.5 font-mono text-[11.5px] text-ink-400">
                      {a.age} {a.sex.charAt(0)} · arrived {a.arrivedAt}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery(a.name.split(' ')[0]);
                      setSearched(true);
                    }}
                  >
                    Search for {a.name.split(' ')[0]}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </ClinicianPageBody>

      {reqPatient && (
        <RequestAccessDialog
          open
          onClose={() => setRequesting(null)}
          patientId={reqPatient.id}
          patientName={reqPatient.fullName}
          clinicianId={CLINICIAN_ID}
        />
      )}
    </>
  );
}

/* ============================================================================
   NOTIFICATIONS
   ========================================================================== */

export function ClinicianNotifications() {
  const { notifications, unread, markNotificationRead, markAllRead } = useNotifications(
    clinicianUser.id,
  );

  return (
    <>
      <ClinicianPageHeader
        eyebrow={unread > 0 ? `${unread} unread` : 'All caught up'}
        title="Notifications"
        actions={
          unread > 0 ? (
            <Button variant="secondary" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <ClinicianPageBody>
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell />} title="Nothing yet" />
        ) : (
          <ul className="space-y-2.5">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link to={n.href ?? '/clinician'} onClick={() => markNotificationRead(n.id)}>
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
      </ClinicianPageBody>
    </>
  );
}

/* ============================================================================
   AUDIT
   ========================================================================== */

export function ClinicianAudit() {
  const { audit, sessionAuditCount } = useVita();
  return (
    <>
      <ClinicianPageHeader
        eyebrow="Append-only"
        title="Audit log"
        description={
          sessionAuditCount > 0
            ? `${sessionAuditCount} of these entries were written by what you did in this session. The patient sees the same log.`
            : 'Every read is recorded here under your name, including reads of the evidence behind a claim. The patient sees the same log.'
        }
      />
      <ClinicianPageBody className="space-y-5">
        <AuditLog events={audit} liveCount={sessionAuditCount} />
        <Card accent="accent">
          <TrustRow
            items={[
              'Written under your licence number',
              'Visible to the patient',
              'Cannot be edited or deleted',
            ]}
          />
        </Card>
      </ClinicianPageBody>
    </>
  );
}

/* ============================================================================
   CLINICAL TIMELINE
   ========================================================================== */

export function ClinicianTimeline() {
  const { grants } = useVita();
  const authorised = grants.some((g) => g.status === 'active' && g.granteeName === clinicianUser.name);

  return (
    <>
      <ClinicianPageHeader
        eyebrow="Kavita Menon"
        title="Clinical timeline"
        description="The longitudinal record, available only while an authorisation is live."
      />
      <ClinicianPageBody>
        {!authorised ? (
          <EmptyState
            icon={<ShieldCheck />}
            title="No active authorisation"
            description="You are not currently authorised to read this patient's longitudinal record. Request access, or break glass if this is an emergency."
            action={
              <Link
                to="/clinician/patients"
                className={buttonClasses({ variant: 'primary', size: 'sm' })}
              >
                Go to patients
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            <Card accent="verified">
              <TrustRow
                items={['Authorised access', 'Source-backed', 'Audit logged', 'Expires automatically']}
              />
            </Card>
            <Timeline events={timeline} />
          </div>
        )}
      </ClinicianPageBody>
    </>
  );
}

/* ============================================================================
   SETTINGS
   ========================================================================== */

export function ClinicianSettings() {
  return (
    <>
      <ClinicianPageHeader
        eyebrow="Account"
        title="Security & practice"
        description="What this account is, what it may do, and the limits the system places on it."
      />
      <ClinicianPageBody className="space-y-6">
        <Card>
          <FieldLabel>Practitioner</FieldLabel>
          <dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Name', clinicianUser.name],
              ['Licence', 'TSMC 41207'],
              ['Speciality', 'Emergency Medicine'],
              ['Department', 'Emergency Department'],
              ['Organisation', 'Apollo Hospitals'],
              ['Verification', 'Verified (simulated)'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label-xs text-ink-400">{k}</dt>
                <dd className="mt-1 text-[13px] font-medium text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card accent="critical">
          <FieldLabel>Limits on this account</FieldLabel>
          <ul className="mt-2.5 space-y-2">
            {[
              'You cannot approve your own access request.',
              'You cannot extend or renew a grant — only the patient can.',
              'You cannot see a data category the patient withheld, in any mode.',
              'Break-glass requires a written reason, expires in two hours, and notifies the patient.',
              'You cannot delete or amend an audit entry.',
              'Major history and the full document archive follow the grant, not your role.',
            ].map((l) => (
              <li key={l} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-700">
                <Ban className="mt-0.5 size-3 shrink-0 text-critical-500" />
                {l}
              </li>
            ))}
          </ul>
        </Card>

        <Card accent="accent">
          <FieldLabel>Major history flagged for this shift</FieldLabel>
          <ul className="mt-2.5 space-y-1.5">
            {majorHistory.slice(0, 3).map((e) => (
              <li key={e.id} className="text-[12.5px] text-ink-600">
                {e.title} · {e.date.slice(0, 4)}
              </li>
            ))}
          </ul>
        </Card>
      </ClinicianPageBody>
    </>
  );
}
