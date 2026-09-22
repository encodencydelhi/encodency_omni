import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { MetricDelta } from "@/types/common";
import { TrendIndicator } from "./trend-indicator";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  delta?: MetricDelta | null;
  comparisonLabel?: string;
  /** Small supporting line, e.g. "4 awaiting review". */
  hint?: ReactNode;
  /** Marks a metric that needs attention without shouting about it. */
  emphasis?: "default" | "warning" | "danger";
  className?: string;
}

const EMPHASIS_STYLES = {
  default: "",
  warning: "border-warning/25 bg-warning-subtle/40",
  danger: "border-danger/25 bg-danger-subtle/40",
} as const;

const ICON_STYLES = {
  default: "bg-muted text-muted-foreground",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
} as const;

/**
 * A single measurement. Values stay at a readable size deliberately — a wall
 * of oversized numbers reads as a template, not as an operations console.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  delta,
  comparisonLabel = "vs. last 30 days",
  hint,
  emphasis = "default",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-sm border border-border bg-card p-3 shadow-xs",
        EMPHASIS_STYLES[emphasis],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-sm"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>

      <p className="text-lg font-semibold leading-none tracking-tight tabular text-foreground">{value}</p>

      {delta ? <TrendIndicator delta={delta} comparisonLabel={comparisonLabel} /> : null}
      {hint ? <p className="text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
