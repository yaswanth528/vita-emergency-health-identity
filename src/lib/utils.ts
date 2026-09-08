/** Minimal class-name joiner. Falsy values are dropped. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Clamp helper used by meters and sparklines. */
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
