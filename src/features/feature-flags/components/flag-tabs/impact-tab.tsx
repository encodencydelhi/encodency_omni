"use client";

import { BuildingIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { AVAILABILITY, flagRoutes } from "../../data/config";
import { useCompanyImpact, useFlagCapabilities } from "../../data/hooks";
import type { FlagDetail } from "../../data/repository";
import type { BlockReason, Environment } from "../../data/types";
import { exportImpact } from "../../lib/export";
import { AvailabilityBadge } from "../badges";
import { EvaluationDrawer } from "../evaluation-drawer";
import { FlagsError } from "../states";

const KEYS = ["q", "plan", "targeting", "availability", "company"] as const;

/** Every company, and whether this flag reaches it. Selecting a row explains why. */
export function ImpactTab({ detail, environment }: { detail: FlagDetail; environment: Environment }) {
  const { flag } = detail;
  const capabilities = useFlagCapabilities();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const query = useCompanyImpact(flag.key, environment, { search: url.values.q || undefined, plan: url.values.plan || undefined, targeting: url.values.targeting || undefined, availability: url.values.availability || undefined });
  const data = query.data;
  const anyFilter = Boolean(url.values.q || url.values.plan || url.values.targeting || url.values.availability);
  const clear = () => { url.set({ q: null, plan: null, targeting: null, availability: null }); setSearch(""); };

  return (
    <div className="space-y-1">
      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8">
          <StatCard compact label="Total Companies" value={data.stats.totalCompanies} />
          <StatCard compact label="Eligible" value={data.stats.eligible} hint="Plan and subscription" />
          <StatCard compact label="Targeting Matched" value={data.stats.targetingMatched} hint="Before eligibility" />
          <StatCard compact label="Effective" value={data.stats.effective} hint="Available now" tone={data.stats.effective > 0 ? "success" : "neutral"} />
          <StatCard compact label="Blocked" value={data.stats.blocked} hint="Targeted, unavailable" tone={data.stats.blocked > 0 ? "warning" : "neutral"} />
          <StatCard compact label="Plan" value={data.stats.blockedByPlan} hint="Blocked by plan" />
          <StatCard compact label="Dependency" value={data.stats.blockedByDependency} hint="Blocked by prerequisite" />
          <StatCard compact label="Integration" value={data.stats.blockedByIntegration} hint="Blocked by integration" />
        </StatGrid>
      ) : query.error ? null : (
        <StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8" />
      )}
      <p className="px-0.5 text-2xs text-muted-foreground">Reasons are independent, not exclusive: a company can be blocked by more than one, so the reason counts need not add up to the blocked total.</p>

      <div className="flex flex-wrap items-center gap-1.5 py-1">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company or plan..." aria-label="Search companies" className="w-full sm:w-64" />
        <FilterSelect label="Plan" value={url.values.plan || undefined} options={(data?.facets.plans ?? []).map((item) => ({ value: item, label: item[0]?.toUpperCase() + item.slice(1) }))} onChange={(value) => url.set({ plan: value })} />
        <FilterSelect label="Targeting" value={url.values.targeting || undefined} options={[{ value: "matched", label: "Matched" }, { value: "not_matched", label: "Not Matched" }]} onChange={(value) => url.set({ targeting: value })} />
        <FilterSelect label="Availability" value={url.values.availability || undefined} options={Object.entries(AVAILABILITY).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ availability: value })} />
        {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
        {capabilities.canExportFlags && data ? <Button variant="outline" size="sm" className="ml-auto" onClick={() => exportImpact(flag.key, data.rows)} disabled={data.rows.length === 0}><DownloadIcon />Export</Button> : null}
      </div>

      {query.error && !data ? (
        <FlagsError subject="Company Impact" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Company impact"
            rows={data.rows}
            getKey={(row) => row.companyId}
            onRowClick={(row) => url.set({ company: row.companyId })}
            empty={<EmptyState icon={BuildingIcon} title={anyFilter ? "No Matching Companies" : "No Companies"} description={anyFilter ? "No company matches these filters." : "There is no company to evaluate."} action={anyFilter ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : undefined} />}
            columns={[
              { id: "company", header: "Company", cell: (row) => <div className="min-w-0"><Link href={flagRoutes.company(row.companyId)} onClick={(event) => event.stopPropagation()} className="block truncate font-medium text-foreground hover:text-primary hover:underline">{row.companyName}</Link><p className="truncate text-2xs text-muted-foreground">{row.companyDisplayId}</p></div> },
              { id: "plan", header: "Plan", hideBelow: "md", cell: (row) => row.planName },
              { id: "subscription", header: "Subscription", hideBelow: "lg", cell: (row) => <span className="capitalize">{row.subscriptionStatus.replace(/_/g, " ")}</span> },
              { id: "targeted", header: "Targeting", hideBelow: "md", cell: (row) => (row.targeted ? "Matched" : "Not Matched") },
              { id: "availability", header: "Availability", cell: (row) => <AvailabilityBadge availability={row.availability} /> },
              { id: "reasons", header: "Also Blocked By", hideBelow: "lg", cell: (row) => <span className="text-2xs text-muted-foreground">{row.reasons.slice(1).map((reason: BlockReason) => AVAILABILITY[reason].label).join(", ") || "-"}</span> },
              { id: "action", header: "Metered Actions", hideBelow: "lg", cell: (row) => <span className="text-2xs text-muted-foreground">{row.action.state === "limited" ? "Limited By Usage" : row.action.state === "ok" ? "Within Limits" : "Not Metered"}</span> },
              { id: "explain", header: <span className="sr-only">Explain</span>, align: "right", cell: (row) => <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); url.set({ company: row.companyId }); }}>Explain</Button> },
            ]}
          />
        </Panel>
      )}

      <EvaluationDrawer flagKey={flag.key} companyId={url.values.company || null} environment={environment} onClose={() => url.set({ company: null })} />
    </div>
  );
}
