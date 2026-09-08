import type {
  Allergy,
  Condition,
  Hospitalisation,
  LabTrend,
  Medication,
  Procedure,
} from '@/types';

/* ============================================================================
   ALLERGIES
   Ranked by severity. Anaphylaxis is the single most decision-changing fact in
   this entire record, so it is modelled first and rendered first.
   ========================================================================== */

export const allergies: Allergy[] = [
  {
    id: 'alg-penicillin',
    substance: {
      value: 'Penicillin',
      evidenceId: 'ev-allergy-penicillin',
      confidence: 99,
      state: 'clinician-verified',
    },
    reaction: {
      value: 'Anaphylaxis — angio-oedema, stridor, hypotension',
      evidenceId: 'ev-allergy-reaction',
      confidence: 97,
      state: 'clinician-verified',
    },
    severity: 'anaphylaxis',
    drugClass: 'Beta-lactam antibiotics',
    crossReactive: ['Amoxicillin', 'Ampicillin', 'Piperacillin', 'Cephalosporins (caution)'],
    recordedOn: '2019-03-14',
  },
];

/* ============================================================================
   CONDITIONS
   ========================================================================== */

export const conditions: Condition[] = [
  {
    id: 'cnd-cad',
    name: {
      value: 'Coronary artery disease, s/p PCI',
      evidenceId: 'ev-cad',
      confidence: 98,
      state: 'clinician-verified',
    },
    code: 'I25.10',
    severity: 'critical',
    diagnosedOn: '2023-05-18',
    status: 'active',
    controlMarker: {
      value: 'LVEF 52% · Dec 2025',
      evidenceId: 'ev-lvef',
      confidence: 96,
      state: 'source-backed',
    },
    notes: 'Single-vessel disease. Drug-eluting stent in proximal LAD.',
  },
  {
    id: 'cnd-htn',
    name: {
      value: 'Essential hypertension',
      evidenceId: 'ev-htn',
      confidence: 97,
      state: 'clinician-verified',
    },
    code: 'I10',
    severity: 'significant',
    diagnosedOn: '2018-09-02',
    status: 'active',
    controlMarker: {
      value: 'BP 138/86 · Aug 2026',
      evidenceId: 'ev-bp-19aug',
      confidence: 96,
      state: 'source-backed',
    },
    notes: 'Above target at most recent review.',
  },
  {
    id: 'cnd-t2dm',
    name: {
      value: 'Type 2 diabetes mellitus',
      evidenceId: 'ev-t2dm',
      confidence: 97,
      state: 'clinician-verified',
    },
    code: 'E11.9',
    severity: 'significant',
    diagnosedOn: '2016-04-21',
    status: 'active',
    controlMarker: {
      value: 'HbA1c 7.4% · Jul 2026',
      evidenceId: 'ev-hba1c',
      confidence: 99,
      state: 'source-backed',
    },
  },
  {
    id: 'cnd-dyslipidaemia',
    name: {
      value: 'Dyslipidaemia',
      evidenceId: 'ev-dyslipidaemia',
      confidence: 94,
      state: 'source-backed',
    },
    code: 'E78.5',
    severity: 'managed',
    diagnosedOn: '2023-05-22',
    status: 'active',
    controlMarker: {
      value: 'LDL 118 mg/dL · Jul 2026',
      evidenceId: 'ev-ldl',
      confidence: 99,
      state: 'source-backed',
    },
    notes: 'Above secondary-prevention target — the reason for the August dose change.',
  },
  {
    id: 'cnd-ckd',
    name: {
      value: 'Reduced eGFR (stage 2)',
      evidenceId: 'ev-ckd',
      confidence: 91,
      state: 'source-backed',
    },
    code: 'N18.2',
    severity: 'managed',
    diagnosedOn: '2026-07-18',
    status: 'active',
    controlMarker: {
      value: 'eGFR 62 mL/min · Jul 2026',
      evidenceId: 'ev-egfr',
      confidence: 99,
      state: 'source-backed',
    },
    notes: 'Relevant to contrast imaging and nephrotoxic agents in an emergency setting.',
  },
];

/* ============================================================================
   MEDICATIONS
   `treats` wires each drug to the condition it addresses. That relation is what
   turns a medication list into a health graph.
   ========================================================================== */

export const medications: Medication[] = [
  {
    id: 'med-atorvastatin',
    name: {
      value: 'Atorvastatin',
      evidenceId: 'ev-atorvastatin-name',
      confidence: 99,
      state: 'source-backed',
    },
    dose: {
      // The conflicted one. State is 'conflicted', so every surface that renders
      // this dose is obliged to show the conflict rather than the value alone.
      value: '20 mg',
      evidenceId: 'ev-atorvastatin-20',
      confidence: 96,
      state: 'conflicted',
      conflictId: 'cfl-atorvastatin',
    },
    frequency: {
      value: 'Once daily, evening',
      evidenceId: 'ev-atorvastatin-freq',
      confidence: 95,
      state: 'source-backed',
    },
    route: 'Oral',
    indication: 'Secondary prevention · LDL above target',
    status: 'changed',
    startedOn: '2023-05-22',
    changedOn: '2026-08-12',
    previousDose: '10 mg',
    prescriber: 'Dr. Meera Rao · Apollo Cardiology',
    cautions: ['Myopathy risk increases with dose', 'Check LFTs if symptomatic'],
    treats: ['cnd-dyslipidaemia', 'cnd-cad'],
  },
  {
    id: 'med-metformin',
    name: {
      value: 'Metformin',
      evidenceId: 'ev-metformin-name',
      confidence: 98,
      state: 'source-backed',
    },
    dose: {
      value: '500 mg',
      evidenceId: 'ev-metformin-dose',
      confidence: 98,
      state: 'source-backed',
    },
    frequency: {
      value: 'Twice daily, after food',
      evidenceId: 'ev-metformin-freq',
      confidence: 97,
      state: 'source-backed',
    },
    route: 'Oral',
    indication: 'Type 2 diabetes mellitus',
    status: 'active',
    startedOn: '2016-05-02',
    prescriber: 'Dr. Meera Rao · Apollo Cardiology',
    cautions: [
      'Withhold before iodinated contrast — eGFR 62 mL/min',
      'Lactic acidosis risk in acute renal impairment',
    ],
    treats: ['cnd-t2dm'],
  },
  {
    id: 'med-telmisartan',
    name: {
      value: 'Telmisartan',
      evidenceId: 'ev-telmisartan-name',
      confidence: 97,
      state: 'source-backed',
    },
    dose: {
      value: '40 mg',
      evidenceId: 'ev-telmisartan-dose',
      confidence: 97,
      state: 'source-backed',
    },
    frequency: {
      value: 'Once daily, morning',
      evidenceId: 'ev-telmisartan-freq',
      confidence: 96,
      state: 'source-backed',
    },
    route: 'Oral',
    indication: 'Hypertension · renal protection',
    status: 'active',
    startedOn: '2023-05-22',
    prescriber: 'Dr. Meera Rao · Apollo Cardiology',
    cautions: ['Contributes to postural hypotension', 'Monitor potassium with reduced eGFR'],
    treats: ['cnd-htn', 'cnd-ckd'],
  },
  {
    id: 'med-aspirin',
    name: {
      value: 'Aspirin',
      evidenceId: 'ev-aspirin-name',
      confidence: 98,
      state: 'source-backed',
    },
    dose: {
      value: '75 mg',
      evidenceId: 'ev-aspirin-dose',
      confidence: 98,
      state: 'source-backed',
    },
    frequency: {
      value: 'Once daily, afternoon',
      evidenceId: 'ev-aspirin-freq',
      confidence: 96,
      state: 'source-backed',
    },
    route: 'Oral',
    indication: 'Antiplatelet · post-PCI secondary prevention',
    status: 'active',
    startedOn: '2023-05-22',
    prescriber: 'Dr. Meera Rao · Apollo Cardiology',
    cautions: ['Bleeding risk — relevant before any invasive procedure'],
    treats: ['cnd-cad'],
  },
  {
    id: 'med-clopidogrel',
    name: {
      value: 'Clopidogrel',
      evidenceId: 'ev-clopidogrel-stop',
      confidence: 92,
      state: 'source-backed',
    },
    dose: {
      value: '75 mg',
      evidenceId: 'ev-clopidogrel-stop',
      confidence: 92,
      state: 'source-backed',
    },
    frequency: {
      value: 'Once daily',
      evidenceId: 'ev-clopidogrel-stop',
      confidence: 90,
      state: 'source-backed',
    },
    route: 'Oral',
    indication: 'Dual antiplatelet therapy, 12 months post-PCI',
    status: 'discontinued',
    startedOn: '2023-05-22',
    changedOn: '2024-05-22',
    prescriber: 'Dr. Meera Rao · Apollo Cardiology',
    treats: ['cnd-cad'],
  },
  {
    id: 'med-amlodipine',
    name: {
      value: 'Amlodipine',
      evidenceId: 'ev-amlodipine-discontinued',
      confidence: 81,
      state: 'stale',
    },
    dose: {
      value: '5 mg',
      evidenceId: 'ev-amlodipine-discontinued',
      confidence: 78,
      state: 'stale',
    },
    frequency: {
      value: 'Once daily',
      evidenceId: 'ev-amlodipine-discontinued',
      confidence: 79,
      state: 'stale',
    },
    route: 'Oral',
    indication: 'Hypertension',
    status: 'discontinued',
    startedOn: '2023-11-08',
    changedOn: '2024-01-15',
    prescriber: 'Not legible on source',
    cautions: ['Source is a low-confidence handwritten scan'],
    treats: ['cnd-htn'],
  },
];

export const activeMedications = medications.filter(
  (m) => m.status === 'active' || m.status === 'changed' || m.status === 'as-needed',
);

/* ============================================================================
   PROCEDURES & ADMISSIONS
   ========================================================================== */

export const procedures: Procedure[] = [
  {
    id: 'prc-pci-2023',
    name: {
      value: 'Percutaneous coronary intervention, proximal LAD',
      evidenceId: 'ev-pci',
      confidence: 98,
      state: 'clinician-verified',
    },
    kind: 'intervention',
    performedOn: '2023-05-19',
    facility: 'Apollo Hospitals · Cath Lab',
    surgeon: 'Dr. Meera Rao',
    outcome: 'TIMI III flow restored. No immediate complication.',
    implants: ['Xience Sierra DES 3.0 × 18 mm — LAD · MRI conditional'],
  },
  {
    id: 'prc-angio-2023',
    name: {
      value: 'Coronary angiography, right radial approach',
      evidenceId: 'ev-pci',
      confidence: 97,
      state: 'source-backed',
    },
    kind: 'diagnostic',
    performedOn: '2023-05-19',
    facility: 'Apollo Hospitals · Cath Lab',
    surgeon: 'Dr. Meera Rao',
    outcome: 'Single-vessel disease, proximal LAD 90% stenosis.',
  },
];

export const hospitalisations: Hospitalisation[] = [
  {
    id: 'hsp-2023-nstemi',
    reason: {
      value: 'NSTEMI — acute coronary syndrome',
      evidenceId: 'ev-admission-2023',
      confidence: 98,
      state: 'clinician-verified',
    },
    facility: 'Apollo Hospitals · Cardiac Care Unit',
    admittedOn: '2023-05-18',
    dischargedOn: '2023-05-22',
    lengthOfStayDays: 4,
    department: 'Cardiology',
    major: true,
    summary:
      'Presented with retrosternal chest heaviness and diaphoresis. Troponin-I 2.8 ng/mL. Underwent PCI to proximal LAD with drug-eluting stent on day 2. Discharged stable on dual antiplatelet therapy.',
  },
];

/** Implanted hardware, pulled forward because it changes imaging decisions. */
export const implants: string[] = procedures.flatMap((p) => p.implants ?? []);

/* ============================================================================
   LAB TRENDS
   Trend direction matters more than any single value in an emergency handover.
   ========================================================================== */

export const labTrends: LabTrend[] = [
  {
    analyte: 'HbA1c',
    unit: '%',
    referenceLow: 4.0,
    referenceHigh: 5.6,
    direction: 'worsening',
    series: [
      { id: 'lab-a1c-1', analyte: 'HbA1c', value: 6.8, unit: '%', referenceLow: 4, referenceHigh: 5.6, takenOn: '2024-08-11', evidenceId: 'ev-hba1c', flag: 'high' },
      { id: 'lab-a1c-2', analyte: 'HbA1c', value: 7.0, unit: '%', referenceLow: 4, referenceHigh: 5.6, takenOn: '2025-02-19', evidenceId: 'ev-hba1c', flag: 'high' },
      { id: 'lab-a1c-3', analyte: 'HbA1c', value: 6.9, unit: '%', referenceLow: 4, referenceHigh: 5.6, takenOn: '2025-09-06', evidenceId: 'ev-hba1c', flag: 'high' },
      { id: 'lab-a1c-4', analyte: 'HbA1c', value: 7.2, unit: '%', referenceLow: 4, referenceHigh: 5.6, takenOn: '2026-01-24', evidenceId: 'ev-hba1c', flag: 'high' },
      { id: 'lab-a1c-5', analyte: 'HbA1c', value: 7.4, unit: '%', referenceLow: 4, referenceHigh: 5.6, takenOn: '2026-07-18', evidenceId: 'ev-hba1c', flag: 'high' },
    ],
  },
  {
    analyte: 'LDL cholesterol',
    unit: 'mg/dL',
    referenceLow: 0,
    referenceHigh: 100,
    direction: 'worsening',
    series: [
      { id: 'lab-ldl-1', analyte: 'LDL', value: 92, unit: 'mg/dL', referenceLow: 0, referenceHigh: 100, takenOn: '2024-08-11', evidenceId: 'ev-ldl', flag: 'normal' },
      { id: 'lab-ldl-2', analyte: 'LDL', value: 101, unit: 'mg/dL', referenceLow: 0, referenceHigh: 100, takenOn: '2025-02-19', evidenceId: 'ev-ldl', flag: 'high' },
      { id: 'lab-ldl-3', analyte: 'LDL', value: 108, unit: 'mg/dL', referenceLow: 0, referenceHigh: 100, takenOn: '2025-09-06', evidenceId: 'ev-ldl', flag: 'high' },
      { id: 'lab-ldl-4', analyte: 'LDL', value: 112, unit: 'mg/dL', referenceLow: 0, referenceHigh: 100, takenOn: '2026-01-24', evidenceId: 'ev-ldl', flag: 'high' },
      { id: 'lab-ldl-5', analyte: 'LDL', value: 118, unit: 'mg/dL', referenceLow: 0, referenceHigh: 100, takenOn: '2026-07-18', evidenceId: 'ev-ldl', flag: 'high' },
    ],
  },
  {
    analyte: 'eGFR',
    unit: 'mL/min',
    referenceLow: 90,
    referenceHigh: 130,
    direction: 'worsening',
    series: [
      { id: 'lab-egfr-1', analyte: 'eGFR', value: 78, unit: 'mL/min', referenceLow: 90, referenceHigh: 130, takenOn: '2024-08-11', evidenceId: 'ev-egfr', flag: 'low' },
      { id: 'lab-egfr-2', analyte: 'eGFR', value: 74, unit: 'mL/min', referenceLow: 90, referenceHigh: 130, takenOn: '2025-02-19', evidenceId: 'ev-egfr', flag: 'low' },
      { id: 'lab-egfr-3', analyte: 'eGFR', value: 70, unit: 'mL/min', referenceLow: 90, referenceHigh: 130, takenOn: '2025-09-06', evidenceId: 'ev-egfr', flag: 'low' },
      { id: 'lab-egfr-4', analyte: 'eGFR', value: 66, unit: 'mL/min', referenceLow: 90, referenceHigh: 130, takenOn: '2026-01-24', evidenceId: 'ev-egfr', flag: 'low' },
      { id: 'lab-egfr-5', analyte: 'eGFR', value: 62, unit: 'mL/min', referenceLow: 90, referenceHigh: 130, takenOn: '2026-07-18', evidenceId: 'ev-egfr', flag: 'low' },
    ],
  },
];

export const medicationById = (id: string) => medications.find((m) => m.id === id);
export const conditionById = (id: string) => conditions.find((c) => c.id === id);
