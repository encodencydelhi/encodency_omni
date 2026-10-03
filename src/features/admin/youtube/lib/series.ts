import { toSeriesPoint } from "../data/mappers";
import type { AnalyticsSeriesPoint } from "../live/youtube-dto";
import type { SeriesPoint } from "../types";

const DAY_MS = 86_400_000;

/** Every calendar day of a range, with the days YouTube returned data for filled in and the rest `null` (a gap, not a zero). */
export function fillSeries(range: { startDate: string; endDate: string }, points: AnalyticsSeriesPoint[]): SeriesPoint[] {
  const byDate = new Map(points.map((p) => [p.date, toSeriesPoint(p)]));
  const out: SeriesPoint[] = [];
  const start = Date.parse(`${range.startDate}T00:00:00.000Z`);
  const end = Date.parse(`${range.endDate}T00:00:00.000Z`);
  for (let t = start; t <= end; t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push(byDate.get(date) ?? { date, views: null, watchTime: null, subscribers: null, avgViewDuration: null, impressions: null, ctr: null });
  }
  return out;
}
