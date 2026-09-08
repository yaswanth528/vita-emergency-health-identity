import { useState } from 'react';
import { Pill, Stethoscope } from 'lucide-react';
import { conditions, medications } from '@/data/clinical';
import { cn } from '@/lib/utils';

/* ============================================================================
   HealthGraph
   ----------------------------------------------------------------------------
   A medication list and a condition list are two flat lists. The clinically
   useful object is the relation between them: which drug is treating what, and
   what a condition is currently being treated with.

   Reconciliation produces that relation (`Medication.treats`), so this view
   draws it. Hovering either side isolates the subgraph it participates in —
   which is how a clinician actually reads it: "she's on four drugs; two of them
   are for the heart".
   ========================================================================== */

const ROW_H = 46;
const ROW_GAP = 10;
/** Nominal viewBox width; the SVG stretches horizontally to fit its container. */
const VB_W = 1000;

export function HealthGraph() {
  const [hovered, setHovered] = useState<{ side: 'condition' | 'medication'; id: string } | null>(
    null,
  );

  const activeConditions = conditions.filter((c) => c.status === 'active');
  const shownMeds = medications.filter((m) => m.status !== 'discontinued');

  const rows = Math.max(activeConditions.length, shownMeds.length);
  const height = rows * ROW_H + (rows - 1) * ROW_GAP;

  const yFor = (index: number) => index * (ROW_H + ROW_GAP) + ROW_H / 2;

  const edges = shownMeds.flatMap((m, mi) =>
    m.treats
      .map((cid) => {
        const ci = activeConditions.findIndex((c) => c.id === cid);
        if (ci === -1) return null;
        return { medId: m.id, condId: cid, from: yFor(ci), to: yFor(mi) };
      })
      .filter((e): e is { medId: string; condId: string; from: number; to: number } => e !== null),
  );

  const isEdgeLit = (e: { medId: string; condId: string }) =>
    !hovered ||
    (hovered.side === 'condition' && hovered.id === e.condId) ||
    (hovered.side === 'medication' && hovered.id === e.medId);

  const isNodeLit = (side: 'condition' | 'medication', id: string) => {
    if (!hovered) return true;
    if (hovered.side === side) return hovered.id === id;
    return edges.some((e) =>
      side === 'condition'
        ? e.condId === id && e.medId === hovered.id
        : e.medId === id && e.condId === hovered.id,
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-line bg-canvas-sunk px-4 py-2.5">
        <span className="label-xs text-ink-400">Conditions</span>
        <span className="font-mono text-[10.5px] text-ink-400">
          {edges.length} treatment links · hover to isolate
        </span>
        <span className="label-xs text-ink-400">Medications</span>
      </div>

      <div className="relative p-4">
        <div className="grid grid-cols-[1fr_64px_1fr] gap-0 sm:grid-cols-[1fr_120px_1fr]">
          {/* Conditions */}
          <div className="flex flex-col gap-2.5">
            {activeConditions.map((c) => (
              <GraphNode
                key={c.id}
                lit={isNodeLit('condition', c.id)}
                icon={<Stethoscope className="size-3.5" />}
                title={c.name.value}
                sub={c.controlMarker?.value.split(' · ')[0] ?? c.code}
                severity={c.severity === 'critical' ? 'critical' : c.severity === 'significant' ? 'caution' : 'neutral'}
                onEnter={() => setHovered({ side: 'condition', id: c.id })}
                onLeave={() => setHovered(null)}
              />
            ))}
          </div>

          {/* Connector column */}
          <div className="relative" aria-hidden>
            <svg
              viewBox={`0 0 ${VB_W} ${height}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {edges.map((e, i) => (
                <path
                  key={i}
                  // Shallow control points. The SVG is stretched horizontally to
                  // fit a narrow column, so deep curves would collapse into a
                  // single crossing point and stop reading as separate links.
                  d={`M0,${e.from} C${VB_W * 0.18},${e.from} ${VB_W * 0.82},${e.to} ${VB_W},${e.to}`}
                  fill="none"
                  strokeWidth={isEdgeLit(e) ? 1.6 : 1}
                  className={cn(
                    'transition-[stroke,stroke-width] duration-200',
                    isEdgeLit(e) ? 'stroke-accent-500' : 'stroke-ink-100',
                  )}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>

          {/* Medications */}
          <div className="flex flex-col gap-2.5">
            {shownMeds.map((m) => (
              <GraphNode
                key={m.id}
                lit={isNodeLit('medication', m.id)}
                icon={<Pill className="size-3.5" />}
                title={`${m.name.value} ${m.dose.value}`}
                sub={m.frequency.value}
                severity={m.status === 'changed' ? 'caution' : 'neutral'}
                align="right"
                onEnter={() => setHovered({ side: 'medication', id: m.id })}
                onLeave={() => setHovered(null)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphNode({
  icon,
  title,
  sub,
  severity,
  lit,
  align = 'left',
  onEnter,
  onLeave,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  severity: 'critical' | 'caution' | 'neutral';
  lit: boolean;
  align?: 'left' | 'right';
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ height: ROW_H }}
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-3 transition-[opacity,border-color,background-color] duration-200',
        align === 'right' && 'flex-row-reverse text-right',
        lit ? 'opacity-100' : 'opacity-30',
        severity === 'critical'
          ? 'border-critical-100 bg-critical-50/60'
          : severity === 'caution'
            ? 'border-caution-100 bg-caution-50/60'
            : 'border-line bg-canvas-sunk/60',
      )}
    >
      <span
        className={cn(
          'shrink-0',
          severity === 'critical'
            ? 'text-critical-500'
            : severity === 'caution'
              ? 'text-caution-500'
              : 'text-ink-300',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink-900">
          {title}
        </span>
        {sub && (
          <span className="block truncate font-mono text-[10.5px] leading-tight text-ink-500">
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}
