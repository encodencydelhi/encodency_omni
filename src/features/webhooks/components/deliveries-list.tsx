/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Deliveries & Attempts directory with KPI cards and quick preview.
 */

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { DefinitionList } from "@/components/shared/definition-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DELIVERY_STATE, FAILURE_CLASS, HTTP_STATUS_FILTER_OPTIONS, WEBHOOK_ROUTES } from "../data/config";
import { attemptsFor, attemptsInWindow, deliveriesInWindow, evaluateDeliveryRecovery, httpStatusBucket, type EligibilityAssessment } from "../data/selectors";
import type { Delivery, WebhooksSnapshot } from "../data/types";
import { CompanyCell, EndpointCell, EventKeyCell, HttpStatus, OpenLink, TablePanel } from "./cells";
import { DATE_FILTER_OPTIONS, EnvironmentFilter, FilterControls, optionsFrom, useFilterState } from "./filters";
import { CardGrid, Chip, EmptyRows, ExportButton, FilterBar, IdCell, Kpi, Mono, State, Timestamp } from "./kit";
import { EligibilityBadge, RecoverySheet } from "./recovery-sheet";
import { useWebhookData } from "./webhooks-context";

export function assessDelivery(snapshot: WebhooksSnapshot, delivery: Delivery): EligibilityAssessment {
  return evaluateDeliveryRecovery({
    delivery,
    endpoint: snapshot.endpoints.find((item) => item.id === delivery.endpointId),
    attempts: attemptsFor(snapshot, delivery.id),
    eventType: snapshot.eventTypes.find((item) => item.key === delivery.eventKey),
    siblingDeliveries: snapshot.deliveries.filter((item) => item.eventId === delivery.eventId && item.endpointId === delivery.endpointId),
  });
}

export function DeliveriesPage() {
  const { snapshot, window } = useWebhookData();
  const filters = useFilterState(["state", "endpoint", "company", "event", "status", "retry", "hours"] as const);
  const [preview, setPreview] = useState<Delivery | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);

  const inPeriod = useMemo(() => deliveriesInWindow(snapshot, window), [snapshot, window]);
  const attemptCount = useMemo(() => attemptsInWindow(snapshot, window).length, [snapshot, window]);
  const assessments = useMemo(() => new Map(snapshot.deliveries.map((d) => [d.id, assessDelivery(snapshot, d)])), [snapshot]);

  const count = (fn: (d: Delivery) => boolean) => inPeriod.filter(fn).length;
  const exhausted = count((d) => d.latestFailureClass === "attempts_exhausted");
  const unknown = count((d) => d.unknownOutcome && d.state !== "delivered");

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const fromMs = filters.values.hours ? Date.parse(snapshot.generatedAt) - Number(filters.values.hours) * 3_600_000 : window.fromMs;
    return snapshot.deliveries.filter((d) => {
      if (Date.parse(d.createdAt) < fromMs) return false;
      const endpoint = snapshot.endpoints.find((item) => item.id === d.endpointId);
      if (q && !`${d.id} ${d.eventId} ${endpoint?.name ?? ""} ${d.companyName ?? ""}`.toLowerCase().includes(q)) return false;
      if (filters.values.state && d.state !== filters.values.state) return false;
      if (filters.values.endpoint && d.endpointId !== filters.values.endpoint) return false;
      if (filters.values.company && (d.companyId ?? "platform") !== filters.values.company) return false;
      if (filters.values.event && d.eventKey !== filters.values.event) return false;
      if (filters.values.status && httpStatusBucket(d.latestHttpStatus) !== filters.values.status) return false;
      if (filters.values.retry && assessments.get(d.id)?.level !== filters.values.retry) return false;
      return true;
    });
  }, [snapshot, window.fromMs, filters.query, filters.values, assessments]);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(page, totalPages);
  const pageRows = rows.slice((safe - 1) * size, safe * size);

  const columns: Array<DataTableColumn<Delivery>> = [
    { id: "id", header: "Delivery ID", cell: (row) => <IdCell id={row.id} sub={row.eventId} /> },
    { id: "event", header: "Event Type", hideBelow: "md", cell: (row) => <EventKeyCell eventKey={row.eventKey} /> },
    { id: "endpoint", header: "Endpoint", hideBelow: "lg", cell: (row) => <EndpointCell endpoint={snapshot.endpoints.find((item) => item.id === row.endpointId)} /> },
    { id: "company", header: "Company / Scope", hideBelow: "xl", cell: (row) => <CompanyCell id={row.companyId} name={row.companyName} /> },
    { id: "state", header: "Delivery State", cell: (row) => <State registry={DELIVERY_STATE} status={row.state} /> },
    { id: "attempts", header: "Attempts", align: "right", cell: (row) => <span className="tabular">{row.attemptsUsed}/{row.maxAttempts}</span> },
    { id: "http", header: "HTTP", hideBelow: "lg", cell: (row) => <HttpStatus status={row.latestHttpStatus} /> },
    { id: "last", header: "Last Attempt", hideBelow: "md", cell: (row) => <Timestamp iso={row.latestAttemptAt} /> },
    { id: "next", header: "Next Retry", hideBelow: "xl", cell: (row) => (row.nextRetryAt ? <Timestamp iso={row.nextRetryAt} /> : <span className="text-muted-foreground">None</span>) },
    { id: "act", header: "Actions", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.delivery(row.id)} /> },
  ];

  return (
    <div className="space-y-1">
      <CardGrid cols={4}>
        <Kpi label="Total Deliveries" value={inPeriod.length} hint="Deliveries in period. Not attempts" />
        <Kpi label="Delivered / Accepted" value={count((d) => d.state === "delivered")} tone="success" hint="Endpoint accepted the delivery" />
        <Kpi label="Pending" value={count((d) => d.state === "pending")} hint="Created, no attempt yet" />
        <Kpi label="Attempting" value={count((d) => d.state === "attempting")} hint="An attempt is in flight" />
        <Kpi label="Retry Scheduled" value={count((d) => d.state === "retry_scheduled")} tone={count((d) => d.state === "retry_scheduled") ? "warning" : "default"} hint="Awaiting next attempt" />
        <Kpi label="Failed" value={count((d) => d.state === "failed")} tone={count((d) => d.state === "failed") ? "danger" : "default"} hint="Terminal failed state" />
        <Kpi label="Attempts Exhausted" value={exhausted} tone={exhausted ? "danger" : "default"} hint="No attempts remain" />
        <Kpi label="Unknown External Outcomes" value={unknown} tone={unknown ? "warning" : "default"} hint="Recipient may have accepted" />
      </CardGrid>
      <p className="text-2xs text-muted-foreground">Counts: {inPeriod.length} deliveries · {attemptCount} attempts · {new Set(inPeriod.map((d) => d.endpointId)).size} endpoints in the selected period. A delivery with three attempts is counted once.</p>

      <TablePanel
        title="Deliveries"
        description="One outgoing event may be delivered to several endpoints. One delivery may have several attempts."
        action={<ExportButton filename="webhook-deliveries.csv" rows={rows.map((d) => ({ id: d.id, eventId: d.eventId, eventKey: d.eventKey, endpointId: d.endpointId, company: d.companyName, state: d.state, attempts: d.attemptsUsed, httpStatus: d.latestHttpStatus, lastAttemptAt: d.latestAttemptAt }))} />}
        filters={
          <FilterBar>
            <FilterControls
              state={filters}
              searchPlaceholder="Search delivery ID, event ID, endpoint or company..."
              filters={[
                { key: "state", label: "State", options: Object.entries(DELIVERY_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "endpoint", label: "Endpoint", options: snapshot.endpoints.map((e) => ({ value: e.id, label: e.name })) },
                { key: "company", label: "Company", options: [{ value: "platform", label: "Platform" }, ...snapshot.companies.filter((c) => snapshot.deliveries.some((d) => d.companyId === c.id)).map((c) => ({ value: c.id, label: c.name }))] },
                { key: "event", label: "Event", options: optionsFrom(snapshot.deliveries.map((d) => d.eventKey)) },
                { key: "status", label: "HTTP", options: HTTP_STATUS_FILTER_OPTIONS },
                { key: "retry", label: "Retry eligibility", options: [{ value: "eligible", label: "No blocking factors" }, { value: "review_required", label: "Review required" }, { value: "not_eligible", label: "Not eligible" }] },
                { key: "hours", label: "Date range", options: DATE_FILTER_OPTIONS },
              ]}
            />
            <EnvironmentFilter />
          </FilterBar>
        }
        scroll={false}
      >
        <DataTable
          columns={columns}
          rows={pageRows}
          getRowId={(row) => row.id}
          isLoading={false}
          caption="Deliveries"
          pagination={{ page: safe, pageSize: size, total: rows.length, totalPages, hasNextPage: safe < totalPages, hasPreviousPage: safe > 1 }}
          onPageChange={setPage}
          onPageSizeChange={(next) => { setSize(next); setPage(1); }}
          onRowClick={setPreview}
          emptyState={<EmptyRows title="No deliveries match" description="No deliveries were recorded for these filters. This is not evidence that events were not produced." />}
        />
      </TablePanel>

      <DeliveryPreview delivery={preview} onClose={() => setPreview(null)} onReview={(id) => setRecovery(id)} />
      <RecoverySheet open={Boolean(recovery)} onOpenChange={(open) => { if (!open) setRecovery(null); }} direction="outgoing" targetId={recovery} />
    </div>
  );
}

export function DeliveryPreview({ delivery, onClose, onReview }: { delivery: Delivery | null; onClose: () => void; onReview: (id: string) => void }) {
  const { snapshot } = useWebhookData();
  const endpoint = delivery ? snapshot.endpoints.find((item) => item.id === delivery.endpointId) : undefined;
  const assessment = delivery ? assessDelivery(snapshot, delivery) : null;
  return (
    <Sheet open={Boolean(delivery)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {delivery ? (
          <>
            <SheetHeader>
              <SheetTitle>{delivery.eventKey}</SheetTitle>
              <SheetDescription><Mono>{delivery.id}</Mono></SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5"><State registry={DELIVERY_STATE} status={delivery.state} />{assessment ? <EligibilityBadge level={assessment.level} /> : null}</div>
              <DefinitionList columns={1} items={[
                { label: "Delivery ID", value: <Mono>{delivery.id}</Mono> },
                { label: "Outgoing event ID", value: <Mono>{delivery.eventId}</Mono> },
                { label: "Event type", value: <Mono>{delivery.eventKey}</Mono> },
                { label: "Endpoint", value: endpoint?.name ?? delivery.endpointId },
                { label: "Company", value: delivery.companyName ?? "Platform" },
                { label: "Attempts used", value: `${delivery.attemptsUsed} of ${delivery.maxAttempts}` },
                { label: "Last HTTP result", value: <HttpStatus status={delivery.latestHttpStatus} /> },
                { label: "Last attempt", value: <Timestamp iso={delivery.latestAttemptAt} /> },
                { label: "Next retry", value: delivery.nextRetryAt ? <Timestamp iso={delivery.nextRetryAt} /> : "None scheduled" },
                { label: "Latest failure summary", value: <span className="whitespace-normal">{delivery.failureSummary ?? "None"}</span> },
                { label: "Failure class", value: delivery.latestFailureClass ? <Chip tone="warning">{FAILURE_CLASS[delivery.latestFailureClass].label}</Chip> : "None" },
              ]} />
            </SheetBody>
            <SheetFooter className="flex-wrap justify-between">
              <Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.endpoint(delivery.endpointId)}>Open Endpoint</Link></Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { onReview(delivery.id); onClose(); }}>Review Redelivery</Button>
                <Button asChild variant="outline" size="sm"><Link href={`${WEBHOOK_ROUTES.delivery(delivery.id)}?tab=attempts`}>View Attempts</Link></Button>
                <Button asChild size="sm"><Link href={WEBHOOK_ROUTES.delivery(delivery.id)}>Open Delivery</Link></Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
