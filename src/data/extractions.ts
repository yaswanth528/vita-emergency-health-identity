import type { AIExtraction } from '@/types';

/**
 * Raw entity extractions, before reconciliation.
 *
 * This is deliberately noisier than the clean health graph: the same drug
 * appears under different surface forms across documents ("TAB. ATORVASTATIN",
 * "Tab Atorvastatin", "T. Atorvastatin"), and two of them carry different
 * strengths. Reconciliation is the step that turns this list into the profile -
 * and the step that discovers the conflict.
 */
export const extractions: AIExtraction[] = [
  /* Prescription_12Aug.pdf */
  { id: 'x-01', documentId: 'doc-rx-12aug', entityType: 'medication', surfaceForm: 'TAB. ATORVASTATIN', normalised: 'Atorvastatin', confidence: 99, page: 1, coding: { system: 'RxNorm', code: '83367' } },
  { id: 'x-02', documentId: 'doc-rx-12aug', entityType: 'dosage', surfaceForm: '20 mg  1 - 0 - 0 (night)', normalised: '20 mg PO once daily, evening', confidence: 96, page: 1 },
  { id: 'x-03', documentId: 'doc-rx-12aug', entityType: 'medication', surfaceForm: 'TAB. METFORMIN', normalised: 'Metformin', confidence: 98, page: 1, coding: { system: 'RxNorm', code: '6809' } },
  { id: 'x-04', documentId: 'doc-rx-12aug', entityType: 'dosage', surfaceForm: '500 mg  1 - 0 - 1 (after food)', normalised: '500 mg PO twice daily', confidence: 97, page: 1 },
  { id: 'x-05', documentId: 'doc-rx-12aug', entityType: 'medication', surfaceForm: 'TAB. TELMISARTAN', normalised: 'Telmisartan', confidence: 97, page: 1, coding: { system: 'RxNorm', code: '73494' } },
  { id: 'x-06', documentId: 'doc-rx-12aug', entityType: 'dosage', surfaceForm: '40 mg  1 - 0 - 0 (morning)', normalised: '40 mg PO once daily, morning', confidence: 96, page: 1 },
  { id: 'x-07', documentId: 'doc-rx-12aug', entityType: 'medication', surfaceForm: 'TAB. ASPIRIN', normalised: 'Aspirin', confidence: 98, page: 1, coding: { system: 'RxNorm', code: '1191' } },
  { id: 'x-08', documentId: 'doc-rx-12aug', entityType: 'dosage', surfaceForm: '75 mg  0 - 1 - 0 (after food)', normalised: '75 mg PO once daily', confidence: 96, page: 1 },
  { id: 'x-09', documentId: 'doc-rx-12aug', entityType: 'allergy', surfaceForm: 'ALLERGY : PENICILLIN (anaphylaxis)', normalised: 'Penicillin — anaphylaxis', confidence: 98, page: 1, coding: { system: 'SNOMED-CT', code: '294930007' } },
  { id: 'x-10', documentId: 'doc-rx-12aug', entityType: 'date', surfaceForm: 'Date: 12-Aug-2026', normalised: '2026-08-12', confidence: 99, page: 1 },
  { id: 'x-11', documentId: 'doc-rx-12aug', entityType: 'condition', surfaceForm: 'CAD s/p PCI', normalised: 'Coronary artery disease, post-PCI', confidence: 95, page: 1, coding: { system: 'ICD-10', code: 'I25.10' } },
  { id: 'x-12', documentId: 'doc-rx-12aug', entityType: 'condition', surfaceForm: 'HTN', normalised: 'Essential hypertension', confidence: 94, page: 1, coding: { system: 'ICD-10', code: 'I10' } },
  { id: 'x-13', documentId: 'doc-rx-12aug', entityType: 'condition', surfaceForm: 'T2DM', normalised: 'Type 2 diabetes mellitus', confidence: 94, page: 1, coding: { system: 'ICD-10', code: 'E11.9' } },
  { id: 'x-14', documentId: 'doc-rx-12aug', entityType: 'condition', surfaceForm: 'Dyslipidaemia', normalised: 'Dyslipidaemia', confidence: 93, page: 1, coding: { system: 'ICD-10', code: 'E78.5' } },

  /* Prescription_May.pdf — the earlier, contradicting script */
  { id: 'x-20', documentId: 'doc-rx-may', entityType: 'medication', surfaceForm: 'Tab Atorvastatin', normalised: 'Atorvastatin', confidence: 96, page: 1, coding: { system: 'RxNorm', code: '83367' } },
  { id: 'x-21', documentId: 'doc-rx-may', entityType: 'dosage', surfaceForm: '10 mg HS', normalised: '10 mg PO once daily, night', confidence: 93, page: 1 },
  { id: 'x-22', documentId: 'doc-rx-may', entityType: 'medication', surfaceForm: 'Tab Metformin', normalised: 'Metformin', confidence: 97, page: 1, coding: { system: 'RxNorm', code: '6809' } },
  { id: 'x-23', documentId: 'doc-rx-may', entityType: 'dosage', surfaceForm: '500 mg BD', normalised: '500 mg PO twice daily', confidence: 96, page: 1 },
  { id: 'x-24', documentId: 'doc-rx-may', entityType: 'allergy', surfaceForm: 'Known allergy : Penicillin', normalised: 'Penicillin', confidence: 88, page: 1 },

  /* BloodReport_Final.pdf */
  { id: 'x-30', documentId: 'doc-lab-final', entityType: 'lab-value', surfaceForm: 'HbA1c 7.4 H %', normalised: 'HbA1c 7.4 % (high)', confidence: 99, page: 1, coding: { system: 'LOINC', code: '4548-4' } },
  { id: 'x-31', documentId: 'doc-lab-final', entityType: 'lab-value', surfaceForm: 'LDL cholesterol 118 H mg/dL', normalised: 'LDL-C 118 mg/dL (high)', confidence: 99, page: 1, coding: { system: 'LOINC', code: '13457-7' } },
  { id: 'x-32', documentId: 'doc-lab-final', entityType: 'lab-value', surfaceForm: 'eGFR (CKD-EPI) 62 L mL/min', normalised: 'eGFR 62 mL/min (low)', confidence: 99, page: 1, coding: { system: 'LOINC', code: '62238-1' } },
  { id: 'x-33', documentId: 'doc-lab-final', entityType: 'lab-value', surfaceForm: 'Serum creatinine 1.10 mg/dL', normalised: 'Creatinine 1.10 mg/dL', confidence: 99, page: 1 },
  { id: 'x-34', documentId: 'doc-lab-final', entityType: 'lab-value', surfaceForm: 'Potassium 4.20 mmol/L', normalised: 'K+ 4.20 mmol/L', confidence: 99, page: 1 },

  /* Discharge_Summary.pdf */
  { id: 'x-40', documentId: 'doc-discharge-2023', entityType: 'condition', surfaceForm: 'NSTEMI, anterior territory', normalised: 'Non-ST-elevation myocardial infarction', confidence: 98, page: 1, coding: { system: 'ICD-10', code: 'I21.4' } },
  { id: 'x-41', documentId: 'doc-discharge-2023', entityType: 'procedure', surfaceForm: 'PCI to proximal LAD with drug-eluting stent', normalised: 'Percutaneous coronary intervention, LAD, DES', confidence: 98, page: 2, coding: { system: 'SNOMED-CT', code: '415070008' } },
  { id: 'x-42', documentId: 'doc-discharge-2023', entityType: 'allergy', surfaceForm: 'PENICILLIN - anaphylaxis', normalised: 'Penicillin — anaphylaxis', confidence: 98, page: 2 },
  { id: 'x-43', documentId: 'doc-discharge-2023', entityType: 'medication', surfaceForm: 'Atorvastatin 40 mg HS', normalised: 'Atorvastatin 40 mg (discharge, 2023)', confidence: 96, page: 4 },
  { id: 'x-44', documentId: 'doc-discharge-2023', entityType: 'medication', surfaceForm: 'Clopidogrel 75 mg OD (12 months)', normalised: 'Clopidogrel 75 mg, time-limited', confidence: 95, page: 4 },
  { id: 'x-45', documentId: 'doc-discharge-2023', entityType: 'date', surfaceForm: 'Admitted : 18-May-2023', normalised: '2023-05-18', confidence: 99, page: 1 },

  /* Rx_2023_11.png — low-confidence handwriting */
  { id: 'x-50', documentId: 'doc-rx-2023-11', entityType: 'medication', surfaceForm: 'T. Amlodipine 5 mg', normalised: 'Amlodipine 5 mg', confidence: 81, page: 1 },
  { id: 'x-51', documentId: 'doc-rx-2023-11', entityType: 'dosage', surfaceForm: 'Atorvastatin 1 0 mg', normalised: 'REJECTED — numeral ambiguous (10 vs 40)', confidence: 58, page: 1 },
  { id: 'x-52', documentId: 'doc-rx-2023-11', entityType: 'medication', surfaceForm: 'T. Metformin 500 BD', normalised: 'Metformin 500 mg twice daily', confidence: 89, page: 1 },

  /* Consult_Note_19Aug.pdf */
  { id: 'x-60', documentId: 'doc-consult-19aug', entityType: 'vital', surfaceForm: 'BP 138/86 mmHg', normalised: 'Blood pressure 138/86 mmHg', confidence: 96, page: 1 },
  { id: 'x-61', documentId: 'doc-consult-19aug', entityType: 'vital', surfaceForm: 'Pulse 74 bpm, regular', normalised: 'Heart rate 74 bpm', confidence: 97, page: 1 },
  { id: 'x-62', documentId: 'doc-consult-19aug', entityType: 'vital', surfaceForm: 'SpO2 98% room air', normalised: 'SpO2 98 %', confidence: 97, page: 1 },
  { id: 'x-63', documentId: 'doc-consult-19aug', entityType: 'condition', surfaceForm: 'Postural light-headedness', normalised: 'Orthostatic symptoms — under investigation', confidence: 88, page: 1 },

  /* Echo_Report_Dec2025.pdf */
  { id: 'x-70', documentId: 'doc-echo-dec25', entityType: 'lab-value', surfaceForm: 'LVEF : 52 % (Simpson biplane)', normalised: 'LVEF 52 %', confidence: 96, page: 1 },
  { id: 'x-71', documentId: 'doc-echo-dec25', entityType: 'procedure', surfaceForm: 'Drug-eluting stent in situ, LAD', normalised: 'Implant — DES, LAD (MRI conditional)', confidence: 95, page: 1 },

  /* Allergy_Record_2019.pdf */
  { id: 'x-80', documentId: 'doc-allergy-2019', entityType: 'allergy', surfaceForm: 'Amoxicillin 500 mg — penicillin class', normalised: 'Penicillin class', confidence: 99, page: 1 },
  { id: 'x-81', documentId: 'doc-allergy-2019', entityType: 'condition', surfaceForm: 'SEVERITY : ANAPHYLAXIS (Grade 3)', normalised: 'Anaphylaxis, grade 3', confidence: 99, page: 1, coding: { system: 'SNOMED-CT', code: '39579001' } },
];

export const extractionsFor = (documentId: string) =>
  extractions.filter((e) => e.documentId === documentId);

/** Entities the pipeline refused to promote into the graph. */
export const rejectedExtractions = extractions.filter((e) => e.confidence < 85);
