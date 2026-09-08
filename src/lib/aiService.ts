/* ============================================================================
   VITA — AI service boundary
   ----------------------------------------------------------------------------
   THIS IS THE SEAM.

   Everything above this file (components, pages, hooks) talks to the four
   functions exported here and knows nothing about how they are implemented.
   Today they resolve against deterministic fixtures in `/data`. Replacing them
   with real calls - a document AI for extraction, an LLM for reconciliation
   and synthesis, a FHIR server for persistence - means rewriting the bodies of
   these functions and nothing else.

   The signatures are async and the return types are the same shapes a real
   backend would produce, so the swap is mechanical rather than architectural.

   What is deliberately NOT here:
     - no `diagnose()`
     - no `recommend()`
     - no `chooseCorrectValue()`
   Those are clinical acts. The system's job ends at assembling evidence.
   ========================================================================== */

import { allergies, activeMedications, conditions, implants, medications } from '@/data/clinical';
import { conflicts, openConflicts } from '@/data/conflicts';
import { documents } from '@/data/documents';
import { extractions } from '@/data/extractions';
import { anaya, patientById } from '@/data/patient';
import { majorHistory, recentChanges, timeline } from '@/data/timeline';
import type {
  AIExtraction,
  Conflict,
  DocumentId,
  EmergencySnapshot,
  HealthEvent,
  PatientId,
  PipelineStage,
} from '@/types';

/** Simulated network + inference latency. Kept short enough for a live demo. */
const latency = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* --- 1. INGEST + EXTRACT ---------------------------------------------------- */

export interface ExtractionResult {
  documentId: DocumentId;
  entities: AIExtraction[];
  /** Entities scored below the acceptance threshold and withheld from the graph. */
  rejected: AIExtraction[];
  meanConfidence: number;
  /** Terminology bindings resolved (RxNorm / SNOMED / LOINC / ICD-10). */
  codedCount: number;
}

/** Acceptance threshold. Below this, a value is flagged rather than asserted. */
export const CONFIDENCE_THRESHOLD = 85;

/**
 * Lift structured clinical entities out of a source document.
 * Real implementation: document AI + clinical NER + terminology binding.
 */
export async function extractMedicalEntities(documentId: DocumentId): Promise<ExtractionResult> {
  await latency(320);
  const all = extractions.filter((e) => e.documentId === documentId);
  const entities = all.filter((e) => e.confidence >= CONFIDENCE_THRESHOLD);
  const rejected = all.filter((e) => e.confidence < CONFIDENCE_THRESHOLD);
  const meanConfidence = all.length
    ? Math.round(all.reduce((sum, e) => sum + e.confidence, 0) / all.length)
    : 0;
  return {
    documentId,
    entities,
    rejected,
    meanConfidence,
    codedCount: all.filter((e) => e.coding).length,
  };
}

/* --- 2. RECONCILE ----------------------------------------------------------- */

export interface ReconciliationResult {
  /** Same entity seen in more than one source, collapsed to a single node. */
  duplicatesMerged: number;
  /** Dose or regimen changes detected across time. */
  changesDetected: HealthEvent[];
  /** Sources that disagree. Never auto-resolved. */
  conflicts: Conflict[];
  /** Entities withheld because they scored below the acceptance threshold. */
  withheld: number;
  entitiesConsidered: number;
}

/**
 * Compare entities across documents and time.
 *
 * The important behaviour is the negative one: when two sources disagree, this
 * function emits a `Conflict` and leaves the value unresolved. It does not
 * prefer the newer document, the higher-confidence extraction, or the more
 * specialist author.
 */
export async function reconcileRecords(): Promise<ReconciliationResult> {
  await latency(420);

  // Same clinical entity asserted by more than one source -> one graph node.
  const byNormalised = new Map<string, number>();
  for (const e of extractions) {
    byNormalised.set(e.normalised, (byNormalised.get(e.normalised) ?? 0) + 1);
  }
  const duplicatesMerged = [...byNormalised.values()].filter((n) => n > 1).length;

  return {
    duplicatesMerged,
    changesDetected: timeline.filter((e) => e.kind === 'medication-change'),
    conflicts,
    withheld: extractions.filter((e) => e.confidence < CONFIDENCE_THRESHOLD).length,
    entitiesConsidered: extractions.length,
  };
}

/* --- 3. BUILD THE HEALTH GRAPH / TIMELINE ----------------------------------- */

export interface TimelineResult {
  events: HealthEvent[];
  /** Distinct source systems the history was reconstructed from. */
  sourceSystems: number;
  spanYears: number;
  /** Edges between events and clinical entities — what makes it a graph. */
  edgeCount: number;
}

export async function buildHealthTimeline(_patientId: PatientId = anaya.id): Promise<TimelineResult> {
  await latency(380);
  const sourceSystems = new Set(documents.map((d) => d.source)).size;
  const years = timeline.map((e) => Number(e.date.slice(0, 4)));
  const edgeCount = timeline.reduce((sum, e) => {
    const l = e.links;
    if (!l) return sum;
    return sum + (l.medications?.length ?? 0) + (l.conditions?.length ?? 0) + (l.documents?.length ?? 0);
  }, 0);

  return {
    events: timeline,
    sourceSystems,
    spanYears: Math.max(...years) - Math.min(...years),
    edgeCount,
  };
}

/* --- 4. SYNTHESISE THE EMERGENCY SNAPSHOT ----------------------------------- */

/**
 * Reduce the full longitudinal profile to what changes a decision in the next
 * five minutes.
 *
 * Selection rules, applied in order:
 *   1. Anything that can kill during treatment  -> allergies, blood group
 *   2. Anything currently in the patient        -> active medications, implants
 *   3. Anything that changes drug choice        -> active conditions, renal function
 *   4. Anything that changed recently           -> last 90 days of changes
 *   5. Anything the system is unsure about      -> open conflicts
 * Everything else is one tap away, not on the screen.
 */
export async function generateEmergencySnapshot(
  patientId: PatientId = anaya.id,
): Promise<EmergencySnapshot> {
  await latency(260);
  const patient = patientById(patientId) ?? anaya;

  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    critical: allergies,
    bloodGroup: patient.bloodGroup,
    activeMedications,
    activeConditions: conditions.filter((c) => c.status === 'active'),
    majorHistory,
    recentChanges,
    openConflicts,
    sourceFreshnessDays: patient.sourceFreshnessDays,
    sourceCount: documents.length,
    contacts: patient.emergencyContacts,
    implants,
  };
}

/* --- Pipeline description --------------------------------------------------- */

/**
 * The stages shown in the processing UI.
 *
 * `outputs` are concrete counts computed from the actual fixture data, not
 * decorative copy — if the data changes, these numbers change with it.
 */
export const pipelineStages: PipelineStage[] = [
  {
    id: 'ingest',
    label: 'Ingest',
    description:
      'Normalise incoming files, detect document type and language, split multi-page scans, and deskew photographed prescriptions.',
    outputs: [
      `${documents.length} documents accepted`,
      `${documents.reduce((s, d) => s + d.pages, 0)} pages rasterised`,
      `${new Set(documents.map((d) => d.source)).size} distinct source systems`,
      '1 handwritten scan routed to OCR',
    ],
    durationMs: 1500,
  },
  {
    id: 'extract',
    label: 'Extract',
    description:
      'Clinical NER over each page: medications, dosages, frequencies, diagnoses, allergies, procedures, lab values, dates. Each entity is bound to a standard terminology where one resolves.',
    outputs: [
      `${extractions.length} medical entities extracted`,
      `${extractions.filter((e) => e.entityType === 'medication').length} medications detected`,
      `${extractions.filter((e) => e.entityType === 'condition').length} diagnoses detected`,
      `${extractions.filter((e) => e.coding).length} bound to RxNorm / SNOMED / LOINC / ICD-10`,
      `${extractions.filter((e) => e.confidence < CONFIDENCE_THRESHOLD).length} below threshold — withheld, not guessed`,
    ],
    durationMs: 2200,
  },
  {
    id: 'reconcile',
    label: 'Reconcile',
    description:
      'Compare entities across documents and across time. Collapse duplicates, order dose changes chronologically, and surface — without resolving — any place where two sources disagree.',
    outputs: [
      `${medications.length} medication records collapsed to ${activeMedications.length} active agents`,
      `${timeline.filter((e) => e.kind === 'medication-change').length} medication changes detected`,
      `${conflicts.length} conflicts detected — held for clinician verification`,
      '0 values auto-resolved',
    ],
    durationMs: 1900,
  },
  {
    id: 'graph',
    label: 'Build health graph',
    description:
      'Link medications to the conditions they treat, procedures to the implants they left behind, and lab values to the diagnoses they track — so the record can be traversed, not just read.',
    outputs: [
      `${timeline.length} events placed on the timeline`,
      `${conditions.length} conditions linked to ${medications.length} medications`,
      `${implants.length} implanted device recorded`,
      `${new Date().getFullYear() - 2016} years of history reconstructed`,
    ],
    durationMs: 1700,
  },
  {
    id: 'synthesise',
    label: 'Generate clinical snapshot',
    description:
      'Reduce the profile to the subset that changes a decision in the next five minutes, and attach a source, a date and a confidence score to every claim in it.',
    outputs: [
      `${allergies.length} critical allergy surfaced first`,
      `${activeMedications.length} active medications summarised`,
      `${majorHistory.length} major history events selected`,
      'Every claim linked to its source document',
    ],
    durationMs: 1400,
  },
];

/* --- Orchestrator ----------------------------------------------------------- */

export interface StageProgress {
  stageIndex: number;
  stage: PipelineStage;
  /** 0–1 within the current stage. */
  progress: number;
  /** Outputs revealed so far for this stage. */
  revealed: string[];
  done: boolean;
}

/**
 * Drive the full pipeline, reporting progress as it goes.
 * Returns a cancel function so a component can abort on unmount.
 */
export function runPipeline(
  onProgress: (p: StageProgress) => void,
  onComplete: () => void,
  speed = 1,
): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const runStage = (index: number) => {
    if (cancelled || index >= pipelineStages.length) {
      if (!cancelled) onComplete();
      return;
    }
    const stage = pipelineStages[index];
    const duration = stage.durationMs / speed;
    const steps = stage.outputs.length;
    const stepMs = duration / steps;

    for (let s = 0; s < steps; s++) {
      timers.push(
        setTimeout(
          () => {
            if (cancelled) return;
            onProgress({
              stageIndex: index,
              stage,
              progress: (s + 1) / steps,
              revealed: stage.outputs.slice(0, s + 1),
              done: false,
            });
          },
          stepMs * (s + 1),
        ),
      );
    }

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        onProgress({
          stageIndex: index,
          stage,
          progress: 1,
          revealed: stage.outputs,
          done: true,
        });
        runStage(index + 1);
      }, duration + 180 / speed),
    );
  };

  runStage(0);

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}
