import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/system/Wordmark';
import { buttonClasses } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="grid-paper flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-5 text-center">
      <Wordmark className="h-5" />
      <div>
        <p className="font-mono text-[12px] uppercase tracking-widest text-ink-400">404</p>
        <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-ink-900">
          That page is not part of this record
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-relaxed text-ink-500">
          Nothing here. The two places worth being are the emergency surface and the patient profile.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Link to="/emergency" className={buttonClasses({ variant: 'primary' })}>
          Try Emergency Mode
        </Link>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Back to the start
        </Link>
      </div>
    </div>
  );
}
