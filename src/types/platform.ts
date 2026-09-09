import type { ConsentScope, ISODate, PatientId } from './index';

/* ============================================================================
   PULSE — platform model
   ----------------------------------------------------------------------------
   The clinical model (`types/index.ts`) describes what is true about a patient.
   This file describes who may see it, who asked, and what happened.

   The two sides of the product are not two applications. They are two views
   over the objects below, and every one of them names both parties:

     Connection      a clinician and a patient know each other
     AccessRequest   a clinician asked; only the patient can answer
     ConsentGrant    the patient's answer, scoped and time-boxed
     EmergencyEvent  the patient raised the alarm
     Notification    the other side was told
     AuditEvent      it was written down

   Permissions are deliberately asymmetric. A clinician can create requests and
   break glass; only a patient can grant, decline or revoke. There is no action
   in this model by which a clinician overrides a patient's decision — the
   nearest thing is break-glass, which is time-boxed, reason-bearing, and
   notifies the patient the moment it is used.
   ========================================================================== */

export type Role = 'patient' | 'clinician';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  /** Patients link to a clinical profile; clinicians link to a practice profile. */
  patientId?: PatientId;
  clinicianId?: ClinicianId;
}

export type ClinicianId = string;

export interface ClinicianProfile {
  id: ClinicianId;
  name: string;
  /** e.g. "Emergency Medicine" */
  speciality: string;
  department: string;
  organisation: string;
  /** Council registration. Simulated verification in this prototype. */
  licenceId: string;
  verified: boolean;
  initials: string;
  email: string;
  phoneMasked: string;
}

/* --- Connection ------------------------------------------------------------- */

export type ConnectionStatus = 'active' | 'pending' | 'ended';

/** A standing care relationship. Distinct from consent: knowing a patient is
 *  not the same as being allowed to read their record. */
export interface Connection {
  id: string;
  patientId: PatientId;
  clinicianId: ClinicianId;
  status: ConnectionStatus;
  since: ISODate;
  /** Why this clinician is in the patient's care circle. */
  relationship: string;
}

/* --- Access requests --------------------------------------------------------- */

export type RequestUrgency = 'routine' | 'emergency';

export type RequestStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'revoked';

export type RequestReason =
  | 'emergency-assessment'
  | 'urgent-clinical-review'
  | 'medication-verification'
  | 'general-consultation'
  | 'records-update';

export const requestReasonLabel: Record<RequestReason, string> = {
  'emergency-assessment': 'Emergency assessment',
  'urgent-clinical-review': 'Urgent clinical review',
  'medication-verification': 'Medication verification',
  'general-consultation': 'General consultation',
  'records-update': 'Records update',
};

export interface AccessRequest {
  id: string;
  patientId: PatientId;
  clinicianId: ClinicianId;
  urgency: RequestUrgency;
  reason: RequestReason;
  /** Free-text justification the clinician typed. Shown to the patient verbatim. */
  note?: string;
  /** What is being asked for — named explicitly, never "full access". */
  scope: ConsentScope;
  requestedData: string[];
  status: RequestStatus;
  createdAt: string;
  /** How long the grant would last if approved. */
  durationHours: number;
  respondedAt?: string;
  /** Set when approval produced a grant, so the two can be traced to each other. */
  consentId?: string;
}

/* --- Emergency --------------------------------------------------------------- */

export type EmergencyStatus = 'active' | 'resolved' | 'cancelled';

/**
 * Raised by the patient, not by the system. An emergency event does not itself
 * release any data — it tells the care circle to look, and it is what makes a
 * subsequent break-glass access defensible.
 */
export interface EmergencyEvent {
  id: string;
  patientId: PatientId;
  status: EmergencyStatus;
  startedAt: string;
  /** Epoch ms, so the clinician's "2 minutes ago" can tick without re-parsing. */
  startedAtMs: number;
  resolvedAt?: string;
  /** Simulated in this prototype. */
  location?: string;
  /** Clinician ids notified when the alarm was raised. */
  notified: ClinicianId[];
  /** Who has opened the emergency context during this event. */
  accessedBy: { clinicianId: ClinicianId; at: string; reason: string }[];
  /** 'patient' — the patient pressed the button themselves. */
  raisedBy: 'patient' | 'caregiver';
}

/* --- Notifications ----------------------------------------------------------- */

export type NotificationKind =
  | 'emergency-alert'
  | 'access-request'
  | 'access-granted'
  | 'access-declined'
  | 'access-revoked'
  | 'profile-accessed'
  | 'record-updated'
  | 'expiry-warning';

export interface AppNotification {
  id: string;
  /** User id of the recipient — this is what keeps the two inboxes separate. */
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Where clicking it should take the recipient. */
  href?: string;
  /** Emergency notifications sort and style above everything else. */
  priority: 'normal' | 'high';
}

/* --- Uploads ------------------------------------------------------------------ */

/**
 * A file the user chose, and what reading it produced.
 *
 * The file itself is held in memory so it can be re-read; it is not persisted.
 * `pages` is the actual text pulled out of the document — by pdf.js for a text
 * layer, or by Tesseract for a scan — and every entity below points at a real
 * offset inside it. Nothing in this record is invented: if the document could
 * not be read, `readError` says why and there are no entities.
 */
export interface UploadedFile {
  id: string;
  name: string;
  sizeKb: number;
  mime: string;
  kind: 'pdf' | 'image';
  addedAt: string;
  status: 'queued' | 'reading' | 'read' | 'failed';
  /** Live progress while the reader works. */
  progress?: { stage: string; pct: number };
  /** The real extracted text, one entry per page. */
  pages?: string[];
  readMethod?: import('@/lib/docReader').ReadMethod;
  /** OCR mean word confidence, or 99 for an exact text layer. */
  readConfidence?: number;
  readError?: string;
  entities?: import('@/lib/clinicalNer').NerEntity[];
  acceptedCount?: number;
  withheldCount?: number;
  meanConfidence?: number;
}
