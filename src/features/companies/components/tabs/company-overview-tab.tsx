"use client";

import { FolderIcon, PlugIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DefinitionList } from "@/components/shared/definition-list";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UsageProgress } from "@/components/shared/usage-progress";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { QUOTA_METRICS } from "@/types/domain/plan";
import { INTEGRATION_STATUS } from "@/types/domain/integration";
import type { Company } from "@/types/domain/company";
import {
  useCompanyActivity,
  useCompanyIntegrations,
  useCompanyOverview,
  useCompanyUsage,
} from "../../hooks/use-companies";

/** The at-a-glance view: what they have, what they use, what they pay. */
export function CompanyOverviewTab({ company }: { company: Company }) {
  const overview = useCompanyOverview(company.id);
  const usage = useCompanyUsage(company.id);
  const integrations = useCompanyIntegrations(company.id);
  const activity = useCompanyActivity(company.id);

  const subscription = overview.data?.subscriptionSummary;
  const topUsage = (usage.data ?? [])
    .filter((record) => record.limit !== null)
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 4);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <SectionCard title="Clients">
            <p className="text-2xl font-semibold tabular text-foreground">
              {formatNumber(company.counts.Clients)}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">Brands under this organisation</p>
          </SectionCard>
          <SectionCard title="Team members">
            <p className="text-2xl font-semibold tabular text-foreground">
              {formatNumber(company.counts.users)}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">With access to the workspace</p>
          </SectionCard>
          <SectionCard title="Connected channels">
            <p className="text-2xl font-semibold tabular text-foreground">
              {formatNumber(company.channels.connected + company.channels.degraded)}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">
              {company.channels.disconnected > 0
                ? `${company.channels.disconnected} disconnected`
                : "All healthy"}
            </p>
          </SectionCard>
        </div>

        <SectionCard title="Monthly usage" description="Metered dimensions closest to the plan limit.">
          {usage.isPending ? (
            <CardSkeleton lines={4} />
          ) : topUsage.length === 0 ? (
            <EmptyState icon={FolderIcon} title="No metered usage this period" size="sm" />
          ) : (
            <div className="space-y-4">
              {topUsage.map((record) => (
                <UsageProgress
                  key={record.metric}
                  label={QUOTA_METRICS[record.metric].label}
                  used={record.used}
                  limit={record.limit}
                  unit={QUOTA_METRICS[record.metric].unit}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Clients" description="Every brand this organisation manages.">
          {overview.isPending ? (
            <CardSkeleton lines={3} />
          ) : (overview.data?.Clients.length ?? 0) === 0 ? (
            <EmptyState icon={FolderIcon} title="No Clients yet" size="sm" />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {overview.data?.Clients.map((project) => (
                <li
                  key={project.id}
                  className="rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground"
                >
                  {project.name}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard title="Subscription">
          {overview.isPending || !subscription ? (
            <CardSkeleton lines={4} />
          ) : (
            <DefinitionList
              columns={1}
              items={[
                { label: "Plan", value: subscription.planName },
                { label: "Billing cycle", value: subscription.billingCycle },
                { label: "Renews", value: formatDate(subscription.renewsAt) },
                {
                  label: "Amount",
                  value: formatCurrency(subscription.amountMinor, subscription.currency),
                },
              ]}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Integration health"
          action={
            <Link
              href={ROUTES.superAdmin.integrations}
              className="text-2xs font-medium text-primary hover:text-primary-hover"
            >
              All providers
            </Link>
          }
        >
          {integrations.isPending ? (
            <CardSkeleton lines={4} />
          ) : (integrations.data?.length ?? 0) === 0 ? (
            <EmptyState icon={PlugIcon} title="No channels connected" size="sm" />
          ) : (
            <ul className="space-y-2.5">
              {integrations.data?.slice(0, 6).map((integration) => (
                <li key={integration.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[0.8125rem] text-foreground">
                    {integration.accountName}
                  </span>
                  <StatusBadge registry={INTEGRATION_STATUS} status={integration.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Latest activity">
          {activity.isPending ? (
            <CardSkeleton lines={5} />
          ) : (activity.data?.length ?? 0) === 0 ? (
            <EmptyState icon={UsersIcon} title="No recorded activity" size="sm" />
          ) : (
            <ActivityTimeline entries={(activity.data ?? []).slice(0, 6)} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
