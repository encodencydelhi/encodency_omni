/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Outgoing workspace: Endpoints directory and Endpoint Configuration overview.
 */

"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { PageSection } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DELIVERY_STATE, ENDPOINT_STATE, ENVIRONMENT_LABEL, PRIVACY_LABEL, SIGNING_STATE, WEBHOOK_ROUTES } from "../data/config";
import type { OutgoingEndpoint } from "../data/types";
import { CompanyCell, EndpointCell, OpenLink, TablePanel, SectionCard } from "./cells";
import { EndpointWizard } from "./endpoint-wizard";
import { EnvironmentFilter, FilterControls, optionsFrom, useFilterState } from "./filters";
import { CardGrid, Chip, EmptyRows, ExportButton, FilterBar, Kpi, Mono, Notice, State, SubNav, Timestamp, usePaged } from "./kit";
import { useWebhookData } from "./webhooks-context";

function OutgoingNav({ view }: { view: "endpoints" | "configuration" }) {
  const router = useRouter();
  const { snapshot } = useWebhookData();
  return (
    <SubNav
      label="Outgoing sections"
      value={view}
      onChange={(next) => router.push(next === "endpoints" ? WEBHOOK_ROUTES.outgoing : WEBHOOK_ROUTES.outgoingConfiguration)}
      items={[
        { value: "endpoints", label: "Endpoints", count: snapshot.endpoints.length },
        { value: "configuration", label: "Endpoint Configuration" },
      ]}
    />
  );
}

function OutgoingHeader({ onAdd, exportRows }: { onAdd: () => void; exportRows: Array<Record<string, string | number | null>> }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Outgoing Endpoints</h2>
        <p className="text-[0.8125rem] text-muted-foreground">Manage configured destinations and event subscriptions for platform-generated webhooks.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportButton filename="webhook-outgoing-endpoints.csv" rows={exportRows} />
        <Button size="sm" onClick={onAdd}><PlusIcon />Add Endpoint</Button>
      </div>
    </div>
  );
}

export function OutgoingEndpointsPage() {
  const { snapshot } = useWebhookData();
  const router = useRouter();
  const [wizard, setWizard] = useState(false);
  const filters = useFilterState(["company", "state", "signing", "event", "result"] as const);

  const latestDelivery = useMemo(() => {
    const map = new Map<string, (typeof snapshot.deliveries)[number]>();
    snapshot.deliveries.forEach((delivery) => { if (!map.has(delivery.endpointId)) map.set(delivery.endpointId, delivery); });
    return map;
  }, [snapshot]);

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return snapshot.endpoints.filter((endpoint) => {
      if (q && !`${endpoint.name} ${endpoint.destinationHost} ${endpoint.companyName ?? "platform"} ${endpoint.id}`.toLowerCase().includes(q)) return false;
      if (filters.values.company && (endpoint.companyId ?? "platform") !== filters.values.company) return false;
      if (filters.values.state && endpoint.state !== filters.values.state) return false;
      if (filters.values.signing && endpoint.signing.state !== filters.values.signing) return false;
      if (filters.values.event && !snapshot.subscriptions.some((sub) => sub.endpointId === endpoint.id && sub.eventKey === filters.values.event)) return false;
      if (filters.values.result && latestDelivery.get(endpoint.id)?.state !== filters.values.result) return false;
      return true;
    });
  }, [snapshot, filters.query, filters.values, latestDelivery]);

  const paged = usePaged(rows, 10);

  const columns: Array<DataTableColumn<OutgoingEndpoint>> = [
    { id: "name", header: "Endpoint Name", cell: (row) => (<div className="min-w-0"><Link href={WEBHOOK_ROUTES.endpoint(row.id)} onClick={(e) => e.stopPropagation()} className="block max-w-[15rem] truncate text-[0.8125rem] font-medium hover:underline">{row.name}</Link><Mono className="text-muted-foreground">{row.id}</Mono>{row.demoCreated ? <Chip tone="brand">Demo created</Chip> : null}</div>) },
    { id: "scope", header: "Scope / Company", hideBelow: "lg", cell: (row) => <CompanyCell id={row.companyId} name={row.companyName} /> },
    { id: "host", header: "Destination Host", hideBelow: "xl", cell: (row) => <Mono>{row.destinationHost}</Mono> },
    { id: "env", header: "Environment", hideBelow: "2xl", cell: (row) => <span className="text-[0.8125rem]">{ENVIRONMENT_LABEL[row.environment]}</span> },
    { id: "events", header: "Events", align: "right", hideBelow: "md", cell: (row) => <span className="tabular" title={snapshot.subscriptions.filter((s) => s.endpointId === row.id).map((s) => s.eventKey).join(", ")}>{snapshot.subscriptions.filter((s) => s.endpointId === row.id).length}</span> },
    { id: "state", header: "Endpoint State", cell: (row) => <State registry={ENDPOINT_STATE} status={row.state} /> },
    { id: "signing", header: "Signing", hideBelow: "lg", cell: (row) => <State registry={SIGNING_STATE} status={row.signing.state} /> },
    { id: "result", header: "Recent Delivery", hideBelow: "xl", cell: (row) => { const d = latestDelivery.get(row.id); return d ? <State registry={DELIVERY_STATE} status={d.state} /> : <span className="text-muted-foreground">No deliveries</span>; } },
    { id: "updated", header: "Last Updated", hideBelow: "2xl", cell: (row) => <Timestamp iso={row.updatedAt} /> },
    { id: "act", header: "Actions", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.endpoint(row.id)} label="Open" /> },
  ];

  return (
    <PageSection className="space-y-1">
      <OutgoingHeader onAdd={() => setWizard(true)} exportRows={rows.map((e) => ({ id: e.id, name: e.name, scope: e.companyName ?? "Platform", host: e.destinationHost, environment: e.environment, state: e.state, signing: e.signing.state }))} />
      <OutgoingNav view="endpoints" />
      <CardGrid cols={4}>
        <Kpi label="Endpoints" value={snapshot.endpoints.length} hint="Configured in this environment" />
        <Kpi label="Enabled" value={snapshot.endpoints.filter((e) => e.state === "enabled").length} hint="Configuration state only. Not a health signal" />
        <Kpi label="Signing Not Configured" value={snapshot.endpoints.filter((e) => e.signing.state === "not_configured").length} tone="warning" hint="Recipients cannot verify events" href={WEBHOOK_ROUTES.security} />
        <Kpi label="Disabled / Suspended" value={snapshot.endpoints.filter((e) => e.state === "disabled" || e.state === "suspended").length} hint="Deliveries are cancelled, not sent" />
      </CardGrid>
      <TablePanel
        title="Endpoints"
        description="Destinations show scheme and host only. Query strings and credentials are never displayed."
        filters={
          <FilterBar>
            <FilterControls
              state={filters}
              searchPlaceholder="Search endpoint name, host, company or endpoint ID..."
              filters={[
                { key: "company", label: "Company", options: [{ value: "platform", label: "Platform" }, ...snapshot.companies.filter((c) => snapshot.endpoints.some((e) => e.companyId === c.id)).map((c) => ({ value: c.id, label: c.name }))] },
                { key: "state", label: "State", options: Object.entries(ENDPOINT_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "signing", label: "Signing", options: Object.entries(SIGNING_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "event", label: "Event", options: optionsFrom(snapshot.subscriptions.map((s) => s.eventKey)) },
                { key: "result", label: "Recent delivery", options: Object.entries(DELIVERY_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
              ]}
            />
            <EnvironmentFilter />
          </FilterBar>
        }
        scroll={false}
      >
        <DataTable
          columns={columns}
          rows={paged.pageRows}
          getRowId={(row) => row.id}
          isLoading={false}
          caption="Outgoing endpoints"
          pagination={paged.pagination}
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
          onRowClick={(row) => router.push(WEBHOOK_ROUTES.endpoint(row.id))}
          emptyState={<EmptyRows title="No endpoints match" description="Adjust the filters, or add a demo endpoint." />}
        />
      </TablePanel>
      <EndpointWizard open={wizard} onOpenChange={setWizard} />
    </PageSection>
  );
}

export function EndpointConfigurationPage() {
  const { snapshot } = useWebhookData();
  const router = useRouter();
  const [wizard, setWizard] = useState(false);
  const s = snapshot.settings;

  const columns: Array<DataTableColumn<OutgoingEndpoint>> = [
    { id: "name", header: "Endpoint", cell: (row) => <EndpointCell endpoint={row} /> },
    { id: "timeout", header: "Timeout", align: "right", cell: (row) => <span className="tabular">{row.policy.timeoutMs.toLocaleString()} ms</span> },
    { id: "retry", header: "Retry Policy", cell: (row) => <Mono>{row.policy.retryPolicyRef.replace("retry-policy/", "")}</Mono> },
    { id: "max", header: "Max Attempts", align: "right", hideBelow: "md", cell: (row) => <span className="tabular">{row.policy.maxAttempts}</span> },
    { id: "schema", header: "Schema", hideBelow: "lg", cell: (row) => <span className="text-[0.8125rem]">{row.policy.schemaVersion}</span> },
    { id: "privacy", header: "Payload Privacy", hideBelow: "lg", cell: (row) => <Chip>{PRIVACY_LABEL[row.policy.payloadPrivacy]}</Chip> },
    { id: "state", header: "State", cell: (row) => <State registry={ENDPOINT_STATE} status={row.state} /> },
    { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={`${WEBHOOK_ROUTES.endpoint(row.id)}?tab=settings`} label="Edit" /> },
  ];

  return (
    <PageSection className="space-y-1">
      <OutgoingHeader onAdd={() => setWizard(true)} exportRows={snapshot.endpoints.map((e) => ({ id: e.id, timeoutMs: e.policy.timeoutMs, retryPolicy: e.policy.retryPolicyRef, maxAttempts: e.policy.maxAttempts }))} />
      <OutgoingNav view="configuration" />
      <Notice tone="info">Delivery configuration is a reference. Timeouts and retries are enforced by a future delivery worker, not by this frontend.</Notice>
      <CardGrid cols={4}>
        <Kpi label="Default Timeout" value={`${s.defaultTimeoutMs.toLocaleString()} ms`} hint="Applied to new endpoints" />
        <Kpi label="Default Retry Policy" value={s.defaultRetryPolicyRef.replace("retry-policy/", "")} hint={`${s.defaultMaxAttempts} attempts`} />
        <Kpi label="HTTPS Outside Development" value={s.requireHttpsOutsideDevelopment ? "Required" : "Optional"} hint="Preliminary frontend check" />
        <Kpi label="Payload Preview" value={s.payloadPreviewEnabled ? "Enabled" : "Off"} hint="Sanitized previews only" />
      </CardGrid>
      <div className="grid gap-1 xl:grid-cols-[1.4fr_1fr]">
        <TablePanel title="Per-Endpoint Delivery Configuration" description="Open an endpoint's Settings & Lifecycle tab to change it." >
          <DataTable columns={columns} rows={snapshot.endpoints} getRowId={(row) => row.id} isLoading={false} caption="Endpoint delivery configuration" onRowClick={(row) => router.push(`${WEBHOOK_ROUTES.endpoint(row.id)}?tab=settings`)} emptyState={<EmptyRows title="No endpoints configured" />} />
        </TablePanel>
        <SectionCard title="Retry Policy Catalogue" description="Reference definitions. Failure classes not listed are never auto-retried.">
          <ul className="divide-y divide-border">
            {snapshot.retryPolicies.map((policy) => (
              <li key={policy.ref} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[0.8125rem] font-medium">{policy.name}</span><Chip>{policy.maxAttempts} attempts</Chip></div>
                <Mono className="block text-muted-foreground">{policy.ref}</Mono>
                <p className="text-2xs text-muted-foreground">Backoff: {policy.backoff}</p>
                <p className="text-2xs text-muted-foreground">Retryable: {policy.retryableClasses.length ? policy.retryableClasses.map((c) => c.replaceAll("_", " ")).join(", ") : "none"}</p>
                <p className="text-2xs text-muted-foreground">{policy.notes}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
      <EndpointWizard open={wizard} onOpenChange={setWizard} />
    </PageSection>
  );
}
