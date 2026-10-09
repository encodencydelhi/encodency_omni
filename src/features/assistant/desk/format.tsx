import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DeskRange } from "./types";

export const RANGE_TABS: Array<{ id: DeskRange; label: string }> = [
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "all", label: "All Time" },
];

export const RANGE_NOUN: Record<DeskRange, string> = { "7d": "in the last 7 days", "30d": "in the last 30 days", "90d": "in the last 90 days", all: "so far" };

/** 1,234 -> "1.2k", 2,450,000 -> "2.5M": big token counts stay readable in a tile. */
export function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export const full = (value: number) => value.toLocaleString("en-IN");

export function seconds(ms: number): string {
  if (ms <= 0) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** What the assistant did, in words (the model's tool names are internal). */
export const TOOL_LABEL: Record<string, string> = {
  navigate_to_page: "Pointed To A Page",
  draft_support_ticket: "Prepared A Support Ticket",
  find_my_tickets: "Looked Up Tickets",
};
export const CARD_LABEL: Record<string, string> = { navigate: "Page Button", ticket_draft: "Ticket Draft", tickets: "Ticket List" };
export const toolLabel = (name: string) => TOOL_LABEL[name] ?? name;
export const cardLabel = (name: string) => CARD_LABEL[name.split(":")[0]!] ?? name;

export const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", MANAGER: "Manager", VIEWER: "Viewer" };

/** "▲ 12%" against the previous period of the same length (nothing to compare on "All time"). */
export function Delta({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-slate-400">no earlier data</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold", value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500")}>
      <Icon className="size-3" aria-hidden="true" />
      {Math.abs(value)}%<span className="ml-1 font-medium text-slate-400">vs before</span>
    </span>
  );
}
