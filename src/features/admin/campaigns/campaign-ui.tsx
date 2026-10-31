import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";

/** "APP_PROMOTION" -> "App promotion". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** The API stores provider codes; these are the names people know them by. */
const CHANNEL_LABEL: Record<string, string> = { META: "Meta & Instagram", GOOGLE_BUSINESS: "Google Business", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", X: "X (Twitter)" };
export const channelLabel = (code: string) => CHANNEL_LABEL[code] ?? humanize(code);

/** A channel's logo with its readable name; `compact` keeps just the logo (name stays in the tooltip). */
export function ChannelTag({ channel, compact = false, className }: { channel: string; compact?: boolean; className?: string }) {
  const label = channelLabel(channel);
  if (compact) return <span title={label} className={cn("size-4 shrink-0", className)}><ChannelLogo channel={channel} className="size-4" /></span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-medium text-[#172044]", className)}>
      <span className="size-3.5 shrink-0"><ChannelLogo channel={channel} className="size-3.5" /></span>
      {label}
    </span>
  );
}

/** The compact admin card used across the campaign pages: slim header, 14px body padding. */
export function Section({ title, icon: Icon, action, children, className }: { title: ReactNode; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-sm border border-[#E2E8F0] bg-white shadow-xs", className)}>
      <div className="flex min-h-[40px] items-center justify-between gap-2 border-b border-[#EDF1F5] px-3.5 py-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[#172044]">
          {Icon ? <Icon className="size-3.5 text-[#75829D]" /> : null}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}
