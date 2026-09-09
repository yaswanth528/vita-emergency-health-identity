import { CircleAlert, Clock3, MapPin, ShieldCheck, Siren, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, FieldLabel } from '@/components/ui';
import { useActiveEmergency, useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';
import type { PatientId } from '@/types';
import type { ClinicianId } from '@/types/platform';

/* ============================================================================
   Emergency controls
   ----------------------------------------------------------------------------
   Two gates, one on each side, and neither is decoration:

   `EmergencyButton`   the patient's. Confirms before firing, because an
                       accidental press notifies their whole care circle. It
                       raises an alarm — it does not release data.

   `BreakGlassDialog`  the clinician's. Demands a written reason before the
                       emergency context opens, states plainly what is and is
                       not released, and says out loud that the patient is
                       notified. Friction here is the feature.
   ========================================================================== */

/* --- A small modal, shared by both gates ---------------------------------- */

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  /* CSS transitions rather than an AnimatePresence exit: exits in this build do
     not reliably settle, and a break-glass dialog stranded over the emergency
     context would be considerably worse than one that fades plainly. */
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[70] bg-ink-950/50 backdrop-blur-[2px] motion-safe:animate-[vita-rise_0.18s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="fixed left-1/2 top-1/2 z-[71] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-line bg-canvas shadow-raised motion-safe:animate-[vita-rise_0.22s_cubic-bezier(0.22,0.61,0.36,1)]"
      >
        {children}
      </div>
    </>
  );
}

/* --- Patient: the emergency button ----------------------------------------- */

export function EmergencyButton({ patientId }: { patientId: PatientId }) {
  const [open, setOpen] = useState(false);
  const { activateEmergency } = useVita();
  const active = useActiveEmergency(patientId);

  if (active) return <EmergencyActiveCard event={active} />;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-4 rounded-lg border border-critical-300 bg-critical-50 px-5 py-4 text-left transition-colors hover:border-critical-500 hover:bg-critical-100/70"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-critical-600 text-white">
          <Siren className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-critical-700">Emergency</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-critical-600/85">
            Alert your care team and make your emergency context available under your consent
            settings.
          </span>
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="emg-title">
        <div className="border-b border-line bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-critical-50 text-critical-600">
              <CircleAlert className="size-4.5" />
            </span>
            <div>
              <h2 id="emg-title" className="text-[17px] font-semibold text-ink-900">
                Are you in an emergency?
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                This notifies your authorised care team and makes your emergency health context
                available to them, according to your consent settings.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <FieldLabel>What this does and does not do</FieldLabel>
          <ul className="mt-2.5 space-y-2">
            <GateLine tone="ok">Alerts the clinicians already connected to your record.</GateLine>
            <GateLine tone="ok">
              Lets them open your emergency context — allergies, blood group, medications,
              conditions, major history.
            </GateLine>
            <GateLine tone="no">
              Does not open your full record. Mental health and reproductive health stay withheld.
            </GateLine>
            <GateLine tone="no">
              Does not call an ambulance. If you need one, call your local emergency number.
            </GateLine>
            <GateLine tone="ok">
              Every access is logged with the clinician&apos;s name, and you are told the moment it
              happens.
            </GateLine>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas-sunk px-5 py-3.5">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            I&apos;m safe
          </Button>
          <Button
            variant="critical"
            icon={<Siren />}
            onClick={() => {
              activateEmergency(patientId, 'Hyderabad · approximate');
              setOpen(false);
            }}
          >
            Activate emergency
          </Button>
        </div>
      </Modal>
    </>
  );
}

function GateLine({ tone, children }: { tone: 'ok' | 'no'; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-600">
      <span
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          tone === 'ok' ? 'bg-verified-500' : 'bg-ink-300',
        )}
      />
      {children}
    </li>
  );
}

/* --- Patient: the live emergency card --------------------------------------- */

export function EmergencyActiveCard({ event }: { event: ReturnType<typeof useActiveEmergency> }) {
  const { cancelEmergency } = useVita();
  const navigate = useNavigate();
  if (!event) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-critical-300 bg-critical-50">
      <div className="flex items-center gap-2.5 border-b border-critical-100 bg-critical-600 px-5 py-2.5 text-white">
        <span className="size-2 rounded-full bg-white pulse-dot" aria-hidden />
        <span className="label-sm">Emergency active</span>
        <span className="ml-auto font-mono text-[11.5px] opacity-90">{event.startedAt}</span>
      </div>

      <div className="px-5 py-4">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="label-xs flex items-center gap-1 text-critical-600/80">
              <Clock3 className="size-2.5" />
              Started
            </dt>
            <dd className="mt-1 font-mono text-[13px] text-ink-900">{event.startedAt}</dd>
          </div>
          <div>
            <dt className="label-xs flex items-center gap-1 text-critical-600/80">
              <MapPin className="size-2.5" />
              Location
            </dt>
            <dd className="mt-1 text-[13px] text-ink-900">{event.location ?? 'Not shared'}</dd>
          </div>
          <div>
            <dt className="label-xs text-critical-600/80">Care team notified</dt>
            <dd className="mt-1 text-[13px] text-ink-900">
              {event.notified.length} clinician{event.notified.length === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt className="label-xs text-critical-600/80">Context opened by</dt>
            <dd className="mt-1 text-[13px] text-ink-900">
              {event.accessedBy.length === 0
                ? 'Nobody yet'
                : `${event.accessedBy.length} clinician${event.accessedBy.length === 1 ? '' : 's'}`}
            </dd>
          </div>
        </dl>

        {event.accessedBy.length > 0 && (
          <div className="mt-4 rounded-md border border-critical-100 bg-white px-3.5 py-3">
            <FieldLabel>Access during this emergency</FieldLabel>
            <ul className="mt-2 space-y-1.5">
              {event.accessedBy.map((a, i) => (
                <li key={i} className="text-[12.5px] leading-snug text-ink-700">
                  <span className="font-medium">{a.at}</span> — emergency context opened.
                  <span className="text-ink-500"> Reason: “{a.reason}”</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/emergency-profile')}>
            View emergency profile
          </Button>
          <Button variant="ghost" onClick={() => cancelEmergency(event.id)}>
            Cancel emergency
          </Button>
        </div>
      </div>
    </div>
  );
}

/* --- Clinician: break-glass -------------------------------------------------- */

const PRESET_REASONS = [
  'Patient unconscious and unable to provide history.',
  'Patient confused; no accompanying relative or records.',
  'Acute presentation, allergy status required before prescribing.',
  'Suspected overdose; current medication list required urgently.',
];

export function BreakGlassDialog({
  open,
  onClose,
  patientId,
  patientName,
  clinicianId,
  onGranted,
}: {
  open: boolean;
  onClose: () => void;
  patientId: PatientId;
  patientName: string;
  clinicianId: ClinicianId;
  onGranted: () => void;
}) {
  const { openEmergencyContext } = useVita();
  const [reason, setReason] = useState('');

  return (
    <Modal open={open} onClose={onClose} labelledBy="bg-title">
      <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-critical-50 text-critical-600">
            <TriangleAlert className="size-4.5" />
          </span>
          <div>
            <div className="label-xs text-critical-600">Break-glass access</div>
            <h2 id="bg-title" className="mt-1 text-[17px] font-semibold text-ink-900">
              Open emergency context for {patientName}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cancel"
          className="-mr-1 -mt-1 rounded-md p-2 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-800"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
        <div className="hatch-caution rounded-md border border-caution-100 bg-caution-50/60 px-3.5 py-3">
          <p className="text-[12.5px] leading-relaxed text-ink-700">
            This releases a <strong className="font-semibold">restricted emergency subset</strong> —
            allergies, blood group, active medications, conditions, major history and contacts. It
            does not open the full record. Access expires in two hours, is written to the audit
            trail under your name, and the patient is notified immediately.
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="bg-reason" className="label-xs text-ink-400">
            Reason for emergency access · required
          </label>
          <textarea
            id="bg-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why can this patient not consent right now?"
            className="mt-2 w-full resize-none rounded-md border border-line-strong bg-white px-3 py-2.5 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="rounded-sm border border-line bg-white px-2 py-1 text-[11.5px] text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
              >
                {r.replace(/\.$/, '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas-sunk px-5 py-3.5">
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
          <ShieldCheck className="size-3.5" />
          Logged against {clinicianId === 'cl-rao' ? 'Dr. Arjun Rao' : clinicianId}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="critical"
            icon={<Siren />}
            disabled={reason.trim().length < 10}
            onClick={() => {
              openEmergencyContext(patientId, clinicianId, reason.trim());
              onClose();
              onGranted();
            }}
          >
            Confirm emergency access
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* --- Clinician: the alert row ------------------------------------------------- */

export function EmergencyAlertBanner({
  patientName,
  startedAt,
  onOpen,
  minutesAgo,
}: {
  patientName: string;
  startedAt: string;
  onOpen: () => void;
  minutesAgo: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-critical-300 bg-white shadow-raised">
      <div className="flex items-center gap-2.5 bg-critical-600 px-4 py-2 text-white">
        <span className="size-2 rounded-full bg-white pulse-dot" aria-hidden />
        <span className="label-sm">Emergency alert</span>
        <Badge tone="neutral" className="ml-auto border-white/25 bg-white/15 text-white">
          {minutesAgo}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <h3 className="text-[20px] font-semibold leading-tight text-ink-900">{patientName}</h3>
          <p className="mt-1 text-[12.5px] text-ink-500">
            Emergency activated by the patient at {startedAt}. Connected patient — emergency context
            available under break-glass.
          </p>
        </div>
        <Button variant="critical" size="lg" icon={<Siren />} onClick={onOpen}>
          Open Emergency Mode
        </Button>
      </div>
    </div>
  );
}
