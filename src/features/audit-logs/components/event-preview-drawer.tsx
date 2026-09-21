"use client";

import { ArrowRightIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue } from "@/features/companies/components/primitives";
import { auditRoutes } from "../data/config";
import { useAuditCapabilities, useEvent } from "../data/hooks";
import { actorSubline, scopeText, utcFull } from "../lib/format";
import { AddToInvestigationDialog } from "./add-to-investigation";
import { OutcomeBadge, PriorityBadge, SensitiveBadge, WorkflowBadge } from "./badges";
import { AuditError } from "./states";

/** A concise look at one event. The full detail page has everything else. */
export function EventPreviewDrawer({ eventId, onClose, back }: { eventId: string | null; onClose: () => void; back?: string }) {
  const query = useEvent(eventId ?? "");
  const capabilities = useAuditCapabilities();
  const [linking, setLinking] = useState(false);
  const detail = eventId ? query.data : undefined;
  const event = detail?.event;
  const related = event ? (event.target.href ?? event.related.find((ref) => ref.href)?.href ?? null) : null;

  return (
    <>
      <Sheet open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{event?.actionLabel ?? "Audit Event"}</SheetTitle>
            <SheetDescription>{event ? <span className="font-mono">{event.id}</span> : "Loading the event..."}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            {query.error && !event ? (
              <AuditError subject="Event" error={query.error} onRetry={() => void query.refetch()} back={{ href: auditRoutes.events(), label: "Back to Event Explorer" }} />
            ) : !event || !detail ? (
              <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Loading...</div>
            ) : (
              <>
                <p className="text-[0.8125rem] text-muted-foreground">{event.summary}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <OutcomeBadge outcome={event.outcome} />
                  <PriorityBadge priority={event.priority} />
                  {event.sensitiveCategory ? <SensitiveBadge category={event.sensitiveCategory} /> : null}
                  {event.workflowStage ? <WorkflowBadge stage={event.workflowStage} /> : null}
                </div>
                <dl className="divide-y divide-border rounded-sm border border-border px-3">
                  <KeyValue label="Occurred At">{utcFull(event.occurredAt)}</KeyValue>
                  <KeyValue label="Actor">{event.actor.displayName}</KeyValue>
                  <KeyValue label="Actor Context">{actorSubline(event.actor, capabilities.canViewActorEmail)}</KeyValue>
                  <KeyValue label="Target">{event.target.displayName}</KeyValue>
                  <KeyValue label="Company / Scope">{scopeText(event.scope)}</KeyValue>
                  {event.correlationId ? <KeyValue label="Correlation ID"><span className="font-mono text-2xs">{event.correlationId}</span></KeyValue> : null}
                </dl>
                <section aria-label="Change summary">
                  <h4 className="mb-1 text-[13px] font-semibold text-foreground">Change Summary</h4>
                  {event.changes.length === 0 ? (
                    <p className="text-2xs text-muted-foreground">No field-level changes were recorded for this event.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-sm border border-border">
                      {event.changes.slice(0, 3).map((change) => (
                        <li key={change.key} className="px-3 py-1.5 text-[0.8125rem]">
                          <p className="font-medium text-foreground">{change.label}</p>
                          <p className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">{change.redacted ? "[REDACTED]" : (change.before ?? "Not Recorded")}<ArrowRightIcon className="size-3" aria-hidden />{change.redacted ? "[REDACTED]" : (change.after ?? "Not Recorded")}</p>
                        </li>
                      ))}
                      {event.changes.length > 3 ? <li className="px-3 py-1.5 text-2xs text-muted-foreground">And {event.changes.length - 3} more in the full event.</li> : null}
                    </ul>
                  )}
                </section>
                {detail.workflow.length > 1 ? <p className="text-2xs text-muted-foreground">Part of a workflow of {detail.workflow.length} events.</p> : null}
              </>
            )}
          </SheetBody>
          <SheetFooter className="flex-wrap">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {event && related ? <Button asChild variant="outline"><Link href={related}><ExternalLinkIcon />Open Related Resource</Link></Button> : null}
            {event && event.correlationId ? <Button asChild variant="outline"><Link href={`${auditRoutes.event(event.id, back)}#workflow`}>View Workflow</Link></Button> : null}
            {event && capabilities.canManageInvestigations ? <Button variant="outline" onClick={() => setLinking(true)}>Add To Investigation</Button> : null}
            {event ? <Button asChild><Link href={auditRoutes.event(event.id, back)}>Open Full Event</Link></Button> : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {event && linking ? <AddToInvestigationDialog event={event} onClose={() => setLinking(false)} /> : null}
    </>
  );
}
