"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { auditRoutes } from "../data/config";
import type { AuditEvent } from "../data/types";
import { utcShort } from "../lib/format";
import { OutcomeBadge, WorkflowBadge } from "./badges";

/**
 * The events that share one correlation id, oldest first. Only a shared correlation id groups
 * events; similar names, the same person or the same day never do. The selected event is marked.
 */
export function AuditWorkflowTimeline({ events, currentId, back }: { events: readonly AuditEvent[]; currentId?: string; back?: string }) {
  if (events.length <= 1) return <p className="text-[0.8125rem] text-muted-foreground">This event is not part of a correlated workflow.</p>;
  return (
    <ol className="relative space-y-0" aria-label="Correlated workflow">
      {events.map((event, index) => {
        const current = event.id === currentId;
        return (
          <li key={event.id} className="relative flex gap-3 pb-3 last:pb-0">
            {index < events.length - 1 ? <span className="absolute top-3 left-[5px] h-full w-px bg-border-strong" aria-hidden /> : null}
            <span className={cn("relative z-[1] mt-1 size-[11px] shrink-0 rounded-full border-2 bg-card", current ? "border-primary bg-primary" : "border-border-strong")} aria-hidden />
            <div className={cn("min-w-0 flex-1 rounded-sm border px-2.5 py-1.5", current ? "border-primary/40 bg-primary-subtle/40" : "border-border")}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={auditRoutes.event(event.id, back)} aria-current={current ? "true" : undefined} className="text-[0.8125rem] font-medium text-foreground hover:text-primary hover:underline">{event.actionLabel}</Link>
                {event.workflowStage ? <WorkflowBadge stage={event.workflowStage} /> : null}
                <OutcomeBadge outcome={event.outcome} />
                {current ? <span className="text-2xs font-medium text-primary">Selected event</span> : null}
              </div>
              <p className="mt-0.5 text-2xs text-muted-foreground">{utcShort(event.occurredAt)} - {event.actor.displayName} - {event.target.displayName}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
