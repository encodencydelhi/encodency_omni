import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { StatusRegistry } from "@/types/common";

interface StatusBadgeProps<TStatus extends string> {
  registry: StatusRegistry<TStatus>;
  status: TStatus;
  /** Adds a small dot for scanning long status columns quickly. */
  withDot?: boolean;
  className?: string;
}

const DOT_TONES = {
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-neutral",
} as const;

/**
 * Renders a status from its registry, so the label and colour of a state are
 * defined exactly once per domain.
 */
export function StatusBadge<TStatus extends string>({
  registry,
  status,
  withDot = false,
  className,
}: StatusBadgeProps<TStatus>) {
  const meta = registry[status];
  if (!meta) return null;

  return (
    <Badge tone={meta.tone} className={className} title={meta.description}>
      {withDot ? <span className={cn("size-1.5 rounded-full", DOT_TONES[meta.tone])} aria-hidden /> : null}
      {meta.label}
    </Badge>
  );
}
