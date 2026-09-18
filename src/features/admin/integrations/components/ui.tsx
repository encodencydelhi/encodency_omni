"use client";

/**
 * Integration-specific UI, built on the shared OmniPlatform workspace
 * primitives. The primitives are re-exported from here so every file in this
 * module imports from one place, and so they can move to a shared package
 * later without touching the pages.
 */

import type { ComponentType, ReactNode } from "react";
import { BarChart3, Loader2, Mail, Plug } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { MODULE_META, PERMISSION_STATUS_META, SEVERITY_META, STATUS_META } from "../integrations-data/config";
import { clientName } from "../integrations-data/selectors";
import { useHydrated, useNow } from "../integrations-data/hooks";
import { useIntegrations } from "../store/integrations-store";
import type { ConnectionStatus, ModuleKey, PermissionStatus, ProviderId, Severity } from "../integrations-data/types";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Hint } from "@/features/admin/x/components/ui";

export {
  ActionMenu,
  Badge,
  Button,
  Card,
  CardHeader,
  ChoiceCard,
  ConfirmDialog,
  DefinitionRow,
  EmptyState,
  FormField,
  Hint,
  InfoTip,
  Meter,
  Notice,
  Pagination,
  SearchField,
  Segmented,
  SelectMenu,
  SettingRow,
  Skeleton,
  SortHeader,
  UnderlineTabs,
  ViewLink,
  buttonClass,
  numClass,
  tdClass,
  thClass,
  useDebounced,
  x,
} from "@/features/admin/x/components/ui";
export type { MenuItem, SelectOption } from "@/features/admin/x/components/ui";

/* ------------------------------------------------------------------ */
/* Provider logos                                                      */
/* ------------------------------------------------------------------ */

const CHANNEL_NAME: Partial<Record<ProviderId, string>> = {
  meta: "Meta & Instagram",
  linkedin: "LinkedIn",
  "google-business": "Google Business",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  x: "X (Twitter)",
  "search-console": "Search Console",
  "website-tracking": "Website",
};

function LetterMark({ letter, background, color = "#fff" }: { letter: string; background: string; color?: string }) {
  return (
    <span className="grid size-full place-items-center text-[45%] font-bold" style={{ background, color }}>
      {letter}
    </span>
  );
}

function CustomMark({ providerId }: { providerId: ProviderId }) {
  switch (providerId) {
    case "ga4":
      return (
        <span className="grid size-full place-items-center bg-white">
          <BarChart3 className="size-[70%] text-[#F9AB00]" strokeWidth={2.6} />
        </span>
      );
    case "smtp":
      return (
        <span className="grid size-full place-items-center bg-[#EFF4FF]">
          <Mail className="size-[62%] text-[#1D4ED8]" />
        </span>
      );
    case "mailchimp":
      return <LetterMark letter="M" background="#FFE01B" color="#241C15" />;
    case "tiktok":
      return <LetterMark letter="T" background="#0F1419" />;
    case "hubspot":
      return <LetterMark letter="H" background="#FF7A59" />;
    default:
      return (
        <span className="grid size-full place-items-center bg-[#F1F4F8]">
          <Plug className="size-[60%] text-[#6B7890]" />
        </span>
      );
  }
}

export function ProviderLogo({ providerId, className, muted }: { providerId: ProviderId; className?: string; muted?: boolean }) {
  const channel = CHANNEL_NAME[providerId];
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[#E4E9F0] bg-white p-[5px]",
        muted && "opacity-50 grayscale",
        className,
      )}
    >
      <span className="block size-full overflow-hidden rounded-[4px]">
        {channel ? <ChannelLogo channel={channel} className="size-full" /> : <CustomMark providerId={providerId} />}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

/** The single status chip. Text label + dot, so meaning never rides on colour alone. */
export function StatusChip({ status, progress, className }: { status: ConnectionStatus; progress?: number; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset", meta.chip, className)}>
      {status === "syncing" ? <Loader2 className="size-3 animate-spin" /> : <span className={cn("size-1.5 rounded-full", meta.dot)} />}
      {meta.label}
      {status === "syncing" && progress !== undefined && <span className="tabular-nums opacity-80">{progress}%</span>}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={cn("inline-flex h-5 items-center whitespace-nowrap rounded-sm px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.03em] ring-1 ring-inset", meta.chip)}>
      {meta.label}
    </span>
  );
}

export function PermissionChip({ status }: { status: PermissionStatus }) {
  const meta = PERMISSION_STATUS_META[status];
  return <span className={cn("inline-flex h-[22px] items-center whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset", meta.chip)}>{meta.label}</span>;
}

/** Health dot for dense places: a coloured dot with the label in a tooltip and for screen readers. */
export function HealthDot({ status }: { status: ConnectionStatus }) {
  const meta = STATUS_META[status];
  return (
    <Hint text={meta.label}>
      <span className="inline-flex" aria-label={meta.label}>
        <span className={cn("size-2 rounded-full", meta.dot, status === "syncing" && "animate-pulse")} />
      </span>
    </Hint>
  );
}

/* ------------------------------------------------------------------ */
/* Modules & clients                                                   */
/* ------------------------------------------------------------------ */

export function ModuleChips({ modules, max = 3, className, nowrap }: { modules: ModuleKey[]; max?: number; className?: string; nowrap?: boolean }) {
  const unique = [...new Set(modules)];
  const shown = unique.slice(0, max);
  const rest = unique.slice(max);
  if (!unique.length) return <span className="text-[11.5px] text-[#98A2B3]">Not used yet</span>;
  return (
    <span className={cn("flex items-center gap-1", nowrap ? "flex-nowrap whitespace-nowrap" : "flex-wrap", className)}>
      {shown.map((module) => (
        <span key={module} className="inline-flex h-5 items-center rounded-sm bg-[#F1F4F8] px-1.5 text-[10.5px] font-medium text-[#3C4A66]">
          {MODULE_META[module].label}
        </span>
      ))}
      {rest.length > 0 && (
        <Hint text={rest.map((module) => MODULE_META[module].label).join(", ")}>
          <span tabIndex={0} className="inline-flex h-5 cursor-default items-center rounded-sm bg-[#F1F4F8] px-1.5 text-[10.5px] font-semibold text-[#6B7890]">
            +{rest.length}
          </span>
        </Hint>
      )}
    </span>
  );
}

export function ClientTag({ clientId, className }: { clientId: string | null; className?: string }) {
  const { data } = useIntegrations();
  const client = data.clients.find((item) => item.id === clientId);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-[12px] text-[#3C4A66]", className)}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: client?.color ?? "#6D28D9" }} />
      <span className="truncate">{clientName(data.clients, clientId)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

/** Hydration-safe relative time. Renders a stable placeholder on the server. */
export function RelativeTime({ iso, future, fallback = "—" }: { iso: string | null; future?: boolean; fallback?: string }) {
  const hydrated = useHydrated();
  // The ticking clock value, not Date.now(), keeps render pure and the label current.
  const now = useNow();
  if (!iso) return <span className="text-[#98A2B3]">{fallback}</span>;
  if (!hydrated) return <span className="text-[#98A2B3]">…</span>;
  const date = parseISO(iso);
  const diff = date.getTime() - now;
  const text = Math.abs(diff) < 60_000 ? "just now" : formatDistanceToNowStrict(date, { addSuffix: true });
  return (
    <time dateTime={iso} title={date.toLocaleString()} className={cn(future && diff < 0 && "text-[#B54708]")}>
      {text}
    </time>
  );
}

/* ------------------------------------------------------------------ */
/* KPI tile                                                            */
/* ------------------------------------------------------------------ */

export function KpiTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet";
  onClick?: () => void;
  active?: boolean;
}) {
  const tones = {
    neutral: "bg-[#F1F4F8] text-[#475467]",
    green: "bg-[#ECFAF3] text-[#067647]",
    amber: "bg-[#FFF7E8] text-[#B54708]",
    red: "bg-[#FEF1F2] text-[#C81E2B]",
    blue: "bg-[#EFF4FF] text-[#1D4ED8]",
    violet: "bg-[#F4F0FF] text-[#6D28D9]",
  };
  const content = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-[#6B7890]">{label}</span>
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-sm", tones[tone])}>
          <Icon className="size-3.5" />
        </span>
      </span>
      <span className="mt-1 block text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#0F1B3D] tabular-nums">{value}</span>
      {detail && <span className="mt-0.5 block truncate text-[11.5px] text-[#98A2B3]">{detail}</span>}
    </>
  );
  const base = cn(
    "min-w-0 rounded-[10px] border border-[#E4E9F0] bg-white px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition",
    active && "border-[#2563EB]/40 ring-[3px] ring-[#2563EB]/8",
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(base, "hover:border-[#C9D1DC] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2563EB]/25")}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}

/** Dotted-leader label/value row used in compact cards. */
export function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-[12px]">
      <span className="shrink-0 text-[#6B7890]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#24324F]">{children}</span>
    </div>
  );
}
