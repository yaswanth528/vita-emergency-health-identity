import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { auditEvents as seedAudit } from '@/data/consent';
import { conflicts as seedConflicts } from '@/data/conflicts';
import { documentById } from '@/data/documents';
import { getEvidence } from '@/data/evidence';
import { clockTime } from '@/lib/format';
import type { AuditAction, AuditEvent, Conflict, ConflictId, EvidenceId } from '@/types';

/* ============================================================================
   Session store
   ----------------------------------------------------------------------------
   Three pieces of state that genuinely belong to the whole application:

   1. The evidence drawer. Any surface can ask to show provenance for a claim,
      so the drawer is global rather than per-page.

   2. The live audit trail. Opening evidence, opening a document and verifying a
      conflict all append here — so the audit page is a real record of what the
      user did in this session, not a static fixture. This is the honest version
      of "auditable": if the log did not react to the demo, it would be a
      screenshot pretending to be a system.

   3. Conflict verification. A clinician can record a decision on a conflict;
      the system still never picks one itself.
   ========================================================================== */

type ViewerTarget =
  | { kind: 'evidence'; evidenceId: EvidenceId }
  | { kind: 'conflict'; conflictId: ConflictId }
  | null;

interface VitaContextValue {
  /* Evidence drawer */
  viewer: ViewerTarget;
  openEvidence: (id: EvidenceId, claimLabel?: string) => void;
  openConflict: (id: ConflictId) => void;
  closeViewer: () => void;
  /** The human-readable claim the drawer was opened from, for context. */
  claimLabel: string | undefined;

  /* Audit */
  audit: AuditEvent[];
  logAudit: (action: AuditAction, detail: string) => void;
  /** Entries created during this browser session, newest first. */
  sessionAuditCount: number;

  /* Conflicts */
  conflicts: Conflict[];
  verifyConflict: (id: ConflictId, chosenValue: string, clinician: string) => void;

  /* Emergency session */
  emergencyActive: boolean;
  setEmergencyActive: (v: boolean) => void;
}

const VitaContext = createContext<VitaContextValue | null>(null);

/** Actor attributed to actions taken in the demo session. */
const ACTOR = { name: 'Dr. Meera Rao', org: 'Apollo Hospitals · Emergency Department' };

export function VitaProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerTarget>(null);
  const [claimLabel, setClaimLabel] = useState<string | undefined>(undefined);
  const [sessionAudit, setSessionAudit] = useState<AuditEvent[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>(seedConflicts);
  const [emergencyActive, setEmergencyActive] = useState(false);

  const logAudit = useCallback((action: AuditAction, detail: string) => {
    const now = new Date();
    setSessionAudit((prev) => [
      {
        id: `aud-live-${prev.length + 1}-${now.getTime()}`,
        time: clockTime(now),
        date: now.toISOString().slice(0, 10),
        action,
        actor: ACTOR.name,
        actorRole: 'clinician',
        organisation: ACTOR.org,
        detail,
        consentId: 'csn-rao-emergency',
        ipHint: 'Apollo ED · triage terminal 3',
      },
      ...prev,
    ]);
  }, []);

  const openEvidence = useCallback(
    (id: EvidenceId, label?: string) => {
      setViewer({ kind: 'evidence', evidenceId: id });
      setClaimLabel(label);
      const ev = getEvidence(id);
      const doc = ev ? documentById(ev.documentId) : undefined;
      logAudit(
        'evidence-view',
        label
          ? `Evidence inspected for claim "${label}"${doc ? ` — ${doc.filename}, page ${ev?.page}` : ''}.`
          : `Evidence inspected${doc ? ` — ${doc.filename}, page ${ev?.page}` : ''}.`,
      );
    },
    [logAudit],
  );

  const openConflict = useCallback(
    (id: ConflictId) => {
      setViewer({ kind: 'conflict', conflictId: id });
      const c = seedConflicts.find((x) => x.id === id);
      setClaimLabel(c?.subject);
      logAudit('evidence-view', `Conflicting records reviewed — ${c?.subject ?? id}.`);
    },
    [logAudit],
  );

  const closeViewer = useCallback(() => {
    setViewer(null);
    setClaimLabel(undefined);
  }, []);

  const verifyConflict = useCallback(
    (id: ConflictId, chosenValue: string, clinician: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'clinician-verified' as const,
                resolvedBy: clinician,
                resolvedValue: chosenValue,
                resolvedOn: new Date().toISOString().slice(0, 10),
              }
            : c,
        ),
      );
      logAudit(
        'conflict-verify',
        `Conflict resolved by clinician — "${chosenValue}" confirmed as the value to act on. Recorded against ${clinician}.`,
      );
    },
    [logAudit],
  );

  const audit = useMemo(() => [...sessionAudit, ...seedAudit], [sessionAudit]);

  const value = useMemo<VitaContextValue>(
    () => ({
      viewer,
      openEvidence,
      openConflict,
      closeViewer,
      claimLabel,
      audit,
      logAudit,
      sessionAuditCount: sessionAudit.length,
      conflicts,
      verifyConflict,
      emergencyActive,
      setEmergencyActive,
    }),
    [
      viewer,
      openEvidence,
      openConflict,
      closeViewer,
      claimLabel,
      audit,
      logAudit,
      sessionAudit.length,
      conflicts,
      verifyConflict,
      emergencyActive,
    ],
  );

  return <VitaContext.Provider value={value}>{children}</VitaContext.Provider>;
}

export function useVita(): VitaContextValue {
  const ctx = useContext(VitaContext);
  if (!ctx) throw new Error('useVita must be used inside <VitaProvider>');
  return ctx;
}

/** Open conflicts, reactive to in-session verification. */
export function useOpenConflicts(): Conflict[] {
  const { conflicts } = useVita();
  return conflicts.filter((c) => c.status === 'awaiting-verification');
}
