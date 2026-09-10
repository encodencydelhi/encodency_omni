import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDelta } from "@/lib/utils/format";
import type { MetricDelta } from "@/types/common";

interface TrendIndicatorProps {
  delta: MetricDelta;
  /** Optional label such as "vs. last month". */
  comparisonLabel?: string;
  className?: string;
}

/**
 * Colour follows meaning, not direction: a rise in failed jobs is bad, a rise
 * in revenue is good, and the component is told which is which.
 */
export function TrendIndicator({ delta, comparisonLabel, className }: TrendIndicatorProps) {
  const { changePercent, direction } = delta;
  const isFlat = Math.abs(changePercent) < 0.05;
  const isPositiveOutcome = direction === "up-is-good" ? changePercent > 0 : changePercent < 0;

  const Icon = isFlat ? MinusIcon : changePercent > 0 ? TrendingUpIcon : TrendingDownIcon;

  return (
    <span className={cn("inline-flex items-center gap-1 text-2xs font-medium", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1",
          isFlat ? "text-muted-foreground" : isPositiveOutcome ? "text-success" : "text-danger",
        )}
      >
        <Icon className="size-3" />
        {isFlat ? "No change" : formatDelta(changePercent)}
      </span>
      {comparisonLabel ? <span className="text-muted-foreground">{comparisonLabel}</span> : null}
    </span>
  );
}
