/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Overview: KPIs, activity trend, source and endpoint summaries, failures, recent deliveries, activity.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_PROPS, CHART_GRID_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_STYLE } from "@/components/shared/charts/chart-theme";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils/format";
import {
  ATTEMPT_RESULT, DELIVERY_STATE, ENDPOINT_STATE, ENVIRONMENT_LABEL, VERIFICATION_STATE, WEBHOOK_ROUTES,
} from "../data/config";
import {
  activityTrend, attemptsInWindow, attentionItems, deliveriesInWindow, endpointStats, incomingInWindow,
  ISSUE_LABEL, overviewKpis, sourceStats, type AttentionItem, type EndpointStat, type SourceStat,
} from "../data/selectors";
import type { Delivery, IncomingEvent } from "../data/types";
import { CompanyCell, EndpointCell, OpenLink, TablePanel, SectionCard } from "./cells";
import { CardGrid, Chip, DirectionBadge, EmptyRows, IdCell, Kpi, State, Timestamp, humanize } from "./kit";
import { useWebhookData } from "./webhooks-context";

const SERIES = [
  { key: "incoming", label: "Incoming events", color: "var(--chart-2)" },
  { key: "outgoing", label: "Outgoing deliveries", color: "var(--chart-3)" },
  { key: "failedIncoming", label: "Failed incoming processing", color: "var(--chart-4)" },
  { key: "failedAttempts", label: "Failed outgoing attempts", color: "var(--chart-1)" },
] as const;

function TrendPanel() {
  const { snapshot, window } = useWebhookData();
  const { buckets, grouping } = useMemo(() => activityTrend(snapshot, window), [snapshot, window]);
  const total = buckets.reduce((sum, bucket) => sum + bucket.incoming + bucket.outgoing, 0);
  return (
    <SectionCard title="Incoming & Outgoing Activity" description={`Recorded demo events, grouped ${grouping}. Failed attempts count attempts, not deliveries.`} contentClassName="max-h-none overflow-visible">
      {total === 0 ? (
        <EmptyRows title="No activity in this period" description="Widen the time range. Missing data is not shown as healthy." />
      ) : (
        <div className="h-44" role="img" aria-label={`Activity trend, ${grouping} buckets`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={buckets} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval="preserveStartEnd" minTickGap={28} />
              <YAxis {...CHART_AXIS_PROPS} allowDecimals={false} width={44} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {SERIES.map((series) => (
                <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={1.75} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

const sourceColumns: Array<DataTableColumn<SourceStat>> = [
  { id: "source", header: "Provider / Source", cell: (row) => <IdCell id={row.source.providerName} sub={row.source.id} /> },
  { id: "events", header: "Events", align: "right", cell: (row) => <span className="tabular">{row.events}</span> },
  { id: "vf", header: "Verif. Failures", align: "right", hideBelow: "2xl", cell: (row) => <span className="tabular">{row.verificationFailures}</span> },
  { id: "pf", header: "Proc. Failures", align: "right", hideBelow: "2xl", cell: (row) => <span className="tabular">{row.processingFailures}</span> },
  { id: "last", header: "Last Received", hideBelow: "xl", cell: (row) => <Timestamp iso={row.lastReceivedAt} /> },
  { id: "mon", header: "Monitoring", cell: (row) => <MonitoringChip state={row.monitoring} /> },
  { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.incomingSource(row.source.id)} /> },
];

export function MonitoringChip({ state }: { state: SourceStat["monitoring"] }) {
  const map = {
    observed: { tone: "info", label: "Observed (demo)" },
    stale: { tone: "warning", label: "Stale" },
    no_observations: { tone: "warning", label: "No observations" },
    receiver_not_connected: { tone: "neutral", label: "Receiver not connected" },
  } as const;
  const item = map[state];
  return <Chip tone={item.tone}>{item.label}</Chip>;
}

const endpointColumns: Array<DataTableColumn<EndpointStat>> = [
  { id: "endpoint", header: "Endpoint", cell: (row) => <EndpointCell endpoint={row.endpoint} /> },
  { id: "scope", header: "Company / Scope", hideBelow: "2xl", cell: (row) => <CompanyCell id={row.endpoint.companyId} name={row.endpoint.companyName} /> },
  { id: "subs", header: "Events", align: "right", hideBelow: "2xl", cell: (row) => <span className="tabular">{row.subscribed}</span> },
  { id: "ok", header: "Delivered", align: "right", cell: (row) => <span className="tabular">{row.delivered}</span> },
  { id: "bad", header: "Failed", align: "right", cell: (row) => <span className="tabular">{row.failed}</span> },
  { id: "state", header: "State", cell: (row) => <State registry={ENDPOINT_STATE} status={row.endpoint.state} /> },
  { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.endpoint(row.endpoint.id)} /> },
];

const failureColumns: Array<DataTableColumn<AttentionItem>> = [
  { id: "dir", header: "Direction", cell: (row) => <DirectionBadge direction={row.direction} /> },
  { id: "issue", header: "Issue", cell: (row) => (<div className="min-w-0"><span className="block max-w-[14rem] truncate text-[0.8125rem] font-medium">{ISSUE_LABEL[row.issue]}</span><span className="block max-w-[14rem] truncate text-2xs text-muted-foreground">{row.subject}</span></div>) },
  { id: "related", header: "Related", hideBelow: "2xl", cell: (row) => <IdCell id={row.relatedId} /> },
  { id: "company", header: "Company", hideBelow: "xl", cell: (row) => <span className="text-[0.8125rem]">{row.company ?? "Not mapped"}</span> },
  { id: "seen", header: "Last Seen", cell: (row) => <Timestamp iso={row.lastSeenAt} /> },
  { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={row.relatedHref} label="Review" /> },
];

export function OverviewPage() {
  const { snapshot, window } = useWebhookData();
  const kpi = useMemo(() => overviewKpis(snapshot, window), [snapshot, window]);
  const sources = useMemo(() => sourceStats(snapshot, window), [snapshot, window]);
  const endpoints = useMemo(() => endpointStats(snapshot, window), [snapshot, window]);
  const issues = useMemo(() => attentionItems(snapshot, window), [snapshot, window]);
  const deliveries = useMemo(() => deliveriesInWindow(snapshot, window).slice(0, 7), [snapshot, window]);
  const incoming = useMemo(() => incomingInWindow(snapshot, window), [snapshot, window]);
  const verificationRows = useMemo(() => incoming.filter((event) => event.verification.state !== "verified").slice(0, 6), [incoming]);
  const attempts = attemptsInWindow(snapshot, window).length;
  const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}% of period` : "No events in period");

  return (
    <div className="space-y-1">
      <CardGrid cols={4}>
        <Kpi label="Incoming Events" value={formatNumber(kpi.incomingEvents)} hint="Period. Received demo records" href={WEBHOOK_ROUTES.incomingEvents} />
        <Kpi label="Verified Incoming" value={formatNumber(kpi.verifiedIncoming)} hint={`${pct(kpi.verifiedIncoming, kpi.incomingEvents)}. Demo verification records`} />
        <Kpi label="Incoming Processing Failures" value={formatNumber(kpi.incomingProcessingFailures)} hint="Verified events whose processing failed" tone={kpi.incomingProcessingFailures ? "danger" : "default"} href={`${WEBHOOK_ROUTES.failures}?section=incoming`} />
        <Kpi label="Outgoing Deliveries" value={formatNumber(kpi.outgoingDeliveries)} hint={`Period. ${attempts} attempts across them`} href={WEBHOOK_ROUTES.deliveries} />
        <Kpi label="Delivered / Accepted" value={formatNumber(kpi.delivered)} hint={`${pct(kpi.delivered, kpi.outgoingDeliveries)}. Endpoint accepted; downstream unconfirmed`} tone="success" href={`${WEBHOOK_ROUTES.deliveries}?state=delivered`} />
        <Kpi label="Failed Deliveries" value={formatNumber(kpi.failedDeliveries)} hint="Terminal failed state" tone={kpi.failedDeliveries ? "danger" : "default"} href={`${WEBHOOK_ROUTES.deliveries}?state=failed`} />
        <Kpi label="Retry Scheduled" value={formatNumber(kpi.retryScheduled)} hint="Awaiting next automatic attempt" tone={kpi.retryScheduled ? "warning" : "default"} href={`${WEBHOOK_ROUTES.failures}?section=retry`} />
        <Kpi label="Enabled Endpoints" value={`${kpi.enabledEndpoints} / ${kpi.totalEndpoints}`} hint="Current state, not period-based. Enabled is not healthy" href={WEBHOOK_ROUTES.outgoing} />
      </CardGrid>

      <TrendPanel />

      <div className="grid items-stretch gap-1 xl:grid-cols-2">
        <TablePanel title="Incoming Source Summary" description={`${ENVIRONMENT_LABEL[snapshot.environment]}. Sources come from Integrations provider configuration.`} action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.incoming}>All sources</Link></Button>}>
          <DataTable columns={sourceColumns} rows={sources} getRowId={(row) => row.source.id} isLoading={false} caption="Incoming sources" emptyState={<EmptyRows title="No incoming sources registered" />} />
        </TablePanel>
        <TablePanel title="Outgoing Endpoint Summary" description="Configured demo endpoints. Enabled does not mean healthy." action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.outgoing}>All endpoints</Link></Button>}>
          <DataTable columns={endpointColumns} rows={endpoints.slice(0, 7)} getRowId={(row) => row.endpoint.id} isLoading={false} caption="Outgoing endpoints" emptyState={<EmptyRows title="No endpoints configured" />} />
        </TablePanel>
      </div>

      <div className="grid items-stretch gap-1 xl:grid-cols-2">
        <TablePanel title="Failures Requiring Review" description="Not every non-2xx response is safe to retry. Review before recovery." action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.failures}>Open recovery</Link></Button>}>
          <DataTable columns={failureColumns} rows={issues.slice(0, 7)} getRowId={(row) => row.id} isLoading={false} caption="Failures requiring review" emptyState={<EmptyRows title="No failures in this period" description="An empty list does not prove health. See the monitoring freshness above." />} />
        </TablePanel>
        <TablePanel title="Recent Deliveries" description="One row per delivery, not per attempt." action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.deliveries}>All deliveries</Link></Button>}>
          <RecentDeliveries rows={deliveries} />
        </TablePanel>
      </div>

      <div className="grid items-stretch gap-1 xl:grid-cols-2">
        <SectionCard title="Verification Activity" description="Demo verification records. No cryptographic check ran in this frontend." action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.security}>Security</Link></Button>}>
          {verificationRows.length === 0 ? <EmptyRows title="No verification problems" description="No rejected or unverified events in this period." /> : (
            <ul className="divide-y divide-border">
              {verificationRows.map((event) => <VerificationRow key={event.id} event={event} />)}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Webhook Operational Activity" description="Configuration and monitoring activity for this environment." action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.activity}>All activity</Link></Button>}>
          <ul className="divide-y divide-border">
            {snapshot.activity.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-foreground">{humanize(entry.type)}</p>
                  <p className="text-2xs text-muted-foreground">{entry.message}</p>
                </div>
                <div className="shrink-0 text-right"><Timestamp iso={entry.at} /></div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function VerificationRow({ event }: { event: IncomingEvent }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 space-y-1">
        <Link href={WEBHOOK_ROUTES.incomingEvent(event.id)} className="block truncate text-[0.8125rem] font-medium hover:underline">{event.providerName} - {event.eventType}</Link>
        <p className="truncate text-2xs text-muted-foreground">{event.verification.failureReason ?? "Verification not completed."}</p>
        <State registry={VERIFICATION_STATE} status={event.verification.state} />
      </div>
      <Timestamp iso={event.receivedAt} />
    </li>
  );
}

function RecentDeliveries({ rows }: { rows: Delivery[] }) {
  const { snapshot } = useWebhookData();
  const router = useRouter();
  const columns: Array<DataTableColumn<Delivery>> = [
    { id: "id", header: "Delivery", cell: (row) => <IdCell id={row.id} sub={row.eventKey} /> },
    { id: "endpoint", header: "Endpoint", hideBelow: "2xl", cell: (row) => <EndpointCell endpoint={snapshot.endpoints.find((item) => item.id === row.endpointId)} /> },
    { id: "latest", header: "Latest Attempt", hideBelow: "xl", cell: (row) => (row.latestResult ? <State registry={ATTEMPT_RESULT} status={row.latestResult} /> : <span className="text-muted-foreground">None yet</span>) },
    { id: "state", header: "State", cell: (row) => <State registry={DELIVERY_STATE} status={row.state} /> },
    { id: "last", header: "Last Attempt", cell: (row) => <Timestamp iso={row.latestAttemptAt} /> },
    { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.delivery(row.id)} /> },
  ];
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} isLoading={false} caption="Recent deliveries" emptyState={<EmptyRows title="No deliveries in this period" />} onRowClick={(row) => router.push(WEBHOOK_ROUTES.delivery(row.id))} />;
}
