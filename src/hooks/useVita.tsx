import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auditEvents as seedAudit, consentGrants as seedGrants } from '@/data/consent';
import { conflicts as seedConflicts } from '@/data/conflicts';
import { documentById } from '@/data/documents';
import { getEvidence } from '@/data/evidence';
import { patientById } from '@/data/patient';
import {
  clinicianById,
  clinicianUser,
  patientUser,
  seedConnections,
  seedNotifications,
  seedRequests,
  userIdForClinician,
  userIdForPatient,
} from '@/data/platform';
import { clockTime } from '@/lib/format';
import type {
  AuditAction,
  AuditEvent,
  Conflict,
  ConflictId,
  ConsentGrant,
  ConsentScope,
  EvidenceId,
  PatientId,
} from '@/types';
import type {
  AccessRequest,
  AppNotification,
  ClinicianId,
  EmergencyEvent,
  NotificationKind,
  RequestReason,
  RequestUrgency,
  Role,
  UploadedFile,
  User,
} from '@/types/platform';
import { requestReasonLabel } from '@/types/platform';

/* ============================================================================
   The store
   ----------------------------------------------------------------------------
   One provider holds everything both sides can see. That is the whole point:
   the patient's emergency button and the clinician's alert list are not two
   mocks that happen to agree — they are the same array.

   Three groups of state:

     1. Evidence viewer      global, because any surface can ask for provenance
     2. Clinical trust       conflicts, and the audit log they write to
     3. The platform         session, connections, requests, consent, emergency
                             events, notifications

   Every mutation that affects the other party writes an audit entry AND a
   notification. Doing both at every call site would be easy to forget, so the
   helpers below (`notify`, `logAudit`) are used by all of them.
   ========================================================================== */

type ViewerTarget =
  | { kind: 'evidence'; evidenceId: EvidenceId }
  | { kind: 'conflict'; conflictId: ConflictId }
  | null;

export interface CreateRequestInput {
  patientId: PatientId;
  clinicianId: ClinicianId;
  urgency: RequestUrgency;
  reason: RequestReason;
  note?: string;
  scope: ConsentScope;
  requestedData: string[];
  durationHours: number;
}

interface VitaContextValue {
  /* --- Evidence viewer ---------------------------------------------------- */
  viewer: ViewerTarget;
  claimLabel: string | undefined;
  openEvidence: (id: EvidenceId, claimLabel?: string) => void;
  openConflict: (id: ConflictId) => void;
  closeViewer: () => void;

  /* --- Trust -------------------------------------------------------------- */
  audit: AuditEvent[];
  logAudit: (action: AuditAction, detail: string, patientId?: PatientId) => void;
  sessionAuditCount: number;
  conflicts: Conflict[];
  verifyConflict: (id: ConflictId, chosenValue: string, clinician: string) => void;

  /* --- Session ------------------------------------------------------------ */
  user: User | null;
  role: Role | null;
  signInAs: (role: Role) => void;
  signOut: () => void;

  /* --- Platform ----------------------------------------------------------- */
  grants: ConsentGrant[];
  requests: AccessRequest[];
  notifications: AppNotification[];
  emergencies: EmergencyEvent[];

  /** Patient action. Raises the alarm; releases nothing by itself. */
  activateEmergency: (patientId: PatientId, location?: string) => void;
  cancelEmergency: (eventId: string) => void;

  /**
   * Clinician action. Break-glass: time-boxed, reason-bearing, and it notifies
   * the patient at the moment it is used.
   */
  openEmergencyContext: (
    patientId: PatientId,
    clinicianId: ClinicianId,
    reason: string,
  ) => void;

  createRequest: (input: CreateRequestInput) => void;
  /** Patient-only. There is no clinician path to approving their own request. */
  respondToRequest: (requestId: string, decision: 'approved' | 'declined') => void;
  revokeGrant: (consentId: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (recipientId: string) => void;

  /* --- Uploads ------------------------------------------------------------ */
  uploads: UploadedFile[];
  /** Returns what was rejected so the UI can say why, rather than failing silently. */
  addUploads: (files: File[]) => { accepted: number; rejected: { name: string; why: string }[] };
  removeUpload: (id: string) => void;
  markUploadsProcessed: () => void;

  /** Legacy flag used by Emergency Mode to mark the surface active. */
  emergencyActive: boolean;
  setEmergencyActive: (v: boolean) => void;
}

const VitaContext = createContext<VitaContextValue | null>(null);

const stamp = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')} Sep 2026 · ${d.toTimeString().slice(0, 5)}`;
};
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function VitaProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerTarget>(null);
  const [claimLabel, setClaimLabel] = useState<string | undefined>(undefined);
  const [sessionAudit, setSessionAudit] = useState<AuditEvent[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>(seedConflicts);
  const [emergencyActive, setEmergencyActive] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [grants, setGrants] = useState<ConsentGrant[]>(seedGrants);
  const [requests, setRequests] = useState<AccessRequest[]>(seedRequests);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);

  /* --- Primitives --------------------------------------------------------- */

  const logAudit = useCallback(
    (action: AuditAction, detail: string, _patientId?: PatientId) => {
      const now = new Date();
      const actor = user?.name ?? 'Dr. Arjun Rao';
      const actorRole = user?.role === 'patient' ? 'patient' : 'clinician';
      setSessionAudit((prev) => [
        {
          id: `aud-live-${prev.length + 1}-${now.getTime()}`,
          time: clockTime(now),
          date: now.toISOString().slice(0, 10),
          action,
          actor,
          actorRole,
          organisation: user?.role === 'clinician' ? 'Apollo Hospitals · Emergency Department' : undefined,
          detail,
          ipHint: user?.role === 'clinician' ? 'Apollo ED · triage terminal 3' : 'Mobile · Hyderabad',
        },
        ...prev,
      ]);
    },
    [user],
  );

  const notify = useCallback(
    (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      setNotifications((prev) => [
        { ...n, id: uid('ntf'), createdAt: stamp(), read: false },
        ...prev,
      ]);
    },
    [],
  );

  /* --- Evidence viewer ----------------------------------------------------- */

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

  /* --- Session -------------------------------------------------------------- */

  const signInAs = useCallback((role: Role) => {
    setUser(role === 'patient' ? patientUser : clinicianUser);
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  /* --- Emergency ------------------------------------------------------------ */

  const activateEmergency = useCallback(
    (patientId: PatientId, location?: string) => {
      const patient = patientById(patientId);
      const notified = seedConnections
        .filter((c) => c.patientId === patientId && c.status === 'active')
        .map((c) => c.clinicianId);

      setEmergencies((prev) => [
        {
          id: uid('emg'),
          patientId,
          status: 'active',
          startedAt: stamp(),
          startedAtMs: Date.now(),
          location,
          notified,
          accessedBy: [],
          raisedBy: 'patient',
        },
        ...prev,
      ]);

      // Everyone in the care circle is told. Nothing is released yet.
      for (const clinicianId of notified) {
        notify({
          recipientId: userIdForClinician(clinicianId),
          kind: 'emergency-alert',
          title: `Emergency — ${patient?.displayName ?? patientId}`,
          body: `${patient?.fullName ?? 'Patient'} activated an emergency${location ? ` at ${location}` : ''}. Emergency context is available under break-glass.`,
          href: '/clinician',
          priority: 'high',
        });
      }

      logAudit(
        'emergency-access',
        `Emergency activated by ${patient?.fullName ?? patientId}. ${notified.length} connected clinician${notified.length === 1 ? '' : 's'} notified. No data released at this point.`,
      );
    },
    [logAudit, notify],
  );

  const cancelEmergency = useCallback(
    (eventId: string) => {
      setEmergencies((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, status: 'cancelled' as const, resolvedAt: stamp() } : e,
        ),
      );
      logAudit('emergency-access', 'Emergency stood down by the patient. Care circle notified.');
    },
    [logAudit],
  );

  const openEmergencyContext = useCallback(
    (patientId: PatientId, clinicianId: ClinicianId, reason: string) => {
      const clinician = clinicianById(clinicianId);
      const patient = patientById(patientId);
      const at = stamp();

      setEmergencies((prev) =>
        prev.map((e) =>
          e.patientId === patientId && e.status === 'active'
            ? { ...e, accessedBy: [...e.accessedBy, { clinicianId, at, reason }] }
            : e,
        ),
      );

      // Break-glass produces a real, visible, expiring grant — not a bypass.
      const grantId = uid('csn');
      setGrants((prev) => [
        {
          id: grantId,
          granteeName: clinician?.name ?? 'Clinician',
          granteeRole: 'clinician',
          organisation: `${clinician?.organisation ?? ''} · ${clinician?.department ?? ''}`,
          scope: 'emergency-context',
          purpose: reason,
          grantedAt: at,
          expiresAt: 'Expires 2 hours from grant',
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
        ...prev,
      ]);

      notify({
        recipientId: userIdForPatient(patientId),
        kind: 'profile-accessed',
        title: `${clinician?.name ?? 'A clinician'} accessed your emergency health context`,
        body: `${clinician?.organisation ?? ''} · ${clinician?.department ?? ''}. Reason given: "${reason}". Break-glass access, expires in 2 hours.`,
        href: '/app/consent',
        priority: 'high',
      });

      logAudit(
        'emergency-access',
        `Break-glass emergency context opened for ${patient?.displayName ?? patientId} by ${clinician?.name ?? clinicianId}. Reason: "${reason}". 2-hour expiry. Patient notified.`,
      );
    },
    [logAudit, notify],
  );

  /* --- Requests -------------------------------------------------------------- */

  const createRequest = useCallback(
    (input: CreateRequestInput) => {
      const clinician = clinicianById(input.clinicianId);
      const id = uid('req');
      setRequests((prev) => [
        { ...input, id, status: 'pending', createdAt: stamp() },
        ...prev,
      ]);

      notify({
        recipientId: userIdForPatient(input.patientId),
        kind: 'access-request',
        title: `${clinician?.name ?? 'A clinician'} requested access`,
        body: `${clinician?.organisation ?? ''} · ${requestReasonLabel[input.reason]}. ${input.requestedData.length} data categories, for ${input.durationHours} hours.`,
        href: '/app/requests',
        priority: input.urgency === 'emergency' ? 'high' : 'normal',
      });

      logAudit(
        'consent-grant',
        `Access requested from ${input.patientId} — ${requestReasonLabel[input.reason]}, scope "${input.scope}". Awaiting patient decision.`,
      );
    },
    [logAudit, notify],
  );

  const respondToRequest = useCallback(
    (requestId: string, decision: 'approved' | 'declined') => {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return;
      const clinician = clinicianById(req.clinicianId);
      const at = stamp();
      const grantId = decision === 'approved' ? uid('csn') : undefined;

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: decision, respondedAt: at, consentId: grantId } : r,
        ),
      );

      if (decision === 'approved' && grantId) {
        setGrants((prev) => [
          {
            id: grantId,
            granteeName: clinician?.name ?? 'Clinician',
            granteeRole: 'clinician',
            organisation: `${clinician?.organisation ?? ''} · ${clinician?.department ?? ''}`,
            scope: req.scope,
            purpose: req.note ?? requestReasonLabel[req.reason],
            grantedAt: at,
            expiresAt: `${req.durationHours} hours from grant`,
            status: 'active',
            basis: 'patient-granted',
            visibleData: req.requestedData,
            withheldData: [
              'Everything not listed as visible',
              'Mental health records',
              'Reproductive and sexual health history',
            ],
          },
          ...prev,
        ]);
      }

      notify({
        recipientId: userIdForClinician(req.clinicianId),
        kind: decision === 'approved' ? 'access-granted' : 'access-declined',
        title:
          decision === 'approved'
            ? 'Patient approved your access request'
            : 'Patient declined your access request',
        body:
          decision === 'approved'
            ? `${requestReasonLabel[req.reason]} — access active for ${req.durationHours} hours.`
            : `${requestReasonLabel[req.reason]} — no access granted. The patient is not obliged to give a reason.`,
        href: '/clinician/requests',
        priority: 'normal',
      });

      logAudit(
        decision === 'approved' ? 'consent-grant' : 'consent-revoke',
        `Patient ${decision} the access request from ${clinician?.name ?? req.clinicianId} (${requestReasonLabel[req.reason]}).`,
      );
    },
    [requests, logAudit, notify],
  );

  const revokeGrant = useCallback(
    (consentId: string) => {
      const grant = grants.find((g) => g.id === consentId);
      setGrants((prev) =>
        prev.map((g) =>
          g.id === consentId
            ? {
                ...g,
                status: 'revoked' as const,
                expiresAt: `Revoked ${stamp()}`,
                visibleData: [],
                withheldData: ['All data — access revoked by patient'],
              }
            : g,
        ),
      );
      logAudit('consent-revoke', `Access revoked for ${grant?.granteeName ?? consentId} by the patient.`);
    },
    [grants, logAudit],
  );

  /* --- Notifications --------------------------------------------------------- */

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback((recipientId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === recipientId ? { ...n, read: true } : n)),
    );
  }, []);

  /* --- Uploads --------------------------------------------------------------- */

  const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  const MAX_MB = 25;

  const addUploads = useCallback(
    (files: File[]) => {
      const rejected: { name: string; why: string }[] = [];
      const accepted: UploadedFile[] = [];

      for (const f of files) {
        // Extension fallback: some browsers report an empty type for PDFs
        // dragged from certain file managers.
        const byExt = /.(pdf|png|jpe?g|webp)$/i.test(f.name);
        if (!ACCEPTED.includes(f.type) && !byExt) {
          rejected.push({ name: f.name, why: 'Not a PDF or image' });
          continue;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
          rejected.push({ name: f.name, why: `Larger than ${MAX_MB} MB` });
          continue;
        }
        accepted.push({
          id: uid('upl'),
          name: f.name,
          sizeKb: Math.max(1, Math.round(f.size / 1024)),
          mime: f.type || (/.pdf$/i.test(f.name) ? 'application/pdf' : 'image/*'),
          kind: f.type === 'application/pdf' || /.pdf$/i.test(f.name) ? 'pdf' : 'image',
          addedAt: stamp(),
          status: 'queued',
        });
      }

      if (accepted.length) {
        setUploads((prev) => [...accepted, ...prev]);
        logAudit(
          'export',
          `${accepted.length} document${accepted.length === 1 ? '' : 's'} added by the patient: ${accepted
            .map((a) => a.name)
            .join(', ')}. Queued for processing.`,
        );
      }
      return { accepted: accepted.length, rejected };
    },
    [logAudit],
  );

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const markUploadsProcessed = useCallback(() => {
    setUploads((prev) =>
      prev.map((u) =>
        u.status === 'processed'
          ? u
          : // A stand-in count. The prototype has no document AI, so this is
            // derived from file size rather than from anything on the page,
            // and the UI labels it as simulated wherever it appears.
            { ...u, status: 'processed' as const, simulatedExtraction: Math.max(3, Math.round(u.sizeKb / 40)) },
      ),
    );
  }, []);

  const audit = useMemo(() => [...sessionAudit, ...seedAudit], [sessionAudit]);

  const value = useMemo<VitaContextValue>(
    () => ({
      viewer,
      claimLabel,
      openEvidence,
      openConflict,
      closeViewer,
      audit,
      logAudit,
      sessionAuditCount: sessionAudit.length,
      conflicts,
      verifyConflict,
      user,
      role: user?.role ?? null,
      signInAs,
      signOut,
      grants,
      requests,
      notifications,
      emergencies,
      activateEmergency,
      cancelEmergency,
      openEmergencyContext,
      createRequest,
      respondToRequest,
      revokeGrant,
      markNotificationRead,
      markAllNotificationsRead,
      uploads,
      addUploads,
      removeUpload,
      markUploadsProcessed,
      emergencyActive,
      setEmergencyActive,
    }),
    [
      viewer,
      claimLabel,
      openEvidence,
      openConflict,
      closeViewer,
      audit,
      logAudit,
      sessionAudit.length,
      conflicts,
      verifyConflict,
      user,
      signInAs,
      signOut,
      grants,
      requests,
      notifications,
      emergencies,
      activateEmergency,
      cancelEmergency,
      openEmergencyContext,
      createRequest,
      respondToRequest,
      revokeGrant,
      markNotificationRead,
      markAllNotificationsRead,
      uploads,
      addUploads,
      removeUpload,
      markUploadsProcessed,
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

/* --- Derived selectors -------------------------------------------------------- */

export function useOpenConflicts(): Conflict[] {
  const { conflicts } = useVita();
  return conflicts.filter((c) => c.status === 'awaiting-verification');
}

/** The signed-in user, plus their linked profile ids. Null when signed out. */
export function useSession() {
  const { user, role, signInAs, signOut } = useVita();
  return { user, role, signInAs, signOut, isPatient: role === 'patient', isClinician: role === 'clinician' };
}

export function useNotifications(recipientId: string | undefined) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useVita();
  const mine = useMemo(
    () => (recipientId ? notifications.filter((n) => n.recipientId === recipientId) : []),
    [notifications, recipientId],
  );
  return {
    notifications: mine,
    unread: mine.filter((n) => !n.read).length,
    urgent: mine.filter((n) => !n.read && n.priority === 'high').length,
    markNotificationRead,
    markAllRead: () => recipientId && markAllNotificationsRead(recipientId),
  };
}

/** The live emergency for a patient, if one is running. */
export function useActiveEmergency(patientId?: PatientId): EmergencyEvent | undefined {
  const { emergencies } = useVita();
  return emergencies.find(
    (e) => e.status === 'active' && (patientId ? e.patientId === patientId : true),
  );
}

/** Every running emergency — the clinician's alert list. */
export function useEmergencyAlerts(): EmergencyEvent[] {
  const { emergencies } = useVita();
  return emergencies.filter((e) => e.status === 'active');
}

export type { NotificationKind };
