"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BookOpenCheck, BotMessageSquare, LayoutDashboard, MessagesSquare, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { btn } from "@/features/support/ui";
import { ASSISTANT_DESK_KEY } from "./hooks";

const TABS = [
  { label: "Overview", href: "/super-admin/assistant", icon: LayoutDashboard },
  { label: "Conversations", href: "/super-admin/assistant/conversations", icon: MessagesSquare },
  { label: "People", href: "/super-admin/assistant/people", icon: UsersRound },
  { label: "Knowledge", href: "/super-admin/assistant/knowledge", icon: BookOpenCheck },
];

/** Header and tabs of the Super Admin's assistant console: what people ask the in-app assistant and what it answers. */
export function AssistantDeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/super-admin/assistant";
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: [ASSISTANT_DESK_KEY] }) > 0;

  return (
    <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-84px)] flex-col overflow-visible bg-[#f8fafc] capitalize sm:-mx-5 xl:-mx-6">
      <div className="border-b border-slate-200 bg-white px-5 pt-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-red-50 text-red-600 ring-1 ring-red-100">
              <BotMessageSquare className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">AI Assistant</h1>
              <p className="text-xs font-medium text-slate-600">What people ask the in-app assistant, what it answers, and the tokens it uses.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-500 md:inline-flex">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Secrets are masked before saving. Opening a chat is audited.
            </span>
            <button type="button" className={btn} onClick={() => void queryClient.invalidateQueries({ queryKey: [ASSISTANT_DESK_KEY] })}>
              <RefreshCw className={cn("size-3.5", fetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
        <nav className="mt-2 flex gap-1 overflow-x-auto overflow-y-hidden" aria-label="Assistant sections">
          {TABS.map((tab) => {
            const current = tab.href === "/super-admin/assistant" ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn("inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition", current ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-900")}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 px-5 py-2 sm:px-6">{children}</div>
    </div>
  );
}
