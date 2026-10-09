const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: new Date(iso).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** "2d 4h", "3h 10m", "45m": a span of milliseconds in the units a person reads. */
export function span(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MINUTE) return "<1m";
  if (abs < HOUR) return `${Math.round(abs / MINUTE)}m`;
  if (abs < DAY) {
    const hours = Math.floor(abs / HOUR);
    const minutes = Math.round((abs % HOUR) / MINUTE);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(abs / DAY);
  const hours = Math.round((abs % DAY) / HOUR);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

/** Time left until a deadline, or how long past it. */
export function dueText(iso: string, now = Date.now()): { text: string; late: boolean } {
  const diff = new Date(iso).getTime() - now;
  return diff >= 0 ? { text: `${span(diff)} left`, late: false } : { text: `${span(diff)} overdue`, late: true };
}

/** Average hours as a short label ("1.5h", "2d 3h"); null stays a dash. */
export function hoursLabel(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  return span(hours * HOUR);
}

export function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}
