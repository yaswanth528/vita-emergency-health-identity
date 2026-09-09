import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarClock,
  HeartPulse,
  Ruler,
  ScanLine,
  Scissors,
  Siren,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllergyAlert, ConditionCard, LabTrendCard, MedicationCard } from '@/components/clinical';
import { HealthGraph } from '@/components/clinical/HealthGraph';
import { EvidenceBadge } from '@/components/evidence/EvidenceBadge';
import { Badge, Card, FieldLabel, SectionHeader, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import {
  allergies,
  conditions,
  hospitalisations,
  labTrends,
  medications,
  procedures,
} from '@/data/clinical';
import { kavita } from '@/data/patient';
import { recentChanges } from '@/data/timeline';
import { useVita } from '@/hooks/useVita';
import { formatDate, relativeAge } from '@/lib/format';

/* ============================================================================
   Health profile
   ----------------------------------------------------------------------------
   The full longitudinal record. Deliberately structured as a graph of linked
   entities rather than a form: identity, then the relation between conditions
   and the drugs treating them, then everything that produced those facts.
   ========================================================================== */

export default function HealthProfile() {
  const { openEvidence } = useVita();

  return (
    <>
      <PageHeader
        eyebrow="Longitudinal profile"
        title="Health profile"
        description="Assembled from 8 source documents across 7 systems, spanning 2016 to 2026. Every value below resolves to the document it came from."
        actions={
          <Link to="/emergency" className={buttonClasses({ variant: 'secondary' })}>
            <Siren className="size-[15px]" />
            See the emergency view
          </Link>
        }
      />

      <PageBody className="space-y-10">
        {/* --- Identity ------------------------------------------------------ */}
        <section>
          <SectionHeader eyebrow="Verified" title="Identity" />
          <Card className="mt-4">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-ink-900 font-mono text-[19px] font-semibold text-white">
                {kavita.photoInitials}
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[19px] font-semibold text-ink-900">{kavita.fullName}</h3>
                  <Badge tone="verified">
                    <BadgeCheck className="size-3" />
                    Identity verified
                  </Badge>
                </div>
                <p className="mt-1 text-[13px] text-ink-500">
                  {kavita.age} years · {kavita.sex} · born {formatDate(kavita.dateOfBirth)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {kavita.identityMethods.map((m) => (
                    <Badge key={m} mono>
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                <IdentityField label="Blood group" value={kavita.bloodGroup.value} strong />
                <IdentityField label="ABHA" value={kavita.abhaMasked} mono />
                <IdentityField label="Organ donor" value={kavita.organDonor ? 'Registered' : 'No'} />
                <IdentityField
                  label="Height / weight"
                  value={`${kavita.heightCm} cm · ${kavita.weightKg} kg`}
                  icon={<Ruler className="size-3" />}
                />
                <IdentityField label="Primary physician" value={kavita.primaryPhysician} />
                <IdentityField
                  label="Advance directive"
                  value={kavita.advanceDirective ?? 'None recorded'}
                />
              </dl>
            </div>
          </Card>
        </section>

        {/* --- Critical ------------------------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow="Released first in an emergency"
            title="Allergies & adverse reactions"
          />
          <div className="mt-4 space-y-3">
            {allergies.map((a) => (
              <AllergyAlert key={a.id} allergy={a} />
            ))}
          </div>
        </section>

        {/* --- The graph ----------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Reconciled relations"
            title="Health graph"
            description="What reconciliation produced that a document pile cannot: the link between each condition and the medication treating it."
          />
          <div className="mt-4">
            <HealthGraph />
          </div>
        </section>

        {/* --- Recent changes ------------------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow="Last 90 days"
            title="Recent changes"
            description="Changes are surfaced separately because a regimen that changed three weeks ago behaves differently from one that has been stable for three years."
          />
          <div className="mt-4 space-y-2.5">
            {recentChanges.map((e) => (
              <button
                key={e.id}
                onClick={() => e.evidenceId && openEvidence(e.evidenceId, e.title)}
                className="hatch-caution flex w-full items-start gap-3 rounded-lg border border-caution-100 bg-caution-50/50 px-4 py-3.5 text-left transition-colors hover:border-caution-300"
              >
                <Activity className="mt-0.5 size-4 shrink-0 text-caution-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink-900">{e.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{e.detail}</p>
                  <p className="mt-1.5 font-mono text-[11px] text-ink-400">
                    {formatDate(e.date)} · {relativeAge(e.date)} · {e.facility}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* --- Medications --------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={`${medications.filter((m) => m.status !== 'discontinued').length} active · ${medications.filter((m) => m.status === 'discontinued').length} discontinued`}
            title="Medications"
            description="Discontinued agents are kept, not deleted — a drug stopped last year is still relevant to a reaction today."
          />
          <div className="mt-4 space-y-2.5">
            {medications.map((m) => (
              <MedicationCard key={m.id} medication={m} />
            ))}
          </div>
        </section>

        {/* --- Conditions ---------------------------------------------------- */}
        <section>
          <SectionHeader eyebrow={`${conditions.length} recorded`} title="Conditions" />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {conditions.map((c) => (
              <ConditionCard key={c.id} condition={c} />
            ))}
          </div>
        </section>

        {/* --- Lab trends ---------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Direction over time"
            title="Lab trends"
            description="A single result is a data point. The slope is the clinical signal."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {labTrends.map((t) => (
              <LabTrendCard key={t.analyte} trend={t} />
            ))}
          </div>
        </section>

        {/* --- Procedures ---------------------------------------------------- */}
        <section>
          <SectionHeader eyebrow="Surgical & interventional" title="Procedures" />
          <div className="mt-4 space-y-2.5">
            {procedures.map((p) => (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Scissors className="size-3.5 shrink-0 text-ink-300" />
                      <h4 className="text-[14.5px] font-semibold text-ink-900">{p.name.value}</h4>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink-500">
                      {formatDate(p.performedOn)} · {p.facility}
                      {p.surgeon && ` · ${p.surgeon}`}
                    </p>
                    {p.outcome && (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{p.outcome}</p>
                    )}
                    {p.implants && p.implants.length > 0 && (
                      <div className="mt-2.5 rounded-md border border-caution-100 bg-caution-50/60 px-3 py-2">
                        <div className="label-xs flex items-center gap-1.5 text-caution-600">
                          <ScanLine className="size-3" />
                          Implanted device
                        </div>
                        {p.implants.map((im) => (
                          <p key={im} className="mt-1 text-[12.5px] font-medium text-ink-800">
                            {im}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <EvidenceBadge fact={p.name} claimLabel={p.name.value} />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* --- Hospitalisations ---------------------------------------------- */}
        <section>
          <SectionHeader eyebrow="Inpatient" title="Hospitalisations" />
          <div className="mt-4 space-y-2.5">
            {hospitalisations.map((h) => (
              <Card key={h.id} accent={h.major ? 'critical' : 'none'}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[14.5px] font-semibold text-ink-900">{h.reason.value}</h4>
                      {h.major && <Badge tone="critical">Major history</Badge>}
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-500">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3" />
                        {h.facility}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        {formatDate(h.admittedOn)} – {formatDate(h.dischargedOn)} ·{' '}
                        {h.lengthOfStayDays} days
                      </span>
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{h.summary}</p>
                  </div>
                  <EvidenceBadge fact={h.reason} claimLabel={h.reason.value} />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* --- Emergency info ------------------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow="Released under emergency access"
            title="Emergency information"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {kavita.emergencyContacts.map((c) => (
              <Card key={c.phone}>
                <FieldLabel>
                  {c.isCaregiver ? 'Emergency contact · caregiver' : 'Emergency contact'}
                </FieldLabel>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-ink-900">{c.name}</p>
                    <p className="text-[12.5px] text-ink-500">{c.relationship}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink-700">
                    {c.phoneMasked}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-3">
            <div className="flex items-start gap-2.5">
              <HeartPulse className="mt-0.5 size-4 shrink-0 text-ink-300" />
              <div>
                <h4 className="text-[13.5px] font-semibold text-ink-900">
                  What a clinician sees before you can speak
                </h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                  Emergency access releases allergies, blood group, active medications and recent
                  changes, active conditions, major history, implanted devices and these contacts —
                  and nothing else. Mental-health and reproductive-health records are withheld from
                  emergency scope by default.
                </p>
                <Link
                  to="/app/consent"
                  className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-600 hover:underline"
                >
                  Review emergency scope
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </PageBody>
    </>
  );
}

function IdentityField({
  label,
  value,
  mono,
  strong,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="label-xs flex items-center gap-1 text-ink-400">
        {icon}
        {label}
      </dt>
      <dd
        className={
          'mt-1 truncate ' +
          (strong ? 'text-[17px] font-semibold text-ink-900' : 'text-[13px] text-ink-800') +
          (mono ? ' font-mono text-[12px]' : '')
        }
      >
        {value}
      </dd>
    </div>
  );
}
