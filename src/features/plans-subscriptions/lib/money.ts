import { formatCurrency } from "@/lib/utils/format";

/** Whole-currency minor units formatted for display; zero reads as a dash. */
export function money(minor: number, currency: string, compact = false): string {
  return minor === 0 ? "-" : formatCurrency(minor, currency, { compact });
}

/** Sums are never mixed across currencies: each currency is listed on its own. */
export function moneyTotals(totals: Record<string, number>, compact = false): string {
  const entries = Object.entries(totals).filter(([, minor]) => minor > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "-";
  return entries.map(([currency, minor]) => formatCurrency(minor, currency, { compact })).join(" + ");
}

export function signedMoney(minor: number, currency: string): string {
  if (minor === 0) return "No change";
  return `${minor > 0 ? "+" : "-"}${formatCurrency(Math.abs(minor), currency)}`;
}

/** Annual price as savings against twelve months at the monthly price; null when it cannot be computed honestly. */
export function annualSavings(monthlyMinor: number, annualMinor: number): { amountMinor: number; percent: number } | null {
  if (!(monthlyMinor > 0) || !(annualMinor > 0)) return null;
  const full = monthlyMinor * 12;
  return { amountMinor: full - annualMinor, percent: Math.round(((full - annualMinor) / full) * 1000) / 10 };
}

/** "14900" typed by a person in major units -> minor units. Empty or invalid becomes 0. */
export function toMinor(value: string): number {
  const number = Number(value.replace(/[, ]/g, ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0;
}

export function fromMinor(minor: number): string {
  return minor > 0 ? String(minor / 100) : "";
}
