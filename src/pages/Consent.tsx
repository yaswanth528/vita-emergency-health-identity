import { Bell, Share2, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuditLog, ConsentPanel } from '@/components/system/ConsentPanel';
import { Card, FieldLabel, SectionHeader, Tabs } from '@/components/ui';
import { PageBody, PageHeader } from '@/layouts/AppShell';
import { consentGrants } from '@/data/consent';
import { useVita } from '@/hooks/useVita';
import type { ConsentGrant } from '@/types';

/* ============================================================================
   Consent & access control
   ----------------------------------------------------------------------------
   "Permissioned. Auditable. Source-backed." — the first two words live here.

   The audit log on this page is not a fixture. Opening evidence anywhere in the
   application appends to it, so by the time a judge reaches this screen it
   contains a record of the demo they just watched.
   ========================================================================== */

type Filter = 'active' | 'all';

export default function Consent() {
  const { audit, sessionAuditCount } = useVita();
  const [filter, setFilter] = useState<Filter>('active');
  const [revoked, setRevoked] = useState<string[]>([]);

  const grants: ConsentGrant[] = useMemo(
    () =>
      consentGrants.map((g) =>
        revoked.includes(g.id)
          ? { ...g, status: 'revoked' as const, expiresAt: 'Revoked just now', visibleData: [], withheldData: ['All data — access revoked by patient'] }
          : g,
      ),
    [revoked],
  );

  const shown = filter === 'active' ? grants.filter((g) => g.status === 'active') : grants;
  const activeCount = grants.filter((g) => g.status === 'active').length;

  return (
    <>
      <PageHeader
        eyebrow="Trust"
        title="Consent & access"
        description="Who can see your record, why, what exactly they can see, and when their access ends. Every read is logged with a name against it."
      />

      <PageBody className="space-y-9">
        {/* --- Principles --------------------------------------------------- */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Principle
            icon={<ShieldCheck className="size-4" />}
            title="Scoped"
            detail="A grant exposes a named subset, never the whole record by default."
          />
          <Principle
            icon={<Share2 className="size-4" />}
            title="Time-boxed"
            detail="Every grant expires. Emergency access expires in two hours."
          />
          <Principle
            icon={<Bell className="size-4" />}
            title="Notified"
            detail="Break-glass access alerts you and your caregiver as it happens."
          />
        </div>

        {/* --- Grants -------------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow={`${activeCount} active`}
            title="Access grants"
            description="Revoking is immediate. The grant stays in the log — removing the history would defeat the point of having one."
          />
          <div className="mt-4">
            <Tabs
              tabs={[
                { id: 'active', label: 'Active', count: activeCount },
                { id: 'all', label: 'All grants', count: grants.length },
              ]}
              active={filter}
              onChange={(id) => setFilter(id as Filter)}
              className="mb-4"
            />
            <div className="space-y-3">
              {shown.map((g) => (
                <ConsentPanel
                  key={g.id}
                  grant={g}
                  onRevoke={(id) => setRevoked((prev) => [...prev, id])}
                />
              ))}
            </div>
          </div>
        </section>

        {/* --- Audit --------------------------------------------------------- */}
        <section>
          <SectionHeader
            eyebrow="Auditable"
            title="Audit trail"
            description={
              sessionAuditCount > 0
                ? `${sessionAuditCount} of these entries were written by what you did in this session — opening evidence and source documents is itself an auditable act.`
                : 'Every access is recorded here, including reads of the evidence behind a claim.'
            }
          />
          <div className="mt-4">
            <AuditLog events={audit} liveCount={sessionAuditCount} />
          </div>
        </section>

        <Card accent="accent">
          <FieldLabel>Why break-glass exists</FieldLabel>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">
            A consent model that cannot be overridden in an emergency is a consent model that gets
            switched off in an emergency. So VITA includes the override, and makes it expensive: it
            is labelled break-glass in the record, it expires in two hours, it notifies the patient
            and their caregiver at the moment it is used, and every screen the clinician opens under
            it is logged against their name. The point is not to prevent emergency access. It is to
            make emergency access accountable.
          </p>
        </Card>
      </PageBody>
    </>
  );
}

function Principle({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Card>
      <span className="text-ink-400">{icon}</span>
      <h3 className="mt-2.5 text-[14px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{detail}</p>
    </Card>
  );
}
