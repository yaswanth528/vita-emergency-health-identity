import { cn } from '@/lib/utils';

/* ============================================================================
   PULSE brand marks
   ----------------------------------------------------------------------------
   Two marks, because one cannot do both jobs.

   `Wordmark`    — the app lockup. A rounded tile carrying the ECG trace, plus
                   the PULSE wordmark. Legible at 16px, which is the size it is
                   used at in the sidebar, the emergency header and every nav.

   `PulseLockup` — the full identity: caduceus with wings and cross, and the
                   wordmark with the ECG line running through the letters. Used
                   where there is room for it to be read as a logo rather than
                   as chrome.

   Both are drawn as inline SVG rather than an image file so they stay sharp at
   any size, inherit currentColor where appropriate, and can be recoloured for
   the dark emergency surface without shipping a second asset.
   ========================================================================== */

const GREEN = 'var(--color-brand)';
const RED = 'var(--color-brand-red)';

/* --- The ECG trace, shared by both marks ---------------------------------- */

/** A single heartbeat: flat line, small dip, tall spike, overshoot, flat. */
const ECG_PATH = 'M0 12h7l2.6-7.2 3.4 14 2.4-8.4 1.8 2.4H24';

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
        <g transform="translate(2 2)">
          <path
            d={ECG_PATH}
            fill="none"
            stroke={dark ? 'var(--color-critical-bright)' : '#ffffff'}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
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

/* --- Caduceus emblem -------------------------------------------------------- */

/**
 * Caduceus: cross, finial, swept wings, twin serpents, tapered staff.
 *
 * Drawn in the lockup's own coordinate space (centred on x=280) so the emblem
 * can sit in the L slot of the wordmark rather than floating above it, which is
 * how the supplied artwork is composed.
 */
function Caduceus() {
  const wing = (
    <g fill={RED}>
      <path d="M250 84C212 54 164 47 122 62c46 4 90 15 128 34z" />
      <path d="M250 100C216 76 172 71 136 84c42 4 80 13 114 27z" />
      <path d="M250 116C222 99 186 96 156 105c34 3 66 9 94 18z" />
    </g>
  );

  return (
    <g>
      {/* Cross */}
      <g fill={RED}>
        <rect x="270" y="6" width="20" height="58" rx="3" />
        <rect x="251" y="25" width="58" height="20" rx="3" />
      </g>

      {/* Wings — three swept feathers, mirrored */}
      {wing}
      <g transform="translate(560 0) scale(-1 1)">{wing}</g>

      {/* Staff, finial and tapered tip */}
      <path d="M280 78V282" stroke={GREEN} strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="280" cy="76" r="11" fill={GREEN} />
      <path d="M280 274l-9 22 9 30 9-30z" fill={GREEN} />

      {/* Twin serpents — a double helix crossing the staff three times */}
      <g fill="none" stroke={GREEN} strokeWidth="9" strokeLinecap="round">
        <path d="M249 96c0 26 62 30 62 58s-62 32-62 58 31 30 31 44" />
        <path d="M311 96c0 26-62 30-62 58s62 32 62 58-31 30-31 44" />
      </g>

      {/* Serpent heads and forked tongues */}
      <g fill={GREEN}>
        <ellipse cx="247" cy="90" rx="13" ry="9" transform="rotate(-24 247 90)" />
        <ellipse cx="313" cy="90" rx="13" ry="9" transform="rotate(24 313 90)" />
      </g>
      <g stroke={GREEN} strokeWidth="3" strokeLinecap="round">
        <path d="M236 82l-11-6M236 82l-9-10" />
        <path d="M324 82l11-6M324 82l9-10" />
      </g>
    </g>
  );
}

/* --- Full identity lockup ---------------------------------------------------- */

/**
 * The complete identity, as one SVG.
 *
 * Composing it from HTML text plus an absolutely-positioned overlay was the
 * obvious approach and the wrong one: the emblem and the ECG line have to be
 * positioned against the letterforms to within a few pixels, and that is only
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
      viewBox="0 0 560 330"
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
        <text x="224" y="292" textAnchor="end">
          PU
        </text>
        <text x="336" y="292" textAnchor="start">
          SE
        </text>
      </g>

      {/* The ECG trace, running through the letters as in the mark */}
      <path
        d="M26 252h84l13-46 16 82 12-54 10 18h63M336 252h58l13-46 16 82 12-54 10 18h89"
        fill="none"
        stroke={RED}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
