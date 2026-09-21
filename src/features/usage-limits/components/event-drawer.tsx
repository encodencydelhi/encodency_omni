"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue } from "@/features/companies/components/primitives";
import { formatDateTime } from "@/lib/utils/format";
import { RESOURCE_BY_KEY } from "../data/catalogue";
import { usageRoutes } from "../data/config";
import { useEvent } from "../data/hooks";
import { number } from "../lib/format";
import { ProcessingBadge } from "./badges";
import { UsageError } from "./states";

/** One metering event. Reference values only: no request payloads, keys or secrets are ever shown. */
export function EventDrawer({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const query = useEvent(eventId);
  const event = query.data;
  return (
    <Sheet open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Usage Event</SheetTitle>
          <SheetDescription>{event ? event.id : "Loading the event..."}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {query.error && !event ? (
            <UsageError subject="Event" error={query.error} onRetry={() => void query.refetch()} back={{ href: usageRoutes.metering, label: "Back to Metering" }} />
          ) : !event ? (
            <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Loading...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1"><ProcessingBadge status={event.status} /></div>
              {event.errorReason ? <p className="rounded-sm border border-border bg-muted/40 px-3 py-2 text-[0.8125rem] text-foreground">{event.errorReason}</p> : null}
              <dl className="divide-y divide-border">
                <KeyValue label="Event ID"><code className="break-all text-[11px]">{event.id}</code></KeyValue>
                <KeyValue label="Company"><Link href={usageRoutes.company(event.companyId)} className="font-medium text-primary hover:underline">{event.companyName}</Link></KeyValue>
                <KeyValue label="Client">{event.clientName ?? <span className="text-muted-foreground">Company-level (not attributed)</span>}</KeyValue>
                <KeyValue label="Resource">{RESOURCE_BY_KEY[event.resource].name}</KeyValue>
                <KeyValue label="Quantity">+{number(event.quantity)} {event.unit}</KeyValue>
                <KeyValue label="Counted in usage">{event.counted ? "Yes" : "No"}</KeyValue>
                <KeyValue label="Source service">{event.source}</KeyValue>
                <KeyValue label="Event time">{formatDateTime(event.occurredAt)}</KeyValue>
                <KeyValue label="Received">{formatDateTime(event.receivedAt)}</KeyValue>
                <KeyValue label="Aggregation period">{event.aggregationPeriod}</KeyValue>
                <KeyValue label="Idempotency reference"><code className="break-all text-[11px]">{event.idempotencyKey}</code></KeyValue>
                <KeyValue label="Related reference"><code className="break-all text-[11px]">{event.reference}</code></KeyValue>
              </dl>
              <p className="text-2xs text-muted-foreground">Demo operational data. Request payloads, credentials and secrets are never stored or shown.</p>
              <Link href={usageRoutes.companyUsage(event.companyId, event.resource)} className="text-2xs font-medium text-primary hover:underline">Review affected company usage</Link>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
