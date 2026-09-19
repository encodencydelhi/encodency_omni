import { cn } from "@/lib/utils/cn";
import type { UsageResourceStatus } from "../data/types";

const TONES: Record<UsageResourceStatus, string> = {
  healthy: "bg-success",
  high: "bg-info",
  near_limit: "bg-warning",
  exceeded: "bg-danger",
  not_metered: "bg-neutral",
};

/** A slim progress bar whose colour follows the same bands as the status badge beside it. */
export function UsageBar({
  utilization,
  status,
  label,
  className,
}: {
  utilization: number | null;
  status: UsageResourceStatus;
  label: string;
  className?: string;
}) {
  const width = utilization === null ? 6 : Math.min(100, Math.max(utilization, utilization > 0 ? 2 : 0));
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-sm bg-muted", className)}
      role="progressbar"
      aria-label={`${label} utilisation`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={utilization === null ? undefined : Math.round(Math.min(utilization, 100))}
    >
      <div className={cn("h-full rounded-sm transition-[width]", TONES[status])} style={{ width: `${width}%` }} />
    </div>
  );
}
