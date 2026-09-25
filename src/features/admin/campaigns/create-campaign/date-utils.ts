/**
 * Date utilities for Campaign scheduling and ISO 8601 YYYY-MM-DD conversions.
 */

/**
 * Normalizes user-input dates (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, or natural language)
 * into a strict YYYY-MM-DD calendar date string. Returns undefined if invalid.
 */
export function toCalendarDateString(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // 1. Strict YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      return trimmed;
    }
    return undefined;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY (Universal in India / UK)
  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // 3. YYYY/MM/DD
  const ymdMatch = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (ymdMatch) {
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]);
    const d = Number(ymdMatch[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // 4. Natural language e.g. "Mar 15, 2025" or "15 Mar 2025"
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth();
    const d = parsed.getDate();
    const date = new Date(Date.UTC(y, m, d));
    return date.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Calculates duration in days between two date strings (inclusive).
 */
export function calculateCampaignDuration(startStr?: string, endStr?: string): string {
  const s = toCalendarDateString(startStr);
  const e = toCalendarDateString(endStr);
  if (!s || !e) return "";
  const d1 = new Date(`${s}T00:00:00Z`).getTime();
  const d2 = new Date(`${e}T00:00:00Z`).getTime();
  const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays <= 0) return "Invalid range";
  return `${diffDays} days`;
}
