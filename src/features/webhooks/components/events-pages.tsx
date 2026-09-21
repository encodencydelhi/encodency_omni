/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Events & Subscriptions: catalogue, subscriptions directory and event type detail.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { AUDIENCE_LABEL, CATEGORY_LABEL, EVENT_AVAILABILITY, ENVIRONMENT_LABEL, PRIVACY_LABEL, SCHEMA_LIFECYCLE, SUBSCRIPTION_STATE, WEBHOOK_ROUTES } from "../data/config";
import { subscribersOf } from "../data/selectors";
import type { EventSubscription, OutgoingEventType } from "../data/types";
import { CompanyCell, OpenLink, TablePanel, SectionCard } from "./cells";
import { DetailHeader, InfoCard } from "./detail";
import { EnvironmentFilter, FilterControls, optionsFrom, useFilterState } from "./filters";
import { CardGrid, Chip, EmptyRows, ExportButton, FilterBar, Kpi, Mono, NotFoundPanel, Notice, State, SubNav, Timestamp, usePaged } from "./kit";
import { useWebhookData } from "./webhooks-context";

function EventsNav({ view }: { view: "catalogue" | "subscriptions" }) {
  const router = useRouter();
  const { snapshot } = useWebhookData();
  return (
    <SubNav
      label="Events sections"
      value={view}
      onChange={(next) => router.push(next === "catalogue" ? WEBHOOK_ROUTES.events : WEBHOOK_ROUTES.subscriptions)}
      items={[
        { value: "catalogue", label: "Event Catalogue", count: snapshot.eventTypes.length },
        { value: "subscriptions", label: "Subscriptions", count: snapshot.subscriptions.length },
      ]}
    />
  );
}

function EventsSummary() {
  const { snapshot } = useWebhookData();
  const types = snapshot.eventTypes;
  return (
    <CardGrid cols={4}>
      <Kpi label="Event Types" value={types.length} hint={`${types.filter((t) => t.availability === "available").length} available, ${types.filter((t) => t.availability === "deprecated").length} deprecated`} />
      <Kpi label="Company-Scoped" value={types.filter((t) => t.audience === "company").length} hint="Customer-subscribable unless deprecated" />
      <Kpi label="Platform-Only" value={types.filter((t) => t.audience === "platform").length} hint="Never offered to company endpoints" />
      <Kpi label="Subscriptions" value={snapshot.subscriptions.length} hint={`${new Set(snapshot.subscriptions.map((s) => s.endpointId)).size} endpoints subscribe`} />
    </CardGrid>
  );
}

export function EventCataloguePage() {
  const { snapshot } = useWebhookData();
  const router = useRouter();
  const filters = useFilterState(["category", "audience", "schema", "availability", "subscribers"] as const);

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return snapshot.eventTypes.filter((type) => {
      const count = subscribersOf(snapshot, type.key).length;
      if (q && !`${type.name} ${type.key} ${CATEGORY_LABEL[type.category]}`.toLowerCase().includes(q)) return false;
      if (filters.values.category && type.category !== filters.values.category) return false;
      if (filters.values.audience && type.audience !== filters.values.audience) return false;
      if (filters.values.schema && type.schemaVersion !== filters.values.schema) return false;
      if (filters.values.availability && type.availability !== filters.values.availability) return false;
      if (filters.values.subscribers === "0" && count !== 0) return false;
      if (filters.values.subscribers === "1" && count !== 1) return false;
      if (filters.values.subscribers === "2+" && count < 2) return false;
      return true;
    });
  }, [snapshot, filters.query, filters.values]);
  const paged = usePaged(rows, 10);

  const columns: Array<DataTableColumn<OutgoingEventType>> = [
    { id: "name", header: "Event Name", cell: (row) => <span className="text-[0.8125rem] font-medium">{row.name}</span> },
    { id: "key", header: "Stable Event Key", cell: (row) => <Mono>{row.key}</Mono> },
    { id: "category", header: "Category", hideBelow: "md", cell: (row) => <Chip>{CATEGORY_LABEL[row.category]}</Chip> },
    { id: "schema", header: "Schema", cell: (row) => <span className="tabular text-[0.8125rem]">{row.schemaVersion}</span> },
    { id: "audience", header: "Audience Scope", hideBelow: "lg", cell: (row) => <Chip tone={row.audience === "platform" ? "warning" : "info"}>{AUDIENCE_LABEL[row.audience]}</Chip> },
    { id: "availability", header: "Availability", cell: (row) => <State registry={EVENT_AVAILABILITY} status={row.availability} /> },
    { id: "subs", header: "Subscribed Endpoints", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular">{subscribersOf(snapshot, row.key).length}</span> },
    { id: "last", header: "Last Produced", hideBelow: "xl", cell: (row) => (row.lastProducedAt ? <Timestamp iso={row.lastProducedAt} /> : <span className="text-muted-foreground">Not produced</span>) },
    { id: "act", header: "Actions", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.eventType(row.key)} label="Details" /> },
  ];

  return (
    <div className="space-y-1">
      <EventsNav view="catalogue" />
      <EventsSummary />
      <Notice tone="info">This is a demo event catalogue. Producers are not connected, so &ldquo;Last produced&rdquo; reflects demo records only. It is separate from Feature Flags and the plan catalogue.</Notice>
      <TablePanel
        title="Event Catalogue"
        description="Outgoing platform event types, their schema versions and who subscribes."
        action={<ExportButton filename="webhook-event-catalogue.csv" rows={rows.map((t) => ({ key: t.key, name: t.name, category: t.category, schema: t.schemaVersion, audience: t.audience, availability: t.availability }))} />}
        filters={
          <FilterBar>
            <FilterControls
              state={filters}
              searchPlaceholder="Search event name, key or category..."
              filters={[
                { key: "category", label: "Category", options: Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })) },
                { key: "audience", label: "Audience", options: Object.entries(AUDIENCE_LABEL).map(([value, label]) => ({ value, label })) },
                { key: "schema", label: "Schema", options: optionsFrom(snapshot.eventTypes.map((t) => t.schemaVersion)) },
                { key: "availability", label: "Availability", options: Object.entries(EVENT_AVAILABILITY).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "subscribers", label: "Subscribers", options: [{ value: "0", label: "None" }, { value: "1", label: "One" }, { value: "2+", label: "Two or more" }] },
              ]}
            />
          </FilterBar>
        }
        scroll={false}
      >
        <DataTable columns={columns} rows={paged.pageRows} getRowId={(row) => row.key} isLoading={false} caption="Event catalogue" pagination={paged.pagination} onPageChange={paged.setPage} onPageSizeChange={paged.setPageSize} onRowClick={(row) => router.push(WEBHOOK_ROUTES.eventType(row.key))} emptyState={<EmptyRows title="No event types match" />} />
      </TablePanel>
    </div>
  );
}

export function SubscriptionsDirectoryPage() {
  const { snapshot } = useWebhookData();
  const router = useRouter();
  const filters = useFilterState(["company", "endpoint", "event", "status"] as const);

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return snapshot.subscriptions.filter((sub) => {
      const endpoint = snapshot.endpoints.find((item) => item.id === sub.endpointId);
      if (q && !`${endpoint?.name ?? ""} ${sub.eventKey} ${endpoint?.companyName ?? "platform"}`.toLowerCase().includes(q)) return false;
      if (filters.values.company && (endpoint?.companyId ?? "platform") !== filters.values.company) return false;
      if (filters.values.endpoint && sub.endpointId !== filters.values.endpoint) return false;
      if (filters.values.event && sub.eventKey !== filters.values.event) return false;
      if (filters.values.status && sub.state !== filters.values.status) return false;
      return true;
    });
  }, [snapshot, filters.query, filters.values]);
  const paged = usePaged(rows, 10);

  const columns: Array<DataTableColumn<EventSubscription>> = [
    { id: "endpoint", header: "Endpoint", cell: (row) => { const e = snapshot.endpoints.find((item) => item.id === row.endpointId); return e ? <Link href={WEBHOOK_ROUTES.endpoint(e.id)} onClick={(ev) => ev.stopPropagation()} className="block max-w-[15rem] truncate text-[0.8125rem] font-medium hover:underline">{e.name}</Link> : <span>{row.endpointId}</span>; } },
    { id: "scope", header: "Company / Scope", hideBelow: "lg", cell: (row) => { const e = snapshot.endpoints.find((item) => item.id === row.endpointId); return <CompanyCell id={e?.companyId ?? null} name={e?.companyName ?? null} />; } },
    { id: "event", header: "Event Type", cell: (row) => <Mono>{row.eventKey}</Mono> },
    { id: "schema", header: "Schema", cell: (row) => <span className="tabular text-[0.8125rem]">{row.schemaVersion}</span> },
    { id: "state", header: "Status", cell: (row) => <State registry={SUBSCRIPTION_STATE} status={row.state} /> },
    { id: "created", header: "Created", hideBelow: "xl", cell: (row) => <Timestamp iso={row.createdAt} /> },
    { id: "updated", header: "Updated", hideBelow: "xl", cell: (row) => <Timestamp iso={row.updatedAt} /> },
    { id: "act", header: "Actions", align: "right", cell: (row) => <OpenLink href={`${WEBHOOK_ROUTES.endpoint(row.endpointId)}?tab=subscriptions`} label="Manage" /> },
  ];

  return (
    <div className="space-y-1">
      <EventsNav view="subscriptions" />
      <EventsSummary />
      <Notice tone="info">Company-scoped endpoints cannot subscribe to platform-only events. Enforcement here is demo validation, and the backend must enforce authorization.</Notice>
      <TablePanel
        title="Subscriptions"
        description={`Endpoint event subscriptions in ${ENVIRONMENT_LABEL[snapshot.environment]}.`}
        action={<ExportButton filename="webhook-subscriptions.csv" rows={rows.map((s) => ({ endpointId: s.endpointId, eventKey: s.eventKey, schema: s.schemaVersion, state: s.state }))} />}
        filters={
          <FilterBar>
            <FilterControls
              state={filters}
              searchPlaceholder="Search endpoint, event type or company..."
              filters={[
                { key: "company", label: "Company", options: [{ value: "platform", label: "Platform" }, ...snapshot.companies.filter((c) => snapshot.endpoints.some((e) => e.companyId === c.id)).map((c) => ({ value: c.id, label: c.name }))] },
                { key: "endpoint", label: "Endpoint", options: snapshot.endpoints.map((e) => ({ value: e.id, label: e.name })) },
                { key: "event", label: "Event", options: optionsFrom(snapshot.subscriptions.map((s) => s.eventKey)) },
                { key: "status", label: "Status", options: Object.entries(SUBSCRIPTION_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
              ]}
            />
            <EnvironmentFilter />
          </FilterBar>
        }
        scroll={false}
      >
        <DataTable columns={columns} rows={paged.pageRows} getRowId={(row) => row.id} isLoading={false} caption="Subscriptions" pagination={paged.pagination} onPageChange={paged.setPage} onPageSizeChange={paged.setPageSize} onRowClick={(row) => router.push(`${WEBHOOK_ROUTES.endpoint(row.endpointId)}?tab=subscriptions`)} emptyState={<EmptyRows title="No subscriptions match" />} />
      </TablePanel>
    </div>
  );
}

export function EventTypeDetailPage({ eventKey }: { eventKey: string }) {
  const { snapshot } = useWebhookData();
  const type = snapshot.eventTypes.find((item) => item.key === eventKey);
  if (!type) return <NotFoundPanel title="Event type not found" description="This event key is not in the catalogue." href={WEBHOOK_ROUTES.events} action="Back to catalogue" />;

  const subs = subscribersOf(snapshot, type.key);
  const fieldList = (fields: string[], empty: string) => (fields.length ? <div className="flex flex-wrap gap-1">{fields.map((f) => <Chip key={f}><span className="font-mono">{f}</span></Chip>)}</div> : <span className="text-[0.8125rem] text-muted-foreground">{empty}</span>);

  return (
    <div className="space-y-1">
      <DetailHeader
        backHref={WEBHOOK_ROUTES.events}
        backLabel="Back to Event Catalogue"
        title={type.name}
        subtitle={<><Mono>{type.key}</Mono> · schema {type.schemaVersion} · {CATEGORY_LABEL[type.category]}</>}
        badges={<><State registry={EVENT_AVAILABILITY} status={type.availability} /><Chip tone={type.audience === "platform" ? "warning" : "info"}>{AUDIENCE_LABEL[type.audience]}</Chip>{!type.customerSubscribable ? <Chip tone="neutral">Not customer-subscribable</Chip> : null}</>}
      />
      <div className="grid gap-1 lg:grid-cols-2">
        <InfoCard title="Definition" columns={1} items={[
          { label: "Description", value: <span className="whitespace-normal">{type.description}</span> },
          { label: "Event producer", value: type.producer },
          { label: "Related business module", value: type.relatedModule },
          { label: "Audience scope", value: AUDIENCE_LABEL[type.audience] },
          { label: "Last produced", value: type.lastProducedAt ? <Timestamp iso={type.lastProducedAt} /> : "Not produced in demo records" },
        ]} />
        <SectionCard title="Payload Field Summary" description="Field names only. No private customer payload is shown as documentation.">
          <div className="space-y-3">
            <div className="space-y-1"><p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Required</p>{fieldList(type.requiredFields, "None")}</div>
            <div className="space-y-1"><p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Optional</p>{fieldList(type.optionalFields, "None")}</div>
            <div className="space-y-1"><p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Deprecated</p>{fieldList(type.deprecatedFields, "None")}</div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <SectionCard title="Schema Versions" description="Payload schemas do not change for existing subscribers without a compatibility policy.">
          <ul className="divide-y divide-border">
            {type.versions.map((version) => (
              <li key={version.version} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2"><span className="tabular text-[0.8125rem] font-semibold">v{version.version}</span><State registry={SCHEMA_LIFECYCLE} status={version.lifecycle} /><Chip tone={version.backwardCompatible ? "success" : "warning"}>{version.backwardCompatible ? "Backward compatible" : "Breaking change"}</Chip></div>
                <p className="text-2xs text-muted-foreground">{version.changeNote}</p>
                <p className="text-2xs text-muted-foreground">Pinned subscriptions: {subs.filter((s) => s.schemaVersion === version.version).length}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Sensitive Field Classification" description="How sensitive fields are handled before persistence or export.">
          {type.sensitiveFields.length === 0 ? <EmptyRows title="No sensitive fields declared" /> : (
            <ul className="divide-y divide-border">
              {type.sensitiveFields.map((field) => (
                <li key={field.field} className="space-y-1 py-2.5 first:pt-0 last:pb-0"><div className="flex items-center gap-2"><Mono className="font-semibold">{field.field}</Mono><Chip tone={field.classification === "restricted" ? "danger" : "warning"}>{PRIVACY_LABEL[field.classification]}</Chip></div><p className="text-2xs text-muted-foreground">{field.handling}</p></li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Subscribed Endpoints" description={`${subs.length} endpoint subscription(s) in ${ENVIRONMENT_LABEL[snapshot.environment]}.`}>
        {subs.length === 0 ? <EmptyRows title="No subscribers" description="No endpoint subscribes to this event type." /> : (
          <ul className="divide-y divide-border">
            {subs.map((sub) => {
              const endpoint = snapshot.endpoints.find((item) => item.id === sub.endpointId);
              return (
                <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0"><Link href={WEBHOOK_ROUTES.endpoint(sub.endpointId)} className="text-[0.8125rem] font-medium hover:underline">{endpoint?.name ?? sub.endpointId}</Link><p className="text-2xs text-muted-foreground">{endpoint?.companyName ?? "Platform"} · schema {sub.schemaVersion}</p></div>
                  <State registry={SUBSCRIPTION_STATE} status={sub.state} />
                </li>
              );
            })}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="mt-3"><Link href={`${WEBHOOK_ROUTES.subscriptions}?event=${encodeURIComponent(type.key)}`}>Open in subscriptions directory</Link></Button>
      </SectionCard>
    </div>
  );
}
