# VITA — Emergency Health Identity Layer

> **When the patient can't speak, their history still can.**

A consent-driven health identity layer that gives authorised clinicians the right patient
context at the exact moment it matters — with every clinical claim traceable to the document,
page, date and confidence it came from.

This is a working prototype. All patient data is synthetic.

---

## Run it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. A **Guided demo** button sits in the bottom-left of every
screen and walks the full nine-step story in about two minutes.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Stack: React 19 · TypeScript · Vite · Tailwind v4 · react-router · framer-motion.

---

## The argument

**The problem.** A 58-year-old arrives unconscious. Her penicillin anaphylaxis is in a 2019
record at a hospital across town. Her current statin dose is on a prescription in her handbag.
Her coronary stent is in a PDF nobody at this hospital can open. None of it is missing. All of
it is unreachable.

**The insight.** Right now the patient is the integration layer. Every system assumes someone
conscious, articulate and well enough to remember their own dose — an assumption that fails in
exactly the moment the information matters most.

**What VITA does.** Ingests fragmented records, extracts structured clinical entities, reconciles
them across sources and time, and assembles the reduced snapshot a clinician can read in ten
seconds. It does not diagnose, recommend treatment, or alter a medication record.

---

## What makes this more than a PDF summariser

| | |
|---|---|
| **Structure** | 41 typed entities extracted from 8 documents, bound to RxNorm / SNOMED-CT / LOINC / ICD-10 |
| **Reconciliation** | 6 medication records collapsed into 4 active agents; 2 dose changes ordered over time |
| **Provenance** | 35 evidence links — every clinical value resolves to a document, page, excerpt and confidence |
| **Restraint** | 2 conflicts surfaced and held for clinician verification · **0 values auto-resolved** · 2 low-confidence extractions withheld from the health graph rather than guessed |

### Provenance is a type constraint, not a convention

Every medically-actionable value in the domain model is a `SourcedFact`, which cannot be
constructed without an evidence reference:

```ts
interface SourcedFact<T = string> {
  value: T;
  evidenceId: EvidenceId;      // required — this is the trust guarantee
  confidence: Confidence;
  state: VerificationState;    // 'source-backed' | 'clinician-verified' | 'conflicted' | …
  conflictId?: ConflictId;
}
```

UI components accept `SourcedFact`, not `string`. It is structurally impossible to render an
AI-derived medical claim in this interface without also being able to show where it came from.

### Conflicts are the output, not a failure

Two prescriptions disagree about the atorvastatin dose — 10 mg in May, 20 mg in August. VITA
shows both and stops. There is no recency rule, no confidence tie-break, no
specialist-authority heuristic, and deliberately no `resolvedValue` produced by the system.
A clinician records the decision, and their name goes on it in the audit trail.

### The audit trail is live

Opening evidence, opening a source document and verifying a conflict all append to the audit log
in real time. By the time you reach the consent page in the guided demo, it contains a record of
the demo you just ran — not a fixture pretending to be a system.

---

## Screens

Emergency Mode is the centre of the product. It deliberately does not live inside the
application shell, because a clinician in an emergency has no use for navigation.

| Route | What it is |
|---|---|
| `/` | Landing — problem → insight → architecture → AI → trust → emergency → vision |
| `/emergency` | Identify → verify (the 00:00 / 00:05 / 00:10 / 00:30 beats, as real gates) |
| `/emergency/:id` | **Emergency Mode** — dark, one dominant fact, everything one tap from its source |
| `/clinician` | Clinician workspace — patient lookup and authorisation state |
| `/clinician/:id` | Clinical snapshot with full conflict treatment |
| `/app/dashboard` | Patient dashboard |
| `/app/profile` | Health profile + health graph (conditions ↔ medications) |
| `/app/documents[/:id]` | Document centre; original page beside its extraction |
| `/app/ingest` | AI pipeline: Ingest → Extract → Reconcile → Graph → Snapshot |
| `/app/timeline` | Longitudinal history, 2016–2026, reconstructed from 8 sources |
| `/app/consent` | Consent grants, break-glass, live audit trail |
| `/app/caregiver` | Caregiver mode — scoped access, can share emergency context |
| `/app/settings` | Security posture and the explicit list of what is *not* built |
| `/login` | Role selection (clinician · patient · caregiver) |

The registry is deliberately not uniform. Of four patients: one is fully linked, one has no
standing grant and needs break-glass, one has an almost-empty profile, and one cannot be released
at all because their identity is unverified. A demo where every record is perfect proves nothing
about the system's judgement.

---

## Architecture

```
src/
  components/
    ui/          Button Card Badge Stat Tabs Progress SectionHeader …
    evidence/    EvidenceBadge ConfidenceMeter EvidenceDrawer (evidence + conflict modes)
    clinical/    AllergyAlert MedicationCard ConditionCard LabTrendCard Timeline HealthGraph
    system/      AIProcessing ConsentPanel AuditLog DemoGuide Wordmark
  layouts/       AppShell (sidebar + page frame)
  pages/         one file per route
  data/          patient · clinical · documents · evidence · extractions
                 conflicts · timeline · consent (+ audit)
  hooks/         useVita — evidence drawer, live audit, conflict verification
  lib/           aiService · format · utils
  types/         the domain model
```

### The AI seam

Everything above `src/lib/aiService.ts` talks to four functions and knows nothing about how they
are implemented:

```ts
extractMedicalEntities(documentId)   → entities, rejected, meanConfidence, codedCount
reconcileRecords()                   → duplicatesMerged, changesDetected, conflicts, withheld
buildHealthTimeline(patientId)       → events, sourceSystems, spanYears, edgeCount
generateEmergencySnapshot(patientId) → the decision-relevant subset
```

They are `async` and return the shapes a real backend would produce. Swapping the deterministic
fixtures for a document AI, an LLM reconciliation pass and a FHIR server means rewriting four
function bodies — not the application.

There is deliberately no `diagnose()`, no `recommend()`, and no `chooseCorrectValue()`.

---

## Design notes

- **Two surfaces.** Warm-white application (`#FBFAF7`) and near-black emergency surface
  (`#05080F`). Every primitive takes a `surface` prop rather than maintaining two component sets.
- **Colour is a signal channel.** Critical red appears on allergies and the emergency rule and
  almost nowhere else. Amber means "a human needs to look at this". Green means verified.
- **The allergy is set at 46px** because nothing else on that screen is allowed to compete
  with it.
- **IBM Plex Mono** carries provenance — timestamps, confidence, document ids, codes — so
  evidence reads as instrumentation rather than decoration.
- **Absence is stated, never implied.** An empty section says "none recorded", because "nothing
  shown" and "nothing exists" are different claims and only one of them is safe.

---

## Not built (architected for, deliberately out of scope)

Live ABDM integration · hospital HIS/EMR write-back · production authentication · pharmacy and
insurance feeds · encryption-at-rest and key management · real clinical decision support.

These are listed in the app itself, on `/app/settings`. A healthcare prototype that advertises
only its capabilities is making a claim it cannot cash.

---

**Prototype · synthetic patient data · not for clinical use.**
