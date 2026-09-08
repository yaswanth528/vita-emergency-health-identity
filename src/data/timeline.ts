import type { HealthEvent } from '@/types';

/**
 * The longitudinal history, reconstructed from eight source documents that
 * originated in five different systems and were never designed to be read
 * together.
 *
 * `links` is what distinguishes this from a list of PDF upload dates: each
 * event knows which medications, conditions and documents it touches, so the
 * timeline can be traversed as a graph from any entity in the profile.
 *
 * Ordered newest first.
 */
export const timeline: HealthEvent[] = [
  {
    id: 'evt-2026-08-19',
    date: '2026-08-19',
    kind: 'consultation',
    title: 'Cardiology follow-up',
    detail:
      'Routine post-PCI review. BP 138/86 mmHg, above target. Patient reported two episodes of postural light-headedness over the preceding three weeks.',
    major: false,
    facility: 'Apollo Hospitals · Cardiology OPD',
    evidenceId: 'ev-followup-19aug',
    links: { conditions: ['cnd-htn', 'cnd-cad'], documents: ['doc-consult-19aug'] },
  },
  {
    id: 'evt-2026-08-12',
    date: '2026-08-12',
    kind: 'medication-change',
    title: 'Medication changed — Atorvastatin increased',
    detail:
      'Atorvastatin raised from 10 mg to 20 mg nightly, with the prescribing reason recorded on the script: LDL not at target.',
    major: true,
    facility: 'Apollo Hospitals · Cardiology OPD',
    evidenceId: 'ev-dose-change',
    links: {
      medications: ['med-atorvastatin'],
      conditions: ['cnd-dyslipidaemia'],
      documents: ['doc-rx-12aug'],
    },
  },
  {
    id: 'evt-2026-07-18',
    date: '2026-07-18',
    kind: 'lab',
    title: 'Blood report — HbA1c, lipids, renal function',
    detail:
      'HbA1c 7.4% (high). LDL 118 mg/dL, above secondary-prevention target. eGFR 62 mL/min, mildly reduced — lab comment advises caution with contrast studies.',
    major: false,
    facility: 'Dr. Lal PathLabs · Banjara Hills',
    evidenceId: 'ev-hba1c',
    links: {
      conditions: ['cnd-t2dm', 'cnd-dyslipidaemia', 'cnd-ckd'],
      documents: ['doc-lab-final'],
    },
  },
  {
    id: 'evt-2026-05-04',
    date: '2026-05-04',
    kind: 'document',
    title: 'Repeat prescription — Sunrise Clinic',
    detail:
      'Routine refill issued outside the cardiology service. This is the earlier of the two prescriptions that disagree on statin dose.',
    major: false,
    facility: 'Sunrise Clinic · General Medicine',
    evidenceId: 'ev-atorvastatin-10',
    links: { medications: ['med-atorvastatin'], documents: ['doc-rx-may'] },
  },
  {
    id: 'evt-2025-12-03',
    date: '2025-12-03',
    kind: 'procedure',
    title: 'Hospital visit — surveillance echocardiogram',
    detail:
      'LVEF 52% with residual mid-anteroseptal hypokinesia, consistent with the prior anterior wall event. Report notes the LAD stent is MRI conditional.',
    major: true,
    facility: 'Apollo Hospitals · Non-invasive Cardiology',
    evidenceId: 'ev-lvef',
    links: { conditions: ['cnd-cad'], documents: ['doc-echo-dec25'] },
  },
  {
    id: 'evt-2024-05-22',
    date: '2024-05-22',
    kind: 'medication-change',
    title: 'Clopidogrel course completed',
    detail:
      'Twelve months of dual antiplatelet therapy concluded as planned at discharge. Aspirin continued as single agent.',
    major: false,
    evidenceId: 'ev-clopidogrel-stop',
    links: { medications: ['med-clopidogrel'], conditions: ['cnd-cad'] },
  },
  {
    id: 'evt-2023-11-08',
    date: '2023-11-08',
    kind: 'document',
    title: 'Handwritten prescription scanned',
    detail:
      'Patient-uploaded photograph of a handwritten script. Two numerals fell below the 85% acceptance threshold and were withheld from the health graph rather than guessed.',
    major: false,
    evidenceId: 'ev-amlodipine-discontinued',
    links: { medications: ['med-amlodipine'], documents: ['doc-rx-2023-11'] },
  },
  {
    id: 'evt-2023-05-19',
    date: '2023-05-19',
    kind: 'procedure',
    title: 'PCI with drug-eluting stent, proximal LAD',
    detail:
      'Coronary angiography via right radial approach showed 90% proximal LAD stenosis. Xience Sierra 3.0 × 18 mm stent deployed, TIMI III flow restored.',
    major: true,
    facility: 'Apollo Hospitals · Cath Lab',
    evidenceId: 'ev-pci',
    links: { conditions: ['cnd-cad'], documents: ['doc-discharge-2023'] },
  },
  {
    id: 'evt-2023-05-18',
    date: '2023-05-18',
    kind: 'admission',
    title: 'Cardiac admission — NSTEMI',
    detail:
      'Retrosternal chest heaviness with diaphoresis, Troponin-I 2.8 ng/mL. Four-day admission to the cardiac care unit. This is the anchor event for the current cardiac regimen.',
    major: true,
    facility: 'Apollo Hospitals · Cardiac Care Unit',
    evidenceId: 'ev-admission-2023',
    links: {
      conditions: ['cnd-cad', 'cnd-htn', 'cnd-t2dm'],
      medications: ['med-aspirin', 'med-telmisartan', 'med-atorvastatin'],
      documents: ['doc-discharge-2023'],
    },
  },
  {
    id: 'evt-2019-03-14',
    date: '2019-03-14',
    kind: 'diagnosis',
    title: 'Anaphylaxis to amoxicillin — allergy recorded',
    detail:
      'Grade 3 anaphylaxis 25 minutes after a first dose of amoxicillin. Treated with IM adrenaline; observed 12 hours. Strict penicillin avoidance advised, cephalosporin caution noted.',
    major: true,
    facility: 'Yashoda Hospitals · Emergency Department',
    evidenceId: 'ev-allergy-penicillin',
    links: { documents: ['doc-allergy-2019'] },
  },
  {
    id: 'evt-2018-09-02',
    date: '2018-09-02',
    kind: 'diagnosis',
    title: 'Essential hypertension diagnosed',
    detail: 'Diagnosis carried forward from primary care records at the time of the 2023 admission.',
    major: false,
    evidenceId: 'ev-htn',
    links: { conditions: ['cnd-htn'] },
  },
  {
    id: 'evt-2016-04-21',
    date: '2016-04-21',
    kind: 'diagnosis',
    title: 'Type 2 diabetes mellitus diagnosed',
    detail: 'Earliest condition in the reconstructed profile. Metformin started the following month.',
    major: false,
    evidenceId: 'ev-t2dm',
    links: { conditions: ['cnd-t2dm'], medications: ['med-metformin'] },
  },
];

export const majorHistory = timeline.filter((e) => e.major);

/** Changes inside the last 90 days — what a clinician most needs at handover. */
export const recentChanges = timeline.filter(
  (e) => e.kind === 'medication-change' && e.date >= '2026-06-01',
);

export const eventById = (id: string) => timeline.find((e) => e.id === id);

export const eventKindLabel: Record<HealthEvent['kind'], string> = {
  'medication-change': 'Medication change',
  'medication-start': 'Medication started',
  diagnosis: 'Diagnosis',
  admission: 'Admission',
  procedure: 'Procedure',
  lab: 'Lab result',
  consultation: 'Consultation',
  immunisation: 'Immunisation',
  document: 'Document',
};

/** Groups the timeline by year for rendering. Newest year first. */
export function groupByYear(events: HealthEvent[]): { year: string; events: HealthEvent[] }[] {
  const map = new Map<string, HealthEvent[]>();
  for (const e of events) {
    const year = e.date.slice(0, 4);
    const bucket = map.get(year);
    if (bucket) bucket.push(e);
    else map.set(year, [e]);
  }
  return [...map.entries()].map(([year, evs]) => ({ year, events: evs }));
}
