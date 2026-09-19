/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Status Badges
 * Font sizes strictly >= 12px (text-xs)
 */

import { cn } from "@/lib/utils/cn";
import {
  CONNECTION_HEALTH_META,
  EXTERNAL_API_ACCESS_META,
  ISSUE_SEVERITY_META,
  ISSUE_STATUS_META,
  OPERATIONAL_HEALTH_META,
  PLATFORM_AVAILABILITY_META,
} from "../data/config";
import type {
  ConnectionHealthStatus,
  ExternalApiAccess,
  IssueSeverity,
  IssueStatus,
  OperationalHealth,
  PlatformAvailability,
} from "../data/types";

interface BadgeProps {
  className?: string;
  showDot?: boolean;
}

export function AvailabilityBadge({
  value,
  className,
  showDot = true,
}: BadgeProps & { value: PlatformAvailability }) {
  const meta = PLATFORM_AVAILABILITY_META[value] ?? {
    label: value,
    tone: "neutral" as const,
  };

  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    info: "bg-sky-50 text-sky-700 border-sky-200/80",
    neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
  };

  const dotTones = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap",
        tones[meta.tone],
        className
      )}
    >
      {showDot && <span className={cn("size-1.5 rounded-full shrink-0", dotTones[meta.tone])} />}
      {meta.label}
    </span>
  );
}

export function ApiAccessBadge({
  value,
  className,
  showDot = true,
}: BadgeProps & { value: ExternalApiAccess }) {
  const meta = EXTERNAL_API_ACCESS_META[value] ?? {
    label: value,
    tone: "neutral" as const,
  };

  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    info: "bg-blue-50 text-blue-700 border-blue-200/80",
    neutral: "bg-slate-100 text-slate-600 border-slate-200/80",
  };

  const dotTones = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-500",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap",
        tones[meta.tone],
        className
      )}
    >
      {showDot && <span className={cn("size-1.5 rounded-full shrink-0", dotTones[meta.tone])} />}
      {meta.label}
    </span>
  );
}

export function OperationalHealthBadge({
  value,
  className,
  showIcon = true,
}: BadgeProps & { value: OperationalHealth; showIcon?: boolean }) {
  const meta = OPERATIONAL_HEALTH_META[value] ?? {
    label: value,
    tone: "neutral" as const,
    icon: null,
  };

  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
  };

  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap",
        tones[meta.tone],
        className
      )}
    >
      {showIcon && Icon && <Icon className="size-3.5 shrink-0" />}
      {meta.label}
    </span>
  );
}

export function ConnectionHealthBadge({
  value,
  className,
  showDot = true,
}: BadgeProps & { value: ConnectionHealthStatus }) {
  const meta = CONNECTION_HEALTH_META[value] ?? {
    label: value,
    tone: "neutral" as const,
  };

  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    neutral: "bg-slate-100 text-slate-600 border-slate-200/80",
  };

  const dotTones = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap",
        tones[meta.tone],
        className
      )}
    >
      {showDot && <span className={cn("size-1.5 rounded-full shrink-0", dotTones[meta.tone])} />}
      {meta.label}
    </span>
  );
}

export function IssueSeverityBadge({
  value,
  className,
}: BadgeProps & { value: IssueSeverity }) {
  const meta = ISSUE_SEVERITY_META[value] ?? {
    label: value,
    tone: "info" as const,
  };

  const tones = {
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    info: "bg-blue-50 text-blue-700 border-blue-200/80",
  };

  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap",
        tones[meta.tone],
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {meta.label}
    </span>
  );
}

export function IssueStatusBadge({
  value,
  className,
  showDot = true,
}: BadgeProps & { value: IssueStatus }) {
  const meta = ISSUE_STATUS_META[value] ?? {
    label: value,
    tone: "neutral" as const,
  };

  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    info: "bg-sky-50 text-sky-700 border-sky-200/80",
  };

  const dotTones = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap capitalize",
        tones[meta.tone],
        className
      )}
    >
      {showDot && <span className={cn("size-1.5 rounded-full shrink-0", dotTones[meta.tone])} />}
      {meta.label}
    </span>
  );
}
