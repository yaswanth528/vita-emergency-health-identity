import {
  Activity,
  CalendarClock,
  FileStack,
  HeartPulse,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  ScanLine,
  ShieldCheck,
  Siren,
  Stethoscope,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { Wordmark } from '@/components/system/Wordmark';
import { kavita } from '@/data/patient';
import { useOpenConflicts } from '@/hooks/useVita';
import { cn } from '@/lib/utils';

/* ============================================================================
   AppShell — the patient/caregiver-facing application
   ----------------------------------------------------------------------------
   Emergency Mode is deliberately NOT rendered inside this shell. It gets its
   own surface, because a clinician in an emergency has no use for navigation,
   and mixing the two would make it ambiguous which mode you are in.

   What this shell does carry is the one-tap route into it.
   ========================================================================== */

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'conflicts';
}

const primaryNav: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/profile', label: 'Health profile', icon: HeartPulse },
  { to: '/app/timeline', label: 'Timeline', icon: CalendarClock },
];

const dataNav: NavItem[] = [
  { to: '/app/documents', label: 'Documents', icon: FileStack },
  { to: '/app/ingest', label: 'AI processing', icon: ScanLine, badge: 'conflicts' },
];

const trustNav: NavItem[] = [
  { to: '/app/consent', label: 'Consent & access', icon: ShieldCheck },
  { to: '/app/caregiver', label: 'Caregiver', icon: UsersRound },
  { to: '/app/settings', label: 'Security', icon: Activity },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-canvas">
      {/* --- Mobile header ------------------------------------------------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="rounded-md p-2 text-ink-600 transition-colors hover:bg-ink-50"
        >
          <Menu className="size-4.5" />
        </button>
        <Wordmark className="h-4" />
        <Link
          to="/emergency"
          className="inline-flex items-center gap-1.5 rounded-md border border-critical-100 bg-critical-50 px-2.5 py-1.5 text-[12px] font-semibold text-critical-600"
        >
          <Siren className="size-3.5" />
          Emergency
        </Link>
      </header>

      {/* --- Mobile drawer -------------------------------------------------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setMobileOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <Wordmark className="h-4" />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-ink-400 hover:bg-ink-50"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </div>
          </nav>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1500px]">
        {/* --- Desktop sidebar --------------------------------------------- */}
        <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-canvas lg:flex">
          <div className="px-5 py-5">
            <Link to="/" aria-label="PULSE home">
              <Wordmark className="h-[18px]" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <SidebarBody />
          </div>
          <div className="border-t border-line px-3 py-3">
            <Link
              to="/clinician"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              <Stethoscope className="size-4" />
              Clinician workspace
            </Link>
          </div>
        </aside>

        {/* --- Content ------------------------------------------------------ */}
        <main key={location.pathname} className="min-w-0 flex-1 rise">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const conflicts = useOpenConflicts();

  return (
    <div className="space-y-6">
      {/* Patient context — always visible, so it is never ambiguous whose
          record is on screen. */}
      <div className="rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink-900 font-mono text-[11px] font-semibold text-white">
            {kavita.photoInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink-900">{kavita.fullName}</p>
            <p className="truncate font-mono text-[10.5px] text-ink-400">
              {kavita.age} {kavita.sex.charAt(0)} · {kavita.abhaMasked}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="label-xs text-ink-400">Profile</span>
          <span className="font-mono text-[11px] font-medium text-ink-700">
            {kavita.profileCompleteness}%
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-ink-800" style={{ width: `${kavita.profileCompleteness}%` }} />
        </div>
      </div>

      <Link
        to="/emergency"
        onClick={onNavigate}
        className="group flex items-center gap-2.5 rounded-md border border-critical-100 bg-critical-50 px-3 py-2.5 transition-colors hover:border-critical-300 hover:bg-critical-100/60"
      >
        <Siren className="size-4 shrink-0 text-critical-500" />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight text-critical-700">
            Emergency profile
          </div>
          <div className="text-[11px] leading-tight text-critical-600/80">Open in one tap</div>
        </div>
      </Link>

      <NavGroup label="Health" items={primaryNav} onNavigate={onNavigate} conflictCount={conflicts.length} />
      <NavGroup label="Sources" items={dataNav} onNavigate={onNavigate} conflictCount={conflicts.length} />
      <NavGroup label="Trust" items={trustNav} onNavigate={onNavigate} conflictCount={conflicts.length} />
    </div>
  );
}

function NavGroup({
  label,
  items,
  onNavigate,
  conflictCount,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
  conflictCount: number;
}) {
  return (
    <div>
      <div className="label-xs px-3 pb-2 text-ink-400">{label}</div>
      <nav className="space-y-0.5">
        {items.map(({ to, label: l, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-ink-900 text-white'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-white' : 'text-ink-400')} />
                <span className="flex-1 truncate">{l}</span>
                {badge === 'conflicts' && conflictCount > 0 && (
                  <Badge tone={isActive ? 'neutral' : 'caution'} className="shrink-0">
                    {conflictCount}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* --- Shared page frame ---------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            {eyebrow && <div className="label-xs mb-2.5 text-ink-400">{eyebrow}</div>}
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.028em] text-ink-900 sm:text-[30px]">
              {title}
            </h1>
            {description && (
              <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9', className)}>{children}</div>
  );
}
