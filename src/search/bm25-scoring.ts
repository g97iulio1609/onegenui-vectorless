/** BM25 scoring constants and utility functions */

export const FIELD_BOOSTS: Record<string, number> = {
  title: 3.0,
  keywords: 2.0,
  summary: 1.5,
  content: 1.0,
};

export const ALL_FIELDS = Object.keys(FIELD_BOOSTS);
export const K1 = 1.2;
export const B = 0.75;
const HIGHLIGHT_RADIUS = 30;

export function sumValues(obj: Record<string, number>): number {
  let sum = 0;
  for (const v of Object.values(obj)) sum += v;
  return sum;
}

export function buildHighlights(
  rawFields: Record<string, string>,
  terms: Set<string>,
): string[] {
  const highlights: string[] = [];
  const combined = Object.values(rawFields).join(' ');
  const lower = combined.toLowerCase();

  for (const term of terms) {
    // Build regex that matches words starting with the stemmed term
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped + '\\w*', 'gi');
    const match = regex.exec(lower);
    if (!match) continue;

    const idx = match.index;
    const matchLen = match[0].length;
    const start = Math.max(0, idx - HIGHLIGHT_RADIUS);
    const end = Math.min(combined.length, idx + matchLen + HIGHLIGHT_RADIUS);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < combined.length ? '...' : '';
    highlights.push(`${prefix}${combined.slice(start, end)}${suffix}`);
  }

  return highlights;
}
