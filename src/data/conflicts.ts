import type { Conflict } from '@/types';

/**
 * Reconciliation output where sources disagree.
 *
 * The product rule this file exists to enforce:
 *
 *   When two records contradict each other, VITA presents both and stops.
 *
 * There is no "most recent wins" heuristic, no confidence tie-break, no silent
 * merge. A newer document is not automatically a truer one - a patient may have
 * continued the older regimen, or the newer note may be a transcription error.
 * Deciding is a clinical act, so a clinician does it, and the decision is
 * written to the audit trail with their name on it.
 */
export const conflicts: Conflict[] = [
  {
    id: 'cfl-atorvastatin',
    kind: 'dose-mismatch',
    subject: 'Atorvastatin — current dose',
    detectedOn: '2026-08-12',
    status: 'awaiting-verification',
    clinicalRelevance:
      'A two-fold dose difference. Relevant if the patient presents with muscle pain, rhabdomyolysis, or deranged liver enzymes, and to any decision about restarting or adjusting the statin during this encounter.',
    claims: [
      {
        label: 'Prescription B · more recent',
        value: 'Atorvastatin 20 mg, nightly',
        evidenceId: 'ev-atorvastatin-20',
        documentId: 'doc-rx-12aug',
        documentDate: '2026-08-12',
        confidence: 96,
      },
      {
        label: 'Prescription A · earlier',
        value: 'Atorvastatin 10 mg, nightly',
        evidenceId: 'ev-atorvastatin-10',
        documentId: 'doc-rx-may',
        documentDate: '2026-05-04',
        confidence: 93,
      },
    ],
  },
  {
    id: 'cfl-amlodipine',
    kind: 'status-contradiction',
    subject: 'Amlodipine — active or discontinued',
    detectedOn: '2024-02-11',
    status: 'awaiting-verification',
    clinicalRelevance:
      'The handwritten source carries a margin annotation ("stop amlo if giddiness") with no confirming record of whether it was stopped. The patient reports postural light-headedness at the most recent review, which makes the answer material.',
    claims: [
      {
        label: 'Handwritten Rx · Nov 2023',
        value: 'Amlodipine 5 mg once daily — prescribed',
        evidenceId: 'ev-amlodipine-discontinued',
        documentId: 'doc-rx-2023-11',
        documentDate: '2023-11-08',
        confidence: 81,
      },
      {
        label: 'Margin annotation · same page',
        value: 'Conditional stop instruction — outcome not recorded',
        evidenceId: 'ev-amlodipine-discontinued',
        documentId: 'doc-rx-2023-11',
        documentDate: '2023-11-08',
        confidence: 64,
      },
    ],
  },
];

export const openConflicts = conflicts.filter((c) => c.status === 'awaiting-verification');

export const conflictById = (id: string | undefined) =>
  id ? conflicts.find((c) => c.id === id) : undefined;

export const conflictKindLabel: Record<Conflict['kind'], string> = {
  'dose-mismatch': 'Dose mismatch',
  'duplicate-entry': 'Duplicate entry',
  'status-contradiction': 'Status contradiction',
  'date-ambiguity': 'Date ambiguity',
};
