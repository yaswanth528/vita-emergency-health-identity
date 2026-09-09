import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleAlert,
  Loader2,
  ShieldCheck,
  Siren,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wordmark } from '@/components/system/Wordmark';
import { Badge, Card, FieldLabel, buttonClasses } from '@/components/ui';
import { useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';

/* ============================================================================
   Registration
   ----------------------------------------------------------------------------
   The two forms are deliberately not the same form with a different heading.

   A patient is creating a health identity: who they are, and who to call. A
   clinician is asserting a professional credential: a licence number, an
   institution, a department — claims that in production would be verified
   against a register before the account could read anything at all.

   Nothing here is stored. The fields exist to make the difference in what each
   side is asserting legible.
   ========================================================================== */

/* --- Shared chrome ---------------------------------------------------------- */

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid-paper flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <Wordmark className="h-[17px]" />
          </Link>
          <Link to="/login" className="text-[12.5px] font-medium text-accent-600 hover:underline">
            Already have an account?
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = 'text',
  hint,
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="label-xs text-ink-400">
        {label}
        {required && <span className="ml-1 text-critical-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11.5px] text-ink-400">{hint}</p>}
    </div>
  );
}

function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = (k: keyof T) => (v: string) => setValues((p) => ({ ...p, [k]: v }));
  return { values, set };
}

/* ============================================================================
   PATIENT REGISTRATION
   ========================================================================== */

const ONBOARDING = [
  { title: 'Complete your emergency profile', detail: 'Allergies, blood group, emergency contact.' },
  { title: 'Add your medical history', detail: 'Conditions, surgeries, hospital admissions.' },
  { title: 'Upload your records', detail: 'Prescriptions, lab reports, discharge summaries.' },
  { title: 'Confirm your medications', detail: 'Reconciled from what you upload.' },
  { title: 'Record your allergies', detail: 'The single most decision-changing fact you own.' },
  { title: 'Set an emergency contact', detail: 'Who a clinician calls if you cannot speak.' },
  { title: 'Review consent', detail: 'Decide the defaults before anyone asks.' },
];

export function RegisterPatient() {
  const navigate = useNavigate();
  const { signInAs } = useVita();
  const [done, setDone] = useState(false);
  const { values, set } = useForm({
    name: '',
    dob: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
    contact: '',
  });

  const ready =
    values.name.trim() &&
    values.email.trim() &&
    values.password.length >= 6 &&
    values.password === values.confirm;

  if (done) {
    return (
      <AuthFrame>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-verified-50 text-verified-600">
              <Sparkles className="size-4" />
            </span>
            <Badge tone="verified">
              <BadgeCheck className="size-2.5" />
              Health identity created
            </Badge>
          </div>
          <h1 className="mt-5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
            Your health identity is ready.
          </h1>
          <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">
            It is empty, and that is the honest starting point — an identity with nothing linked to
            it surfaces nothing. Here is what fills it.
          </p>

          <ol className="mt-7 space-y-2">
            {ONBOARDING.map((s, i) => (
              <li key={s.title}>
                <Card className="flex items-start gap-3.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-sunk font-mono text-[11px] font-semibold text-ink-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink-900">{s.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">{s.detail}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                signInAs('patient');
                navigate('/app/dashboard');
              }}
              className={buttonClasses({ variant: 'primary', size: 'lg' })}
            >
              Go to my dashboard
              <ArrowRight className="size-4" />
            </button>
            <Link to="/app/ingest" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              Upload my first record
            </Link>
          </div>

          <Card accent="accent" className="mt-6">
            <p className="text-[12.5px] leading-relaxed text-ink-600">
              For the demo, the account you are signed into is the fully populated one —
              Kavita Menon, with eight linked documents and ten years of history. A genuinely new
              account would start blank.
            </p>
          </Card>
        </motion.div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div className="label-xs text-ink-400">Create a patient account</div>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
        Create your health identity
      </h1>
      <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">
        This is the record clinicians will ask permission to read. It belongs to you.
      </p>

      <Card className="mt-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" placeholder="Kavita Menon" value={values.name} onChange={set('name')} required />
          <Field label="Date of birth" type="date" value={values.dob} onChange={set('dob')} required />
          <Field label="Phone number" placeholder="+91 98490 22821" value={values.phone} onChange={set('phone')} required />
          <Field label="Email" type="email" placeholder="you@example.com" value={values.email} onChange={set('email')} required />
          <Field label="Password" type="password" value={values.password} onChange={set('password')} hint="At least 6 characters" required />
          <Field
            label="Confirm password"
            type="password"
            value={values.confirm}
            onChange={set('confirm')}
            hint={
              values.confirm && values.confirm !== values.password ? 'Passwords do not match' : undefined
            }
            required
          />
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <Field
            label="Emergency contact (optional)"
            placeholder="Name and number of someone we can call"
            value={values.contact}
            onChange={set('contact')}
            hint="A clinician calls this person if you cannot speak. You can add it later."
          />
        </div>
      </Card>

      <Card accent="accent" className="mt-4">
        <FieldLabel className="flex items-center gap-1.5">
          <ShieldCheck className="size-3" />
          What you are agreeing to
        </FieldLabel>
        <ul className="mt-2.5 space-y-1.5">
          {[
            'Nothing in your record is shared until you approve a specific request.',
            'Every grant you give expires by itself.',
            'You can revoke any access at any time, and the clinician is told.',
            'In an emergency, break-glass access releases a restricted subset — and notifies you.',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-600">
              <Check className="mt-0.5 size-3 shrink-0 text-verified-500" strokeWidth={2.6} />
              {t}
            </li>
          ))}
        </ul>
      </Card>

      <button
        disabled={!ready}
        onClick={() => setDone(true)}
        className={cn(buttonClasses({ variant: 'primary', size: 'lg', block: true }), 'mt-5')}
      >
        Create my health identity
        <ArrowRight className="size-4" />
      </button>
      <p className="mt-3 text-center text-[11.5px] text-ink-400">
        Prototype — no data is submitted or stored.
      </p>
    </AuthFrame>
  );
}

/* ============================================================================
   CLINICIAN REGISTRATION
   ========================================================================== */

const CHECKS = [
  'Council registration found',
  'Name matches the register',
  'Institution confirmed',
  'Department confirmed',
];

export function RegisterClinician() {
  const navigate = useNavigate();
  const { signInAs } = useVita();
  const [phase, setPhase] = useState<'form' | 'verifying' | 'verified'>('form');
  const [step, setStep] = useState(-1);
  const { values, set } = useForm({
    name: '',
    licence: '',
    organisation: '',
    department: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });

  const ready =
    values.name.trim() &&
    values.licence.trim() &&
    values.organisation.trim() &&
    values.email.trim() &&
    values.password.length >= 6 &&
    values.password === values.confirm;

  useEffect(() => {
    if (phase !== 'verifying') return;
    const timers = CHECKS.map((_, i) => setTimeout(() => setStep(i), 500 * (i + 1)));
    timers.push(setTimeout(() => setPhase('verified'), 500 * (CHECKS.length + 1)));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  if (phase !== 'form') {
    return (
      <AuthFrame>
        <div className="mx-auto max-w-lg">
          <div className="label-xs text-ink-400">Verification</div>
          <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
            {phase === 'verified' ? 'Clinician account verified' : 'Verifying your registration'}
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-500">
            A clinician account can read other people&apos;s medical records. It does not get created
            on the strength of a typed licence number alone.
          </p>

          <Card className="mt-6">
            {CHECKS.map((c, i) => {
              const complete = phase === 'verified' || step >= i;
              const running = phase === 'verifying' && step === i - 1;
              return (
                <div key={c} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      complete
                        ? 'border-verified-100 bg-verified-50 text-verified-600'
                        : running
                          ? 'border-accent-300 bg-accent-50 text-accent-600'
                          : 'border-line bg-canvas-sunk text-ink-300',
                    )}
                  >
                    {complete ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : running ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[13px]',
                      complete ? 'font-medium text-ink-900' : 'text-ink-400',
                    )}
                  >
                    {c}
                  </span>
                </div>
              );
            })}
          </Card>

          <AnimatePresence>
            {phase === 'verified' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card accent="verified" className="mt-4">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-verified-600" />
                    <div>
                      <p className="text-[14px] font-semibold text-ink-900">
                        {values.name || 'Dr. Arjun Rao'} — verified
                      </p>
                      <p className="mt-1 text-[12.5px] text-ink-500">
                        {values.licence || 'TSMC 41207'} ·{' '}
                        {values.organisation || 'Apollo Hospitals'} ·{' '}
                        {values.department || 'Emergency Department'}
                      </p>
                      <p className="mt-2 text-[11.5px] text-ink-400">
                        Verification is simulated in this prototype. In production this is a call to
                        the medical council register and the hospital directory.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card accent="critical" className="mt-4">
                  <FieldLabel>What this account still cannot do</FieldLabel>
                  <ul className="mt-2.5 space-y-1.5">
                    {[
                      'Read any patient record without that patient granting access.',
                      'Approve its own access requests.',
                      'See a category the patient withheld — in any mode, including emergencies.',
                      'Break glass without writing a reason that the patient will read.',
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2 text-[12.5px] text-ink-600">
                        <CircleAlert className="mt-0.5 size-3 shrink-0 text-critical-500" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </Card>

                <button
                  onClick={() => {
                    signInAs('clinician');
                    navigate('/clinician');
                  }}
                  className={cn(buttonClasses({ variant: 'primary', size: 'lg', block: true }), 'mt-5')}
                >
                  Enter the clinician workspace
                  <ArrowRight className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div className="label-xs text-ink-400">Create a clinician account</div>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
        Register your professional credentials
      </h1>
      <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">
        These are claims about a licence to practise, and they are checked before the account can
        read anything.
      </p>

      <Card className="mt-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" placeholder="Dr. Arjun Rao" value={values.name} onChange={set('name')} required />
          <Field
            label="Professional ID / licence"
            placeholder="TSMC 41207"
            value={values.licence}
            onChange={set('licence')}
            hint="State medical council registration"
            required
          />
          <Field label="Hospital / organisation" placeholder="Apollo Hospitals" value={values.organisation} onChange={set('organisation')} required />
          <Field label="Department" placeholder="Emergency Department" value={values.department} onChange={set('department')} />
          <Field
            label="Work email"
            type="email"
            placeholder="arjun.rao@apollo.example"
            value={values.email}
            onChange={set('email')}
            hint="Must be an institutional address"
            required
          />
          <Field label="Phone" placeholder="+91 90000 41407" value={values.phone} onChange={set('phone')} />
          <Field label="Password" type="password" value={values.password} onChange={set('password')} hint="At least 6 characters" required />
          <Field
            label="Confirm password"
            type="password"
            value={values.confirm}
            onChange={set('confirm')}
            hint={
              values.confirm && values.confirm !== values.password ? 'Passwords do not match' : undefined
            }
            required
          />
        </div>
      </Card>

      <Card accent="critical" className="mt-4">
        <FieldLabel className="flex items-center gap-1.5">
          <Siren className="size-3" />
          Accountability
        </FieldLabel>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
          Every record you open is logged against this licence number and shown to the patient. That
          is the trade for being able to break glass when someone cannot consent.
        </p>
      </Card>

      <button
        disabled={!ready}
        onClick={() => setPhase('verifying')}
        className={cn(buttonClasses({ variant: 'primary', size: 'lg', block: true }), 'mt-5')}
      >
        Verify and create account
        <ArrowRight className="size-4" />
      </button>
      <p className="mt-3 text-center text-[11.5px] text-ink-400">
        Prototype — no data is submitted or stored, and verification is simulated.
      </p>
    </AuthFrame>
  );
}
