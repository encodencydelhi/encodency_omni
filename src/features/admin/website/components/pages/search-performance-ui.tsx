"use client";

import type { ReactNode } from "react";
import { BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "../../data/selectors";
import { Chip, StatTile, toneText } from "../ui/kit";

export function formatNumber(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "Not available" : value.toLocaleString();
}

export function formatPct(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "Not available" : `${value.toFixed(2)}%`;
}

export function formatPosition(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "Not available" : value.toFixed(1);
}

export function average(values: Array<number | null | undefined>) {
  const real = values.filter((value): value is number => value != null && Number.isFinite(value));
  return real.length ? real.reduce((sum, value) => sum + value, 0) / real.length : null;
}

export function getMovement(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const delta = previous - current;
  if (delta > 0) return { tone: "good" as Tone, label: `Improved ${delta.toFixed(1)}`, value: delta };
  if (delta < 0) return { tone: "bad" as Tone, label: `Declined ${Math.abs(delta).toFixed(1)}`, value: delta };
  return { tone: "muted" as Tone, label: "No change", value: 0 };
}

export function MovementChip({ current, previous }: { current: number | null | undefined; previous: number | null | undefined }) {
  const movement = getMovement(current, previous);
  if (!movement) return <span className="text-[11px] text-[#94A3B8]">No previous-period data</span>;
  return (
    <Chip tone={movement.tone} dot>
      {movement.label}
    </Chip>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  note,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-semibold tracking-[-0.01em] text-[#111C3A]">{title}</h1>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#6B7A94]">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      {note ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#E6EBF4] bg-[#F7F9FC] px-3 py-2">
          <Info className="mt-0.5 size-3.5 shrink-0 text-[#4A5A73]" aria-hidden />
          <p className="text-[11px] leading-relaxed text-[#4A5A73]">{note}</p>
        </div>
      ) : null}
    </div>
  );
}

export function MetricGrid({
  metrics,
}: {
  metrics: Array<{ label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: typeof BarChart3 }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <StatTile
          key={metric.label}
          label={metric.label}
          value={metric.value}
          sub={metric.sub}
          tone={metric.tone ?? "info"}
          icon={metric.icon ?? BarChart3}
        />
      ))}
    </div>
  );
}

export function PathLabel({ url }: { url: string }) {
  let label = url;
  try {
    const parsed = new URL(url);
    label = parsed.pathname === "/" ? parsed.hostname : parsed.pathname;
  } catch {
    label = url;
  }
  return (
    <span title={url} className="block max-w-[360px] truncate font-mono text-[11px] font-semibold text-[#28354C]">
      {label}
    </span>
  );
}

export function DetailMetric({ label, value, tone = "info" }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-[#E6EBF4] bg-[#FAFBFD] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">{label}</p>
      <p className={cn("mt-1 text-[18px] font-semibold tracking-[-0.02em]", toneText[tone])}>{value}</p>
    </div>
  );
}

export function UnavailableText({ children }: { children: ReactNode }) {
  return <span className="text-[11px] text-[#94A3B8]">{children}</span>;
}
