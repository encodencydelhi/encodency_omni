"use client";

import Link from "next/link";
import { MessageSquare, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { timeAgo } from "../time";
import type { TicketItem } from "../types";
import { CategoryChip, PriorityBadge, StatusBadge } from "../ui";

/** One ticket of the Company's list: whose turn it is is the first thing the eye should catch. */
export function CompanyTicketRow({ ticket, compact }: { ticket: TicketItem; compact?: boolean }) {
  const needsYou = ticket.awaiting === "you";
  return (
    <li>
      <Link href={`/admin/support/tickets/${ticket.number}`} className={cn("group relative flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-slate-50", needsYou && "bg-amber-50/50 hover:bg-amber-50")}>
        {needsYou && <span className="absolute inset-y-0 left-0 w-0.5 bg-amber-500" aria-hidden="true" />}
        <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold tabular-nums text-slate-500">#{ticket.number}</span>
        <div className="min-w-[220px] flex-1">
          <p className="text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-red-700">{ticket.subject}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {ticket.createdBy.isYou ? "You" : ticket.createdBy.name}
            </span>
            <span>Updated {timeAgo(ticket.lastActivityAt)}</span>
            {ticket.replies > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3" />
                {ticket.replies} {ticket.replies === 1 ? "reply" : "replies"}
              </span>
            )}
            {!compact && ticket.assignee && <span>Handled by {ticket.assignee.name}</span>}
            {!compact && ticket.client && <span>Client: {ticket.client.name}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {!compact && <CategoryChip category={ticket.category} />}
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} customer />
        </div>
      </Link>
    </li>
  );
}
