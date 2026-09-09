import logoUrl from '@/assets/pulse-logo.png';
import { cn } from '@/lib/utils';

/* ============================================================================
   PULSE brand marks
   ----------------------------------------------------------------------------
   Two marks, because one cannot do both jobs.

   `PulseLockup` — the real artwork (`src/assets/pulse-logo.png`, 1774×887,
                   transparent background). Used wherever there is room for it
                   to read as a logo rather than as chrome.

   `Wordmark`    — the app lockup: a rounded tile carrying the heartbeat, plus
                   the name set in type. This exists because the full artwork
                   is 2:1 — at the 18px height the sidebar, emergency header
                   and every nav actually use, it would be 36px wide and the
                   letters about four pixels tall. An illegible logo in the
                   chrome is worse than a simple one, so the chrome gets a mark
                   built for the size, the way an app icon differs from a
                   full lockup.
   ========================================================================== */

/* --- Full identity — the supplied artwork ----------------------------------- */

export function PulseLockup({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="PULSE"
      /* Intrinsic size given so the layout does not shift while it loads. */
      width={1774}
      height={887}
      className={cn('h-auto w-full max-w-[400px]', className)}
    />
  );
}

/* --- Compact app lockup ------------------------------------------------------ */

export function Wordmark({
  className,
  surface = 'light',
  showTag = false,
}: {
  className?: string;
  surface?: 'light' | 'dark';
  showTag?: boolean;
}) {
  const dark = surface === 'dark';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 leading-none',
        dark ? 'text-white' : 'text-ink-900',
        className ?? 'h-[18px]',
      )}
    >
      <svg viewBox="0 0 28 28" className="h-full w-auto shrink-0" aria-hidden>
        <rect
          width="28"
          height="28"
          rx="6.5"
          fill={dark ? 'rgba(255,255,255,0.08)' : 'var(--color-brand)'}
        />
        {/* One heartbeat: baseline, dip, spike, overshoot, baseline. */}
        <path
          d="M4 15.2h4.6l1.9-5.4 2.6 10 1.8-6.2 1.4 1.6H24"
          fill="none"
          stroke={dark ? 'var(--color-critical-bright)' : '#ffffff'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="text-[15px] font-semibold leading-none tracking-[0.14em]">PULSE</span>

      {showTag && (
        <span
          className={cn(
            'ml-1 hidden self-center border-l pl-2.5 text-[11.5px] font-medium leading-none tracking-normal md:inline-block',
            dark ? 'border-ink-700 text-ink-400' : 'border-line-strong text-ink-400',
          )}
        >
          Emergency Health Identity Layer
        </span>
      )}
    </span>
  );
}
