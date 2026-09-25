/**
 * Turns the ScheduleBuilder's display labels (`Sep 14, 2026` + `10:00 AM`)
 * into the ISO 8601-with-explicit-offset string TASK-11B requires, and applies
 * the backend's two window checks before we spend a request on them.
 */

export const MIN_LEAD_MS = 2 * 60 * 1000;
export const MAX_HORIZON_MS = 180 * 24 * 60 * 60 * 1000;

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const DATE_LABEL = /^([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})$/;
const TIME_LABEL = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/** `"Sep 14, 2026"` + `"10:00 AM"` → local Date, or null when unparseable. */
export function parseScheduleDateTime(dateLabel?: string, timeLabel?: string): Date | null {
  const date = DATE_LABEL.exec((dateLabel ?? "").trim());
  const time = TIME_LABEL.exec((timeLabel ?? "").trim());
  if (!date || !time) return null;

  const month = MONTHS[date[1]!];
  if (month === undefined) return null;

  const day = Number(date[2]);
  const year = Number(date[3]);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;

  const rawHours = Number(time[1]);
  const minutes = Number(time[2]);
  const meridiem = time[3]!.toUpperCase();
  if (rawHours < 1 || rawHours > 12 || minutes > 59) return null;

  const hours24 = meridiem === "AM" ? rawHours % 12 : (rawHours % 12) + 12;
  const parsed = new Date(year, month, day, hours24, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Backend contract: ISO 8601 with an explicit `Z` or `±hh:mm` offset. */
export function toIsoWithOffset(date: Date): string {
  return date.toISOString();
}

/** Returns a message when the value is outside the backend window, else null. */
export function scheduleWindowError(date: Date, now: Date = new Date()): string | null {
  const time = date.getTime();
  if (time < now.getTime() + MIN_LEAD_MS) {
    return "scheduledFor must be at least 2 minutes from now.";
  }
  if (time > now.getTime() + MAX_HORIZON_MS) {
    return "scheduledFor must be within 180 days from now.";
  }
  return null;
}

/** Label → ISO in one step; throws nothing, reports the reason instead. */
export function composeScheduledFor(
  dateLabel?: string,
  timeLabel?: string,
  now: Date = new Date(),
): { scheduledFor: string } | { error: string } {
  const parsed = parseScheduleDateTime(dateLabel, timeLabel);
  if (!parsed) {
    return { error: "Pick a valid date and time to schedule this post." };
  }
  const windowError = scheduleWindowError(parsed, now);
  if (windowError) return { error: windowError };
  return { scheduledFor: toIsoWithOffset(parsed) };
}

/** Next `days` calendar days as the ScheduleBuilder's `Sep 14, 2026` labels. */
export function upcomingDateLabels(days = 14, from: Date = new Date()): string[] {
  const labels: string[] = [];
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  for (let i = 1; i <= days; i += 1) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    labels.push(formatter.format(day));
  }
  return labels;
}

/** 30-minute slots across waking hours, as `10:00 AM` labels. */
export function timeLabels(): string[] {
  const labels: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const suffix = hour < 12 ? "AM" : "PM";
      const twelve = hour % 12 === 0 ? 12 : hour % 12;
      labels.push(`${twelve}:${minute === 0 ? "00" : "30"} ${suffix}`);
    }
  }
  return labels;
}
