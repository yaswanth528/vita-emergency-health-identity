import {
  Activity,
  CalendarClock,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  ScrollText,
  Send,
  ShieldCheck,
  Siren,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AccountChip, NotificationBell } from '@/components/system/PlatformUI';
import { Wordmark } from '@/components/system/Wordmark';
import { Badge } from '@/components/ui';
import { clinicianById, clinicianUser } from '@/data/platform';
import { useEmergencyAlerts, useVita } from '@/hooks/useVita';
import { cn } from '@/lib/utils';

/* ============================================================================
   ClinicianShell
   ----------------------------------------------------------------------------
   Same design system as the patient app, deliberately different priorities.

   The patient shell opens on "is my record in order and who can see it". This
   one opens on "who needs me right now", so the nav is ordered by urgency, the
   emergency count is always visible in the chrome, and the density is higher.

   What is absent matters as much: there is no consent-management item here.
   A clinician can ask, and can break glass with a reason — they cannot
   administer another person's permissions.
   ========================================================================== */

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: 'emergency' | 'requests';
}

const workNav: NavItem[] = [
  { to: '/clinician', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/clinician/patients', label: 'Patients', icon: UsersRound },
  { to: '/clinician/emergency', label: 'Emergency', icon: Siren, badge: 'emergency' },
];

const flowNav: NavItem[] = [
  { to: '/clinician/requests', label: 'Requests', icon: Send, badge: 'requests' },
  { to: '/clinician/new-patient', label: 'New patient', icon: UserPlus },
];

const recordNav: NavItem[] = [
  { to: '/clinician/timeline', label: 'Clinical timeline', icon: CalendarClock },
  { to: '/clinician/audit', label: 'Audit log', icon: ScrollText },
  { to: '/clinician/settings', label: 'Security', icon: Activity },
];

export function ClinicianShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signInAs } = useVita();
  const alerts = useEmergencyAlerts();

  /* Deep-linking into the clinician side signs you in as the clinician. This is
     a prototype affordance so judges never hit a dead end; production would
     redirect to an authentication challenge instead. */
  useEffect(() => {
    if (!user || user.role !== 'clinician') signInAs('clinician');
  }, [user, signInAs]);

  const clinician = clinicianById(user?.clinicianId ?? 'cl-rao');

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
        <div className="flex items-center gap-1">
          <NotificationBell recipientId={clinicianUser.id} href="/clinician/notifications" />
          <AccountChip compact />
        </div>
      </header>

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
              <ShellNav onNavigate={() => setMobileOpen(false)} alertCount={alerts.length} />
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
            <ShellNav alertCount={alerts.length} />
          </div>
          <div className="border-t border-line px-3 py-3">
            <div className="rounded-md bg-canvas-sunk px-3 py-2.5">
              <div className="label-xs text-ink-400">On shift</div>
              <p className="mt-1 text-[12.5px] font-semibold text-ink-900">{clinician?.name}</p>
              <p className="text-[11px] text-ink-500">
                {clinician?.department} · {clinician?.organisation}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-verified-500" />
                <span className="font-mono text-[10px] text-ink-500">
                  {clinician?.licenceId} · verified
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* --- Content ------------------------------------------------------ */}
        <div className="min-w-0 flex-1">
          {/* Desktop top bar — the emergency count lives in the chrome so it is
              visible from every screen, not only the overview. */}
          <div className="sticky top-0 z-20 hidden items-center gap-4 border-b border-line bg-canvas/95 px-8 py-2.5 backdrop-blur-sm lg:flex">
            {alerts.length > 0 ? (
              <button
                onClick={() => navigate('/clinician/emergency')}
                className="flex items-center gap-2 rounded-md border border-critical-300 bg-critical-50 px-2.5 py-1.5 transition-colors hover:bg-critical-100/70"
              >
                <span className="size-1.5 rounded-full bg-critical-500 pulse-dot" />
                <span className="text-[12.5px] font-semibold text-critical-700">
                  {alerts.length} active emergency{alerts.length === 1 ? '' : ' alerts'}
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-2 text-[12.5px] text-ink-400">
                <span className="size-1.5 rounded-full bg-verified-500" />
                No active emergencies
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell recipientId={clinicianUser.id} href="/clinician/notifications" />
              <AccountChip />
            </div>
          </div>

          <main key={location.pathname} className="rise">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function ShellNav({
  onNavigate,
  alertCount,
}: {
  onNavigate?: () => void;
  alertCount: number;
}) {
  const { requests } = useVita();
  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <NavGroup label="Care" items={workNav} onNavigate={onNavigate} alertCount={alertCount} pending={pending} />
      <NavGroup label="Access" items={flowNav} onNavigate={onNavigate} alertCount={alertCount} pending={pending} />
      <NavGroup label="Record" items={recordNav} onNavigate={onNavigate} alertCount={alertCount} pending={pending} />
    </div>
  );
}

function NavGroup({
  label,
  items,
  onNavigate,
  alertCount,
  pending,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
  alertCount: number;
  pending: number;
}) {
  return (
    <div>
      <div className="label-xs px-3 pb-2 text-ink-400">{label}</div>
      <nav className="space-y-0.5">
        {items.map(({ to, label: l, icon: Icon, end, badge }) => {
          const count = badge === 'emergency' ? alertCount : badge === 'requests' ? pending : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors duration-150',
                  isActive ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      isActive ? 'text-white' : badge === 'emergency' && count > 0 ? 'text-critical-500' : 'text-ink-400',
                    )}
                  />
                  <span className="flex-1 truncate">{l}</span>
                  {count > 0 && (
                    <Badge tone={badge === 'emergency' ? 'critical' : isActive ? 'neutral' : 'caution'}>
                      {count}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/* --- Page frame, matching the patient shell's ---------------------------------- */

export function ClinicianPageHeader({
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
      <div className="mx-auto max-w-[1140px] px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            {eyebrow && <div className="label-xs mb-2.5 text-ink-400">{eyebrow}</div>}
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.028em] text-ink-900">
              {title}
            </h1>
            {description && (
              <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-500">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function ClinicianPageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-[1140px] px-5 py-7 sm:px-8', className)}>{children}</div>
  );
}
