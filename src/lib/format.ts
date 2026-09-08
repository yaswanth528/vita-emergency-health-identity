import type { ISODate } from '@/types';

/** The demo's reference "today". Everything relative is measured from here. */
export const TODAY = new Date('2026-09-09T08:41:00');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Aug 2026" */
export function formatDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

/** "12 Aug" — used where the year is already established by context. */
export function formatDayMonth(iso: ISODate): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

/** Whole days between an ISO date and the demo reference date. */
export function daysAgo(iso: ISODate): number {
  const then = new Date(`${iso}T00:00:00`);
  return Math.max(0, Math.round((TODAY.getTime() - then.getTime()) / 86_400_000));
}

/** "21 days ago" / "yesterday" / "3 years ago" */
export function relativeAge(iso: ISODate): string {
  const d = daysAgo(iso);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 45) return `${d} days ago`;
  const months = Math.round(d / 30.44);
  if (months < 22) return `${months} months ago`;
  return `${Math.round(d / 365.25)} years ago`;
}

/**
 * Freshness banding for source data. A number of days is not itself meaningful
 * to a clinician; whether it is fresh enough to act on is.
 */
export type FreshnessBand = 'current' | 'recent' | 'ageing' | 'stale';

export function freshnessBand(days: number): FreshnessBand {
  if (days <= 30) return 'current';
  if (days <= 90) return 'recent';
  if (days <= 365) return 'ageing';
  return 'stale';
}

export const freshnessLabel: Record<FreshnessBand, string> = {
  current: 'Current',
  recent: 'Recent',
  ageing: 'Ageing',
  stale: 'Stale',
};

/** "08:41:09" from a Date. */
export function clockTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

/** Elapsed seconds rendered as "00:07" — the emergency clock. */
export function elapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** File size for the document list. */
export function fileSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}
