"use client";

import {
  ActivityIcon,
  ArrowRightIcon,
  Building2Icon,
  CreditCardIcon,
  LifeBuoyIcon,
  PlugIcon,
  TrendingUpIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ActivityKind, DashboardSnapshot } from "@/types/domain/dashboard";

const ACTIVITY_PRESENTATION: Record<ActivityKind, { icon: LucideIcon; accent: string }> = {
  company_registered: { icon: Building2Icon, accent: "bg-info-subtle text-info" },
  plan_upgraded: { icon: TrendingUpIcon, accent: "bg-success-subtle text-success" },
  user_invited: { icon: UserPlusIcon, accent: "bg-violet-subtle text-violet" },
  integration_connected: { icon: PlugIcon, accent: "bg-neutral-subtle text-neutral" },
  ticket_opened: { icon: LifeBuoyIcon, accent: "bg-primary-subtle text-primary" },
  payment_failed: { icon: CreditCardIcon, accent: "bg-danger-subtle text-danger" },
};

interface RecentActivityProps {
  entries: DashboardSnapshot["recentActivity"];
  isLoading: boolean;
}

export function RecentActivity({ entries, isLoading }: RecentActivityProps) {
  return (
    <SectionCard
      title="Recent Activity"
      action={
        <Link
          href={ROUTES.superAdmin.auditLogs}
          className="inline-flex items-center gap-1 text-2xs font-medium text-primary transition-colors hover:text-primary-hover"
        >
          View all
          <ArrowRightIcon className="size-3" />
        </Link>
      }
      className="h-[320px]"
      contentClassName="overflow-y-auto"
    >
      {isLoading ? (
        <CardSkeleton lines={6} />
      ) : entries.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No recorded activity yet" size="sm" />
      ) : (
        <ul className="space-y-2.5">
          {entries.map((entry) => {
            const { icon: Icon, accent } = ACTIVITY_PRESENTATION[entry.kind];

            return (
              <li key={entry.id} className="flex items-start gap-2.5">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", accent)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium text-foreground">{entry.title}</p>
                  <p className="truncate text-2xs text-muted-foreground">{entry.detail}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
