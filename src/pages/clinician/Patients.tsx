import {
  BadgeCheck,
  KeyRound,
  Search,
  Send,
  ShieldAlert,
  Siren,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BreakGlassDialog } from '@/components/system/EmergencyControls';
import { RequestAccessDialog } from '@/components/system/PlatformUI';
import { Badge, Button, Card, EmptyState, Tabs, buttonClasses } from '@/components/ui';
import { ClinicianPageBody, ClinicianPageHeader } from '@/layouts/ClinicianShell';
import { allPatients, patientById, registryStatus } from '@/data/patient';
import { clinicianUser, seedConnections } from '@/data/platform';
import { useEmergencyAlerts, useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

/* ============================================================================
   Patient list
   ----------------------------------------------------------------------------
   The registry is deliberately uneven. Four patients exercise four different
   authorisation states, because a list where every row says AUTHORISED proves
   nothing about whether the system actually gates anything.
   ========================================================================== */

type Filter = 'all' | 'emergency' | 'connected' | 'unauthorised' | 'blocked';

export default function ClinicianPatients() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [breakGlass, setBreakGlass] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const navigate = useNavigate();
  const alerts = useEmergencyAlerts();
  const { grants } = useVita();

  const clinicianId = clinicianUser.clinicianId!;
  const connectedIds = new Set(
    seedConnections.filter((c) => c.clinicianId === clinicianId).map((c) => c.patientId),
  );
  const emergencyIds = new Set(alerts.map((a) => a.patientId));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPatients
      .filter((p) => {
        if (filter === 'emergency') return emergencyIds.has(p.id);
        if (filter === 'connected') return connectedIds.has(p.id);
        if (filter === 'unauthorised')
          return registryStatus[p.id]?.consent === 'requires-request';
        if (filter === 'blocked') return registryStatus[p.id]?.consent === 'blocked-identity';
        return true;
      })
      .filter(
        (p) =>
          !q ||
          p.fullName.toLowerCase().includes(q) ||
          p.abhaMasked.includes(q) ||
          p.id.toLowerCase().includes(q),
      )
      .sort((a, b) => Number(emergencyIds.has(b.id)) - Number(emergencyIds.has(a.id)));
  }, [query, filter, emergencyIds, connectedIds]);

  const bgPatient = breakGlass ? patientById(breakGlass) : null;
  const reqPatient = requesting ? patientById(requesting) : null;

  return (
    <>
      <ClinicianPageHeader
        eyebrow="Registry"
        title="Patients"
        description="Search by name, ABHA number or patient ID. Clinical context is released only against a verified identity and an active authorisation."
      />

      <ClinicianPageBody className="space-y-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ABHA number or patient ID…"
            className="h-11 w-full rounded-md border border-line-strong bg-white pl-10 pr-4 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none"
          />
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: allPatients.length },
            { id: 'emergency', label: 'Emergency', count: emergencyIds.size },
            { id: 'connected', label: 'Connected', count: connectedIds.size },
            {
              id: 'unauthorised',
              label: 'Needs authorisation',
              count: allPatients.filter((p) => registryStatus[p.id]?.consent === 'requires-request')
                .length,
            },
            {
              id: 'blocked',
              label: 'Identity unverified',
              count: allPatients.filter((p) => registryStatus[p.id]?.consent === 'blocked-identity')
                .length,
            },
          ]}
          active={filter}
          onChange={(id) => setFilter(id as Filter)}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="No patient matches"
            description="Try an ABHA number, or register the arrival at triage if they are not in the registry."
            action={
              <Link
                to="/clinician/new-patient"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                New patient
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {rows.map((p) => (
              <PatientRow
                key={p.id}
                patient={p}
                inEmergency={emergencyIds.has(p.id)}
                authorised={grants.some(
                  (g) => g.status === 'active' && g.granteeName === 'Dr. Arjun Rao',
                )}
                onOpen={() => navigate(`/clinician/patients/${p.id}`)}
                onBreakGlass={() => setBreakGlass(p.id)}
                onRequest={() => setRequesting(p.id)}
              />
            ))}
          </div>
        )}
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

function PatientRow({
  patient,
  inEmergency,
  onOpen,
  onBreakGlass,
  onRequest,
}: {
  patient: Patient;
  inEmergency: boolean;
  authorised: boolean;
  onOpen: () => void;
  onBreakGlass: () => void;
  onRequest: () => void;
}) {
  const status = registryStatus[patient.id];
  const blocked = status?.consent === 'blocked-identity';
  const needsRequest = status?.consent === 'requires-request';

  return (
    <Card
      accent={inEmergency ? 'critical' : blocked ? 'none' : needsRequest ? 'caution' : 'verified'}
      className={cn(blocked && 'opacity-75', inEmergency && 'ring-1 ring-critical-300')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-md font-mono text-[13px] font-semibold',
              blocked ? 'border border-line bg-canvas-sunk text-ink-400' : 'bg-ink-900 text-white',
            )}
          >
            {patient.photoInitials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {inEmergency && (
                <Badge tone="critical">
                  <Siren className="size-2.5" />
                  Emergency
                </Badge>
              )}
              <h3 className="text-[15.5px] font-semibold text-ink-900">{patient.fullName}</h3>
              {patient.identityVerified ? (
                <Badge tone="verified">
                  <BadgeCheck className="size-2.5" />
                  Verified
                </Badge>
              ) : (
                <Badge tone="critical">
                  <ShieldAlert className="size-2.5" />
                  Unverified
                </Badge>
              )}
              {patient.id === 'pt-4491' && (
                <Badge tone="critical">
                  <TriangleAlert className="size-2.5" />
                  Penicillin allergy
                </Badge>
              )}
            </div>
            <p className="mt-1 font-mono text-[11.5px] text-ink-400">
              {patient.age} {patient.sex.charAt(0)} · {patient.id.toUpperCase()} · ABHA{' '}
              {patient.abhaMasked}
            </p>
            <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-ink-500">
              {status?.note}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 sm:items-end">
          <dl className="flex gap-5">
            <div>
              <dt className="label-xs text-ink-400">Sources</dt>
              <dd className="mt-1 font-mono text-[13.5px] font-semibold tabular-nums text-ink-900">
                {status?.linkedSources ?? 0}
              </dd>
            </div>
            <div>
              <dt className="label-xs text-ink-400">Last seen</dt>
              <dd className="mt-1 text-[12px] text-ink-700">{status?.lastEncounter ?? '—'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {blocked ? (
              <Button size="sm" variant="secondary" icon={<ShieldAlert />} disabled>
                Verify identity first
              </Button>
            ) : (
              <>
                {inEmergency ? (
                  <Button size="sm" variant="critical" icon={<Siren />} onClick={onBreakGlass}>
                    Open Emergency Mode
                  </Button>
                ) : needsRequest ? (
                  <Button size="sm" variant="secondary" icon={<KeyRound />} onClick={onRequest}>
                    Request access
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" icon={<Send />} onClick={onRequest}>
                    Request access
                  </Button>
                )}
                <Button size="sm" variant="secondary" icon={<Stethoscope />} onClick={onOpen}>
                  Open patient
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
