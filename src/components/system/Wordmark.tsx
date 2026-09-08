import { cn } from '@/lib/utils';

/**
 * The mark is an ECG trace that resolves into a stable line — the product's
 * whole argument in one glyph: the signal was always there, it just needed to
 * be made legible.
 *
 * The height class goes on the wrapper, not the SVG, so callers can size the
 * lockup with a single `h-*` without fighting the glyph's own sizing.
 */
export function Wordmark({
  className,
  surface = 'light',
  showTag = false,
}: {
  className?: string;
  surface?: 'light' | 'dark';
  showTag?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 leading-none',
        surface === 'light' ? 'text-ink-900' : 'text-white',
        className ?? 'h-[18px]',
      )}
    >
      <svg viewBox="0 0 28 28" className="h-full w-auto shrink-0" aria-hidden>
        <rect
          width="28"
          height="28"
          rx="6.5"
          className={surface === 'light' ? 'fill-ink-900' : 'fill-white/10'}
        />
        <path
          d="M5 15h3.6l1.9-4.4 2.8 9 2.3-6 1.5 1.4H23"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-critical-bright"
        />
      </svg>
      <span className="text-[15px] font-semibold leading-none tracking-[0.14em]">VITA</span>
      {showTag && (
        <span
          className={cn(
            'ml-1 hidden self-center border-l pl-2.5 text-[11.5px] font-medium leading-none tracking-normal md:inline-block',
            surface === 'light' ? 'border-line-strong text-ink-400' : 'border-ink-700 text-ink-400',
          )}
        >
          Emergency Health Identity Layer
        </span>
      )}
    </span>
  );
}
