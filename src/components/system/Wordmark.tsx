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
 * Paint order matters and is the opposite of the order you might draw in:
 * wings first so they sit behind, then the staff, then the serpents, then the
 * heads on top. Drawn the other way the heads get buried in the wings, which
 * is what stops a caduceus reading as a caduceus.
 */
function Caduceus() {
  /**
   * Three layered wing leaves per side. The gradient runs light at the outer
   * tip to deep green at the root; because the right wing is produced by
   * mirroring this group and the gradient is in user space, it mirrors with it
   * and stays light at *its* tip too.
   */
  const wing = (
    <g fill="url(#pulse-wing)">
      <path d="M268 88C214 40 142 22 76 48c40 20 114 30 192 56z" />
      <path d="M266 112C220 78 162 62 104 82c42 18 94 30 158 56z" />
      <path d="M262 148C228 124 186 114 142 126c38 14 78 24 116 42z" />
    </g>
  );

  return (
    <g>
      {/* Cross */}
      <g fill="url(#pulse-red)">
        <rect x="269" y="2" width="22" height="58" rx="4" />
        <rect x="251" y="20" width="58" height="22" rx="4" />
      </g>

      {/* Wings, mirrored about the centre line */}
      {wing}
      <g transform="translate(560 0) scale(-1 1)">{wing}</g>

      {/* Staff, finial, tapered tip */}
      <path d="M280 74V282" stroke="url(#pulse-green)" strokeWidth="11" fill="none" />
      <circle cx="280" cy="76" r="13" fill="url(#pulse-green)" />
      <path d="M280 272l-10 26 10 32 10-32z" fill="url(#pulse-green)" />

      {/* Twin serpents — three tight crossings, tails converging on the staff */}
      <g fill="none" stroke="url(#pulse-green)" strokeWidth="10" strokeLinecap="round">
        <path d="M248 104c0 28 64 28 64 56s-64 28-64 56 32 26 32 54" />
        <path d="M312 104c0 28-64 28-64 56s64 28 64 56-32 26-32 54" />
      </g>

      {/* Heads and forked tongues, on top of the wings */}
      <g fill="url(#pulse-green)">
        <ellipse cx="243" cy="94" rx="15" ry="10" transform="rotate(-32 243 94)" />
        <ellipse cx="317" cy="94" rx="15" ry="10" transform="rotate(32 317 94)" />
      </g>
      <g stroke={GREEN} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M231 84l-12-7M231 84l-9-11" />
        <path d="M329 84l12-7M329 84l9-11" />
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
      <defs>
        {/* Vertical, top-lit — matches the shading in the source artwork. */}
        <linearGradient id="pulse-green" x1="0" y1="60" x2="0" y2="320" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1a8b4e" />
          <stop offset="1" stopColor="#06522a" />
        </linearGradient>
        {/* Horizontal: light at the outer wing tip, deep at the root. */}
        <linearGradient id="pulse-wing" x1="84" y1="0" x2="272" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3faa69" />
          <stop offset="1" stopColor="#0a6435" />
        </linearGradient>
        <linearGradient id="pulse-red" x1="0" y1="0" x2="0" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ee2a31" />
          <stop offset="1" stopColor="#c4161d" />
        </linearGradient>
        <linearGradient id="pulse-word" x1="0" y1="185" x2="0" y2="295" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#127a44" />
          <stop offset="1" stopColor="#064f28" />
        </linearGradient>
        {/* The trace fades in from the left rather than starting abruptly. */}
        <linearGradient id="pulse-ecg" x1="0" y1="0" x2="560" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={RED} stopOpacity="0" />
          <stop offset="0.13" stopColor={RED} stopOpacity="1" />
          <stop offset="1" stopColor={RED} stopOpacity="1" />
        </linearGradient>
      </defs>

      <Caduceus />

      {/* Wordmark, split around the emblem which occupies the L slot */}
      <g
        fill={dark ? '#ffffff' : 'url(#pulse-word)'}
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

      {/* ECG trace over the letters: fades in at the left, one complex at the
          P/U junction and one over the S, ending in a solid terminator dot. */}
      <path
        d="M12 252h92l13-56 10 114 11-72 9 30 7-16h74M332 252h6l13-56 10 114 11-72 9 30 7-16h124"
        fill="none"
        stroke="url(#pulse-ecg)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="528" cy="252" r="9.5" fill={RED} />
    </svg>
  );
}
