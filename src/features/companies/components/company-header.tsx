"use client";

import { CalendarIcon, ExternalLinkIcon, GlobeIcon, MailIcon, PhoneIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils/format";
import { COMPANY_STATUS, type Company } from "@/types/domain/company";
import { PLAN_TIER } from "@/types/domain/plan";

interface CompanyHeaderProps {
  company: Company | undefined;
  isLoading: boolean;
  actions: React.ReactNode;
}

function MetaItem({ icon: Icon, children }: { icon: typeof MailIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Identity, state and the actions that change them — everything an operator
 * needs before opening a tab.
 */
export function CompanyHeader({ company, isLoading, actions }: CompanyHeaderProps) {
  if (isLoading || !company) {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="size-14 rounded-xl">
            <AvatarFallback className="rounded-xl text-sm">{getInitials(company.name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                {company.name}
              </h1>
              <StatusBadge registry={COMPANY_STATUS} status={company.status} withDot />
              <StatusBadge registry={PLAN_TIER} status={company.planTier} />
            </div>

            <p className="text-2xs text-muted-foreground">
              {company.industry} · {company.country} · {company.timezone}
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <MetaItem icon={MailIcon}>{company.primaryContact.email}</MetaItem>
              {company.primaryContact.phone ? (
                <MetaItem icon={PhoneIcon}>{company.primaryContact.phone}</MetaItem>
              ) : null}
              <MetaItem icon={CalendarIcon}>
                Customer since {formatDate(company.createdAt)}
              </MetaItem>
              <MetaItem icon={GlobeIcon}>
                Active {formatRelativeTime(company.lastActivityAt)}
              </MetaItem>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {company.website ? (
            <Button variant="outline" size="sm" asChild>
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Website
              </a>
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
    </div>
  );
}
