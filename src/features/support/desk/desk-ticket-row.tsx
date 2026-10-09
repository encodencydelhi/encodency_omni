"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { timeAgo } from "../time";
import type { DeskItem } from "../types";
import { Avatar, Badge, CategoryChip, PriorityBadge, SlaBadge, StatusBadge } from "../ui";

/** Compact desk row (used on the overview and the SLA page); the inbox has its own table with selection. */
export function DeskTicketRow({ ticket }: { ticket: DeskItem }) {
  return (
    <li>
      <Link href={`/super-admin/support/tickets/${ticket.number}`} className="group flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 transition hover:bg-slate-50">
        <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold tabular-nums text-slate-500">#{ticket.number}</span>
        <div className="min-w-[220px] flex-1">
          <p className="text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-red-700">{ticket.subject}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {ticket.company.name}
            </span>
            <span>{ticket.createdBy.name}</span>
            <span>Updated {timeAgo(ticket.lastActivityAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {ticket.unanswered && <Badge tone="red">No reply yet</Badge>}
          <CategoryChip category={ticket.category} />
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          <SlaBadge sla={ticket.sla} />
          {ticket.assignee ? (
            <span className="inline-flex items-center gap-1.5" title={`Assigned to ${ticket.assignee.name}`}>
              <Avatar name={ticket.assignee.name} size={22} />
            </span>
          ) : (
            <Badge tone="slate">Unassigned</Badge>
          )}
        </div>
      </Link>
    </li>
  );
}
