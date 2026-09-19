"use client";

import { ColumnsIcon, LayersIcon, PlusIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { PanelSkeleton, StatGridSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { formatNumber } from "@/lib/utils/format";
import { DemoTag, PlanStatusBadge } from "../components/badges";
import { ComparisonTable, type ComparisonColumn } from "../components/plan-comparison-table";
import { PlanCard } from "../components/plan-card";
import { PlansError } from "../components/states";
import { usePlanActions } from "../components/use-plan-actions";
import { PLANS_MOCK_MODE, routes } from "../data/config";
import { useComparison, usePlans } from "../data/hooks";
import type { PlanSummary } from "../data/types";
import { toStatusOptions } from "@/types/common";
import { PLAN_STATUS } from "../data/config";

const KEYS = ["q", "status", "visibility", "retired", "view"] as const;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "invite_only", label: "Invite only" },
];

function comparisonColumns(plans: PlanSummary[]): ComparisonColumn[] {
  return plans.flatMap((item) => {
    const version = item.current ?? item.draft;
    if (!version) return [];
    return [
      {
        id: item.plan.id,
        title: <Link href={routes.plan(item.plan.id)} className="hover:text-primary hover:underline">{item.plan.name}</Link>,
        subtitle: (
          <span className="flex flex-wrap items-center gap-1">
            <PlanStatusBadge status={item.plan.status} />
            <span>{item.current ? `v${item.current.version}` : "Draft only"}</span>
          </span>
        ),
        version,
      },
    ];
  });
}

/** The plan catalogue: every plan as a compact configuration card, with a real comparison one click away. */
export function PlansCataloguePage() {
  const router = useRouter();
  const actions = usePlanActions();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const comparing = url.values.view === "compare";
  const query = useMemo(
    () => ({ search: url.values.q || undefined, status: url.values.status || undefined, visibility: url.values.visibility || undefined, showRetired: url.values.retired === "1" }),
    [url.values],
  );
  const plans = usePlans(query);
  const comparison = useComparison();
  const filtered = url.activeCount > 0 && !(url.activeCount === 1 && comparing);
  const data = plans.data;
  const portfolio = data?.portfolio;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Platform Plans"
        description="Define pricing, features, usage allowances and availability for company subscriptions."
        meta={PLANS_MOCK_MODE ? <DemoTag>Demo configuration</DemoTag> : undefined}
        actions={
          <>
            <Button variant={comparing ? "subtle" : "outline"} size="sm" aria-pressed={comparing} onClick={() => url.set({ view: comparing ? null : "compare" })}>
              <ColumnsIcon />
              Compare Plans
            </Button>
            {actions.capabilities.canCreatePlan ? (
              <Button size="sm" onClick={() => router.push(routes.createPlan)}>
                <PlusIcon />
                Create Plan
              </Button>
            ) : null}
          </>
        }
      />

      {portfolio ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard compact label="Published Plans" value={portfolio.published} hint="Open for business" tone="success" href="?status=published" />
          <StatCard compact label="Draft Plans" value={portfolio.draft} hint="Not yet published" href="?status=draft" />
          <StatCard compact label="Hidden Plans" value={portfolio.hidden} hint="Hidden from new purchase" tone="warning" href="?status=hidden" />
          <StatCard compact label="Retired Plans" value={portfolio.retired} hint="Closed to new business" href="?status=retired" />
          <StatCard compact label="Active Subscribers" value={formatNumber(portfolio.activeSubscribers)} hint="Companies on any plan" href={routes.subscriptionsFor({ status: "current" })} />
          <StatCard compact label="Requiring Review" value={portfolio.requiringReview} hint="Drafts or invalid setup" tone={portfolio.requiringReview > 0 ? "warning" : "neutral"} />
        </StatGrid>
      ) : plans.error ? null : (
        <StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search plan name, code or segment..." aria-label="Search plans" className="w-full sm:w-72" />
        <FilterSelect label="Status" value={url.values.status || undefined} options={toStatusOptions(PLAN_STATUS)} onChange={(value) => url.set({ status: value })} />
        <FilterSelect label="Visibility" value={url.values.visibility || undefined} options={VISIBILITY_OPTIONS} onChange={(value) => url.set({ visibility: value })} />
        <div className="flex items-center gap-1.5 pl-1">
          <Switch id="show-retired" checked={url.values.retired === "1"} onCheckedChange={(checked) => url.set({ retired: checked ? "1" : null })} />
          <Label htmlFor="show-retired" className="text-2xs font-normal text-muted-foreground">Show Retired Plans</Label>
        </div>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => { url.set({ q: null, status: null, visibility: null, retired: null }); setSearch(""); }}>
            Clear Filters
          </Button>
        ) : null}
      </div>

      {plans.error && !data ? (
        <PlansError subject="Plans" error={plans.error} onRetry={() => void plans.refetch()} />
      ) : !data ? (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <PanelSkeleton key={index} rows={5} />
          ))}
        </div>
      ) : data.summaries.length === 0 ? (
        <div className="rounded-sm border border-border bg-card">
          {portfolio && portfolio.published + portfolio.draft + portfolio.hidden + portfolio.retired === 0 ? (
            <EmptyState
              icon={LayersIcon}
              title="No plans yet"
              description="Create the first plan to start offering subscriptions."
              action={actions.capabilities.canCreatePlan ? <Button onClick={() => router.push(routes.createPlan)}><PlusIcon />Create Plan</Button> : undefined}
            />
          ) : url.values.status === "published" ? (
            <EmptyState icon={LayersIcon} title="No published plans" description="Publish a draft to make it available." action={<Button variant="outline" onClick={() => url.set({ status: null })}>Clear Filters</Button>} />
          ) : url.values.status === "draft" ? (
            <EmptyState icon={LayersIcon} title="No draft plans" description="Every plan has been published." action={<Button variant="outline" onClick={() => url.set({ status: null })}>Clear Filters</Button>} />
          ) : (
            <EmptyState icon={SearchXIcon} title="No plans match these filters" description="Try a broader search, or clear the filters." action={<Button variant="outline" onClick={() => { url.set({ q: null, status: null, visibility: null, retired: null }); setSearch(""); }}>Clear Filters</Button>} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
          {data.summaries.map((summary) => (
            <PlanCard key={summary.plan.id} summary={summary} actions={actions} />
          ))}
        </div>
      )}

      {comparing ? (
        <Panel title="Plan Comparison" description="Current published version of each plan; a plan with only a draft shows its draft." flush>
          {comparison.error ? (
            <div className="px-3 pb-3"><PlansError subject="Comparison" error={comparison.error} onRetry={() => void comparison.refetch()} /></div>
          ) : comparison.isPending ? (
            <div className="px-3 pb-3"><PanelSkeleton rows={8} title={false} /></div>
          ) : (
            <ComparisonTable columns={comparisonColumns(comparison.data)} emptyMessage="No plans to compare yet." />
          )}
        </Panel>
      ) : null}
      {actions.dialogs}
    </div>
  );
}
