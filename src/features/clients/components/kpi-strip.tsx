"use client";

import { ArchiveIcon, CirclePauseIcon, CircleCheckIcon, ClipboardListIcon, FolderIcon, PlugIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton } from "@/features/companies/components/states";
import { formatNumber } from "@/lib/utils/format";
import { CLIENTS_LIST_ROUTE } from "../data/config";
import type { ClientPortfolio } from "../data/types";

const link = (query: string) => `${CLIENTS_LIST_ROUTE}${query}`;

/**
 * The eight portfolio numbers. Every one is derived from the same client
 * records the table shows, so a KPI and the list it links to always agree.
 */
export function ClientKpiStrip({ portfolio }: { portfolio: ClientPortfolio | undefined }) {
  if (!portfolio) return <StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" />;
  const delta = portfolio.newThisMonth - portfolio.newLastMonth;

  return (
    <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
      <StatCard compact label="Total Clients" value={formatNumber(portfolio.total)} hint={`Across ${portfolio.companies} ${portfolio.companies === 1 ? "company" : "companies"}`} href={CLIENTS_LIST_ROUTE} icon={FolderIcon} />
      <StatCard compact label="Active" value={formatNumber(portfolio.workspace.active)} hint="Workspaces operating" tone="success" href={link("?workspace=active")} icon={CircleCheckIcon} />
      <StatCard compact label="Paused" value={formatNumber(portfolio.workspace.paused)} hint="Held, nothing deleted" tone="warning" href={link("?workspace=paused")} icon={CirclePauseIcon} />
      <StatCard compact label="Archived" value={formatNumber(portfolio.workspace.archived)} hint="Retained for records" href={link("?workspace=archived")} icon={ArchiveIcon} />
      <StatCard
        compact
        label="New This Month"
        value={formatNumber(portfolio.newThisMonth)}
        hint={delta === 0 ? "Same as last month" : `${delta > 0 ? "+" : ""}${delta} vs last month`}
        href={link("?created=month")}
        icon={SparklesIcon}
      />
      <StatCard
        compact
        label="Connected Accounts"
        value={formatNumber(portfolio.connectedAccounts)}
        hint={portfolio.attentionAccounts > 0 ? `${portfolio.attentionAccounts} need attention` : "All healthy"}
        title="Connected channel accounts across all clients. Accounts, not providers."
        icon={PlugIcon}
      />
      <StatCard compact label="Onboarding Pending" value={formatNumber(portfolio.onboardingPending)} hint="Not yet completed" tone="info" href={link("?onboarding=pending")} icon={ClipboardListIcon} />
      <StatCard compact label="Needs Attention" value={formatNumber(portfolio.needsAttention)} hint="Warning or critical" tone="danger" href={link("?health=at_risk")} icon={TriangleAlertIcon} />
    </StatGrid>
  );
}
