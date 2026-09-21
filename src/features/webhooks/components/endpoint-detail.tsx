/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Endpoint detail: Overview, Subscriptions, Deliveries, Security, Activity, Settings & Lifecycle.
 */

"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_LABEL, DELIVERY_STATE, ENDPOINT_STATE, ENVIRONMENT_LABEL, MODULE_LINKS, PRIVACY_LABEL, RETRY_POLICIES, SECURITY_REFERENCES,
  SECURITY_REVIEW, SIGNING_STATE, SUBSCRIPTION_STATE, URL_VALIDATION, WEBHOOK_ROUTES,
} from "../data/config";
import { useWebhookMutation } from "../data/hooks";
import { webhooksRepository } from "../data/repository";
import { deliveriesInWindow, endpointSecurityWarnings, subscriptionsFor } from "../data/selectors";
import type { Delivery, EventSubscription } from "../data/types";
import { checkDestinationUrl } from "../data/validation";
import { CompanyCell, OpenLink, TablePanel, SectionCard } from "./cells";
import { ChangeReviewDialog, type ChangeRow } from "./change-review";
import { DetailHeader, InfoCard, TabBar, useUrlTab, type TabItem } from "./detail";
import { CardGrid, Chip, EmptyRows, IdCell, Kpi, Mono, NotFoundPanel, Notice, State, Timestamp, humanize } from "./kit";
import { useWebhookData } from "./webhooks-context";

const TABS: ReadonlyArray<TabItem<"overview" | "subscriptions" | "deliveries" | "security" | "activity" | "settings">> = [
  { value: "overview", label: "Overview" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "deliveries", label: "Deliveries" },
  { value: "security", label: "Security" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Settings & Lifecycle" },
];

export function EndpointDetailPage({ endpointId }: { endpointId: string }) {
  const { snapshot, environment } = useWebhookData();
  const router = useRouter();
  const [tab, setTab] = useUrlTab(TABS);
  const [stateDialog, setStateDialog] = useState(false);

  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId);

  const setState = useWebhookMutation(environment, (input: { state: "enabled" | "disabled"; reason: string }) =>
    webhooksRepository.setEndpointState(environment, endpointId, input.state, input.reason),
  );

  if (!endpoint) return <NotFoundPanel title="Endpoint not found" description="No endpoint with this ID exists in the selected environment." href={WEBHOOK_ROUTES.outgoing} action="Back to endpoints" />;

  const nextState = endpoint.state === "enabled" ? "disabled" : "enabled";
  const canToggle = endpoint.state === "enabled" || endpoint.state === "disabled" || endpoint.state === "draft";
  const subs = subscriptionsFor(snapshot, endpoint.id);
  const affectedCompanies = endpoint.companyName ? [endpoint.companyName] : ["All companies (platform endpoint)"];

  return (
    <div className="space-y-1">
      <DetailHeader
        backHref={WEBHOOK_ROUTES.outgoing}
        backLabel="Back to Outgoing Endpoints"
        title={endpoint.name}
        subtitle={<><Mono>{endpoint.id}</Mono> · {endpoint.companyName ?? "Platform"} · {ENVIRONMENT_LABEL[endpoint.environment]} · <Mono>{endpoint.destinationHost}</Mono> · updated <Timestamp iso={endpoint.updatedAt} relative={false} /></>}
        badges={<><State registry={ENDPOINT_STATE} status={endpoint.state} />{endpoint.demoCreated ? <Chip tone="brand">Demo configuration</Chip> : null}</>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setTab("settings")}>Edit Endpoint</Button>
            <Button variant="outline" size="sm" onClick={() => setTab("subscriptions")}>Review Subscriptions</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><MoreHorizontalIcon />More</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => router.push(`${WEBHOOK_ROUTES.deliveries}?endpoint=${endpoint.id}`)}>View Deliveries</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTab("security")}>Review Security</DropdownMenuItem>
                {canToggle && endpoint.state !== "draft" ? <DropdownMenuItem onSelect={() => setStateDialog(true)}>{endpoint.state === "enabled" ? "Disable Endpoint" : "Enable Endpoint"}</DropdownMenuItem> : null}
                {endpoint.companyId ? (<><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => router.push(MODULE_LINKS.company(endpoint.companyId!))}>Open Company</DropdownMenuItem></>) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <TabBar items={TABS.map((item) => item.value === "subscriptions" ? { ...item, count: subs.length } : item)} value={tab} onChange={setTab} label="Endpoint sections" />

      {tab === "overview" ? <OverviewTab endpointId={endpoint.id} onTab={setTab} /> : null}
      {tab === "subscriptions" ? <SubscriptionsTab endpointId={endpoint.id} /> : null}
      {tab === "deliveries" ? <DeliveriesTab endpointId={endpoint.id} /> : null}
      {tab === "security" ? <SecurityTab endpointId={endpoint.id} /> : null}
      {tab === "activity" ? <ActivityTab endpointId={endpoint.id} /> : null}
      {tab === "settings" ? <SettingsTab endpointId={endpoint.id} onToggle={() => setStateDialog(true)} /> : null}

      <ChangeReviewDialog
        open={stateDialog}
        onOpenChange={setStateDialog}
        title={`${nextState === "enabled" ? "Enable" : "Disable"} endpoint`}
        description="This changes the demo configuration only. No delivery is sent or stopped by this frontend."
        rows={[{ label: "Endpoint state", current: ENDPOINT_STATE[endpoint.state].label, proposed: ENDPOINT_STATE[nextState].label }]}
        affectedEvents={subs.map((sub) => sub.eventKey)}
        affectedCompanies={affectedCompanies}
        impact={nextState === "disabled" ? "Future matching events would be cancelled instead of delivered once a delivery worker exists." : "Future matching events would become eligible for delivery once a delivery worker exists."}
        confirmLabel={nextState === "enabled" ? "Enable endpoint" : "Disable endpoint"}
        pending={setState.isPending}
        onConfirm={async (reason) => {
          try {
            await setState.mutateAsync({ state: nextState, reason });
            toast.success(`Endpoint ${nextState} in demo configuration`, { description: "Delivery history is unchanged. Nothing was sent." });
            setStateDialog(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The change could not be saved.");
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function deliveryColumns(): Array<DataTableColumn<Delivery>> {
  return [
    { id: "id", header: "Delivery ID", cell: (row) => <IdCell id={row.id} sub={row.eventKey} /> },
    { id: "event", header: "Event ID", hideBelow: "lg", cell: (row) => <Mono>{row.eventId}</Mono> },
    { id: "state", header: "State", cell: (row) => <State registry={DELIVERY_STATE} status={row.state} /> },
    { id: "attempts", header: "Attempts", align: "right", cell: (row) => <span className="tabular">{row.attemptsUsed}/{row.maxAttempts}</span> },
    { id: "last", header: "Last Attempt", hideBelow: "md", cell: (row) => <Timestamp iso={row.latestAttemptAt} /> },
    { id: "next", header: "Next Retry", hideBelow: "lg", cell: (row) => (row.nextRetryAt ? <Timestamp iso={row.nextRetryAt} /> : <span className="text-muted-foreground">None</span>) },
    { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.delivery(row.id)} /> },
  ];
}

function OverviewTab({ endpointId, onTab }: { endpointId: string; onTab: (tab: "subscriptions" | "deliveries" | "security" | "activity") => void }) {
  const { snapshot, window } = useWebhookData();
  const router = useRouter();
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId)!;
  const subs = subscriptionsFor(snapshot, endpointId);
  const all = snapshot.deliveries.filter((d) => d.endpointId === endpointId);
  const period = deliveriesInWindow(snapshot, window).filter((d) => d.endpointId === endpointId);
  const count = (state: Delivery["state"]) => period.filter((d) => d.state === state).length;
  const last = all[0];
  const warnings = endpointSecurityWarnings(endpoint);
  const activity = snapshot.activity.filter((entry) => entry.endpointId === endpointId).slice(0, 5);

  return (
    <div className="space-y-1">
      <CardGrid cols={4}>
        <Kpi label="Configuration State" value={ENDPOINT_STATE[endpoint.state].label} hint="Enabled is not healthy" />
        <Kpi label="Subscribed Events" value={subs.length} hint="Current state" />
        <Kpi label="Deliveries in Period" value={period.length} hint="Deliveries, not attempts" />
        <Kpi label="Delivered / Accepted" value={count("delivered")} tone="success" hint="Downstream unconfirmed" />
        <Kpi label="Failed" value={count("failed")} tone={count("failed") ? "danger" : "default"} hint="Terminal failed state" />
        <Kpi label="Retry Scheduled" value={count("retry_scheduled")} tone={count("retry_scheduled") ? "warning" : "default"} hint="Awaiting next attempt" />
        <Kpi label="Last Delivery" value={last ? DELIVERY_STATE[last.state].label : "None"} hint={last ? <Timestamp iso={last.latestAttemptAt ?? last.createdAt} /> : "No deliveries recorded"} />
        <Kpi label="Signing Readiness" value={SIGNING_STATE[endpoint.signing.state].label} tone={endpoint.signing.state === "configured_reference" ? "default" : "warning"} hint="Reference state only" />
      </CardGrid>

      <div className="grid gap-1 lg:grid-cols-2">
        <InfoCard title="Endpoint Information" items={[
          { label: "Endpoint name", value: endpoint.name },
          { label: "Endpoint ID", value: <Mono>{endpoint.id}</Mono> },
          { label: "Scope", value: <CompanyCell id={endpoint.companyId} name={endpoint.companyName} /> },
          { label: "Environment", value: ENVIRONMENT_LABEL[endpoint.environment] },
          { label: "Destination", value: <Mono>{endpoint.destinationUrl}</Mono> },
          { label: "Configuration state", value: <State registry={ENDPOINT_STATE} status={endpoint.state} /> },
          { label: "Created", value: <Timestamp iso={endpoint.createdAt} /> },
          { label: "Updated", value: <Timestamp iso={endpoint.updatedAt} /> },
          { label: "Owner contact", value: endpoint.contactRef ?? "Not recorded" },
          { label: "Description", value: <span className="whitespace-normal">{endpoint.description || "None"}</span> },
        ]} />
        <SectionCard title="Delivery Summary" description="For the selected period.">
          <ul className="space-y-2 text-[0.8125rem]">
            {(["delivered", "retry_scheduled", "failed", "attempting", "pending", "cancelled"] as const).map((state) => (
              <li key={state} className="flex items-center justify-between gap-2"><State registry={DELIVERY_STATE} status={state} /><span className="tabular font-medium">{count(state)}</span></li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => onTab("deliveries")}>Open deliveries</Button>
        </SectionCard>
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <SectionCard title="Event Subscriptions" action={<Button variant="outline" size="sm" onClick={() => onTab("subscriptions")}>Review</Button>}>
          {subs.length === 0 ? <EmptyRows title="No subscriptions" /> : <ul className="divide-y divide-border">{subs.map((sub) => (<li key={sub.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"><span className="min-w-0"><Link href={WEBHOOK_ROUTES.eventType(sub.eventKey)} className="font-mono text-[0.75rem] font-semibold hover:underline">{sub.eventKey}</Link><span className="ml-2 text-2xs text-muted-foreground">schema {sub.schemaVersion}</span></span><State registry={SUBSCRIPTION_STATE} status={sub.state} /></li>))}</ul>}
        </SectionCard>
        <TablePanel title="Recent Deliveries" action={<Button variant="outline" size="sm" onClick={() => onTab("deliveries")}>All</Button>}>
          <DataTable columns={deliveryColumns().filter((c) => ["id", "state", "last", "act"].includes(c.id))} rows={all.slice(0, 5)} getRowId={(row) => row.id} isLoading={false} caption="Recent endpoint deliveries" onRowClick={(row) => router.push(WEBHOOK_ROUTES.delivery(row.id))} emptyState={<EmptyRows title="No deliveries" description="Nothing has been recorded for this endpoint." />} />
        </TablePanel>
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <SectionCard title="Security Readiness" action={<Button variant="outline" size="sm" onClick={() => onTab("security")}>Review</Button>}>
          {warnings.length === 0 ? <p className="text-[0.8125rem] text-muted-foreground">No warnings. Backend enforcement is still required.</p> : <ul className="list-disc space-y-1 pl-4 text-[0.8125rem]">{warnings.slice(0, 4).map((w) => <li key={w}>{w}</li>)}</ul>}
        </SectionCard>
        <SectionCard title="Recent Activity" action={<Button variant="outline" size="sm" onClick={() => onTab("activity")}>All</Button>}>
          {activity.length === 0 ? <EmptyRows title="No activity recorded" /> : <ul className="divide-y divide-border">{activity.map((entry) => (<li key={entry.id} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0"><span><span className="block text-[0.8125rem] font-medium">{humanize(entry.type)}</span><span className="text-2xs text-muted-foreground">{entry.message}</span></span><Timestamp iso={entry.at} /></li>))}</ul>}
        </SectionCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

function SubscriptionsTab({ endpointId }: { endpointId: string }) {
  const { snapshot, environment } = useWebhookData();
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId)!;
  const current = subscriptionsFor(snapshot, endpointId);
  const currentKeys = useMemo(() => current.map((sub) => sub.eventKey), [current]);
  const [selected, setSelected] = useState<string[]>(currentKeys);
  const [review, setReview] = useState(false);

  const save = useWebhookMutation(environment, (input: { keys: string[]; reason: string }) => webhooksRepository.saveSubscriptions(environment, endpointId, input.keys, input.reason));

  const added = selected.filter((key) => !currentKeys.includes(key));
  const removed = currentKeys.filter((key) => !selected.includes(key));
  const dirty = added.length + removed.length > 0;
  const catalogue = snapshot.eventTypes;
  const companyScoped = endpoint.ownerScope === "company";

  const rows: ChangeRow[] = [
    { label: "Subscribed events", current: currentKeys.length, proposed: selected.length },
    ...added.map((key) => ({ label: "Add", current: "-", proposed: key })),
    ...removed.map((key) => ({ label: "Remove", current: key, proposed: "-" })),
  ];

  return (
    <div className="space-y-2">
      {dirty ? (
        <Notice tone="brand" title={`${added.length} to add, ${removed.length} to remove`}>
          Changes are not saved yet. Existing deliveries keep their history.
          <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => setReview(true)}>Review Subscription Changes</Button><Button size="sm" variant="ghost" onClick={() => setSelected(currentKeys)}>Discard</Button></div>
        </Notice>
      ) : null}
      <div className="grid gap-1 xl:grid-cols-2">
        <SectionCard title="Subscribed Event Types" description="Changing subscriptions never rewrites historical deliveries.">
          {selected.length === 0 ? <EmptyRows title="No subscriptions" description="An endpoint needs at least one subscription to be saved." /> : (
            <ul className="divide-y divide-border">
              {selected.map((key) => {
                const sub: EventSubscription | undefined = current.find((item) => item.eventKey === key);
                const type = catalogue.find((item) => item.key === key);
                return (
                  <li key={key} className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={WEBHOOK_ROUTES.eventType(key)} className="font-mono text-[0.75rem] font-semibold hover:underline">{key}</Link>
                      <p className="text-2xs text-muted-foreground">Schema {sub?.schemaVersion ?? type?.schemaVersion} · added <Timestamp iso={sub?.createdAt ?? null} relative={false} />{sub ? <> · updated <Timestamp iso={sub.updatedAt} relative={false} /></> : null}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {sub ? <State registry={SUBSCRIPTION_STATE} status={sub.state} /> : <Chip tone="brand">Pending add</Chip>}
                      <Button variant="ghost" size="sm" onClick={() => setSelected(selected.filter((item) => item !== key))} aria-label={`Remove subscription ${key}`}>Remove</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {removed.length ? <p className="mt-2 text-2xs text-muted-foreground">Pending removal: {removed.join(", ")}</p> : null}
        </SectionCard>
        <SectionCard title="Available Event Catalogue" description={companyScoped ? "Company-scoped endpoints cannot subscribe to platform-only events." : "Events the platform defines."}>
          <ul className="divide-y divide-border">
            {catalogue.map((type) => {
              const subscribed = selected.includes(type.key);
              const blocked = type.availability === "deprecated" || (companyScoped && (!type.customerSubscribable || type.audience === "platform"));
              return (
                <li key={type.key} className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium">{type.name} <span className="font-mono text-2xs text-muted-foreground">{type.key}</span></p>
                    <p className="text-2xs text-muted-foreground">{CATEGORY_LABEL[type.category]} · schema {type.schemaVersion}{blocked ? (type.availability === "deprecated" ? " · Deprecated" : " · Platform-only") : ""}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={subscribed || blocked} onClick={() => setSelected([...selected, type.key])} aria-label={`Add subscription ${type.key}`}>{subscribed ? "Subscribed" : "Add"}</Button>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
      <div className="flex justify-end"><Button disabled={!dirty} onClick={() => setReview(true)}>Save Demo Configuration</Button></div>

      <ChangeReviewDialog
        open={review}
        onOpenChange={setReview}
        title="Review subscription changes"
        description="Saves a demo subscription configuration. Nothing is sent to a backend."
        rows={rows}
        affectedEvents={[...added, ...removed]}
        affectedCompanies={endpoint.companyName ? [endpoint.companyName] : ["All companies (platform endpoint)"]}
        impact={removed.length ? "Removed event types stop being eligible for this endpoint. Deliveries already created are not deleted." : "Added event types become eligible for this endpoint from now on."}
        confirmLabel="Save demo configuration"
        pending={save.isPending}
        onConfirm={async (reason) => {
          try {
            await save.mutateAsync({ keys: selected, reason });
            toast.success("Demo subscriptions saved", { description: "Existing delivery history is unchanged." });
            setReview(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The subscriptions could not be saved.");
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deliveries / Security / Activity                                    */
/* ------------------------------------------------------------------ */

function DeliveriesTab({ endpointId }: { endpointId: string }) {
  const { snapshot } = useWebhookData();
  const router = useRouter();
  const rows = snapshot.deliveries.filter((d) => d.endpointId === endpointId);
  return (
    <TablePanel title="Endpoint Deliveries" description="One row per delivery. A delivery may have several attempts." action={<Button asChild variant="outline" size="sm"><Link href={`${WEBHOOK_ROUTES.deliveries}?endpoint=${endpointId}`}>Open in Deliveries</Link></Button>}>
      <DataTable columns={deliveryColumns()} rows={rows} getRowId={(row) => row.id} isLoading={false} caption="Endpoint deliveries" onRowClick={(row) => router.push(WEBHOOK_ROUTES.delivery(row.id))} emptyState={<EmptyRows title="No deliveries" description="No deliveries are recorded for this endpoint. That is not evidence that events were not produced." />} />
    </TablePanel>
  );
}

function SecurityTab({ endpointId }: { endpointId: string }) {
  const { snapshot, environment } = useWebhookData();
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId)!;
  const rotate = useWebhookMutation(environment, () => webhooksRepository.requestSecretRotationReview(environment, endpointId));
  const warnings = endpointSecurityWarnings(endpoint);
  const sg = endpoint.signing;
  return (
    <div className="space-y-2">
      <Notice tone="warning" title="No secret is shown, generated or rotated here">Signing keys belong in backend key management. This view shows references only.</Notice>
      <div className="grid gap-1 lg:grid-cols-2">
        <InfoCard title="Signing" columns={1} items={[
          { label: "Signing method", value: sg.method === "hmac_sha256" ? "HMAC-SHA256 (reference)" : "None" },
          { label: "Signing readiness", value: <State registry={SIGNING_STATE} status={sg.state} /> },
          { label: "Secret version reference", value: sg.secretVersionRef ? <Mono>{sg.secretVersionRef}</Mono> : "None" },
          { label: "Last rotation", value: <Timestamp iso={sg.lastRotationAt} /> },
          { label: "Security review", value: <State registry={SECURITY_REVIEW} status={sg.reviewStatus} /> },
          { label: "Payload schema version", value: endpoint.policy.schemaVersion },
        ]} />
        <InfoCard title="Destination" columns={1} items={[
          { label: "HTTPS state", value: endpoint.security.httpsState === "https" ? "HTTPS" : endpoint.security.httpsState === "http" ? "HTTP (not encrypted)" : "Unknown" },
          { label: "URL validation", value: <State registry={URL_VALIDATION} status={endpoint.security.urlValidationState} /> },
          { label: "Last security review", value: <Timestamp iso={endpoint.security.lastSecurityReviewAt} /> },
          { label: "Private-network restriction", value: <span className="whitespace-normal text-2xs">{SECURITY_REFERENCES.privateNetworkPolicy}</span> },
          { label: "Redirect policy", value: <span className="whitespace-normal text-2xs">{SECURITY_REFERENCES.redirectPolicy}</span> },
          { label: "DNS resolution policy", value: <span className="whitespace-normal text-2xs">{SECURITY_REFERENCES.dnsPolicy}</span> },
        ]} />
      </div>
      <SectionCard title="Security Warnings" action={
        <Button variant="outline" size="sm" disabled={rotate.isPending} onClick={async () => {
          try { await rotate.mutateAsync(undefined); toast.success("Rotation review requested (demo)", { description: "No secret was generated or changed. Key management is not connected." }); } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
        }}>Request Secret Rotation Review</Button>
      }>
        {warnings.length === 0 ? <p className="text-[0.8125rem] text-muted-foreground">No frontend-detectable warnings. Backend SSRF, DNS and egress enforcement is still required.</p> : <ul className="list-disc space-y-1 pl-4 text-[0.8125rem]">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      </SectionCard>
    </div>
  );
}

function ActivityTab({ endpointId }: { endpointId: string }) {
  const { snapshot } = useWebhookData();
  const entries = snapshot.activity.filter((entry) => entry.endpointId === endpointId);
  return (
    <SectionCard title="Endpoint Activity" description="Demo activity records. Sensitive administrative actions are recorded centrally in Audit Logs once a backend exists." action={<Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.auditSensitive}>Open Audit Logs</Link></Button>}>
      {entries.length === 0 ? <EmptyRows title="No activity recorded" /> : (
        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="text-[0.8125rem] font-medium">{humanize(entry.type)} {entry.auditReferenced ? <Chip tone="info">Audit-worthy</Chip> : null}</p><p className="text-2xs text-muted-foreground">{entry.message} · {entry.actorName}</p></div>
              <Timestamp iso={entry.at} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Settings & lifecycle                                                */
/* ------------------------------------------------------------------ */

function SettingsTab({ endpointId, onToggle }: { endpointId: string; onToggle: () => void }) {
  const { snapshot, environment } = useWebhookData();
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId)!;
  const subs = subscriptionsFor(snapshot, endpointId);

  const [form, setForm] = useState({
    name: endpoint.name, description: endpoint.description, destinationUrl: "", allowedAudience: endpoint.allowedAudience,
    contactRef: endpoint.contactRef ?? "", timeoutMs: endpoint.policy.timeoutMs, retryPolicyRef: endpoint.policy.retryPolicyRef,
  });
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useWebhookMutation(environment, (input: Parameters<typeof webhooksRepository.updateEndpoint>[1]) => webhooksRepository.updateEndpoint(environment, input));

  const urlCheck = form.destinationUrl.trim() ? checkDestinationUrl(form.destinationUrl, endpoint.environment) : null;
  const highImpact = Boolean(form.destinationUrl.trim()) || form.timeoutMs !== endpoint.policy.timeoutMs || form.retryPolicyRef !== endpoint.policy.retryPolicyRef;
  const dirty = form.name !== endpoint.name || form.description !== endpoint.description || form.allowedAudience !== endpoint.allowedAudience || form.contactRef !== (endpoint.contactRef ?? "") || highImpact;

  const rows: ChangeRow[] = [
    ...(form.destinationUrl.trim() ? [{ label: "Destination", current: <Mono>{endpoint.destinationUrl}</Mono>, proposed: <Mono>{urlCheck?.sanitizedUrl ?? "Invalid"}</Mono> }] : []),
    ...(form.timeoutMs !== endpoint.policy.timeoutMs ? [{ label: "Timeout", current: `${endpoint.policy.timeoutMs} ms`, proposed: `${form.timeoutMs} ms` }] : []),
    ...(form.retryPolicyRef !== endpoint.policy.retryPolicyRef ? [{ label: "Retry policy", current: endpoint.policy.retryPolicyRef, proposed: form.retryPolicyRef }] : []),
  ];

  const payload = (reason?: string) => ({
    endpointId, name: form.name, description: form.description, destinationUrl: form.destinationUrl || undefined,
    allowedAudience: form.allowedAudience, contactRef: form.contactRef || null, timeoutMs: form.timeoutMs, retryPolicyRef: form.retryPolicyRef, reason,
  });

  const persist = async (reason?: string) => {
    try {
      await update.mutateAsync(payload(reason));
      toast.success("Demo endpoint configuration saved", { description: "Historical deliveries are unchanged. No request was sent." });
      setForm((f) => ({ ...f, destinationUrl: "" }));
      setReview(false);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The endpoint could not be saved.";
      setError(message);
      setReview(false);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-2">
      <SectionCard title="Editable Configuration" description="Destination, timeout and retry policy changes are high-impact and need a reason.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="s-name">Name</Label><Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="s-contact">Owner contact</Label><Input id="s-contact" value={form.contactRef} onChange={(e) => setForm({ ...form, contactRef: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-desc">Description</Label><Textarea id="s-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-url">Destination URL</Label>
            <Input id="s-url" value={form.destinationUrl} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} placeholder={`Current: ${endpoint.destinationUrl}. Enter a new HTTPS URL to change it`} aria-invalid={Boolean(urlCheck && !urlCheck.ok)} autoComplete="off" />
            {urlCheck ? (<div className="space-y-0.5" aria-live="polite">{urlCheck.errors.map((m) => <p key={m} className="text-2xs text-danger">{m}</p>)}{urlCheck.warnings.map((m) => <p key={m} className="text-2xs text-warning">{m}</p>)}{urlCheck.ok ? <p className="text-2xs text-muted-foreground">Preliminary check passed. The backend must still enforce SSRF and egress controls.</p> : null}</div>) : <p className="text-2xs text-muted-foreground">Leave blank to keep the current destination.</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="s-aud">Allowed scope</Label><Input id="s-aud" value={form.allowedAudience} onChange={(e) => setForm({ ...form, allowedAudience: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="s-timeout">Timeout (ms)</Label><Input id="s-timeout" type="number" min={1000} max={30000} step={500} value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-retry">Delivery policy reference</Label>
            <Select value={form.retryPolicyRef} onValueChange={(value) => setForm({ ...form, retryPolicyRef: value })}><SelectTrigger id="s-retry"><SelectValue /></SelectTrigger><SelectContent>{RETRY_POLICIES.map((p) => <SelectItem key={p.ref} value={p.ref}>{p.name}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        {error ? <p className="mt-3 text-2xs text-danger" role="alert">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" disabled={!dirty} onClick={() => { setForm({ name: endpoint.name, description: endpoint.description, destinationUrl: "", allowedAudience: endpoint.allowedAudience, contactRef: endpoint.contactRef ?? "", timeoutMs: endpoint.policy.timeoutMs, retryPolicyRef: endpoint.policy.retryPolicyRef }); setError(null); }}>Reset</Button>
          <Button disabled={!dirty || update.isPending || Boolean(urlCheck && !urlCheck.ok)} onClick={() => (highImpact ? setReview(true) : void persist())}>{highImpact ? "Review changes" : "Save demo configuration"}</Button>
        </div>
      </SectionCard>

      <SectionCard title="Lifecycle" description="Endpoints are never deleted from here. Historical deliveries are retained.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1"><State registry={ENDPOINT_STATE} status={endpoint.state} /><p className="text-2xs text-muted-foreground">{endpoint.state === "suspended" ? "Suspended endpoints require a backend security review." : endpoint.state === "draft" ? "Draft endpoints are enabled through the wizard or a backend workflow." : `${subs.length} subscription(s). Affects ${endpoint.companyName ?? "all companies"}.`}</p></div>
          {endpoint.state === "enabled" || endpoint.state === "disabled" ? <Button variant={endpoint.state === "enabled" ? "outline" : "default"} onClick={onToggle}>{endpoint.state === "enabled" ? "Disable Endpoint" : "Enable Endpoint"}</Button> : null}
        </div>
      </SectionCard>

      <ChangeReviewDialog
        open={review}
        onOpenChange={setReview}
        title="Review configuration changes"
        description="High-impact change. Saves a demo configuration only."
        rows={rows}
        affectedEvents={subs.map((s) => s.eventKey)}
        affectedCompanies={endpoint.companyName ? [endpoint.companyName] : ["All companies (platform endpoint)"]}
        impact={form.destinationUrl.trim() ? "Future deliveries would go to the new destination. Any recipient state at the old destination is unaffected." : "Future deliveries would follow the new policy."}
        confirmLabel="Save demo configuration"
        pending={update.isPending}
        onConfirm={(reason) => void persist(reason)}
      />
      <p className="text-2xs text-muted-foreground">Payload privacy: {PRIVACY_LABEL[endpoint.policy.payloadPrivacy]}. Category and schema settings are managed through subscriptions.</p>
    </div>
  );
}
