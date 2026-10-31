/**
 * Media360 - Financial KPI Card
 * Compact, modern, equal-height card with rounded-sm, minimum 12px text, and subtle hover.
 */

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { STAT_COLORS, statColorForLabel, statColorForTone } from "@/components/shared/stat-color";
import { ArrowUpRightIcon } from "lucide-react";

interface BillingKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  badge?: string;
  badgeTone?: "info" | "success" | "warning" | "danger" | "neutral";
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function BillingKpiCard({
  label,
  value,
  hint,
  badge,
  badgeTone = "neutral",
  href,
  onClick,
  icon: Icon,
  className,
}: BillingKpiCardProps) {
  const badgeStyles = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-300",
  };

  // A tone the caller gave wins; otherwise the card's name decides ("Overdue" red, "Collected" green, ...).
  const palette = STAT_COLORS[statColorForTone(badgeTone) ?? statColorForLabel(label)];

  const cardContent = (
    <div
      className={cn(
        "group relative flex flex-col justify-between h-full rounded-sm border px-3 py-2 shadow-xs hover:brightness-[0.98] transition-colors",
        palette.card,
        (href || onClick) && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0" title={label}>
          {Icon && <Icon className={cn("size-3.5 shrink-0", palette.ink)} />}
          <span className="text-xs font-medium uppercase tracking-tight text-muted-foreground truncate">
            {label}
          </span>
        </div>
        {badge ? (
          <span
            className={cn(
              "shrink-0 px-1.5 py-0.5 rounded-sm border text-[11px] font-medium leading-none whitespace-nowrap",
              badgeStyles[badgeTone],
            )}
            title={badge}
          >
            {badge}
          </span>
        ) : href ? (
          <ArrowUpRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        ) : null}
      </div>

      <div className="mt-1 space-y-0.5 min-w-0">
        <div className="text-lg sm:text-xl font-medium tracking-tight text-foreground truncate" title={String(value)}>
          {value}
        </div>
        {hint && (
          <div className="text-xs text-muted-foreground truncate" title={hint}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
