"use client";

import {
  ArrowRightIcon,
  CircleCheckIcon,
  CreditCardIcon,
  KeyRoundIcon,
  ListChecksIcon,
  PlugIcon,
  SearchIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import type { AttentionItem } from "@/types/domain/dashboard";
import type { NotificationSeverity } from "@/types/domain/notification";

/** Icon per attention item, so the list is scannable without reading it. */
const ITEM_ICONS: Record<string, LucideIcon> = {
  att_integrations: PlugIcon,
  att_failed_jobs: ListChecksIcon,
  att_payments: CreditCardIcon,
  att_tokens: KeyRoundIcon,
  att_sla: TimerIcon,
};

const SEVERITY_ACCENT: Record<NotificationSeverity, string> = {
  critical: "bg-danger-subtle text-danger",
  warning: "bg-warning-subtle text-warning",
  info: "bg-info-subtle text-info",
};

const SEVERITY_ORDER: NotificationSeverity[] = ["critical", "warning", "info"];

interface NeedsAttentionPanelProps {
  items: AttentionItem[];
  isLoading: boolean;
}

/**
 * The first thing an operator should read.
 *
 * Emphasis comes from position, a small tinted icon and ordering — not from
 * saturated fills, which would make a normal Tuesday look like an incident.
 */
export function NeedsAttentionPanel({ items, isLoading }: NeedsAttentionPanelProps) {
  const sorted = [...items].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  return (
    <SectionCard
      title="Needs Attention"
      action={
        <div className="flex items-center gap-3">
          {!isLoading && sorted.length > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground">
              {sorted.length}
            </span>
          ) : null}
          <Link
            href={ROUTES.superAdmin.notifications}
            className="inline-flex items-center gap-1 text-2xs font-medium text-primary transition-colors hover:text-primary-hover"
          >
            View all
            <ArrowRightIcon className="size-3" />
          </Link>
        </div>
      }
      className="h-[320px]"
      contentClassName="overflow-y-auto"
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CircleCheckIcon}
          title="Nothing needs attention"
          description="Integrations, queues, payments and SLAs are all inside their thresholds."
          size="sm"
        />
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((item) => {
            const Icon = ITEM_ICONS[item.id] ?? SearchIcon;

            return (
              <li key={item.id}>
                <Link href={item.href} className="group flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg",
                      SEVERITY_ACCENT[item.severity],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </span>
                  </span>

                  <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground">
                    {formatRelativeTime(item.raisedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
