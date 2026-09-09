import { Ban, Bell, Check, Clock3, Pill, Share2, ShieldCheck, Siren, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MedicationCard } from '@/components/clinical';
import { Timeline } from '@/components/clinical/Timeline';
import { Badge, Button, Card, FieldLabel, SectionHeader, buttonClasses } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { activeMedications } from '@/data/clinical';
import { consentGrants } from '@/data/consent';
import { kavita } from '@/data/patient';
import { timeline } from '@/data/timeline';
import { useVita } from '@/hooks/useVita';

/* ============================================================================
   Caregiver mode
   ----------------------------------------------------------------------------
   A caregiver is not a clinician with a smaller screen. They do a specific job:
   keep the medication list straight, keep appointments, and be able to hand a
   paramedic the right context at 2am.

   So they get medications, timeline and the ability to share emergency access —
   and explicitly not source documents, lab reports in full, or the authority to
   grant a clinician anything beyond emergency scope. The withheld list is shown
   on this page rather than hidden, because a caregiver should know the edges of
   what they hold.
   ========================================================================== */

export default function Caregiver() {
  const grant = consentGrants.find((g) => g.id === 'csn-rohan-caregiver')!;
  const { logAudit } = useVita();
  const [shared, setShared] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Caregiver"
        title="Rohan Menon"
        description={`Delegated access to ${kavita.fullName}'s record, granted ${grant.grantedAt}. Revocable by the patient at any time.`}
        actions={
          <Link to="/emergency" className={buttonClasses({ variant: 'critical' })}>
            <Siren className="size-[15px]" />
            Share emergency access
          </Link>
        }
      />

      <PageBody className="space-y-9">
        {/* --- Scope --------------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Your access"
            title="What you can and cannot see"
            description="A caregiver grant is narrower than a clinician grant on purpose."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card accent="verified">
              <FieldLabel className="flex items-center gap-1.5">
                <Check className="size-3" />
                Available to you
              </FieldLabel>
              <ul className="mt-2.5 space-y-1.5">
                {grant.visibleData.map((v) => (
                  <li key={v} className="flex items-start gap-2 text-[13px] leading-snug text-ink-700">
                    <Check className="mt-0.5 size-3 shrink-0 text-verified-500" />
                    {v}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <FieldLabel className="flex items-center gap-1.5">
                <Ban className="size-3" />
                Withheld from you
              </FieldLabel>
              <ul className="mt-2.5 space-y-1.5">
                {grant.withheldData.map((v) => (
                  <li key={v} className="flex items-start gap-2 text-[13px] leading-snug text-ink-500">
                    <Ban className="mt-0.5 size-3 shrink-0 text-ink-300" />
                    {v}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* --- Emergency handoff --------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="The 2am job"
            title="Share emergency access"
            description="If you are with the patient and a clinician needs context, you can release the emergency snapshot without waiting for the patient to be able to consent."
          />
          <Card accent="critical" className="mt-4">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Share2 className="mt-0.5 size-4 shrink-0 text-critical-500" />
                <div>
                  <h3 className="text-[14.5px] font-semibold text-ink-900">
                    Release emergency context to an attending clinician
                  </h3>
                  <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-ink-500">
                    Releases allergies, blood group, active medications, conditions, major history
                    and contacts — for two hours. The patient is notified, and every screen the
                    clinician opens is logged against their name.
                  </p>
                  {shared && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-verified-100 bg-verified-50 px-3 py-2">
                      <Bell className="size-3.5 text-verified-600" />
                      <span className="text-[12.5px] font-medium text-verified-600">
                        Access released · expires in 2 hours · patient notified
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant={shared ? 'secondary' : 'critical'}
                icon={shared ? <Clock3 /> : <Siren />}
                disabled={shared}
                onClick={() => {
                  setShared(true);
                  logAudit(
                    'consent-grant',
                    'Caregiver released emergency context to attending clinician. 2-hour expiry. Patient notified.',
                  );
                }}
              >
                {shared ? 'Active for 2 hours' : 'Release emergency access'}
              </Button>
            </div>
          </Card>
        </section>

        {/* --- Medications --------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={`${activeMedications.length} active`}
            title="Medication schedule"
            description="One of these changed three weeks ago — the change is marked so it does not get missed in a routine refill."
            action={
              <Badge tone="caution">
                <Pill className="size-2.5" />1 recent change
              </Badge>
            }
          />
          <div className="mt-4 space-y-2.5">
            {activeMedications.map((m) => (
              <MedicationCard key={m.id} medication={m} />
            ))}
          </div>
        </section>

        {/* --- Timeline ------------------------------------------------------ */}
        <section>
          <SectionHeader
            eyebrow="Last 12 months"
            title="Recent history"
            action={
              <Link to="/app/timeline" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Full timeline
              </Link>
            }
          />
          <div className="mt-4">
            <Timeline events={timeline.filter((e) => e.date >= '2025-10-01')} compact />
          </div>
        </section>

        <Card accent="accent">
          <div className="flex items-start gap-2.5">
            <UsersRound className="mt-0.5 size-4 shrink-0 text-accent-600" />
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink-900">
                Caregiver access is delegated, not owned
              </h3>
              <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-500">
                {kavita.fullName} can see everything you have viewed, in the same audit trail that
                records clinician access, and can revoke this grant at any time from her consent
                settings. Delegation that cannot be inspected or withdrawn is not delegation.
              </p>
              <Link
                to="/app/consent"
                className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-600 hover:underline"
              >
                <ShieldCheck className="size-3" />
                View the shared audit trail
              </Link>
            </div>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
