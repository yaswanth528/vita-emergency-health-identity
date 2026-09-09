import { ArrowRight, Send, ShieldAlert, TriangleAlert, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BreakGlassDialog, EmergencyAlertBanner } from '@/components/system/EmergencyControls';
import { RequestAccessDialog, RequestCard, TrustRow } from '@/components/system/PlatformUI';
import { Badge, Card, EmptyState, FieldLabel, SectionHeader, buttonClasses } from '@/components/ui';
import { ClinicianPageBody, ClinicianPageHeader } from '@/layouts/ClinicianShell';
import { patientById, registryStatus } from '@/data/patient';
import { clinicianUser, seedConnections, unlinkedArrivals } from '@/data/platform';
import { recentChanges } from '@/data/timeline';
import { useEmergencyAlerts, useVita } from '@/hooks/useVita';
import { sinceLabel } from '@/lib/elapsed';
import { formatDate } from '@/lib/format';

/* ============================================================================
   Clinician overview
   ----------------------------------------------------------------------------
   Answers one question, in priority order: who needs me right now?

     1. Live emergencies          someone pressed the button
     2. Unlinked arrivals         someone is here with no record at all
     3. Connected patients        with something that changed since last time
     4. Requests                  what I am waiting on

   The emergency section is not styled loudly because emergencies are dramatic;
   it is styled loudly because it must win against everything else on the
   screen when it is present, and disappear completely when it is not.
   ========================================================================== */

export default function ClinicianOverview() {
  const navigate = useNavigate();
  const alerts = useEmergencyAlerts();
  const { requests } = useVita();
  const [now, setNow] = useState(Date.now());
  const [breakGlass, setBreakGlass] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  /* The alert age ticks so "just now" becomes "2 minutes ago" while watching. */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const clinicianId = clinicianUser.clinicianId!;
  const pending = requests.filter((r) => r.status === 'pending' && r.clinicianId === clinicianId);
  const myPatients = seedConnections
    .filter((c) => c.clinicianId === clinicianId && c.status === 'active')
    .map((c) => patientById(c.patientId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const bgPatient = breakGlass ? patientById(breakGlass) : null;
  const reqPatient = requesting ? patientById(requesting) : null;

  return (
    <>
      <ClinicianPageHeader
        eyebrow="Emergency department · 09 Sep 2026"
        title="Who needs you now"
        description="Live alerts, arrivals without a record, and the patients whose context changed since you last looked."
        actions={
          <>
            <Link
              to="/clinician/new-patient"
              className={buttonClasses({ variant: 'secondary' })}
            >
              <UserPlus className="size-[15px]" />
              New patient
            </Link>
            <Link to="/clinician/patients" className={buttonClasses({ variant: 'primary' })}>
              <UsersRound className="size-[15px]" />
              All patients
            </Link>
          </>
        }
      />

      <ClinicianPageBody className="space-y-9">
        {/* --- 1. Emergencies -------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={alerts.length > 0 ? 'Highest priority' : 'Clear'}
            title="Emergency alerts"
            description={
              alerts.length > 0
                ? 'A patient has raised the alarm. Opening their context requires a written reason and notifies them.'
                : 'Nothing active. Alerts appear here the moment a connected patient activates an emergency.'
            }
          />
          <div className="mt-4 space-y-3">
            {alerts.length === 0 && (
              <EmptyState
                icon={<ShieldAlert />}
                title="No active emergencies"
                description="When a connected patient presses Emergency, it lands here immediately and in the bar above."
              />
            )}
            {alerts.map((e) => {
              const p = patientById(e.patientId);
              return (
                <EmergencyAlertBanner
                  key={e.id}
                  patientName={p?.fullName ?? e.patientId}
                  startedAt={e.startedAt}
                  minutesAgo={sinceLabel(e.startedAtMs, now)}
                  onOpen={() => setBreakGlass(e.patientId)}
                />
              );
            })}
          </div>
        </section>

        {/* --- 2. Unlinked arrivals -------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="No health identity"
            title="New patients"
            description="Arrivals with nothing linked. The honest answer here is that the product has nothing to offer yet — only a way to change that."
          />
          <div className="mt-4 space-y-2.5">
            {unlinkedArrivals.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-line-strong bg-canvas-sunk font-mono text-[12px] text-ink-400">
                      {a.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-ink-900">{a.name}</h3>
                        <Badge tone="neutral">No linked profile</Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-[11.5px] text-ink-400">
                        {a.age} {a.sex.charAt(0)} · arrived {a.arrivedAt}
                      </p>
                      <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-ink-500">
                        {a.note}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/clinician/new-patient"
                    className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                  >
                    Search registry
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* --- 3. Connected patients -------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={`${myPatients.length} connected`}
            title="Your patients"
            action={
              <Link
                to="/clinician/patients"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
              >
                Full list
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-4 space-y-2.5">
            {myPatients.map((p) => {
              const status = registryStatus[p.id];
              const change = p.id === 'pt-4491' ? recentChanges[0] : undefined;
              return (
                <Card key={p.id} interactive onClick={() => navigate(`/clinician/patients/${p.id}`)}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-ink-900 font-mono text-[12px] font-semibold text-white">
                        {p.photoInitials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold text-ink-900">{p.fullName}</h3>
                          <Badge tone="neutral" mono>
                            {p.id.toUpperCase()}
                          </Badge>
                          <Badge tone="critical">
                            <TriangleAlert className="size-2.5" />
                            Penicillin allergy
                          </Badge>
                        </div>
                        <p className="mt-1 text-[12px] text-ink-500">
                          Last encounter {status?.lastEncounter ?? '—'}
                        </p>
                        {change && (
                          <p className="mt-1.5 text-[12.5px] text-caution-600">
                            Recent change · {change.title.replace('Medication changed — ', '')} ·{' '}
                            {formatDate(change.date)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={status?.consent === 'active' ? 'verified' : 'caution'}>
                        {status?.consent === 'active' ? 'Authorised' : 'Requires request'}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequesting(p.id);
                        }}
                        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                      >
                        <Send className="size-[15px]" />
                        Request access
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* --- 4. Requests ------------------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow={`${pending.length} awaiting a decision`}
            title="Your access requests"
            description="You asked. Only the patient can answer, and they are not obliged to."
            action={
              <Link
                to="/clinician/requests"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
              >
                Request centre
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-4 space-y-2.5">
            {pending.length === 0 ? (
              <EmptyState icon={<Send />} title="Nothing pending" />
            ) : (
              pending.map((r) => <RequestCard key={r.id} request={r} viewer="clinician" />)
            )}
          </div>
        </section>

        <Card accent="accent">
          <FieldLabel>What you can and cannot do here</FieldLabel>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
            You can search the registry, ask a patient for access, and break glass in an emergency
            with a written reason. You cannot approve your own request, extend a grant, or see a
            category the patient withheld. Every read you make is written to their audit trail under
            your name and licence number.
          </p>
          <div className="mt-3">
            <TrustRow
              items={['Identity verified', 'Purpose-specific access', 'Time-limited', 'Audit logged']}
            />
          </div>
        </Card>
      </ClinicianPageBody>

      {bgPatient && (
        <BreakGlassDialog
          open
          onClose={() => setBreakGlass(null)}
          patientId={bgPatient.id}
          patientName={bgPatient.fullName}
          clinicianId={clinicianId}
          onGranted={() => navigate(`/emergency/${bgPatient.id}`)}
        />
      )}
      {reqPatient && (
        <RequestAccessDialog
          open
          onClose={() => setRequesting(null)}
          patientId={reqPatient.id}
          patientName={reqPatient.fullName}
          clinicianId={clinicianId}
        />
      )}
    </>
  );
}
