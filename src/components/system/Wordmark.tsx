import { cn } from '@/lib/utils';

/* ============================================================================
   PULSE brand marks
   ----------------------------------------------------------------------------
   Two marks, because one cannot do both jobs.

   `Wordmark`    — the app lockup. A rounded tile carrying the ECG trace, plus
                   the PULSE wordmark. Legible at 16px, which is the size it is
                   actually used at in the sidebar, the emergency header and
                   every nav.

   `PulseLockup` — the full identity: caduceus with wings and cross, and the
                   wordmark with the ECG line running through the letters.
                   Used where there is room for it to read as a logo rather
                   than as chrome.

   Both are inline SVG rather than image files, so they stay sharp at any size
   and can be recoloured for the dark emergency surface without a second asset.
   ========================================================================== */

const GREEN = 'var(--color-brand)';
const RED = 'var(--color-brand-red)';

/* --- Compact app lockup ---------------------------------------------------- */

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
        <rect width="28" height="28" rx="6.5" fill={dark ? 'rgba(255,255,255,0.08)' : GREEN} />
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

/* --- Caduceus --------------------------------------------------------------- */

/**
 * Drawn directly in the lockup's coordinate space (centred on x=280) so the
 * emblem sits in the L slot of the wordmark rather than floating above it.
 *
 * Paint order matters and is the opposite of the drawing order you might
 * expect: wings first so they sit behind, then the staff, then the serpents,
 * then the heads on top. Getting this wrong buries the heads in the feathers,
 * which is what makes a caduceus stop reading as a caduceus.
 */
function Caduceus() {
  /* Four tapered feathers per wing, longest on top, rooted at the staff. */
  const wing = (
    <g fill={RED}>
      <path d="M266 86C216 50 160 38 110 52c46 6 100 18 154 44z" />
      <path d="M266 102C224 72 178 62 136 74c40 6 84 14 128 36z" />
      <path d="M266 118C230 94 192 86 158 96c34 5 70 12 106 28z" />
      <path d="M266 134C236 116 206 110 180 118c28 4 56 10 84 22z" />
    </g>
  );

  return (
    <g>
      {/* Cross */}
      <g fill={RED}>
        <rect x="270" y="2" width="20" height="56" rx="2.5" />
        <rect x="252" y="20" width="56" height="20" rx="2.5" />
      </g>

      {/* Wings, mirrored about the centre line */}
      {wing}
      <g transform="translate(560 0) scale(-1 1)">{wing}</g>

      {/* Staff, finial, tapered tip */}
      <circle cx="280" cy="74" r="11" fill={GREEN} />
      <path d="M280 74V282" stroke={GREEN} strokeWidth="11" strokeLinecap="butt" fill="none" />
      <path d="M280 272l-10 26 10 32 10-32z" fill={GREEN} />

      {/* Twin serpents — three tight crossings, tails converging on the staff */}
      <g fill="none" stroke={GREEN} strokeWidth="10" strokeLinecap="round">
        <path d="M248 100c0 28 64 28 64 56s-64 28-64 56 32 26 32 56" />
        <path d="M312 100c0 28-64 28-64 56s64 28 64 56-32 26-32 56" />
      </g>

      {/* Heads and forked tongues, on top of the feathers */}
      <g fill={GREEN}>
        <ellipse cx="240" cy="88" rx="16" ry="10" transform="rotate(-28 240 88)" />
        <ellipse cx="320" cy="88" rx="16" ry="10" transform="rotate(28 320 88)" />
      </g>
      <g stroke={GREEN} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M226 78l-13-7M226 78l-10-12" />
        <path d="M334 78l13-7M334 78l10-12" />
      </g>
    </g>
  );
}

/* --- Full identity lockup ---------------------------------------------------- */

/**
 * The complete identity, as one SVG.
 *
 * Composing this from HTML text plus an absolutely-positioned overlay was the
 * obvious approach and the wrong one: the emblem and the ECG line have to be
 * placed against the letterforms to within a few pixels, and that is only
 * reliable inside a single coordinate space.
 */
export function PulseLockup({
  className,
  surface = 'light',
}: {
  className?: string;
  surface?: 'light' | 'dark';
}) {
  const dark = surface === 'dark';
  return (
    <svg
      viewBox="0 0 560 336"
      className={cn('h-auto w-full max-w-[340px]', className)}
      role="img"
      aria-label="PULSE"
    >
      <Caduceus />

      {/* Wordmark, split around the emblem which occupies the L slot */}
      <g
        fill={dark ? '#ffffff' : GREEN}
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="116"
        letterSpacing="1"
      >
        <text x="227.5" y="292" textAnchor="end">
          PU
        </text>
        <text x="339.5" y="292" textAnchor="start">
          SE
        </text>
      </g>

      {/* ECG trace across the wordmark, interrupted by the emblem */}
      <path
        d="M24 252h89l12-44 16 78 12-50 10 16h76M340 252h34l12-44 16 78 12-50 10 16h116"
        fill="none"
        stroke={RED}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
