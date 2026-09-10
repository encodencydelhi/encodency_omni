import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { MetricDelta } from "@/types/common";
import { TrendIndicator } from "./trend-indicator";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
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
  delta,
  comparisonLabel = "vs. last 30 days",
  hint,
  emphasis = "default",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs",
        EMPHASIS_STYLES[emphasis],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", ICON_STYLES[emphasis])}>
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>

      <p className="text-2xl font-semibold leading-none tracking-tight tabular text-foreground">{value}</p>

      {delta ? <TrendIndicator delta={delta} comparisonLabel={comparisonLabel} /> : null}
      {hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
