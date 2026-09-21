"use client";

import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { MiniTable, type MiniColumn } from "@/features/plans-subscriptions/components/mini-table";
import { SENSITIVE } from "../data/config";
import type { AuditEvent } from "../data/types";
import { actorSubline, scopeText, utcFull, utcShort } from "../lib/format";
import { ActorIcon, CategoryLabel, OutcomeBadge, PriorityBadge, WorkflowBadge } from "./badges";

export type EventsTableVariant = "default" | "sensitive" | "authentication" | "compact";

interface Props {
  rows: readonly AuditEvent[];
  variant?: EventsTableVariant;
  onOpen: (event: AuditEvent) => void;
  menuFor?: (event: AuditEvent) => ActionMenuItem[];
  canSeeEmail?: boolean;
  empty?: ReactNode;
  caption?: string;
  dense?: boolean;
}

const timestamp = (event: AuditEvent) => (
  <div className="whitespace-nowrap">
    <p className="text-[0.8125rem] tabular text-foreground" title={`Occurred ${utcFull(event.occurredAt)}\nRecorded ${utcFull(event.recordedAt)}`}>{utcShort(event.occurredAt)}</p>
  </div>
);

const actor = (event: AuditEvent, canSeeEmail: boolean) => (
  <div className="flex min-w-0 items-center gap-2">
    <ActorIcon type={event.actor.type} />
    <div className="min-w-0">
      <p className="truncate text-[0.8125rem] font-medium text-foreground">{event.actor.displayName}</p>
      <p className="truncate text-2xs text-muted-foreground">{actorSubline(event.actor, canSeeEmail)}</p>
    </div>
  </div>
);

const action = (event: AuditEvent) => (
  <div className="min-w-0">
    <p className="truncate text-[0.8125rem] font-medium text-foreground">{event.actionLabel}</p>
    {event.workflowStage ? <div className="mt-0.5"><WorkflowBadge stage={event.workflowStage} /></div> : null}
  </div>
);

const target = (event: AuditEvent) => (
  <div className="min-w-0">
    <p className="truncate text-[0.8125rem] text-foreground">{event.target.displayName}</p>
    <p className="truncate text-2xs capitalize text-muted-foreground">{event.target.type.replace(/_/g, " ")}</p>
  </div>
);

/**
 * The event list used by every Audit Logs screen. Actor and target are separate columns on
 * purpose, and so are result and review priority. Rows open a quick preview; nothing in a row
 * can edit or delete an event.
 */
export function EventsTable({ rows, variant = "default", onOpen, menuFor, canSeeEmail = true, empty, caption = "Audit events", dense = false }: Props) {
  const columns: Array<MiniColumn<AuditEvent>> = [
    { id: "time", header: "Timestamp", cell: timestamp },
    { id: "actor", header: variant === "authentication" ? "Actor / Attempted Account" : "Actor", cell: (event) => actor(event, canSeeEmail) },
    { id: "action", header: "Action", cell: action },
    variant === "sensitive"
      ? { id: "category", header: "Sensitive Category", hideBelow: "md", cell: (event) => <span className="whitespace-nowrap">{event.sensitiveCategory ? SENSITIVE[event.sensitiveCategory].label : "-"}</span> }
      : variant === "authentication"
        ? { id: "context", header: "Authentication Context", hideBelow: "md", cell: (event) => <span className="text-2xs text-muted-foreground">{event.actor.authContext ?? "Not Recorded"}</span> }
        : { id: "category", header: "Category", hideBelow: "lg", cell: (event) => <CategoryLabel category={event.category} /> },
    ...(variant === "authentication" ? [] : [{ id: "target", header: "Target", hideBelow: "md" as const, cell: target }]),
    { id: "scope", header: "Company / Scope", hideBelow: "lg", cell: (event) => <span className="block max-w-44 truncate" title={scopeText(event.scope)}>{scopeText(event.scope)}</span> },
    { id: "result", header: "Result", cell: (event) => <OutcomeBadge outcome={event.outcome} /> },
    { id: "priority", header: "Review Priority", hideBelow: "lg", cell: (event) => <PriorityBadge priority={event.priority} /> },
    ...(menuFor ? [{ id: "actions", header: <span className="sr-only">Actions</span>, align: "right" as const, cell: (event: AuditEvent) => <span onClick={(click) => click.stopPropagation()}><ActionMenu items={menuFor(event)} label={`Actions for ${event.actionLabel}`} /></span> }] : []),
  ];
  return <MiniTable dense={dense} caption={caption} rows={rows} getKey={(event) => event.id} onRowClick={onOpen} empty={empty} columns={columns} />;
}
