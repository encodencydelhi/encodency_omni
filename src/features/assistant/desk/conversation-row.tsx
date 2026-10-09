import Link from "next/link";
import { Building2, MessageSquareText, Ticket } from "lucide-react";
import { timeAgo } from "@/features/support/time";
import { Avatar, Badge } from "@/features/support/ui";
import { compact, ROLE_LABEL } from "./format";
import type { ConversationItem } from "./types";

/** One conversation: what was asked first, by whom, where, how long it ran and what it cost. */
export function ConversationRow({ item, showPerson = true }: { item: ConversationItem; showPerson?: boolean }) {
  return (
    <li>
      <Link href={`/super-admin/assistant/conversations/${item.id}`} className="group flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-slate-50">
        {showPerson && <Avatar name={item.person.name} size={34} />}
        <div className="min-w-[240px] flex-1">
          <p dir="auto" className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-red-700">{item.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
            {showPerson && (
              <span className="text-slate-700">
                {item.person.name}
                {item.person.role && <span className="ml-1 text-slate-400">· {ROLE_LABEL[item.person.role] ?? item.person.role}</span>}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {item.company.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="size-3" />
              {item.questions} question{item.questions === 1 ? "" : "s"}
            </span>
            <span>{timeAgo(item.lastMessageAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <Badge tone="slate">{item.firstPage.title}</Badge>
          {item.ticketNumber && (
            <Badge tone="green">
              <Ticket className="size-3" />
              Ticket #{item.ticketNumber}
            </Badge>
          )}
          {item.degraded > 0 && <Badge tone="red">{item.degraded} failed</Badge>}
          {item.redacted > 0 && <Badge tone="amber">Secret masked</Badge>}
          <Badge tone="violet">{compact(item.tokens)} tokens</Badge>
        </div>
      </Link>
    </li>
  );
}
