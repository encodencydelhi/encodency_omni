import type { ReportDelivery, WorkspaceSchedule } from "@/services/admin/workspace-reports.service";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS = DAYS.map((label, value) => ({ value, label }));

/** "Every Monday at 09:00 (Asia/Kolkata)" / "Monthly on day 1 at 09:00 (Asia/Kolkata)". */
export function describeSchedule(s: Pick<WorkspaceSchedule, "frequency" | "dayOfWeek" | "dayOfMonth" | "timeOfDay" | "timezone" | "rangeDays">): string {
  const when = s.frequency === "weekly" ? `Every ${DAYS[s.dayOfWeek ?? 1] ?? "Monday"}` : `Monthly on day ${s.dayOfMonth ?? 1}`;
  return `${when} at ${s.timeOfDay} (${s.timezone}), last ${s.rangeDays} days`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** What happened to a report after it was made: only what the server recorded, in plain words. */
export function describeDeliveries(deliveries: ReportDelivery[] | undefined): { text: string; tone: "ok" | "warn" | "none" } {
  if (!deliveries?.length) return { text: "Not sent", tone: "none" };
  const emails = deliveries.filter((d) => d.channel === "email");
  const sent = emails.filter((d) => d.status === "sent").length;
  const failed = emails.filter((d) => d.status === "failed").length;
  const skipped = emails.filter((d) => d.status === "skipped").length;
  const parts: string[] = [];
  if (emails.length) parts.push(`${sent} of ${emails.length} emailed`);
  if (failed) parts.push(`${failed} failed`);
  if (skipped) parts.push(`${skipped} not sent (no mail account)`);
  const app = deliveries.find((d) => d.channel === "in_app");
  if (app) parts.push(app.status === "sent" ? "owners notified in the app" : "in-app notice skipped");
  return { text: parts.join(", "), tone: failed || skipped ? "warn" : "ok" };
}

/** Recipients typed as a list separated by commas, semicolons, spaces or new lines. */
export function parseRecipients(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
}

const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,}$/;
export const invalidRecipients = (list: string[]): string[] => list.filter((x) => !EMAIL.test(x));
