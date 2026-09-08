import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ============================================================================
   Primitives
   Two surfaces exist in this product: the warm-white application, and the
   near-black emergency surface. Every primitive takes `surface` rather than
   maintaining a second component set.
   ========================================================================== */

export type Surface = 'light' | 'dark';

/* --- Button ----------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'critical';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  surface?: Surface;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

const buttonSize: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5',
  md: 'h-10 px-4 text-[13.5px] gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2.5',
};

const buttonVariant: Record<Surface, Record<ButtonVariant, string>> = {
  light: {
    primary:
      'bg-ink-900 text-white border border-ink-900 hover:bg-ink-800 active:bg-ink-950 shadow-flat',
    secondary:
      'bg-white text-ink-800 border border-line-strong hover:border-ink-300 hover:bg-canvas-sunk shadow-flat',
    ghost: 'bg-transparent text-ink-600 border border-transparent hover:bg-ink-50 hover:text-ink-900',
    critical:
      'bg-critical-600 text-white border border-critical-600 hover:bg-critical-700 shadow-flat',
  },
  dark: {
    primary:
      'bg-white text-ink-950 border border-white hover:bg-ink-100 active:bg-ink-200 font-medium',
    secondary:
      'bg-ink-800/70 text-ink-100 border border-ink-600 hover:bg-ink-700 hover:border-ink-500',
    ghost: 'bg-transparent text-ink-300 border border-transparent hover:bg-ink-800 hover:text-white',
    critical: 'bg-critical-600 text-white border border-critical-500 hover:bg-critical-500',
  },
};

/**
 * Shared so a react-router <Link> can be styled identically without nesting an
 * anchor inside a button — invalid HTML that also breaks keyboard navigation.
 */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  surface = 'light',
  block,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  surface?: Surface;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[-0.005em]',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap',
    buttonSize[size],
    buttonVariant[surface][variant],
    block && 'w-full',
    className,
  );
}

export function Button({
  variant = 'secondary',
  size = 'md',
  surface = 'light',
  icon,
  iconRight,
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, size, surface, block, className })} {...rest}>
      {icon && <span className="shrink-0 [&>svg]:size-[15px]">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0 [&>svg]:size-[15px]">{iconRight}</span>}
    </button>
  );
}

/* --- Card ------------------------------------------------------------------- */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: Surface;
  /** Colours the left edge to signal severity without flooding the card. */
  accent?: 'none' | 'critical' | 'caution' | 'verified' | 'accent';
  padded?: boolean;
  interactive?: boolean;
}

const accentEdge: Record<NonNullable<CardProps['accent']>, string> = {
  none: '',
  critical: 'before:bg-critical-500',
  caution: 'before:bg-caution-500',
  verified: 'before:bg-verified-500',
  accent: 'before:bg-accent-500',
};

export function Card({
  surface = 'light',
  accent = 'none',
  padded = true,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg',
        accent !== 'none' &&
          'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-l-lg',
        accent !== 'none' && accentEdge[accent],
        surface === 'light'
          ? 'border border-line bg-white shadow-card'
          : 'border border-ink-700/70 bg-ink-850',
        interactive &&
          (surface === 'light'
            ? 'cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-ink-200 hover:shadow-raised'
            : 'cursor-pointer transition-colors duration-150 hover:border-ink-600 hover:bg-ink-800'),
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* --- Badge ------------------------------------------------------------------ */

export type Tone = 'neutral' | 'critical' | 'caution' | 'verified' | 'accent';

const badgeTone: Record<Surface, Record<Tone, string>> = {
  light: {
    neutral: 'bg-ink-50 text-ink-600 border-ink-100',
    critical: 'bg-critical-50 text-critical-700 border-critical-100',
    caution: 'bg-caution-50 text-caution-600 border-caution-100',
    verified: 'bg-verified-50 text-verified-600 border-verified-100',
    accent: 'bg-accent-50 text-accent-700 border-accent-100',
  },
  dark: {
    neutral: 'bg-ink-800 text-ink-300 border-ink-700',
    critical: 'bg-critical-700/25 text-critical-300 border-critical-700/60',
    caution: 'bg-caution-500/15 text-caution-300 border-caution-500/40',
    verified: 'bg-verified-500/15 text-verified-300 border-verified-500/40',
    accent: 'bg-accent-500/15 text-accent-300 border-accent-500/40',
  },
};

export function Badge({
  tone = 'neutral',
  surface = 'light',
  mono = false,
  className,
  children,
}: {
  tone?: Tone;
  surface?: Surface;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[11px] font-medium leading-none',
        mono && 'font-mono tracking-[0.03em]',
        badgeTone[surface][tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --- Field label / value ----------------------------------------------------- */

export function FieldLabel({
  surface = 'light',
  className,
  children,
}: {
  surface?: Surface;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'label-xs',
        surface === 'light' ? 'text-ink-400' : 'text-ink-400',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --- Section header ---------------------------------------------------------- */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  surface = 'light',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  surface?: Surface;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className={cn('label-xs mb-2', surface === 'light' ? 'text-ink-400' : 'text-ink-400')}>
            {eyebrow}
          </div>
        )}
        <h2
          className={cn(
            'text-[19px] font-semibold leading-tight',
            surface === 'light' ? 'text-ink-900' : 'text-white',
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-1.5 max-w-2xl text-[13.5px] leading-relaxed',
              surface === 'light' ? 'text-ink-500' : 'text-ink-400',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* --- Stat -------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
  surface = 'light',
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  surface?: Surface;
  className?: string;
}) {
  const valueTone: Record<Tone, string> = {
    neutral: surface === 'light' ? 'text-ink-900' : 'text-white',
    critical: surface === 'light' ? 'text-critical-600' : 'text-critical-300',
    caution: surface === 'light' ? 'text-caution-600' : 'text-caution-300',
    verified: surface === 'light' ? 'text-verified-600' : 'text-verified-300',
    accent: surface === 'light' ? 'text-accent-600' : 'text-accent-300',
  };
  return (
    <div className={className}>
      <FieldLabel surface={surface}>{label}</FieldLabel>
      <div className={cn('mt-1.5 text-[26px] font-semibold leading-none tnum', valueTone[tone])}>
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            'mt-1.5 text-[12.5px] leading-snug',
            surface === 'light' ? 'text-ink-500' : 'text-ink-400',
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* --- Progress ---------------------------------------------------------------- */

export function Progress({
  value,
  tone = 'accent',
  surface = 'light',
  className,
}: {
  /** 0–100 */
  value: number;
  tone?: Tone;
  surface?: Surface;
  className?: string;
}) {
  const fill: Record<Tone, string> = {
    neutral: 'bg-ink-400',
    critical: 'bg-critical-500',
    caution: 'bg-caution-500',
    verified: 'bg-verified-500',
    accent: 'bg-accent-500',
  };
  return (
    <div
      className={cn(
        'h-1 w-full overflow-hidden rounded-full',
        surface === 'light' ? 'bg-ink-100' : 'bg-ink-700',
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fill[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* --- Rule -------------------------------------------------------------------- */

export function Rule({ surface = 'light', className }: { surface?: Surface; className?: string }) {
  return (
    <hr className={cn('border-t', surface === 'light' ? 'border-line' : 'border-ink-700/60', className)} />
  );
}

/* --- Empty state -------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-canvas-sunk/50 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-300 [&>svg]:size-6">{icon}</div>}
      <p className="text-[14px] font-medium text-ink-700">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --- Tabs --------------------------------------------------------------------- */

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  surface = 'light',
  className,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  surface?: Surface;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b',
        surface === 'light' ? 'border-line' : 'border-ink-700/60',
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150',
              isActive
                ? surface === 'light'
                  ? 'border-ink-900 text-ink-900'
                  : 'border-white text-white'
                : surface === 'light'
                  ? 'border-transparent text-ink-400 hover:text-ink-700'
                  : 'border-transparent text-ink-400 hover:text-ink-200',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 font-mono text-[11px]',
                  isActive ? 'opacity-70' : 'opacity-50',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
