import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Droplet,
  FileStack,
  Loader2,
  ScanLine,
  Scale,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AllergyAlert, ConditionCard, MedicationCard } from '@/components/clinical';
import { Timeline } from '@/components/clinical/Timeline';
import { EvidenceBadge } from '@/components/evidence/EvidenceBadge';
import { Badge, Card, EmptyState, FieldLabel, SectionHeader, buttonClasses } from '@/components/ui';
import { Wordmark } from '@/components/system/Wordmark';
import { documents } from '@/data/documents';
import { patientById, registryStatus } from '@/data/patient';
import { majorHistory } from '@/data/timeline';
import { useOpenConflicts, useVita } from '@/hooks/useVita';
import { generateEmergencySnapshot } from '@/lib/aiService';
import { formatDate, freshnessBand, freshnessLabel } from '@/lib/format';
import type { EmergencySnapshot } from '@/types';

/* ============================================================================
   Clinical snapshot (clinician view, non-emergency)
   ----------------------------------------------------------------------------
   Same underlying snapshot as Emergency Mode, rendered on the professional
   surface with more room for reasoning: conflicts get full treatment, the
   timeline is available inline, and the source list is visible.

   Emergency Mode is this, minus everything you cannot read in ten seconds.
   ========================================================================== */

export default function ClinicianPatient() {
  const { patientId } = useParams();
  const patient = patientById(patientId ?? '');
  const conflicts = useOpenConflicts();
  const { openConflict, logAudit } = useVita();
  const [snapshot, setSnapshot] = useState<EmergencySnapshot | null>(null);
  /** See EmergencyMode: guards against StrictMode's double mount in dev. */
  const loggedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!patient) return;
    let live = true;
    generateEmergencySnapshot(patient.id).then((s) => live && setSnapshot(s));
    if (loggedFor.current !== patient.id) {
      loggedFor.current = patient.id;
      logAudit('profile-view', `Clinical snapshot opened for ${patient.displayName}.`);
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  if (!patient) return <Navigate to="/clinician" replace />;

  const status = registryStatus[patient.id];
  /** Only the demo patient has a fully linked longitudinal record. */
  const isLinked = patient.id === 'pt-4491';
  const freshness = freshnessBand(patient.sourceFreshnessDays);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link to="/clinician" className="flex items-center gap-3">
            <Wordmark className="h-[17px]" />
          </Link>
          <Link to={`/emergency/${patient.id}`} className={buttonClasses({ variant: 'critical', size: 'sm' })}>
            <Siren className="size-[15px]" />
            Emergency Mode
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
        <Link
          to="/clinician"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" />
          Patient search
        </Link>

        {/* --- Identity banner --------------------------------------------- */}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-ink-900 font-mono text-[17px] font-semibold text-white">
              {patient.photoInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.026em] text-ink-900">
                  {patient.fullName}
                </h1>
                {patient.identityVerified && (
                  <Badge tone="verified">
                    <BadgeCheck className="size-2.5" />
                    Identity verified
                  </Badge>
                )}
              </div>
              <p className="mt-1 font-mono text-[12px] text-ink-500">
                {patient.age} {patient.sex.charAt(0)} · ABHA {patient.abhaMasked} · {status.linkedSources}{' '}
                linked sources
              </p>
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="label-xs flex items-center gap-1 text-ink-400">
                <Droplet className="size-2.5" />
                Blood group
              </dt>
              <dd className="mt-1 text-[20px] font-semibold leading-none text-ink-900">
                {patient.bloodGroup.value}
              </dd>
              <dd className="mt-2">
                <EvidenceBadge fact={patient.bloodGroup} claimLabel="Blood group" detail="compact" />
              </dd>
            </div>
            <div>
              <dt className="label-xs flex items-center gap-1 text-ink-400">
                <Clock3 className="size-2.5" />
                Source freshness
              </dt>
              <dd className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink-900">
                {patient.sourceFreshnessDays}d
              </dd>
              <dd className="mt-2">
                <Badge tone={freshness === 'current' ? 'verified' : freshness === 'recent' ? 'neutral' : 'caution'}>
                  {freshnessLabel[freshness]}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        {!isLinked ? (
          <div className="mt-8">
            <EmptyState
              icon={<FileStack />}
              title="Sparse profile — treat absence as unknown"
              description={`${patient.displayName} has ${status.linkedSources} linked source${status.linkedSources === 1 ? '' : 's'}. A thin record is not a clean bill of health: it means PULSE has nothing to report, not that there is nothing to report. Proceed on clinical assessment.`}
              action={
                <Link to="/clinician" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Back to patient search
                </Link>
              }
            />
          </div>
        ) : !snapshot ? (
          <div className="mt-10 flex items-center justify-center gap-2.5 py-16 text-[13.5px] text-ink-400">
            <Loader2 className="size-4 animate-spin" />
            Assembling clinical snapshot from {documents.length} sources…
          </div>
        ) : (
          <div className="mt-8 space-y-9">
            {/* --- Critical ------------------------------------------------ */}
            <section>
              <SectionHeader eyebrow="Released first" title="Critical" />
              <div className="mt-4 space-y-3">
                {snapshot.critical.map((a) => (
                  <AllergyAlert key={a.id} allergy={a} />
                ))}
              </div>
            </section>

            {/* --- Conflicts ----------------------------------------------- */}
            {conflicts.length > 0 && (
              <section>
                <SectionHeader
                  eyebrow="Reconciliation held these back"
                  title="Conflicting records"
                  description="PULSE has not selected a value. Confirming one records your name and the time against the decision."
                />
                <div className="mt-4 space-y-3">
                  {conflicts.map((c) => (
                    <Card key={c.id} accent="caution" className="hatch-caution">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Scale className="size-3.5 shrink-0 text-caution-600" />
                            <h3 className="text-[14.5px] font-semibold text-ink-900">{c.subject}</h3>
                          </div>
                          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-600">
                            {c.clinicalRelevance}
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {c.claims.map((claim, i) => (
                              <div
                                key={i}
                                className="rounded-md border border-caution-100 bg-white px-3 py-2.5"
                              >
                                <div className="label-xs text-ink-400">{claim.label}</div>
                                <p className="mt-1 text-[13.5px] font-semibold text-ink-900">
                                  {claim.value}
                                </p>
                                <p className="mt-1 font-mono text-[10.5px] text-ink-400">
                                  {formatDate(claim.documentDate)} · {claim.confidence}%
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => openConflict(c.id)}
                          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                        >
                          Compare & verify
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* --- Current state ------------------------------------------- */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <SectionHeader
                  eyebrow={`${snapshot.activeMedications.length} active`}
                  title="Medications"
                />
                <div className="mt-4 space-y-2.5">
                  {snapshot.activeMedications.map((m) => (
                    <MedicationCard key={m.id} medication={m} />
                  ))}
                </div>
              </section>

              <section>
                <SectionHeader
                  eyebrow={`${snapshot.activeConditions.length} active`}
                  title="Conditions"
                />
                <div className="mt-4 space-y-2.5">
                  {snapshot.activeConditions.map((c) => (
                    <ConditionCard key={c.id} condition={c} compact />
                  ))}
                </div>

                {snapshot.implants.length > 0 && (
                  <Card accent="caution" className="mt-3">
                    <FieldLabel className="flex items-center gap-1.5">
                      <ScanLine className="size-3" />
                      Implanted devices
                    </FieldLabel>
                    {snapshot.implants.map((im) => (
                      <p key={im} className="mt-2 text-[13px] font-medium text-ink-900">
                        {im}
                      </p>
                    ))}
                  </Card>
                )}
              </section>
            </div>

            {/* --- Major history ------------------------------------------- */}
            <section>
              <SectionHeader
                eyebrow={`${majorHistory.length} events`}
                title="Major history"
                description="The subset of the timeline flagged as decision-relevant in an acute presentation."
              />
              <div className="mt-4">
                <Timeline events={majorHistory} compact />
              </div>
            </section>

            {/* --- Sources -------------------------------------------------- */}
            <section>
              <SectionHeader
                eyebrow={`${documents.length} documents`}
                title="Sources behind this snapshot"
              />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {documents.map((d) => (
                  <Link
                    key={d.id}
                    to={`/app/documents/${d.id}`}
                    className="flex items-center gap-2.5 rounded-md border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-ink-200"
                  >
                    <FileStack className="size-3.5 shrink-0 text-ink-300" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-800">
                      {d.filename}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-ink-400">
                      {formatDate(d.date)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <Card accent="accent">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" />
                <p className="max-w-3xl text-[12.5px] leading-relaxed text-ink-600">
                  This snapshot is assembled from {snapshot.sourceCount} linked documents. It reports
                  what those sources record and where they record it. It contains no diagnosis, no
                  treatment recommendation, and no value that PULSE selected on your behalf.
                </p>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
