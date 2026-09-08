import { ArrowLeft, ArrowRight, Fingerprint, ShieldCheck, Stethoscope, UserRound, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Wordmark } from '@/components/system/Wordmark';
import { Card, FieldLabel } from '@/components/ui';

/* ============================================================================
   Sign in
   ----------------------------------------------------------------------------
   Role selection rather than a credentials form. Three roles see genuinely
   different products, and which one you are is the only thing this screen needs
   to establish for the prototype.

   Production authentication is explicitly out of scope — the note at the bottom
   says so rather than implying a password box is real security.
   ========================================================================== */

const ROLES = [
  {
    id: 'clinician',
    icon: Stethoscope,
    title: 'Clinician',
    org: 'Apollo Hospitals · Emergency Department',
    detail:
      'Identify a patient, verify authorisation, open the clinical snapshot or go straight to Emergency Mode.',
    to: '/clinician',
    primary: true,
  },
  {
    id: 'patient',
    icon: UserRound,
    title: 'Patient',
    org: 'Anaya Sharma · ABHA ••-••••-••••-4491',
    detail:
      'Your longitudinal profile, your documents, and control over who can see them and for how long.',
    to: '/app/dashboard',
  },
  {
    id: 'caregiver',
    icon: UsersRound,
    title: 'Caregiver',
    org: 'Kiran Sharma · delegated by patient',
    detail:
      'Scoped access to medications, appointments and the timeline. Can share emergency access, cannot administer consent.',
    to: '/app/caregiver',
  },
];

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="grid-paper flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <Wordmark className="h-[17px]" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <div className="label-xs text-ink-400">Sign in</div>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
          Who are you signing in as?
        </h1>
        <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-ink-500">
          Each role sees a different product surface, scoped by consent. Pick one to explore the
          prototype.
        </p>

        <div className="mt-8 space-y-3">
          {ROLES.map((r) => (
            <button key={r.id} onClick={() => navigate(r.to)} className="w-full text-left">
              <Card interactive accent={r.primary ? 'critical' : 'none'}>
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk text-ink-500">
                    <r.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-ink-900">{r.title}</h2>
                      {r.primary && (
                        <span className="label-xs rounded-sm border border-critical-100 bg-critical-50 px-1.5 py-[3px] text-critical-600">
                          Primary user
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[11.5px] text-ink-400">{r.org}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{r.detail}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-ink-300" />
                </div>
              </Card>
            </button>
          ))}
        </div>

        <Card className="mt-8">
          <FieldLabel className="flex items-center gap-1.5">
            <ShieldCheck className="size-3" />
            About authentication in this prototype
          </FieldLabel>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
            Production-grade authentication is deliberately out of scope here. A real deployment
            would authenticate clinicians against the hospital directory, patients against their
            national health identity, and would bind every session to the consent grant that
            authorised it — the same grant this prototype already models and logs.
          </p>
          <p className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-ink-400">
            <Fingerprint className="size-3" />
            No credentials are collected or stored.
          </p>
        </Card>
      </main>
    </div>
  );
}
