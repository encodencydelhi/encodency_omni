import { AlertCircleIcon, CheckCircle2Icon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/types/common";

type BannerTone = Extract<Tone, "success" | "warning" | "danger" | "info">;

const TONE_STYLES: Record<BannerTone, { container: string; icon: LucideIcon; iconColor: string }> = {
  success: { container: "border-success/25 bg-success-subtle", icon: CheckCircle2Icon, iconColor: "text-success" },
  warning: { container: "border-warning/25 bg-warning-subtle", icon: TriangleAlertIcon, iconColor: "text-warning" },
  danger: { container: "border-danger/25 bg-danger-subtle", icon: AlertCircleIcon, iconColor: "text-danger" },
  info: { container: "border-info/25 bg-info-subtle", icon: InfoIcon, iconColor: "text-info" },
};

interface AlertBannerProps {
  tone: BannerTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Inline message block. Subtle by design — it informs without alarming. */
export function AlertBanner({ tone, title, children, action, className }: AlertBannerProps) {
  const { container, icon: Icon, iconColor } = TONE_STYLES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border px-3.5 py-3", container, className)}
    >
      <Icon className={cn("mt-px size-4 shrink-0", iconColor)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="text-[0.8125rem] font-medium text-foreground">{title}</p> : null}
        {children ? (
          <div className="text-[0.8125rem] leading-relaxed text-muted-foreground">{children}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
