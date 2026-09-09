import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Ban,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  LogOut,
  Send,
  ShieldCheck,
  Siren,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal } from '@/components/system/EmergencyControls';
import { Badge, Button, Card, FieldLabel, type Tone } from '@/components/ui';
import { clinicianById } from '@/data/platform';
import { patientById } from '@/data/patient';
import { useNotifications, useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';
import type { ConsentScope, PatientId } from '@/types';
import type { AccessRequest, ClinicianId, RequestReason, Role } from '@/types/platform';
import { requestReasonLabel } from '@/types/platform';

/* ============================================================================
   Platform UI shared by both sides
   ----------------------------------------------------------------------------
   The same components render on the patient and clinician surfaces, but the
   affordances differ by role — and that difference is enforced here rather
   than left to each page. A `RequestCard` shown to a clinician has no approve
   button, because approving is not a thing a clinician may do.
   ========================================================================== */

/* --- Notifications ---------------------------------------------------------- */

export function NotificationBell({ recipientId, href }: { recipientId: string; href: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unread, urgent, markNotificationRead, markAllRead } =
    useNotifications(recipientId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative rounded-md p-2 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
      >
        <Bell className="size-4.5" />
        {unread > 0 && (
          <span
            className={cn(
              'absolute right-1 top-1 flex min-w-[15px] items-center justify-center rounded-full px-1 text-[9.5px] font-bold leading-[15px] text-white',
              urgent > 0 ? 'bg-critical-600' : 'bg-ink-900',
            )}
          >
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1.5 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-white shadow-raised"
          >
            <div className="flex items-center justify-between border-b border-line bg-canvas-sunk px-3.5 py-2.5">
              <span className="label-xs text-ink-400">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11.5px] font-medium text-accent-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
              {notifications.length === 0 && (
                <li className="px-4 py-8 text-center text-[13px] text-ink-400">Nothing yet.</li>
              )}
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.href ?? href}
                    onClick={() => {
                      markNotificationRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'block px-3.5 py-3 transition-colors hover:bg-canvas-sunk',
                      !n.read && 'bg-accent-50/50',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          'mt-1 size-1.5 shrink-0 rounded-full',
                          n.priority === 'high'
                            ? 'bg-critical-500'
                            : n.read
                              ? 'bg-ink-200'
                              : 'bg-accent-500',
                        )}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-[13px] leading-snug',
                            n.read ? 'font-medium text-ink-700' : 'font-semibold text-ink-900',
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{n.body}</p>
                        <p className="mt-1 font-mono text-[10.5px] text-ink-400">{n.createdAt}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              to={href}
              onClick={() => setOpen(false)}
              className="block border-t border-line bg-canvas-sunk px-3.5 py-2.5 text-center text-[12.5px] font-medium text-ink-600 hover:text-ink-900"
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Account chip with demo role switch -------------------------------------- */

export function AccountChip({ compact = false }: { compact?: boolean }) {
  const { user, signInAs, signOut } = useVita();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;
  const other: Role = user.role === 'patient' ? 'clinician' : 'patient';
  const initials = user.name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-ink-50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink-900 font-mono text-[11px] font-semibold text-white">
          {initials}
        </span>
        {!compact && (
          <span className="hidden text-left sm:block">
            <span className="block text-[12.5px] font-semibold leading-tight text-ink-900">
              {user.name}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-400">
              {user.role}
            </span>
          </span>
        )}
        <ChevronDown className="size-3.5 shrink-0 text-ink-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1.5 w-[268px] overflow-hidden rounded-lg border border-line bg-white shadow-raised"
          >
            <div className="border-b border-line px-3.5 py-3">
              <p className="text-[13px] font-semibold text-ink-900">{user.name}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-500">{user.email}</p>
            </div>

            <div className="border-b border-line bg-caution-50/60 px-3.5 py-3">
              <div className="label-xs text-caution-600">Demo mode</div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-ink-600">
                Switch sides instantly to see the same events from the other party&apos;s view.
                Session state is shared.
              </p>
              <button
                onClick={() => {
                  signInAs(other);
                  setOpen(false);
                  navigate(other === 'patient' ? '/app/dashboard' : '/clinician');
                }}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line-strong bg-white px-3 py-2 text-[12.5px] font-medium text-ink-800 transition-colors hover:border-ink-300"
              >
                <ArrowLeftRight className="size-3.5" />
                Continue as {other === 'patient' ? 'patient' : 'clinician'}
              </button>
            </div>

            <button
              onClick={() => {
                signOut();
                setOpen(false);
                navigate('/');
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Request card ------------------------------------------------------------- */

const statusTone: Record<AccessRequest['status'], Tone> = {
  pending: 'caution',
  approved: 'verified',
  declined: 'neutral',
  expired: 'neutral',
  revoked: 'critical',
};

export function RequestCard({
  request,
  viewer,
}: {
  request: AccessRequest;
  /** Patients get decision buttons. Clinicians never do. */
  viewer: Role;
}) {
  const { respondToRequest } = useVita();
  const clinician = clinicianById(request.clinicianId);
  const patient = patientById(request.patientId);
  const emergency = request.urgency === 'emergency';
  const pending = request.status === 'pending';

  return (
    <Card
      accent={emergency ? 'critical' : pending ? 'caution' : 'none'}
      className={cn(emergency && 'hatch-caution')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {emergency && (
              <Badge tone="critical">
                <Siren className="size-2.5" />
                Emergency request
              </Badge>
            )}
            <Badge tone={statusTone[request.status]}>{request.status}</Badge>
            <span className="font-mono text-[10.5px] text-ink-400">{request.createdAt}</span>
          </div>

          <h3 className="mt-2 text-[15px] font-semibold text-ink-900">
            {viewer === 'patient' ? clinician?.name : patient?.fullName}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {viewer === 'patient'
              ? `${clinician?.organisation} · ${clinician?.speciality}`
              : `Patient · ${patient?.age} ${patient?.sex.charAt(0)}`}
          </p>

          <dl className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-x-2 text-[12.5px]">
              <dt className="text-ink-500">Reason</dt>
              <dd className="font-medium text-ink-900">{requestReasonLabel[request.reason]}</dd>
            </div>
            {request.note && (
              <p className="rounded-md border-l-2 border-line-strong bg-canvas-sunk px-3 py-2 text-[12.5px] leading-relaxed text-ink-600">
                “{request.note}”
              </p>
            )}
            <div>
              <dt className="label-xs text-ink-400">Requested data</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {request.requestedData.map((d) => (
                  <Badge key={d} tone="neutral">
                    {d}
                  </Badge>
                ))}
              </dd>
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
              <Clock3 className="size-3" />
              If approved, access lasts {request.durationHours} hours and then expires by itself.
            </div>
          </dl>
        </div>

        {/* Only the patient can answer. This asymmetry is the product. */}
        {viewer === 'patient' && pending && (
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Check />}
              onClick={() => respondToRequest(request.id, 'approved')}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Ban />}
              onClick={() => respondToRequest(request.id, 'declined')}
            >
              Decline
            </Button>
          </div>
        )}
        {viewer === 'clinician' && pending && (
          <span className="shrink-0 rounded-md border border-dashed border-line-strong px-3 py-2 text-[11.5px] text-ink-400">
            Awaiting patient
          </span>
        )}
      </div>
    </Card>
  );
}

/* --- Clinician: create a request ---------------------------------------------- */

const SCOPE_PRESETS: {
  reason: RequestReason;
  scope: ConsentScope;
  urgency: 'routine' | 'emergency';
  data: string[];
  hours: number;
}[] = [
  {
    reason: 'emergency-assessment',
    scope: 'emergency-context',
    urgency: 'emergency',
    data: ['Allergies', 'Blood group', 'Active medications', 'Conditions', 'Major history'],
    hours: 2,
  },
  {
    reason: 'urgent-clinical-review',
    scope: 'full-record',
    urgency: 'routine',
    data: ['Longitudinal timeline', 'Source documents', 'Lab trends', 'Medications'],
    hours: 24,
  },
  {
    reason: 'medication-verification',
    scope: 'medications-only',
    urgency: 'routine',
    data: ['Active medication list', 'Recent medication changes', 'Allergies'],
    hours: 72,
  },
  {
    reason: 'general-consultation',
    scope: 'care-coordination',
    urgency: 'routine',
    data: ['Medications', 'Conditions', 'Timeline'],
    hours: 168,
  },
];

export function RequestAccessDialog({
  open,
  onClose,
  patientId,
  patientName,
  clinicianId,
}: {
  open: boolean;
  onClose: () => void;
  patientId: PatientId;
  patientName: string;
  clinicianId: ClinicianId;
}) {
  const { createRequest } = useVita();
  const [idx, setIdx] = useState(2);
  const [note, setNote] = useState('');
  const preset = SCOPE_PRESETS[idx];

  return (
    <Modal open={open} onClose={onClose} labelledBy="req-title">
      <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
        <div>
          <div className="label-xs text-ink-400">Request access</div>
          <h2 id="req-title" className="mt-1 text-[17px] font-semibold text-ink-900">
            Ask {patientName} for access
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cancel"
          className="-mr-1 -mt-1 rounded-md p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-800"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="max-h-[52vh] space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <FieldLabel>Purpose</FieldLabel>
          <div className="mt-2 space-y-1.5">
            {SCOPE_PRESETS.map((p, i) => (
              <button
                key={p.reason}
                onClick={() => setIdx(i)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                  i === idx
                    ? 'border-accent-300 bg-accent-50'
                    : 'border-line bg-white hover:border-ink-200',
                )}
              >
                <span
                  className={cn(
                    'mt-1 size-2 shrink-0 rounded-full',
                    i === idx ? 'bg-accent-500' : 'bg-ink-200',
                  )}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink-900">
                      {requestReasonLabel[p.reason]}
                    </span>
                    {p.urgency === 'emergency' && <Badge tone="critical">Emergency</Badge>}
                    <span className="font-mono text-[10.5px] text-ink-400">{p.hours}h</span>
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-ink-500">
                    {p.data.join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="req-note" className="label-xs text-ink-400">
            Note to the patient · optional but recommended
          </label>
          <textarea
            id="req-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="They will see this exactly as you write it."
            className="mt-2 w-full resize-none rounded-md border border-line-strong bg-white px-3 py-2.5 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas-sunk px-5 py-3.5">
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
          <ShieldCheck className="size-3.5" />
          The patient decides. You cannot approve this yourself.
        </span>
        <Button
          variant="primary"
          icon={<Send />}
          onClick={() => {
            createRequest({
              patientId,
              clinicianId,
              urgency: preset.urgency,
              reason: preset.reason,
              note: note.trim() || undefined,
              scope: preset.scope,
              requestedData: preset.data,
              durationHours: preset.hours,
            });
            setNote('');
            onClose();
          }}
        >
          Send request
        </Button>
      </div>
    </Modal>
  );
}

/* --- Small trust indicators ---------------------------------------------------- */

export function TrustRow({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
          <Check className="size-3 text-verified-500" strokeWidth={2.6} />
          {t}
        </li>
      ))}
    </ul>
  );
}

export function ConnectedClinicianCard({
  clinicianId,
  scope,
  status,
  expires,
  onManage,
}: {
  clinicianId: ClinicianId;
  scope: string;
  status: string;
  expires: string;
  onManage?: () => void;
}) {
  const c = clinicianById(clinicianId);
  if (!c) return null;
  return (
    <Card accent={status === 'active' ? 'verified' : 'none'}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk font-mono text-[11px] font-semibold text-ink-600">
            {c.initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14.5px] font-semibold text-ink-900">{c.name}</h3>
              {c.verified && (
                <Badge tone="verified">
                  <ShieldCheck className="size-2.5" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              {c.speciality} · {c.organisation}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">
                <FileText className="size-2.5" />
                {scope}
              </Badge>
              <Badge tone={status === 'active' ? 'verified' : 'neutral'}>{status}</Badge>
              <span className="font-mono text-[10.5px] text-ink-400">{expires}</span>
            </div>
          </div>
        </div>
        {onManage && (
          <Button variant="secondary" size="sm" onClick={onManage}>
            Manage access
          </Button>
        )}
      </div>
    </Card>
  );
}
