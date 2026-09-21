"use client";

import { BuildingIcon, CheckIcon, DownloadIcon, MinusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { AvailabilityBadge, DemoTag, StateBadge } from "../components/badges";
import { EnvironmentSwitch, useEnvironment } from "../components/environment";
import { EvaluationDrawer } from "../components/evaluation-drawer";
import { FlagsError } from "../components/states";
import { AVAILABILITY, FLAGS_MOCK_MODE, flagRoutes } from "../data/config";
import { useCompanyAccess, useCompanySearch, useFlagCapabilities } from "../data/hooks";
import type { ConditionState } from "../data/types";
import { exportAccess } from "../lib/export";

const KEYS = ["company", "q", "category", "availability", "flag"] as const;

function Mark({ state, label }: { state: ConditionState; label: string }) {
  if (state === "pass") return <CheckIcon className="size-4 text-success" aria-label={`${label}: passes`} />;
  if (state === "fail") return <XIcon className="size-4 text-danger" aria-label={`${label}: fails`} />;
  return <MinusIcon className="size-4 text-muted-foreground" aria-label={`${label}: not applicable`} />;
}

/**
 * One company's view of every feature. The counts are independent: a feature can be
 * blocked by its plan and by a prerequisite at once, so the blocked-by numbers are not
 * a partition of the total.
 */
export function CompanyAccessPage() {
  const capabilities = useFlagCapabilities();
  const { environment, set: setEnvironment } = useEnvironment();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const companyId = url.values.company || null;
  const companies = useCompanySearch("");
  const query = useCompanyAccess(companyId, environment);
  const data = query.data;

  const needle = url.values.q.trim().toLowerCase();
  const rows = (data?.rows ?? [])
    .filter((row) => !url.values.category || row.flag.category === url.values.category)
    .filter((row) => !url.values.availability || row.evaluation.availability === url.values.availability)
    .filter((row) => !needle || `${row.flag.name} ${row.flag.key}`.toLowerCase().includes(needle));
  const anyFilter = Boolean(url.values.q || url.values.category || url.values.availability);
  const clear = () => { url.set({ q: null, category: null, availability: null }); setSearch(""); };

  if (!capabilities.canViewCompanyAccess) {
    return <Panel><EmptyState icon={BuildingIcon} title="Company Access Is Restricted" description="Viewing a company's feature access needs company read access." /></Panel>;
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Company Access"
        description="Choose a company to see every feature and exactly why each one is or is not available to it."
        meta={FLAGS_MOCK_MODE ? <DemoTag>Demo evaluation</DemoTag> : undefined}
        actions={data && capabilities.canExportFlags ? <Button variant="outline" size="sm" onClick={() => exportAccess(data.company.name, rows)} disabled={rows.length === 0}><DownloadIcon />Export</Button> : undefined}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <EnvironmentSwitch environment={environment} onChange={setEnvironment} />
        <Select value={companyId ?? undefined} onValueChange={(value) => url.set({ company: value, flag: null })}>
          <SelectTrigger size="sm" aria-label="Company" className="w-72"><SelectValue placeholder="Choose a company" /></SelectTrigger>
          <SelectContent>{(companies.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
        </Select>
        {companyId ? <Button variant="ghost" size="sm" onClick={() => url.set({ company: null, flag: null })}>Clear Company</Button> : null}
      </div>

      {!companyId ? (
        <Panel><EmptyState icon={BuildingIcon} title="Choose A Company" description="Pick a company to see its feature availability, and the plan, rollout, prerequisite and integration checks behind each result." /></Panel>
      ) : query.error && !data ? (
        <FlagsError subject="Company" error={query.error} onRetry={() => void query.refetch()} back={{ href: flagRoutes.access(environment), label: "Choose Another Company" }} />
      ) : !data ? (
        <div className="space-y-1"><StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" /><TableSkeleton rows={8} columns={7} /></div>
      ) : (
        <>
          <Panel title={data.company.name} description={`${data.company.displayId} - ${data.company.planName} plan`} action={<div className="flex items-center gap-1"><Button asChild variant="outline" size="sm"><Link href={flagRoutes.company(data.company.id)}>Open Company</Link></Button><Button asChild variant="outline" size="sm"><Link href={flagRoutes.subscription(data.company.subscriptionId)}>Open Subscription</Link></Button></div>}>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
              <KeyValue label="Subscription"><span className="capitalize">{data.company.subscriptionStatus.replace(/_/g, " ")}</span></KeyValue>
              <KeyValue label="Account">{data.company.accountActive ? "Active" : "Not Active"}</KeyValue>
              <KeyValue label="Environment"><span className="capitalize">{data.environment}</span></KeyValue>
            </dl>
          </Panel>

          <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard compact label="Features" value={data.counts.total} hint="Not archived" />
            <StatCard compact label="Available" value={data.counts.available} hint="Every check passes" tone="success" />
            <StatCard compact label="Plan Blocked" value={data.counts.planBlocked} hint="Not in the plan" />
            <StatCard compact label="Rollout Blocked" value={data.counts.rolloutBlocked} hint="Not matched by targeting" />
            <StatCard compact label="Dependency Blocked" value={data.counts.dependencyBlocked} hint="Prerequisite missing" />
            <StatCard compact label="Integration Blocked" value={data.counts.integrationBlocked} hint="Not connected or unhealthy" />
          </StatGrid>
          <p className="px-0.5 text-2xs text-muted-foreground">Counts are independent, not exclusive. A feature that fails two checks is counted under both, so the blocked counts need not add up to the features that are not available.</p>

          <div className="flex flex-wrap items-center gap-1.5 py-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search feature or key..." aria-label="Search features" className="w-full sm:w-64" />
            <FilterSelect label="Category" value={url.values.category || undefined} options={[...new Set(data.rows.map((row) => row.flag.category))].map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ category: value })} />
            <FilterSelect label="Availability" value={url.values.availability || undefined} options={Object.entries(AVAILABILITY).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ availability: value })} />
            {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
          </div>

          <Panel flush>
            <MiniTable
              caption="Feature access matrix"
              rows={rows}
              getKey={(row) => row.flag.key}
              onRowClick={(row) => url.set({ flag: row.flag.key })}
              empty={<EmptyState icon={BuildingIcon} title="No Matching Features" description="No feature matches these filters for this company." action={<Button variant="outline" onClick={clear}>Clear Filters</Button>} />}
              columns={[
                { id: "flag", header: "Feature", cell: (row) => <div className="min-w-0"><Link href={flagRoutes.flag(row.flag.key, environment)} onClick={(event) => event.stopPropagation()} className="block truncate font-medium text-foreground hover:text-primary hover:underline">{row.flag.name}</Link><p className="truncate text-2xs text-muted-foreground">{row.flag.category}</p></div> },
                { id: "state", header: "Flag", hideBelow: "md", cell: (row) => <StateBadge state={row.state as "enabled" | "disabled" | "emergency_off"} /> },
                { id: "rollout", header: "Rollout", align: "right", hideBelow: "md", cell: (row) => <span className="inline-flex"><Mark state={row.evaluation.conditions.targeting} label="Rollout" /></span> },
                { id: "plan", header: "Plan", align: "right", hideBelow: "md", cell: (row) => <span className="inline-flex"><Mark state={row.evaluation.conditions.plan} label="Plan" /></span> },
                { id: "deps", header: "Prerequisites", align: "right", hideBelow: "lg", cell: (row) => <span className="inline-flex"><Mark state={row.evaluation.conditions.dependencies} label="Prerequisites" /></span> },
                { id: "integration", header: "Integrations", align: "right", hideBelow: "lg", cell: (row) => <span className="inline-flex"><Mark state={row.evaluation.conditions.integration} label="Integrations" /></span> },
                { id: "availability", header: "Availability", cell: (row) => <AvailabilityBadge availability={row.evaluation.availability} /> },
                { id: "explain", header: <span className="sr-only">Explain</span>, align: "right", cell: (row) => <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); url.set({ flag: row.flag.key }); }}>Explain</Button> },
              ]}
            />
          </Panel>
        </>
      )}

      <EvaluationDrawer flagKey={url.values.flag || null} companyId={companyId} environment={environment} onClose={() => url.set({ flag: null })} />
    </div>
  );
}
