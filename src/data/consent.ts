import type { AuditEvent, ConsentGrant, ConsentScope } from '@/types';

/**
 * Consent grants.
 *
 * Two properties make this a consent system rather than a permissions table:
 *
 *   1. `withheldData` is explicit. A grant is defined as much by what it does
 *      not expose as by what it does, and the patient can see both.
 *   2. `basis: 'break-glass'` is a first-class state, not a back door. Emergency
 *      override is allowed, time-boxed, and notifies the patient automatically.
 */
export const consentGrants: ConsentGrant[] = [
  {
    id: 'csn-rao-emergency',
    granteeName: 'Dr. Meera Rao',
    granteeRole: 'clinician',
    organisation: 'Apollo Hospitals · Emergency Department',
    scope: 'emergency-context',
    purpose: 'Unscheduled presentation — emergency clinical context required for immediate care.',
    grantedAt: '09 Sep 2026 · 08:41',
    expiresAt: '09 Sep 2026 · 10:41',
    status: 'active',
    basis: 'break-glass',
    visibleData: [
      'Allergies and adverse drug reactions',
      'Blood group',
      'Active medications and recent changes',
      'Active conditions with control markers',
      'Major history and implanted devices',
      'Emergency contacts',
      'Source documents for the above',
    ],
    withheldData: [
      'Mental health records',
      'Reproductive and sexual health history',
      'Full lifetime document archive',
      'Billing and insurance records',
    ],
  },
  {
    id: 'csn-kiran-caregiver',
    granteeName: 'Kiran Sharma',
    granteeRole: 'caregiver',
    organisation: 'Family · Son',
    scope: 'care-coordination',
    purpose: 'Day-to-day care coordination, medication management and appointment support.',
    grantedAt: '14 Mar 2026 · 19:02',
    expiresAt: 'No expiry · revocable at any time',
    status: 'active',
    basis: 'patient-granted',
    visibleData: [
      'Medication list and schedule',
      'Upcoming and past appointments',
      'Allergies',
      'Health timeline',
      'Ability to share emergency access',
    ],
    withheldData: [
      'Source documents in full',
      'Lab reports in full',
      'Consent administration',
      'Ability to grant clinician access beyond emergency scope',
    ],
  },
  {
    id: 'csn-lalpath',
    granteeName: 'Dr. Lal PathLabs',
    granteeRole: 'facility',
    organisation: 'Diagnostics partner · Banjara Hills',
    scope: 'labs-only',
    purpose: 'Automatic delivery of laboratory results into the longitudinal profile.',
    grantedAt: '02 Jan 2025 · 11:20',
    expiresAt: '02 Jan 2027 · 11:20',
    status: 'active',
    basis: 'patient-granted',
    visibleData: ['Patient identity for result matching', 'Prior lab results for trend continuity'],
    withheldData: ['Medications', 'Conditions', 'Clinical notes', 'Documents from other sources'],
  },
  {
    id: 'csn-sunrise',
    granteeName: 'Dr. K. Iyer',
    granteeRole: 'clinician',
    organisation: 'Sunrise Clinic · General Medicine',
    scope: 'medications-only',
    purpose: 'Repeat prescription review.',
    grantedAt: '04 May 2026 · 10:15',
    expiresAt: '04 Jun 2026 · 10:15',
    status: 'expired',
    basis: 'patient-granted',
    visibleData: ['Active medication list', 'Allergies'],
    withheldData: ['Conditions', 'Labs', 'Documents', 'Timeline'],
  },
  {
    id: 'csn-revoked-insurer',
    granteeName: 'Meridian Health Assurance',
    granteeRole: 'facility',
    organisation: 'Insurer · claims unit',
    scope: 'full-record',
    purpose: 'Claim assessment for the May 2023 admission.',
    grantedAt: '12 Jun 2023 · 16:44',
    expiresAt: 'Revoked 30 Jun 2023 · 09:12',
    status: 'revoked',
    basis: 'patient-granted',
    visibleData: [],
    withheldData: ['All data — access revoked by patient'],
  },
];

export const activeGrants = consentGrants.filter((g) => g.status === 'active');

export const consentScopeLabel: Record<ConsentScope, string> = {
  'emergency-context': 'Emergency clinical context',
  'full-record': 'Full record',
  'medications-only': 'Medications only',
  'labs-only': 'Laboratory results only',
  'care-coordination': 'Care coordination',
};

/* ============================================================================
   AUDIT TRAIL
   Every read is logged, including reads of the evidence itself. In an emergency
   the interesting unit of time is the second, so emergency-session entries are
   timestamped accordingly.
   ========================================================================== */

export const auditEvents: AuditEvent[] = [
  {
    id: 'aud-01',
    time: '08:41:02',
    date: '2026-09-09',
    action: 'identity-verify',
    actor: 'System',
    actorRole: 'system',
    detail: 'Identity matched against ABHA ••-••••-••••-4491 and hospital MRN APL-449120.',
    ipHint: 'Apollo ED · triage terminal 3',
  },
  {
    id: 'aud-02',
    time: '08:41:04',
    date: '2026-09-09',
    action: 'consent-grant',
    actor: 'Dr. Meera Rao',
    actorRole: 'clinician',
    organisation: 'Apollo Hospitals · Emergency Department',
    detail:
      'Break-glass emergency access opened, 2-hour expiry. Patient and registered caregiver notified automatically.',
    consentId: 'csn-rao-emergency',
    ipHint: 'Apollo ED · triage terminal 3',
  },
  {
    id: 'aud-03',
    time: '08:41:09',
    date: '2026-09-09',
    action: 'emergency-access',
    actor: 'Dr. Meera Rao',
    actorRole: 'clinician',
    organisation: 'Apollo Hospitals · Emergency Department',
    detail: 'Emergency profile opened. Snapshot assembled from 8 linked sources.',
    consentId: 'csn-rao-emergency',
    ipHint: 'Apollo ED · triage terminal 3',
  },
  {
    id: 'aud-04',
    time: '08:42:17',
    date: '2026-09-09',
    action: 'medication-view',
    actor: 'Dr. Meera Rao',
    actorRole: 'clinician',
    organisation: 'Apollo Hospitals · Emergency Department',
    detail: 'Active medication list viewed — 4 active agents, 1 recent change.',
    consentId: 'csn-rao-emergency',
    ipHint: 'Apollo ED · triage terminal 3',
  },
  {
    id: 'aud-05',
    time: '08:43:05',
    date: '2026-09-09',
    action: 'document-open',
    actor: 'Dr. Meera Rao',
    actorRole: 'clinician',
    organisation: 'Apollo Hospitals · Emergency Department',
    detail: 'Source document opened — Prescription_12Aug.pdf, page 1.',
    consentId: 'csn-rao-emergency',
    ipHint: 'Apollo ED · triage terminal 3',
  },
  {
    id: 'aud-06',
    time: '08:43:31',
    date: '2026-09-09',
    action: 'evidence-view',
    actor: 'Dr. Meera Rao',
    actorRole: 'clinician',
    organisation: 'Apollo Hospitals · Emergency Department',
    detail: 'Evidence inspected for claim "Atorvastatin increased 10 mg → 20 mg".',
    consentId: 'csn-rao-emergency',
    ipHint: 'Apollo ED · triage terminal 3',
  },
  {
    id: 'aud-07',
    time: '19:14:22',
    date: '2026-08-20',
    action: 'profile-view',
    actor: 'Kiran Sharma',
    actorRole: 'caregiver',
    organisation: 'Family · Son',
    detail: 'Caregiver reviewed medication schedule after the 19 Aug follow-up.',
    consentId: 'csn-kiran-caregiver',
    ipHint: 'Mobile · Hyderabad',
  },
  {
    id: 'aud-08',
    time: '08:02:41',
    date: '2026-07-19',
    action: 'export',
    actor: 'System',
    actorRole: 'system',
    detail: 'Laboratory results ingested from Dr. Lal PathLabs under standing consent.',
    consentId: 'csn-lalpath',
    ipHint: 'Partner API',
  },
  {
    id: 'aud-09',
    time: '09:12:03',
    date: '2023-06-30',
    action: 'consent-revoke',
    actor: 'Anaya Sharma',
    actorRole: 'patient',
    detail: 'Access revoked for Meridian Health Assurance following claim closure.',
    consentId: 'csn-revoked-insurer',
    ipHint: 'Mobile · Hyderabad',
  },
];

export const auditActionLabel: Record<AuditEvent['action'], string> = {
  'emergency-access': 'Emergency profile accessed',
  'profile-view': 'Profile viewed',
  'medication-view': 'Medication history viewed',
  'document-open': 'Source document opened',
  'evidence-view': 'Evidence inspected',
  'consent-grant': 'Access granted',
  'consent-revoke': 'Access revoked',
  'identity-verify': 'Identity verified',
  'conflict-verify': 'Conflict verified by clinician',
  export: 'Data ingested',
};
