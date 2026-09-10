import { cn } from "@/lib/utils/cn";
import { formatCompactNumber, formatPercent } from "@/lib/utils/format";
import type { Tone } from "@/types/common";

interface UsageProgressProps {
  used: number;
  limit: number | null;
  unit?: string;
  label?: string;
  /** Hides the numeric row, for dense table cells. */
  compact?: boolean;
  className?: string;
}

const BAR_TONES: Record<Tone, string> = {
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-neutral",
};

/** Bands mirror `resolveUsageStatus`, so bar colour and status label agree. */
function toneForPercent(percent: number): Tone {
  if (percent >= 95) return "danger";
  if (percent >= 75) return "warning";
  return "success";
}

export function UsageProgress({ used, limit, unit, label, compact = false, className }: UsageProgressProps) {
  const isUnmetered = limit === null;
  const percent = isUnmetered ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const tone = isUnmetered ? "neutral" : toneForPercent(percent);

  return (
    <div className={cn("min-w-28 space-y-1.5", className)}>
      {!compact ? (
        <div className="flex items-baseline justify-between gap-3 text-2xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular text-foreground">
            {formatCompactNumber(used)}
            {isUnmetered ? (
              <span className="text-muted-foreground"> / unmetered</span>
            ) : (
              <span className="text-muted-foreground"> / {formatCompactNumber(limit)}</span>
            )}
            {unit ? <span className="text-muted-foreground"> {unit}</span> : null}
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ?? "Usage"}
        >
          <div
            className={cn("h-full rounded-full transition-[width]", BAR_TONES[tone])}
            style={{ width: `${isUnmetered ? 6 : Math.max(percent, 2)}%` }}
          />
        </div>
        {compact ? (
          <span className="w-9 shrink-0 text-right text-2xs tabular text-muted-foreground">
            {isUnmetered ? "—" : formatPercent(percent)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
