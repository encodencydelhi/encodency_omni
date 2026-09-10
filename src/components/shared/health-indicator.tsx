import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/types/common";

const DOT_TONES: Record<Tone, string> = {
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-neutral",
};

interface HealthIndicatorProps {
  tone: Tone;
  label: string;
  /** Adds a soft pulse for states that are actively changing. */
  pulse?: boolean;
  className?: string;
}

/** A quieter alternative to a badge, for dense status lists. */
export function HealthIndicator({ tone, label, pulse = false, className }: HealthIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[0.8125rem] text-foreground", className)}>
      <span className="relative flex size-2 shrink-0">
        {pulse ? (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", DOT_TONES[tone])} />
        ) : null}
        <span className={cn("relative inline-flex size-2 rounded-full", DOT_TONES[tone])} />
      </span>
      {label}
    </span>
  );
}
