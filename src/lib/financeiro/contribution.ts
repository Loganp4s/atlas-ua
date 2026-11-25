/** Parses a user-typed contribution amount; returns null when not a positive value with ≤ 2 decimals. */
export function parseContributionAmount(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
