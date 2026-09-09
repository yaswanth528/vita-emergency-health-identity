import type {
  AccessRequest,
  AppNotification,
  ClinicianProfile,
  Connection,
  User,
} from '@/types/platform';

/* ============================================================================
   Seed data for the two-sided platform.
   Synthetic throughout. Reference date for the demo: 09 Sep 2026, ~08:40.
   ========================================================================== */

/* --- Clinicians -------------------------------------------------------------- */

export const clinicians: ClinicianProfile[] = [
  {
    id: 'cl-rao',
    name: 'Dr. Arjun Rao',
    speciality: 'Emergency Medicine',
    department: 'Emergency Department',
    organisation: 'Apollo Hospitals',
    licenceId: 'TSMC 41207',
    verified: true,
    initials: 'AR',
    email: 'arjun.rao@apollo.example',
    phoneMasked: '+91 ••••• ••407',
  },
  {
    id: 'cl-meera',
    name: 'Dr. Meera Rao',
    speciality: 'Cardiology',
    department: 'Cardiology OPD',
    organisation: 'Apollo Hospitals',
    licenceId: 'TSMC 33418',
    verified: true,
    initials: 'MR',
    email: 'meera.rao@apollo.example',
    phoneMasked: '+91 ••••• ••112',
  },
  {
    id: 'cl-iyer',
    name: 'Dr. K. Iyer',
    speciality: 'General Medicine',
    department: 'Outpatients',
    organisation: 'Sunrise Clinic',
    licenceId: 'TSMC 28994',
    verified: true,
    initials: 'KI',
    email: 'k.iyer@sunrise.example',
    phoneMasked: '+91 ••••• ••771',
  },
];

export const clinicianById = (id: string) => clinicians.find((c) => c.id === id);

/* --- Demo accounts ------------------------------------------------------------ */

/**
 * Two accounts, deliberately not interchangeable. The role on the user record
 * is what selects the shell, the navigation and the permitted actions — there
 * is no shared dashboard that branches on a flag.
 */
export const demoUsers: User[] = [
  {
    id: 'usr-patient-kavita',
    role: 'patient',
    name: 'Kavita Menon',
    email: 'kavita.menon@example.com',
    patientId: 'pt-4491',
  },
  {
    id: 'usr-clinician-rao',
    role: 'clinician',
    name: 'Dr. Arjun Rao',
    email: 'arjun.rao@apollo.example',
    clinicianId: 'cl-rao',
  },
];

export const patientUser = demoUsers[0];
export const clinicianUser = demoUsers[1];

/** User id for a clinician, so notifications can be addressed to a person. */
export const userIdForClinician = (clinicianId: string) =>
  clinicianId === 'cl-rao' ? clinicianUser.id : `usr-${clinicianId}`;

/** User id for a patient, likewise. */
export const userIdForPatient = (patientId: string) =>
  patientId === 'pt-4491' ? patientUser.id : `usr-${patientId}`;

/* --- Connections --------------------------------------------------------------- */

export const seedConnections: Connection[] = [
  {
    id: 'con-1',
    patientId: 'pt-4491',
    clinicianId: 'cl-rao',
    status: 'active',
    since: '2026-09-09',
    relationship: 'Emergency department — current presentation',
  },
  {
    id: 'con-2',
    patientId: 'pt-4491',
    clinicianId: 'cl-meera',
    status: 'active',
    since: '2023-05-18',
    relationship: 'Treating cardiologist since the 2023 admission',
  },
  {
    id: 'con-3',
    patientId: 'pt-2210',
    clinicianId: 'cl-rao',
    status: 'active',
    since: '2026-07-25',
    relationship: 'Emergency department — prior presentation',
  },
];

/* --- Access requests ----------------------------------------------------------- */

export const seedRequests: AccessRequest[] = [
  {
    id: 'req-1',
    patientId: 'pt-4491',
    clinicianId: 'cl-iyer',
    urgency: 'routine',
    reason: 'medication-verification',
    note: 'Repeat prescription review — I want to confirm the current statin dose before issuing.',
    scope: 'medications-only',
    requestedData: ['Active medication list', 'Recent medication changes', 'Allergies'],
    status: 'pending',
    createdAt: '08 Sep 2026 · 17:12',
    durationHours: 72,
  },
  {
    id: 'req-2',
    patientId: 'pt-4491',
    clinicianId: 'cl-meera',
    urgency: 'routine',
    reason: 'general-consultation',
    note: 'Six-month cardiology review. Requesting the longitudinal record ahead of the appointment.',
    scope: 'full-record',
    requestedData: [
      'Longitudinal timeline',
      'All source documents',
      'Lab trends',
      'Medications and conditions',
    ],
    status: 'approved',
    createdAt: '14 Aug 2026 · 09:30',
    respondedAt: '14 Aug 2026 · 09:44',
    durationHours: 720,
    consentId: 'csn-meera-longitudinal',
  },
  {
    id: 'req-3',
    patientId: 'pt-2210',
    clinicianId: 'cl-rao',
    urgency: 'routine',
    reason: 'urgent-clinical-review',
    note: 'Renal function review following the July presentation.',
    scope: 'labs-only',
    requestedData: ['Laboratory results', 'Renal function trend'],
    status: 'pending',
    createdAt: '09 Sep 2026 · 07:55',
    durationHours: 48,
  },
];

/* --- Notifications ------------------------------------------------------------- */

export const seedNotifications: AppNotification[] = [
  {
    id: 'ntf-1',
    recipientId: patientUser.id,
    kind: 'access-request',
    title: 'Dr. K. Iyer requested access',
    body: 'Sunrise Clinic · medication verification. Your active medication list and allergies, for 72 hours.',
    createdAt: '08 Sep 2026 · 17:12',
    read: false,
    href: '/app/requests',
    priority: 'normal',
  },
  {
    id: 'ntf-2',
    recipientId: patientUser.id,
    kind: 'record-updated',
    title: 'New lab report processed',
    body: 'BloodReport_Final.pdf — 11 entities extracted, HbA1c and renal function updated.',
    createdAt: '19 Jul 2026 · 08:02',
    read: true,
    href: '/app/documents/doc-lab-final',
    priority: 'normal',
  },
  {
    id: 'ntf-3',
    recipientId: clinicianUser.id,
    kind: 'access-request',
    title: 'Awaiting response — Z. Ansari',
    body: 'Your request for laboratory results is still pending with the patient.',
    createdAt: '09 Sep 2026 · 07:55',
    read: false,
    href: '/clinician/requests',
    priority: 'normal',
  },
  {
    id: 'ntf-4',
    recipientId: clinicianUser.id,
    kind: 'record-updated',
    title: 'New patient arrived at triage',
    body: 'Rahul Mehta — no linked health profile found in the registry.',
    createdAt: '09 Sep 2026 · 08:12',
    read: false,
    href: '/clinician/new-patient',
    priority: 'normal',
  },
];

/* --- Unlinked arrivals ---------------------------------------------------------- */

/**
 * Someone at triage with no health identity. Their presence in the demo matters:
 * it is the case the product does not magically solve, and the clinician has to
 * either invite them to create a profile or proceed without a record.
 */
export interface UnlinkedArrival {
  id: string;
  name: string;
  age: number;
  sex: 'Female' | 'Male' | 'Other';
  arrivedAt: string;
  note: string;
}

export const unlinkedArrivals: UnlinkedArrival[] = [
  {
    id: 'arr-1',
    name: 'Rahul Mehta',
    age: 41,
    sex: 'Male',
    arrivedAt: '09 Sep 2026 · 08:12',
    note: 'No previous local record and no linked health identity. Nothing to surface.',
  },
];
