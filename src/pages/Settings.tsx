import {
  Ban,
  Bell,
  Database,
  FileText,
  Fingerprint,
  Layers,
  Scale,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, FieldLabel, SectionHeader } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { evidenceCount } from '@/data/evidence';
import { documents } from '@/data/documents';
import { extractions, rejectedExtractions } from '@/data/extractions';
import { kavita } from '@/data/patient';
import { useVita } from '@/hooks/useVita';
import { CONFIDENCE_THRESHOLD } from '@/lib/aiService';

/* ============================================================================
   Security & trust posture
   ----------------------------------------------------------------------------
   The page that states, in one place, what the system does and — more usefully
   — what it refuses to do. The "not built" section is deliberate: a healthcare
   prototype that lists only its capabilities is making a claim it cannot cash.
   ========================================================================== */

export default function Settings() {
  const { audit, sessionAuditCount } = useVita();

  return (
    <>
      <PageHeader
        eyebrow="Trust"
        title="Security & trust posture"
        description="What this system guarantees, how it behaves when it is unsure, and where its boundaries are."
      />

      <PageBody className="space-y-9">
        {/* --- Posture ------------------------------------------------------- */}
        <section>
          <SectionHeader eyebrow="Guarantees" title="How the record is protected" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Posture
              icon={<Fingerprint className="size-4" />}
              title="Identity verified"
              status="Active"
              detail={`Linked via ${kavita.identityMethods.join(', ')}. Clinical context is not released against an unverified identity.`}
            />
            <Posture
              icon={<ShieldCheck className="size-4" />}
              title="Consent controlled"
              status="Active"
              detail="Every grant is scoped, time-boxed and revocable. Withheld categories are named explicitly on each grant."
            />
            <Posture
              icon={<Layers className="size-4" />}
              title="Audit logged"
              status={`${audit.length} entries`}
              detail={
                sessionAuditCount > 0
                  ? `Append-only. ${sessionAuditCount} entries were written by your actions in this session.`
                  : 'Append-only. Includes reads of the evidence behind a claim, not just record opens.'
              }
            />
            <Posture
              icon={<FileText className="size-4" />}
              title="Source backed"
              status={`${evidenceCount} evidence links`}
              detail={`${documents.length} documents underpin the profile. Every clinical value resolves to a document, page, date and confidence.`}
            />
            <Posture
              icon={<Scale className="size-4" />}
              title="Conflicts surfaced"
              status="Never auto-resolved"
              detail="Disagreeing sources are presented side by side and held for clinician verification."
            />
            <Posture
              icon={<Ban className="size-4" />}
              title="Low confidence withheld"
              status={`${rejectedExtractions.length} withheld`}
              detail={`Entities below the ${CONFIDENCE_THRESHOLD}% acceptance threshold are flagged, not written into the health graph.`}
            />
          </div>
        </section>

        {/* --- Product principles --------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Product principles"
            title="What this system will not do"
            description="These are constraints in the architecture, not warnings in a footer."
          />
          <div className="mt-4 space-y-2.5">
            <Principle
              title="No autonomous diagnosis"
              detail="VITA does not interpret findings, suggest a differential, or assign a diagnosis. It reports diagnoses that appear in source documents, attributed to the clinician who made them."
            />
            <Principle
              title="No invented medication changes"
              detail="A dose is only ever what a source says it is. The system never infers, extrapolates, or corrects a regimen."
            />
            <Principle
              title="No silent conflict resolution"
              detail="Where sources disagree, no recency rule, confidence tie-break or specialist-authority heuristic is applied. The disagreement is the output."
            />
            <Principle
              title="No treatment recommendations"
              detail="Cautions shown alongside a medication (for example, withholding metformin before contrast) are drawn from the source record and standard labelling — they are context for a clinician, not instructions."
            />
            <Principle
              title="Absence is not evidence of absence"
              detail="A sparse profile is labelled as sparse. The system never implies that an empty section means a patient does not have a condition."
            />
          </div>
        </section>

        {/* --- Notifications -------------------------------------------------- */}
        <section>
          <SectionHeader eyebrow="Alerts" title="What you are told about" />
          <div className="mt-4 space-y-2">
            <NotifyRow
              icon={<Siren className="size-3.5" />}
              label="Break-glass emergency access"
              detail="Immediate push to patient and registered caregiver, with the clinician's name and facility."
              on
            />
            <NotifyRow
              icon={<Bell className="size-3.5" />}
              label="New access grant"
              detail="Whenever any party is granted access to any scope."
              on
            />
            <NotifyRow
              icon={<Scale className="size-3.5" />}
              label="New conflict detected"
              detail="When reconciliation finds sources that disagree about a current medication."
              on
            />
            <NotifyRow
              icon={<Database className="size-3.5" />}
              label="Routine lab sync"
              detail="Results arriving from a partner lab under standing consent."
              on={false}
            />
          </div>
        </section>

        {/* --- Boundaries ----------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Honest scope"
            title="Not built in this prototype"
            description="Architected for, but deliberately not implemented — listing them is more useful than implying they exist."
          />
          <Card className="mt-4">
            <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {[
                'Live ABDM / national health-stack integration',
                'Hospital HIS and EMR write-back',
                'Production authentication and session management',
                'Pharmacy dispense and adherence feeds',
                'Insurance and claims integration',
                'Real clinical decision support',
                'Encryption-at-rest and key management',
                'Multi-region data residency controls',
              ].map((x) => (
                <li key={x} className="flex items-start gap-2 text-[13px] leading-snug text-ink-500">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3.5 text-[12.5px] leading-relaxed text-ink-500">
              The AI layer sits behind a single module (
              <code className="rounded-xs bg-canvas-sunk px-1 py-0.5 font-mono text-[11.5px]">
                lib/aiService.ts
              </code>
              ) exposing four functions —{' '}
              <span className="font-mono text-[11.5px]">extractMedicalEntities</span>,{' '}
              <span className="font-mono text-[11.5px]">reconcileRecords</span>,{' '}
              <span className="font-mono text-[11.5px]">buildHealthTimeline</span> and{' '}
              <span className="font-mono text-[11.5px]">generateEmergencySnapshot</span>. Swapping
              deterministic fixtures for real document AI and a FHIR server means changing those four
              bodies, not the application.
            </p>
          </Card>
        </section>

        <Card accent="accent">
          <FieldLabel>Data in this prototype</FieldLabel>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">
            Every patient, document, lab value and clinician in this build is synthetic. The{' '}
            {extractions.length} extractions, {evidenceCount} evidence links and{' '}
            {documents.length} source documents are fabricated for demonstration and must not be used
            for clinical purposes.
          </p>
          <Link
            to="/app/consent"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-600 hover:underline"
          >
            Review consent and audit
          </Link>
        </Card>
      </PageBody>
    </>
  );
}

function Posture({
  icon,
  title,
  status,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="text-ink-400">{icon}</span>
        <Badge tone="verified">{status}</Badge>
      </div>
      <h3 className="mt-3 text-[14px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{detail}</p>
    </Card>
  );
}

function Principle({ title, detail }: { title: string; detail: string }) {
  return (
    <Card accent="critical">
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 size-3.5 shrink-0 text-critical-500" />
        <div>
          <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
          <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-600">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function NotifyRow({
  icon,
  label,
  detail,
  on,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  on: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-md border border-line bg-white px-4 py-3">
      <span className="shrink-0 text-ink-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink-900">{label}</p>
        <p className="mt-0.5 text-[12px] text-ink-500">{detail}</p>
      </div>
      <span
        className={
          'shrink-0 rounded-full px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ' +
          (on ? 'bg-verified-50 text-verified-600' : 'bg-ink-50 text-ink-400')
        }
      >
        {on ? 'On' : 'Off'}
      </span>
    </div>
  );
}
