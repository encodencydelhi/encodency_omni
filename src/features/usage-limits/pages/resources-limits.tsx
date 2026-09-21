"use client";

import { LayersIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/features/companies/components/primitives";
import { TableSkeleton } from "@/features/companies/components/states";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { CATEGORY_LABEL, MEASUREMENT_LABEL, RESET_LABEL } from "../data/catalogue";
import { USAGE_MOCK_MODE, usageRoutes } from "../data/config";
import { useResources } from "../data/hooks";
import { DemoTag } from "../components/badges";
import { UsageError } from "../components/states";

const LIMIT_TYPE = { concurrent_capacity: "Capacity", metered_period: "Metered Quota", capacity_snapshot: "Capacity Snapshot" } as const;

export function ResourcesLimitsPage() {
  const router = useRouter();
  const query = useResources();

  return (
    <div className="space-y-3">
      <PageHeader
        title="Resources & Limits"
        description="The shared resource catalogue: what is measured, how, when it resets, the thresholds that apply and what happens at the limit. Plan allowances are managed in Plans & Subscriptions."
        meta={USAGE_MOCK_MODE ? <DemoTag>Demo catalogue policy</DemoTag> : undefined}
        actions={<Button asChild variant="outline" size="sm"><Link href="/super-admin/plans/catalogue">Open Plan Catalogue</Link></Button>}
      />
      {query.error && !query.data ? (
        <UsageError subject="Resource Catalogue" error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <TableSkeleton rows={9} columns={7} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Resource catalogue"
            rows={query.data}
            getKey={(item) => item.definition.key}
            onRowClick={(item) => router.push(usageRoutes.resource(item.definition.key))}
            empty={<EmptyState icon={LayersIcon} title="No Resource Definitions" description="The resource catalogue is empty. Resources are defined with the plan entitlement catalogue." />}
            columns={[
              { id: "resource", header: "Resource", cell: (item) => (<div><p className="font-medium text-foreground">{item.definition.name}</p><p className="text-2xs text-muted-foreground"><code>{item.definition.key}</code></p></div>) },
              { id: "category", header: "Category", hideBelow: "md", cell: (item) => CATEGORY_LABEL[item.definition.category] },
              { id: "unit", header: "Unit", hideBelow: "md", cell: (item) => item.definition.unit },
              { id: "type", header: "Limit Type", cell: (item) => (<span title={MEASUREMENT_LABEL[item.definition.measurement].description}>{LIMIT_TYPE[item.definition.measurement]}</span>) },
              { id: "reset", header: "Reset Policy", hideBelow: "lg", cell: (item) => RESET_LABEL[item.definition.resetPolicy] },
              { id: "source", header: "Metering Source", hideBelow: "lg", cell: (item) => <span className="text-muted-foreground">{item.definition.meteringSource}</span> },
              { id: "thresholds", header: "Thresholds", hideBelow: "md", cell: (item) => <span className="tabular">{item.thresholds.warningPct}% / {item.thresholds.criticalPct}%{item.edited ? <Badge tone="warning" className="ml-1.5">Edited</Badge> : null}</span> },
              { id: "status", header: "Status", cell: (item) => <div className="flex flex-wrap gap-1"><Badge tone="success">Active</Badge>{item.definition.policyStatus === "pending" ? <Badge tone="warning" title="The product has not finalised how this resource is counted.">Policy Pending</Badge> : null}</div> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (item) => <Button asChild variant="ghost" size="sm" onClick={(event) => event.stopPropagation()}><Link href={usageRoutes.resource(item.definition.key)}>View Details</Link></Button> },
            ]}
          />
        </Panel>
      )}
      <p className="text-2xs text-muted-foreground">
        Resource keys, units and how each is measured are stable identifiers and are not editable here: changing them could invalidate usage history and plan entitlements. Warning and critical thresholds can be edited by staff with permission.
      </p>
    </div>
  );
}
