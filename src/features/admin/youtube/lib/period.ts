import type { DateRange } from "../live/youtube-api";

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of a UTC instant. The backend rejects an end date ahead of the UTC clock, so everything here is UTC. */
export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The range ending today (UTC) and covering `days` calendar days, e.g. 28 days -> start = today - 27. */
export function periodRange(days: number, now: number = Date.now()): DateRange {
  const end = Date.parse(`${utcDay(now)}T00:00:00.000Z`);
  return { startDate: utcDay(end - (days - 1) * DAY_MS), endDate: utcDay(end) };
}

/** The `days` days immediately before `periodRange(days)`, for "compared with the previous period". */
export function previousPeriodRange(days: number, now: number = Date.now()): DateRange {
  const current = periodRange(days, now);
  const start = Date.parse(`${current.startDate}T00:00:00.000Z`);
  return { startDate: utcDay(start - days * DAY_MS), endDate: utcDay(start - DAY_MS) };
}
