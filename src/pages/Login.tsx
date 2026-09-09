import { ArrowLeft, ArrowRight, Fingerprint, PlayCircle, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PulseLockup, Wordmark } from '@/components/system/Wordmark';
import { Badge, Card, FieldLabel } from '@/components/ui';
import { clinicianUser, patientUser } from '@/data/platform';
import { useVita } from '@/hooks/useVita';
import type { Role } from '@/types/platform';

/* ============================================================================
   Sign in
   ----------------------------------------------------------------------------
   Two roles, two products. The choice made here selects the shell, the
   navigation and the permitted actions for the rest of the session — it is not
   a preference toggle over one shared dashboard.

   Demo mode exists because a judge with two minutes should not have to type
   credentials. Production authentication is out of scope and the note at the
   bottom says so, rather than implying a password box is real security.
   ========================================================================== */

const ROLES: {
  role: Role;
  icon: typeof UserRound;
  title: string;
  who: string;
  detail: string;
  can: string[];
  to: string;
  register: string;
  primary?: boolean;
}[] = [
  {
    role: 'patient',
    icon: UserRound,
    title: 'Patient',
    who: `${patientUser.name} · ABHA ••-••••-••••-4491`,
    detail: 'Own your health identity, decide who reads it, and raise an emergency.',
    can: ['Approve or decline access', 'Revoke at any time', 'Activate emergency', 'See every read'],
    to: '/app/dashboard',
    register: '/register/patient',
  },
  {
    role: 'clinician',
    icon: Stethoscope,
    title: 'Clinician',
    who: `${clinicianUser.name} · Apollo Hospitals, Emergency Department`,
    detail: 'Find a patient, ask for access, and open emergency context when it is warranted.',
    can: ['Search the registry', 'Request access', 'Break glass with a reason', 'Read what was granted'],
    to: '/clinician',
    register: '/register/clinician',
    primary: true,
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { signInAs } = useVita();

  const enter = (role: Role, to: string) => {
    signInAs(role);
    navigate(to);
  };

  return (
    <div className="grid-paper flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <Wordmark className="h-[17px]" />
          </Link>
          <Badge tone="caution">
            <PlayCircle className="size-2.5" />
            Demo mode
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <PulseLockup className="mb-9 self-center" />

        <div className="label-xs text-ink-400">Sign in</div>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
          Which side are you on?
        </h1>
        <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">
          Patients and clinicians get genuinely different products — different navigation, different
          permissions, different priorities — over one shared record.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <Card key={r.role} accent={r.primary ? 'critical' : 'accent'} className="flex flex-col">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk text-ink-500">
                  <r.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold text-ink-900">{r.title}</h2>
                    {r.primary && <Badge tone="critical">Primary user</Badge>}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-ink-400">{r.who}</p>
                </div>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-ink-600">{r.detail}</p>

              <ul className="mt-3 flex-1 space-y-1.5">
                {r.can.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[12.5px] text-ink-500">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-verified-500" />
                    {c}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => enter(r.role, r.to)}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink-900 text-[14px] font-medium text-white transition-colors hover:bg-ink-800"
              >
                Continue as {r.title.toLowerCase()}
                <ArrowRight className="size-4" />
              </button>

              <Link
                to={r.register}
                className="mt-2.5 text-center text-[12.5px] font-medium text-accent-600 hover:underline"
              >
                Create a {r.title.toLowerCase()} account
              </Link>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <FieldLabel className="flex items-center gap-1.5">
            <ShieldCheck className="size-3" />
            About authentication in this prototype
          </FieldLabel>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-ink-500">
            Production-grade authentication is deliberately out of scope. A real deployment would
            authenticate clinicians against the hospital directory and their council registration,
            patients against their national health identity, and would bind every session to the
            consent grant that authorised it — the same grant this prototype already models, expires
            and logs. Switching roles here shares one session state on purpose, so you can watch an
            action on one side land on the other.
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
