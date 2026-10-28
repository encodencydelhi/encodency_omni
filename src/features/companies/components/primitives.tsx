"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { cycleStatColor, STAT_COLORS, statColorForLabel, statColorForTone, type StatColor } from "@/components/shared/stat-color";
import type { Tone } from "@/types/common";

/**
 * Compact building blocks shared by every tenant screen.
 *
 * The existing MetricCard and SectionCard are sized for the dashboard. The
 * tenant workspace is denser, so these keep the same tokens (border, radius,
 * shadow, type scale) at a tighter size rather than inventing a new look.
 */

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes body padding, for tables and lists that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={cn("min-w-0 rounded-sm border border-border bg-card shadow-xs", className)}>
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-3 pt-2.5 pb-2">
          <div className="min-w-0 flex-1">
            {title ? <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-2xs text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="flex flex-wrap items-center gap-1.5">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn(flush ? "" : "px-3 pb-3", !title && !action && !flush && "pt-3", bodyClassName)}>{children}</div>
    </section>
  );
}

/** One measurement with a supporting line. Optionally a link to where it can be acted on. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
  title,
  compact = false,
  color,
  colorIndex,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
  title?: string;
  /** Drops the icon and tightens the label, for rows of eight cards on laptop widths. */
  compact?: boolean;
  /** The card colour. Without it: the one the tone stands for, else the next in the grid's order (see StatGrid). */
  color?: StatColor;
  colorIndex?: number;
  className?: string;
}) {
  const palette = STAT_COLORS[color ?? statColorForTone(tone) ?? (colorIndex === undefined ? statColorForLabel(label) : cycleStatColor(colorIndex))];
  const body = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <p
          className={cn(
            "min-w-0 flex-1 line-clamp-2 text-[11px] font-medium uppercase leading-tight text-muted-foreground break-words",
            compact ? "tracking-wide" : "tracking-wider",
          )}
        >
          {label}
        </p>
        {Icon && !compact ? (
          <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm", palette.chip)}>
            <Icon className="size-3" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-1 min-w-0 truncate text-lg font-semibold leading-none tabular-nums text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 truncate text-2xs text-muted-foreground">{hint}</div> : null}
    </>
  );

  const cardTitle = title ?? label;

  const shell = cn(
    "block min-w-0 rounded-sm border px-3 py-2 shadow-xs",
    palette.card,
    compact && "px-2.5 py-1.5",
    href && "transition-colors hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-ring/40",
    className,
  );

  return href ? (
    <Link href={href} className={shell} title={cardTitle}>
      {body}
    </Link>
  ) : (
    <div className={shell} title={cardTitle}>
      {body}
    </div>
  );
}

/** Tightly spaced grid for related cards (gap-1 by design). */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  // Cards that do not choose a colour get the next one in turn, so neighbours differ.
  let next = 0;
  const cards = Children.map(children, (child) =>
    isValidElement(child) && child.type === StatCard ? cloneElement(child as ReactElement<{ colorIndex?: number }>, { colorIndex: next++ }) : child,
  );
  return <div className={cn("grid gap-1", className)}>{cards}</div>;
}

/** A form field with its label, hint and error kept together and announced. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-[0.8125rem]">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden>*</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-2xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-2xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Text with an explanatory tooltip - used for health reasons and usage methodology. */
export function WithTooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help", className)} tabIndex={0}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 leading-snug">{content}</TooltipContent>
    </Tooltip>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-1 text-[0.8125rem]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-foreground">{children}</dd>
    </div>
  );
}
