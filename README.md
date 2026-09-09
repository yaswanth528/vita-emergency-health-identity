# PULSE — Emergency Health Identity Layer

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

**What PULSE does.** Ingests fragmented records, extracts structured clinical entities, reconciles
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

Two prescriptions disagree about the atorvastatin dose — 10 mg in May, 20 mg in August. PULSE
shows both and stops. There is no recency rule, no confidence tie-break, no
specialist-authority heuristic, and deliberately no `resolvedValue` produced by the system.
A clinician records the decision, and their name goes on it in the audit trail.

### The audit trail is live

Opening evidence, opening a source document and verifying a conflict all append to the audit log
in real time. By the time you reach the consent page in the guided demo, it contains a record of
the demo you just ran — not a fixture pretending to be a system.

---

## Two connected sides

Patients and clinicians get **different products over one record**. Not one dashboard that
branches on a flag — different shells, different navigation, different permitted actions.

| | Patient `/app/*` | Clinician `/clinician/*` |
|---|---|---|
| Opens on | "Is my record in order, and who can see it?" | "Who needs me right now?" |
| Can | Approve · decline · revoke · activate emergency | Search · request · break glass with a reason |
| Cannot | See other patients | Approve their own request, extend a grant, or see a withheld category |
| Tone | Calm, personal | Dense, fast, action-ordered |

The asymmetry is enforced in the route tree and the store, not by hiding buttons. There is no
action anywhere in the model by which a clinician overrides a patient's decision — the nearest
thing is break-glass, which demands a written reason, expires in two hours, and notifies the
patient the moment it fires.

### The connected demo

The **Guided demo** button drives the real store, so each step genuinely causes the next:

1. Patient signs in — emergency profile ready, one request pending
2. She presses **Emergency** → confirmation states what it does *and does not* do → alarm raised, **nothing released**
3. Switch to clinician — the alert is already there, ticking. Same object, not a second mock
4. **Open Emergency Mode** → break-glass gate, disabled until a reason is typed
5. Emergency context: PENICILLIN, blood group, 4 medications, conditions, major history
6. Any claim → evidence drawer with source, page, date, confidence
7. Conflicting statin doses → both shown, neither chosen
8. Switch back to the patient — *"Dr. Arjun Rao accessed your emergency health context"*, with his reason and the expiry
9. Consent page — the break-glass grant is live, revocable, and the audit trail holds the reads from the other side

The non-emergency path matters too: a clinician requests **medication verification**, the patient
approves on her own screen, and a scoped 72-hour grant appears for both parties. Emergency Mode is
the wedge; longitudinal context is the platform.

## Screens

| Route | What it is |
|---|---|
| `/` | Landing — problem → insight → architecture → AI → trust → emergency → vision |
| `/login` | Role selection · demo mode |
| `/register/patient` · `/register/clinician` | Two genuinely different registrations — a health identity vs a professional credential |
| `/emergency` · `/emergency/:id` | **Emergency Mode** — dark, one dominant fact, outside both shells |
| **Patient** | |
| `/app/dashboard` | Overview — status, emergency control, connected care, live activity |
| `/app/profile` · `/app/medications` · `/app/timeline` | The longitudinal record |
| `/app/emergency-profile` | Exactly what a clinician sees, and what stays withheld |
| `/app/documents[/:id]` · `/app/ingest` | Sources and the AI pipeline |
| `/app/requests` | The only screen where an access decision can be made |
| `/app/consent` · `/app/notifications` · `/app/caregiver` · `/app/settings` | Trust controls |
| **Clinician** | |
| `/clinician` | Overview — emergencies, unlinked arrivals, connected patients, requests |
| `/clinician/patients[/:id]` | Registry and clinical snapshot |
| `/clinician/emergency` | Live alert board |
| `/clinician/requests` | What was asked, what was granted — no approve buttons |
| `/clinician/new-patient` | Search before creating; invite if genuinely absent |
| `/clinician/audit` · `/clinician/settings` | The log, and this account's limits |

The registry is deliberately not uniform. Of four patients: one is fully linked, one has no
standing grant and needs break-glass, one has an almost-empty profile, and one cannot be released
at all because their identity is unverified. A demo where every record is perfect proves nothing
about the system's judgement.

## Architecture

```
src/
  components/
    ui/          Button Card Badge Stat Tabs Progress SectionHeader …
    evidence/    EvidenceBadge ConfidenceMeter EvidenceDrawer (evidence + conflict modes)
    clinical/    AllergyAlert MedicationCard ConditionCard LabTrendCard Timeline HealthGraph
    system/      AIProcessing ConsentPanel AuditLog DemoGuide Wordmark
  layouts/       AppShell (patient) · ClinicianShell
  pages/         one file per route; patient/ and clinician/ subtrees
  data/          patient · clinical · documents · evidence · extractions
                 conflicts · timeline · consent (+ audit) · platform
  hooks/         useVita — one store: session, consent, requests,
                 emergencies, notifications, audit, evidence viewer
  lib/           aiService · format · elapsed · utils
  types/         index (clinical model) · platform (who may see it)
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
- **Colour is a signal channel.** The brand mark is green and red, and rather than scattering
  those two colours as decoration each is bound to a meaning and used only there: brand green
  (`#0B6B3A`) means *verified*, so it appears on every clinician-verified claim; brand red
  (`#DD2027`) means *critical*, so it appears on allergies and the emergency rule and almost
  nowhere else. Amber means "a human needs to look at this". Structure stays midnight ink;
  interaction stays blue. The product reads as branded because green and red are everywhere —
  but always because they mean something.
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
