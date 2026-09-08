/* ============================================================================
   VITA — domain model
   ----------------------------------------------------------------------------
   Design rule that governs this entire file:

     No clinical claim exists in this system without provenance.

   Every medically-actionable value is wrapped in `SourcedFact`, which cannot be
   constructed without an evidence reference. UI components accept `SourcedFact`
   rather than raw strings, so it is structurally impossible to render an
   AI-derived medical statement in the interface without also being able to show
   the document, page, date and confidence it came from.
   ========================================================================== */

/** ISO-8601 date string, e.g. "2026-08-12". */
export type ISODate = string;

/** Confidence expressed 0-100, as reported by the extraction model. */
export type Confidence = number;

export type ExtractionMethod =
  | 'ocr+ner'
  | 'layout-parse'
  | 'table-extract'
  | 'clinician-entered'
  | 'patient-entered'
  | 'hie-sync';

/** How much a fact can be trusted to act on, independent of raw model score. */
export type VerificationState =
  /** Extracted, source-linked, no contradicting record found. */
  | 'source-backed'
  /** A human clinician has explicitly confirmed this value. */
  | 'clinician-verified'
  /** Two or more sources disagree. The system must NOT pick a winner. */
  | 'conflicted'
  /** Source is older than the freshness threshold for this data class. */
  | 'stale'
  /** Supplied by patient/caregiver; useful, but not a clinical record. */
  | 'self-reported';

export type EvidenceId = string;
export type ConflictId = string;
export type DocumentId = string;
export type PatientId = string;

/**
 * A value that carries its own provenance.
 * `evidenceId` is required - this is the core trust guarantee.
 */
export interface SourcedFact<T = string> {
  value: T;
  evidenceId: EvidenceId;
  confidence: Confidence;
  state: VerificationState;
  /** Present only when `state === 'conflicted'`. */
  conflictId?: ConflictId;
}

/* --- Evidence --------------------------------------------------------------- */

/**
 * A single traceable link from a rendered claim back to the exact place in the
 * source material it was derived from.
 */
export interface Evidence {
  id: EvidenceId;
  documentId: DocumentId;
  /** Page within the source document (1-indexed). */
  page: number;
  /** Verbatim text as it appears in the source, for side-by-side comparison. */
  excerpt: string;
  /** The normalised value the extractor produced from that excerpt. */
  extractedValue: string;
  /** Date the clinical event occurred / document was authored. */
  documentDate: ISODate;
  /** When VITA processed it. */
  extractedAt: ISODate;
  confidence: Confidence;
  method: ExtractionMethod;
  /** Which model / pipeline version produced this. Auditable. */
  extractor: string;
}

/* --- Documents -------------------------------------------------------------- */

export type DocumentKind =
  | 'prescription'
  | 'discharge-summary'
  | 'lab-report'
  | 'imaging'
  | 'clinical-note'
  | 'immunisation';

export type ProcessingStatus =
  | 'queued'
  | 'ingesting'
  | 'extracting'
  | 'reconciling'
  | 'processed'
  | 'needs-review';

export interface MedicalDocument {
  id: DocumentId;
  filename: string;
  kind: DocumentKind;
  /** Date of the clinical encounter the document describes. */
  date: ISODate;
  uploadedAt: ISODate;
  /** Originating institution or system. */
  source: string;
  /** How the document reached VITA. */
  channel: 'patient-upload' | 'caregiver-upload' | 'hospital-sync' | 'lab-sync';
  pages: number;
  sizeKb: number;
  status: ProcessingStatus;
  /** Count of structured entities lifted out of this document. */
  entityCount: number;
  /** Mean extraction confidence across this document's entities. */
  meanConfidence: Confidence;
  /** Plain-text stand-in for the rendered page, used by the source viewer. */
  renderedText: string[];
  /** Author / prescriber where known. */
  author?: string;
}

/* --- Clinical entities ------------------------------------------------------ */

export type MedicationStatus = 'active' | 'discontinued' | 'changed' | 'as-needed';

export interface Medication {
  id: string;
  name: SourcedFact;
  /** e.g. "20 mg" */
  dose: SourcedFact;
  /** e.g. "once daily, evening" */
  frequency: SourcedFact;
  route: string;
  /** Why it was prescribed - links medication to condition in the health graph. */
  indication: string;
  status: MedicationStatus;
  startedOn: ISODate;
  /** Set when a dose/regimen change was detected by reconciliation. */
  changedOn?: ISODate;
  previousDose?: string;
  prescriber: string;
  /** Interactions VITA surfaces for clinician awareness - never a recommendation. */
  cautions?: string[];
  /** Condition ids this medication treats. */
  treats: string[];
}

export type ConditionSeverity = 'critical' | 'significant' | 'managed' | 'resolved';

export interface Condition {
  id: string;
  name: SourcedFact;
  /** ICD-10 where the source document carried a code. */
  code?: string;
  severity: ConditionSeverity;
  diagnosedOn: ISODate;
  status: 'active' | 'resolved' | 'in-remission';
  /** Latest relevant control marker, e.g. "HbA1c 7.4%". */
  controlMarker?: SourcedFact;
  notes?: string;
}

export type AllergySeverity = 'anaphylaxis' | 'severe' | 'moderate' | 'mild';

export interface Allergy {
  id: string;
  substance: SourcedFact;
  reaction: SourcedFact;
  severity: AllergySeverity;
  /** Drug class, so cross-reactive agents can be flagged to the clinician. */
  drugClass?: string;
  /** Related agents a clinician should be aware of. Informational only. */
  crossReactive?: string[];
  recordedOn: ISODate;
}

export interface Procedure {
  id: string;
  name: SourcedFact;
  kind: 'surgery' | 'intervention' | 'diagnostic';
  performedOn: ISODate;
  facility: string;
  surgeon?: string;
  outcome?: string;
  /** Implanted hardware matters enormously in emergency imaging decisions. */
  implants?: string[];
}

export interface Hospitalisation {
  id: string;
  reason: SourcedFact;
  facility: string;
  admittedOn: ISODate;
  dischargedOn: ISODate;
  lengthOfStayDays: number;
  department: string;
  /** Flagged as major history for the emergency snapshot. */
  major: boolean;
  summary: string;
}

export interface LabResult {
  id: string;
  analyte: string;
  value: number;
  unit: string;
  referenceLow: number;
  referenceHigh: number;
  takenOn: ISODate;
  evidenceId: EvidenceId;
  flag: 'low' | 'normal' | 'high' | 'critical';
}

export interface LabTrend {
  analyte: string;
  unit: string;
  referenceLow: number;
  referenceHigh: number;
  /** Chronological, oldest first. */
  series: LabResult[];
  /** Direction over the observed window. */
  direction: 'improving' | 'worsening' | 'stable';
}

/* --- Patient ---------------------------------------------------------------- */

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface EmergencyContact {
  name: string;
  relationship: string;
  /** Masked for display; revealed only inside an authorised emergency session. */
  phoneMasked: string;
  phone: string;
  isCaregiver: boolean;
}

export type IdentityMethod = 'abha-linked' | 'govt-id' | 'biometric' | 'hospital-mrn' | 'unverified';

export interface Patient {
  id: PatientId;
  fullName: string;
  /** Abbreviated form used on clinician-facing surfaces. */
  displayName: string;
  dateOfBirth: ISODate;
  age: number;
  sex: 'Female' | 'Male' | 'Other';
  bloodGroup: SourcedFact<BloodGroup>;
  /** Masked national health id. */
  abhaMasked: string;
  identityVerified: boolean;
  identityMethods: IdentityMethod[];
  photoInitials: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContacts: EmergencyContact[];
  /** Free-text directive surfaced in emergency mode when present. */
  advanceDirective?: string;
  organDonor: boolean;
  primaryPhysician: string;
  /** Percent of the longitudinal profile populated from linked sources. */
  profileCompleteness: number;
  /** Days since the most recent source document. */
  sourceFreshnessDays: number;
}

/* --- Reconciliation & conflicts --------------------------------------------- */

export type ConflictKind = 'dose-mismatch' | 'duplicate-entry' | 'status-contradiction' | 'date-ambiguity';

export interface ConflictClaim {
  label: string;
  value: string;
  evidenceId: EvidenceId;
  documentId: DocumentId;
  documentDate: ISODate;
  confidence: Confidence;
}

/**
 * Where sources disagree, VITA presents both and stops.
 * There is deliberately no automatic winner - the system does not choose.
 */
export interface Conflict {
  id: ConflictId;
  kind: ConflictKind;
  subject: string;
  /** Always >= 2. */
  claims: ConflictClaim[];
  detectedOn: ISODate;
  /** Why this matters clinically, in neutral language. */
  clinicalRelevance: string;
  status: 'awaiting-verification' | 'clinician-verified';
  resolvedBy?: string;
  resolvedValue?: string;
  resolvedOn?: ISODate;
}

/* --- Timeline --------------------------------------------------------------- */

export type HealthEventKind =
  | 'medication-change'
  | 'medication-start'
  | 'diagnosis'
  | 'admission'
  | 'procedure'
  | 'lab'
  | 'consultation'
  | 'immunisation'
  | 'document';

export interface HealthEvent {
  id: string;
  date: ISODate;
  kind: HealthEventKind;
  title: string;
  detail: string;
  /** Emergency snapshot pulls only `major` events into "major history". */
  major: boolean;
  facility?: string;
  evidenceId?: EvidenceId;
  /** Related entity ids - this is what makes the timeline a graph, not a list. */
  links?: { medications?: string[]; conditions?: string[]; documents?: DocumentId[] };
}

/* --- Consent & audit -------------------------------------------------------- */

export type ConsentScope =
  | 'emergency-context'
  | 'full-record'
  | 'medications-only'
  | 'labs-only'
  | 'care-coordination';

export type GranteeRole = 'clinician' | 'caregiver' | 'facility' | 'specialist';

export interface ConsentGrant {
  id: string;
  granteeName: string;
  granteeRole: GranteeRole;
  organisation: string;
  scope: ConsentScope;
  /** Plain-language justification recorded at grant time. */
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  /** Human-readable list of what this grant exposes. */
  visibleData: string[];
  /** What this grant explicitly does NOT expose. */
  withheldData: string[];
  /** 'break-glass' = emergency override, auto-notified to the patient. */
  basis: 'patient-granted' | 'break-glass' | 'caregiver-delegated';
}

export type AuditAction =
  | 'emergency-access'
  | 'profile-view'
  | 'medication-view'
  | 'document-open'
  | 'evidence-view'
  | 'consent-grant'
  | 'consent-revoke'
  | 'identity-verify'
  | 'conflict-verify'
  | 'export';

export interface AuditEvent {
  id: string;
  /** "HH:MM:SS" - emergency timelines are read in seconds, not dates. */
  time: string;
  date: ISODate;
  action: AuditAction;
  actor: string;
  actorRole: GranteeRole | 'patient' | 'system';
  organisation?: string;
  detail: string;
  /** Consent grant that authorised this action. Absent = system event. */
  consentId?: string;
  ipHint?: string;
}

/* --- AI pipeline ------------------------------------------------------------ */

export type PipelineStageId = 'ingest' | 'extract' | 'reconcile' | 'graph' | 'synthesise';

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  /** What this stage actually does - shown to the user, no hand-waving. */
  description: string;
  /** Concrete, countable outputs. */
  outputs: string[];
  durationMs: number;
}

export interface AIExtraction {
  id: string;
  documentId: DocumentId;
  entityType: 'medication' | 'dosage' | 'condition' | 'allergy' | 'procedure' | 'date' | 'lab-value' | 'vital';
  surfaceForm: string;
  normalised: string;
  confidence: Confidence;
  page: number;
  /** Standard terminology binding where one was resolved. */
  coding?: { system: 'RxNorm' | 'SNOMED-CT' | 'LOINC' | 'ICD-10'; code: string };
}

/** The reduced, decision-relevant view assembled for an emergency encounter. */
export interface EmergencySnapshot {
  patientId: PatientId;
  generatedAt: string;
  /** Life-threatening items. Rendered first, always. */
  critical: Allergy[];
  bloodGroup: SourcedFact<BloodGroup>;
  activeMedications: Medication[];
  activeConditions: Condition[];
  majorHistory: HealthEvent[];
  recentChanges: HealthEvent[];
  openConflicts: Conflict[];
  sourceFreshnessDays: number;
  /** Number of source documents this snapshot draws on. */
  sourceCount: number;
  contacts: EmergencyContact[];
  implants: string[];
}
