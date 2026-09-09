import type { Patient } from '@/types';

/** The demo patient. Everything else in `/data` hangs off this record. */
export const kavita: Patient = {
  id: 'pt-4491',
  fullName: 'Kavita Menon',
  displayName: 'K. Menon',
  dateOfBirth: '1968-02-11',
  age: 58,
  sex: 'Female',
  bloodGroup: {
    value: 'B+',
    evidenceId: 'ev-blood-group',
    confidence: 99,
    state: 'clinician-verified',
  },
  abhaMasked: '••-••••-••••-4491',
  identityVerified: true,
  identityMethods: ['abha-linked', 'hospital-mrn', 'biometric'],
  photoInitials: 'KM',
  heightCm: 159,
  weightKg: 68,
  organDonor: true,
  advanceDirective: undefined,
  primaryPhysician: 'Dr. Meera Rao · Apollo Cardiology',
  profileCompleteness: 87,
  sourceFreshnessDays: 21,
  emergencyContacts: [
    {
      name: 'Rohan Menon',
      relationship: 'Son',
      phoneMasked: '+91 ••••• ••821',
      phone: '+91 98490 22821',
      isCaregiver: true,
    },
    {
      name: 'Dr. Meera Rao',
      relationship: 'Treating cardiologist',
      phoneMasked: '+91 ••••• ••407',
      phone: '+91 90000 41407',
      isCaregiver: false,
    },
  ],
};

/**
 * Additional records so the clinician workspace behaves like a real registry
 * rather than a single-patient demo. Each one exercises a different state:
 *
 *  - `pt-2210`  identity verified, but NO active consent -> must request access
 *  - `pt-7726`  consent fine, but almost no linked sources -> thin profile
 *  - `pt-9083`  identity NOT verified -> cannot open emergency context
 */
export const otherPatients: Patient[] = [
  {
    id: 'pt-2210',
    fullName: 'Zubeida Ansari',
    displayName: 'Z. Ansari',
    dateOfBirth: '1955-06-30',
    age: 71,
    sex: 'Female',
    bloodGroup: {
      value: 'A-',
      evidenceId: 'ev-blood-group',
      confidence: 94,
      state: 'source-backed',
    },
    abhaMasked: '••-••••-••••-2210',
    identityVerified: true,
    identityMethods: ['abha-linked', 'govt-id'],
    photoInitials: 'ZA',
    organDonor: false,
    primaryPhysician: 'Dr. S. Krishnan · Yashoda Nephrology',
    profileCompleteness: 74,
    sourceFreshnessDays: 46,
    emergencyContacts: [
      {
        name: 'Faizan Ansari',
        relationship: 'Son',
        phoneMasked: '+91 ••••• ••114',
        phone: '+91 99590 11114',
        isCaregiver: true,
      },
    ],
  },
  {
    id: 'pt-7726',
    fullName: 'Arjun Pillai',
    displayName: 'A. Pillai',
    dateOfBirth: '1992-11-02',
    age: 34,
    sex: 'Male',
    bloodGroup: {
      value: 'O+',
      evidenceId: 'ev-blood-group',
      confidence: 86,
      state: 'self-reported',
    },
    abhaMasked: '••-••••-••••-7726',
    identityVerified: true,
    identityMethods: ['abha-linked'],
    photoInitials: 'AP',
    organDonor: false,
    primaryPhysician: 'Not recorded',
    profileCompleteness: 22,
    sourceFreshnessDays: 402,
    emergencyContacts: [
      {
        name: 'Divya Pillai',
        relationship: 'Spouse',
        phoneMasked: '+91 ••••• ••673',
        phone: '+91 70320 55673',
        isCaregiver: false,
      },
    ],
  },
  {
    id: 'pt-9083',
    fullName: 'Joseph Fernandes',
    displayName: 'J. Fernandes',
    dateOfBirth: '1981-04-19',
    age: 45,
    sex: 'Male',
    bloodGroup: {
      value: 'AB+',
      evidenceId: 'ev-blood-group',
      confidence: 71,
      state: 'self-reported',
    },
    abhaMasked: 'not linked',
    identityVerified: false,
    identityMethods: ['unverified'],
    photoInitials: 'JF',
    organDonor: false,
    primaryPhysician: 'Not recorded',
    profileCompleteness: 9,
    sourceFreshnessDays: 0,
    emergencyContacts: [],
  },
];

export const allPatients: Patient[] = [kavita, ...otherPatients];

export const patientById = (id: string): Patient | undefined =>
  allPatients.find((p) => p.id === id);

/**
 * Registry state per patient, consumed by the clinician workspace.
 * Kept separate from `Patient` because in a real system it comes from the
 * consent service, not the demographics service.
 */
export interface RegistryStatus {
  patientId: string;
  linkedSources: number;
  consent: 'active' | 'requires-request' | 'blocked-identity';
  lastEncounter: string;
  note: string;
}

export const registryStatus: Record<string, RegistryStatus> = {
  'pt-4491': {
    patientId: 'pt-4491',
    linkedSources: 8,
    consent: 'active',
    lastEncounter: '19 Aug 2026 · Apollo Cardiology',
    note: 'Emergency context available immediately.',
  },
  'pt-2210': {
    patientId: 'pt-2210',
    linkedSources: 5,
    consent: 'requires-request',
    lastEncounter: '25 Jul 2026 · Yashoda Nephrology',
    note: 'No standing grant. Break-glass access must be requested and is auto-notified to the patient.',
  },
  'pt-7726': {
    patientId: 'pt-7726',
    linkedSources: 1,
    consent: 'active',
    lastEncounter: '03 Aug 2025 · Walk-in clinic',
    note: 'Profile is sparse. Treat absence of data as unknown, not as absence of disease.',
  },
  'pt-9083': {
    patientId: 'pt-9083',
    linkedSources: 0,
    consent: 'blocked-identity',
    lastEncounter: '—',
    note: 'Identity not verified. Emergency context cannot be released against an unverified identity.',
  },
};
