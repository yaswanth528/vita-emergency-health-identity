import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Clock3,
  Database,
  Droplet,
  FileText,
  Fingerprint,
  GitMerge,
  Layers,
  ScanLine,
  Scale,
  ShieldCheck,
  Siren,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PulseLockup, Wordmark } from '@/components/system/Wordmark';
import { buttonClasses } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ============================================================================
   Landing page
   ----------------------------------------------------------------------------
   Tells the argument in order: problem, insight, solution, how the AI works,
   why it can be trusted, what it looks like in the moment that matters.

   No stock photography. The product's own interface is the imagery, because
   the claim being made is about an interface.
   ========================================================================== */

const EASE = [0.22, 0.61, 0.36, 1] as const;

/**
 * Sections animate on mount, not on scroll intersection.
 *
 * A viewport-triggered reveal is prettier, but it makes visibility depend on a
 * scroll event firing correctly. On a page whose entire job is to explain the
 * product to someone seeing it for the first time, a section that fails to
 * appear is a far worse outcome than one that appears without a flourish.
 */
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE },
};

const fadeIn = fadeUp;

export default function Landing() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Nav />
      <Hero />
      <Problem />
      <Insight />
      <Architecture />
      <Pipeline />
      <Trust />
      <EmergencySection />
      <Security />
      <Vision />
      <Footer />
    </div>
  );
}

/* --- Nav ------------------------------------------------------------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link to="/">
          <Wordmark className="h-[17px]" showTag />
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link
            to="/app/dashboard"
            className="hidden rounded-md px-3 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 sm:block"
          >
            Patient login
          </Link>
          <Link
            to="/clinician"
            className="hidden rounded-md px-3 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 sm:block"
          >
            Clinician login
          </Link>
          <Link
            to="/pricing"
            className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            Pricing
          </Link>
          <Link to="/login" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Sign in
          </Link>
          <Link to="/emergency" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
            <Siren className="size-[15px]" />
            Try Emergency Mode
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* --- Hero ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="grid-paper relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-critical-300 to-transparent" />
      <div className="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <motion.div {...fadeIn}>
          <div className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-critical-500 pulse-dot" />
            <span className="label-xs text-ink-500">Emergency health identity layer</span>
          </div>

          <h1 className="mt-7 text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink-900 sm:text-[54px]">
            When the patient can&apos;t speak,
            <br />
            <span className="text-ink-400">their history still can.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-600">
            An AI-powered, consent-driven health identity layer that gives authorised clinicians the
            right patient context at the exact moment it matters — every claim backed by the document
            it came from.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link to="/emergency" className={buttonClasses({ variant: 'primary', size: 'lg' })}>
              <Siren className="size-[17px]" />
              Try Emergency Mode
            </Link>
            <a href="#how" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              Explore how it works
              <ArrowRight className="size-[17px]" />
            </a>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-7">
            <HeroStat value="8" label="fragmented sources" />
            <HeroStat value="41" label="entities reconciled" />
            <HeroStat value="0" label="values auto-resolved" tone="caution" />
          </dl>
        </motion.div>

        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }} className="lg:pt-6">
          <HeroCard />
        </motion.div>
      </div>
    </section>
  );
}

function HeroStat({
  value,
  label,
  tone = 'neutral',
}: {
  value: string;
  label: string;
  tone?: 'neutral' | 'caution';
}) {
  return (
    <div>
      <dt
        className={cn(
          'text-[28px] font-semibold leading-none tabular-nums',
          tone === 'caution' ? 'text-caution-600' : 'text-ink-900',
        )}
      >
        {value}
      </dt>
      <dd className="mt-2 text-[12px] leading-snug text-ink-500">{label}</dd>
    </div>
  );
}

/** A faithful, static miniature of the real Emergency Mode surface. */
function HeroCard() {
  return (
    <div className="surface-dark overflow-hidden rounded-xl border border-ink-800 bg-ink-950 shadow-raised">
      <div className="h-[3px] w-full bg-gradient-to-r from-critical-700 via-critical-bright to-critical-700" />
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-critical-bright pulse-dot" />
          <span className="label-xs text-critical-300">Emergency mode</span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-ink-400">00:09</span>
      </div>

      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md border border-ink-700 bg-ink-850 font-mono text-[11px] font-semibold text-ink-200">
            KM
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13.5px] font-semibold text-white">K. Menon</span>
              <span className="inline-flex items-center gap-0.5 rounded-sm border border-verified-500/40 bg-verified-500/10 px-1 py-[2px] text-[9px] font-semibold uppercase tracking-wider text-verified-300">
                <BadgeCheck className="size-2.5" />
                Verified
              </span>
            </div>
            <p className="font-mono text-[10px] text-ink-500">58 F · ABHA ••-••••-••••-4491</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-critical-500/50 bg-gradient-to-br from-critical-700/25 to-ink-850 p-3.5">
          <div className="absolute inset-y-0 left-0 w-1 bg-critical-bright" />
          <div className="pl-2">
            <div className="label-xs flex items-center gap-1.5 text-critical-300">
              <CircleAlert className="size-3" />
              Critical allergy
            </div>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-white">
              PENICILLIN
            </p>
            <p className="mt-1.5 text-[11.5px] text-critical-300">Anaphylaxis — angio-oedema, stridor</p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-sm border border-verified-500/40 bg-verified-500/10 px-1.5 py-[3px] font-mono text-[9.5px] text-verified-300">
              <FileText className="size-2.5" />
              Allergy_Record_2019.pdf · 99%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniTile icon={<Droplet className="size-3" />} label="Blood" value="B+" />
          <MiniTile icon={<Stethoscope className="size-3" />} label="Active meds" value="4" />
          <MiniTile icon={<Clock3 className="size-3" />} label="Freshness" value="21d" />
        </div>

        <div className="rounded-md border border-caution-500/40 bg-caution-500/[0.08] px-3 py-2.5">
          <div className="label-xs text-caution-300">Recent change</div>
          <p className="mt-1 text-[12.5px] font-semibold text-white">
            Atorvastatin increased 10 mg → 20 mg
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-ink-400">
            Prescription_12Aug.pdf · 12 Aug 2026 · 96%
          </p>
        </div>

        <div className="hatch-caution rounded-md border border-caution-500/40 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <TriangleAlert className="size-3 text-caution-bright" />
            <span className="text-[11.5px] font-semibold text-caution-300">
              Conflicting records — clinician verification required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-800 bg-ink-900 px-2.5 py-2">
      <div className="label-xs flex items-center gap-1 text-ink-500">{icon}</div>
      <div className="mt-1 text-[17px] font-semibold leading-none text-white">{value}</div>
      <div className="mt-1 text-[9.5px] text-ink-500">{label}</div>
    </div>
  );
}

/* --- Problem ---------------------------------------------------------------- */

const FRAGMENTS = [
  { label: 'Apollo Cardiology', detail: 'Prescription · 12 Aug 2026', tone: 'ink' },
  { label: 'Dr. Lal PathLabs', detail: 'HbA1c 7.4% · 18 Jul 2026', tone: 'ink' },
  { label: 'Sunrise Clinic', detail: 'Different statin dose · May 2026', tone: 'caution' },
  { label: 'Yashoda Emergency', detail: 'Penicillin anaphylaxis · 2019', tone: 'critical' },
  { label: 'Photo on a phone', detail: 'Handwritten Rx · illegible', tone: 'caution' },
  { label: 'Apollo Cardiac CCU', detail: 'Discharge summary · 2023', tone: 'ink' },
];

function Problem() {
  return (
    <section id="how" className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <div className="label-xs text-ink-400">The problem</div>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[36px]">
            The information already exists.
            <br />
            <span className="text-ink-400">It just isn&apos;t where the decision is.</span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
            A 58-year-old arrives unconscious. Her allergy is in a 2019 emergency record at a hospital
            across town. Her current statin dose is on a prescription in her handbag. Her stent is in
            a PDF nobody at this hospital can open. None of it is missing. All of it is unreachable.
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {FRAGMENTS.map((f, i) => (
            <div
              key={f.label}
              className={cn(
                'rounded-lg border bg-canvas px-4 py-3.5',
                f.tone === 'critical'
                  ? 'border-critical-100'
                  : f.tone === 'caution'
                    ? 'border-caution-100'
                    : 'border-line',
              )}
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              <div className="flex items-center gap-2">
                <Database
                  className={cn(
                    'size-3.5 shrink-0',
                    f.tone === 'critical'
                      ? 'text-critical-500'
                      : f.tone === 'caution'
                        ? 'text-caution-500'
                        : 'text-ink-300',
                  )}
                />
                <span className="truncate text-[13px] font-semibold text-ink-900">{f.label}</span>
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-ink-500">{f.detail}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* --- Insight ---------------------------------------------------------------- */

function Insight() {
  return (
    <section className="surface-dark border-b border-ink-800 bg-ink-950">
      <div className="grid-paper-dark">
        <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
          <motion.blockquote {...fadeUp} className="mx-auto max-w-3xl text-center">
            <div className="label-xs text-ink-500">The insight</div>
            <p className="mt-5 text-[30px] font-semibold leading-[1.2] tracking-[-0.03em] text-white sm:text-[44px]">
              Right now, the patient is the
              <span className="text-critical-bright"> integration layer</span>.
            </p>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-ink-400">
              Every system assumes someone conscious, articulate and well enough to remember their
              own dose. That assumption fails in exactly the moment the information matters most.
            </p>
          </motion.blockquote>
        </div>
      </div>
    </section>
  );
}

/* --- Architecture ----------------------------------------------------------- */

const LAYERS = [
  {
    icon: UserRound,
    title: 'Patient & caregiver',
    detail: 'Records arrive from the people who hold them — uploads, photos, family members.',
  },
  {
    icon: Fingerprint,
    title: 'Identity & consent',
    detail: 'A verified health identity, and scoped, time-boxed, revocable grants over it.',
  },
  {
    icon: Layers,
    title: 'AI intelligence layer',
    detail: 'Ingest, extract, reconcile, synthesise. Structure and provenance, never diagnosis.',
    emphasis: true,
  },
  {
    icon: Database,
    title: 'FHIR · ABDM · audit',
    detail: 'Standards-bound output and an append-only record of every access.',
  },
  {
    icon: Stethoscope,
    title: 'Clinician at the bedside',
    detail: 'The right context, in seconds, with every claim traceable to its source.',
  },
];

function Architecture() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <div className="label-xs text-ink-400">The solution</div>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[36px]">
            A layer between the records and the moment
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
            PULSE does not replace the hospital system, the lab, or the national health stack. It sits
            between them and the clinician, and does the one job none of them does: assemble a
            trustworthy answer to &ldquo;who is this, and what do I need to know right now?&rdquo;
          </p>
        </motion.div>

        <motion.ol {...fadeUp} className="mt-10 space-y-2.5">
          {LAYERS.map((l, i) => (
            <li key={l.title} className="relative">
              <div
                className={cn(
                  'flex items-start gap-4 rounded-lg border px-5 py-4',
                  l.emphasis
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-line bg-white shadow-card',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md border',
                    l.emphasis
                      ? 'border-ink-700 bg-ink-800 text-white'
                      : 'border-line bg-canvas-sunk text-ink-500',
                  )}
                >
                  <l.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      'text-[15px] font-semibold',
                      l.emphasis ? 'text-white' : 'text-ink-900',
                    )}
                  >
                    {l.title}
                  </h3>
                  <p
                    className={cn(
                      'mt-1 text-[13px] leading-relaxed',
                      l.emphasis ? 'text-ink-300' : 'text-ink-500',
                    )}
                  >
                    {l.detail}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[11px]',
                    l.emphasis ? 'text-ink-500' : 'text-ink-300',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              {i < LAYERS.length - 1 && (
                <span className="ml-[38px] block h-2.5 w-px bg-line-strong" aria-hidden />
              )}
            </li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

/* --- Pipeline --------------------------------------------------------------- */

const STAGES = [
  {
    icon: ScanLine,
    n: '01',
    title: 'Ingest',
    detail:
      'Prescriptions, discharge summaries, lab reports, imaging, handwritten scans. Whatever format they arrive in.',
  },
  {
    icon: Layers,
    n: '02',
    title: 'Extract',
    detail:
      'Medications, dosages, frequencies, diagnoses, allergies, procedures, dates — bound to RxNorm, SNOMED, LOINC and ICD-10.',
  },
  {
    icon: GitMerge,
    n: '03',
    title: 'Reconcile',
    detail:
      'Collapse duplicates across systems, order changes over time, and surface contradictions instead of resolving them.',
  },
  {
    icon: Siren,
    n: '04',
    title: 'Synthesise',
    detail:
      'A longitudinal timeline, a health graph, and the reduced snapshot a clinician can read in ten seconds.',
  },
];

function Pipeline() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <div className="label-xs text-ink-400">The AI</div>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[36px]">
            More than summarisation
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
            Summarising a PDF produces prose. This produces structure: typed entities, standard codes,
            resolved duplicates, ordered change history, and an evidence link on every value.
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => (
            <div key={s.n} className="rounded-lg border border-line bg-canvas p-5">
              <div className="flex items-center justify-between">
                <s.icon className="size-4 text-ink-400" />
                <span className="font-mono text-[11px] text-ink-300">{s.n}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">{s.detail}</p>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp} className="mt-4">
          <Link
            to="/app/ingest"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-600 hover:underline"
          >
            Watch the pipeline run on eight real documents
            <ArrowRight className="size-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* --- Trust ------------------------------------------------------------------ */

function Trust() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <motion.div {...fadeUp}>
            <div className="label-xs text-ink-400">The trust layer</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[36px]">
              Every claim carries its evidence
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
              A medical value with no source is a rumour. In PULSE, provenance is a type constraint,
              not a convention: a clinical value cannot be rendered in the interface without the
              document, page, date and confidence behind it.
            </p>

            <ul className="mt-7 space-y-3.5">
              <TrustPoint
                icon={<FileText className="size-3.5" />}
                title="Source, date, confidence"
                detail="Tap any value to open the original document with the cited line highlighted."
              />
              <TrustPoint
                icon={<Scale className="size-3.5" />}
                title="Conflicts are never resolved silently"
                detail="Where two sources disagree, both are shown and the system stops. No recency heuristic, no confidence tie-break."
              />
              <TrustPoint
                icon={<TriangleAlert className="size-3.5" />}
                title="Low-confidence values are withheld"
                detail="An unreadable numeral on a handwritten script is flagged, not guessed."
              />
              <TrustPoint
                icon={<ShieldCheck className="size-3.5" />}
                title="No autonomous diagnosis"
                detail="PULSE reports what its sources say. It does not interpret, recommend, or alter a medication record."
              />
            </ul>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="space-y-3">
            {/* Evidence example */}
            <div className="rounded-lg border border-line bg-white p-4 shadow-card">
              <div className="label-xs text-ink-400">Extracted value</div>
              <p className="mt-2 text-[16px] font-semibold text-ink-900">
                Atorvastatin increased 10 mg → 20 mg
              </p>
              <dl className="mt-4 space-y-2.5 border-t border-line pt-3.5 text-[12.5px]">
                <Row label="Source" value="Prescription_12Aug.pdf · page 1" mono />
                <Row label="Date" value="12 Aug 2026" mono />
                <Row label="Confidence" value="96%" mono />
                <Row label="Extractor" value="vita-clinical-ner@2.4.1" mono />
              </dl>
              <blockquote className="mt-3.5 rounded-md border-l-2 border-caution-300 bg-caution-50/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink-700">
                ** dose increased from 10 mg - LDL not at target **
              </blockquote>
            </div>

            {/* Conflict example */}
            <div className="hatch-caution rounded-lg border border-caution-100 bg-caution-50/60 p-4">
              <div className="flex items-center gap-2">
                <TriangleAlert className="size-3.5 text-caution-600" />
                <span className="text-[13px] font-semibold text-caution-600">
                  Conflicting medication records
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-caution-100 bg-white px-3 py-2.5">
                  <div className="label-xs text-ink-400">Prescription A</div>
                  <p className="mt-1 text-[13.5px] font-semibold text-ink-900">Atorvastatin 10 mg</p>
                  <p className="mt-1 font-mono text-[10.5px] text-ink-400">04 May 2026 · 93%</p>
                </div>
                <div className="rounded-md border border-caution-100 bg-white px-3 py-2.5">
                  <div className="label-xs text-ink-400">Prescription B</div>
                  <p className="mt-1 text-[13.5px] font-semibold text-ink-900">Atorvastatin 20 mg</p>
                  <p className="mt-1 font-mono text-[10.5px] text-ink-400">12 Aug 2026 · 96%</p>
                </div>
              </div>
              <p className="mt-3 text-[12px] font-medium text-caution-600">
                Status: clinician verification required
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TrustPoint({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink-500">
        {icon}
      </span>
      <div>
        <h3 className="text-[13.5px] font-semibold text-ink-900">{title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{detail}</p>
      </div>
    </li>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className={cn('truncate text-ink-900', mono && 'font-mono text-[11.5px]')}>{value}</dd>
    </div>
  );
}

/* --- Emergency -------------------------------------------------------------- */

const BEATS = [
  { t: '00:00', label: 'Identify', detail: 'Patient arrives.' },
  { t: '00:05', label: 'Verify', detail: 'Authorised access confirmed.' },
  { t: '00:10', label: 'Surface', detail: 'Critical history appears.' },
  { t: '00:30', label: 'Act', detail: 'Clinician has the context.' },
];

function EmergencySection() {
  return (
    <section className="surface-dark border-b border-ink-800 bg-ink-950">
      <div className="grid-paper-dark">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="label-xs text-critical-300">Emergency mode</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">
              Right context. Right patient. Right moment.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-400">
              Not a dashboard. A single screen holding the six facts that change the next decision,
              each one a tap away from the document it came from.
            </p>
          </motion.div>

          <motion.ol {...fadeUp} className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BEATS.map((b) => (
              <li key={b.t} className="rounded-lg border border-ink-800 bg-ink-900/70 p-5">
                <span className="font-mono text-[12px] font-semibold tabular-nums text-critical-300">
                  {b.t}
                </span>
                <h3 className="mt-3 text-[16px] font-semibold text-white">{b.label}</h3>
                <p className="mt-1.5 text-[12.5px] text-ink-400">{b.detail}</p>
              </li>
            ))}
          </motion.ol>

          <motion.div {...fadeUp} className="mt-8">
            <Link to="/emergency" className={buttonClasses({ variant: 'primary', size: 'lg', surface: 'dark' })}>
              <Siren className="size-[17px]" />
              Try Emergency Mode
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* --- Security --------------------------------------------------------------- */

const SECURITY = [
  { icon: Fingerprint, label: 'Identity verified', detail: 'ABHA-linked, biometric or MRN match before any release.' },
  { icon: ShieldCheck, label: 'Consent controlled', detail: 'Scoped, time-boxed, revocable. Withheld data is named explicitly.' },
  { icon: FileText, label: 'Source backed', detail: 'Document, page, date and confidence behind every claim.' },
  { icon: Layers, label: 'Audit logged', detail: 'Append-only record of every read, including reads of evidence.' },
  { icon: Scale, label: 'Conflicts surfaced', detail: 'Disagreeing sources are shown, never silently merged.' },
  { icon: Siren, label: 'No autonomous diagnosis', detail: 'The system assembles evidence. Clinicians decide.' },
];

function Security() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <div className="label-xs text-ink-400">Trust posture</div>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[36px]">
            Permissioned. Auditable. Source-backed.
          </h2>
        </motion.div>

        <motion.div {...fadeUp} className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              <s.icon className="mt-0.5 size-4 shrink-0 text-ink-400" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-ink-900">{s.label}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{s.detail}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* --- Vision ----------------------------------------------------------------- */

function Vision() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <PulseLockup className="mx-auto mb-9" />
          <div className="label-xs text-ink-400">The vision</div>
          <h2 className="mt-5 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink-900 sm:text-[42px]">
            One trusted health identity.
            <br />
            <span className="text-ink-400">Every patient. Every emergency.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-ink-600">
            Records already exist for almost everyone. The work left is making them reachable,
            trustworthy and permissioned at the moment a clinician needs them.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Link to="/app/dashboard" className={buttonClasses({ variant: 'primary', size: 'lg' })}>
              <UserRound className="size-[17px]" />
              Patient login
            </Link>
            <Link to="/clinician" className={buttonClasses({ variant: 'primary', size: 'lg' })}>
              <Stethoscope className="size-[17px]" />
              Clinician login
            </Link>
            <Link to="/emergency" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              <Siren className="size-[17px]" />
              Try Emergency Mode
            </Link>
          </div>
          <p className="mt-4 text-[12.5px] text-ink-400">
            New here?{' '}
            <Link to="/register/patient" className="font-medium text-accent-600 hover:underline">
              Create a patient account
            </Link>{' '}
            or{' '}
            <Link to="/register/clinician" className="font-medium text-accent-600 hover:underline">
              register as a clinician
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* --- Footer ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="bg-canvas">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-5 py-8 sm:px-8">
        <Wordmark className="h-4" />
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-500">
          <Link to="/emergency" className="hover:text-ink-900">
            Emergency Mode
          </Link>
          <Link to="/clinician" className="hover:text-ink-900">
            Clinician workspace
          </Link>
          <Link to="/app/dashboard" className="hover:text-ink-900">
            Patient app
          </Link>
          <Link to="/login" className="hover:text-ink-900">
            Sign in
          </Link>
          <Link to="/pricing" className="hover:text-ink-900">
            Pricing
          </Link>
          <Link to="/app/consent" className="hover:text-ink-900">
            Consent & audit
          </Link>
          <Link to="/app/settings" className="hover:text-ink-900">
            Security
          </Link>
        </nav>
        <p className="font-mono text-[11px] text-ink-400">
          Prototype · synthetic patient data · not for clinical use
        </p>
      </div>
    </footer>
  );
}
