import { htmlToPlainText } from "../lib/rich-text";
import type { MasterContent, PlatformOverride, PlatformSchedule, UTMConfig } from "../types/content.types";
import { composeScheduledFor, immediateScheduledFor } from "./schedule-datetime";

export function deliveryCaption(master: Pick<MasterContent, "caption" | "hashtags" | "link"> & {cta?:string}, override?: PlatformOverride, utm?: UTMConfig): string {
  const caption = htmlToPlainText(override?.enabled ? override.caption ?? master.caption : master.caption).trim();
  const existing = new Set(caption.split(/\s+/));
  const tags = [...new Set((override?.enabled ? override.hashtags ?? master.hashtags : master.hashtags)
    .map(tag => tag.trim()).filter(Boolean).map(tag => tag.startsWith("#") ? tag : `#${tag}`))].filter(tag => !existing.has(tag));
  let link = override?.enabled ? override.link ?? master.link : master.link;
  if (link && utm && Object.values(utm).some(Boolean)) {
    const parsed = new URL(link);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Use a public HTTP or HTTPS link.");
    for (const [key, value] of Object.entries(utm)) if (value) parsed.searchParams.set(`utm_${key}`, value);
    link = parsed.toString();
  }
  const cta = override?.enabled ? override.cta ?? master.cta : master.cta;
  return [caption, cta && !caption.includes(cta) ? cta : "", tags.join(" "), link && !caption.includes(link) ? link : ""].filter(Boolean).join("\n\n");
}

export function deliveryTiming(choice?: PlatformSchedule, now = new Date()) {
  if (choice?.schedule === "draft") return { draft: true as const };
  if (choice?.schedule === "later") return composeScheduledFor(choice.date, choice.time, now);
  return { scheduledFor: immediateScheduledFor(now) };
}
