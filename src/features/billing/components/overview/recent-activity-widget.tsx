/**
 * EnCodency OmniPlatform - Recent Financial Activity Widget
 * Snapshot of platform-wide billing mutations and governance actions.
 */

"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/utils/format";
import { ActivityIcon, ArrowUpRightIcon } from "lucide-react";
import type { FinancialActivity } from "../../data/types";

interface RecentActivityWidgetProps {
  activities: FinancialActivity[];
}

export function RecentActivityWidget({ activities }: RecentActivityWidgetProps) {
  return (
    <div className="flex flex-col h-full bg-card rounded-sm border border-border p-3 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <ActivityIcon className="size-4 text-purple-600 shrink-0" />
          <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
            Recent Financial Activity
          </h2>
        </div>
        <Link
          href="/super-admin/billing/activity"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Full Ledger <ArrowUpRightIcon className="size-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px] scrollbar-thin mt-2 divide-y divide-border/60">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No recent financial events recorded.
          </div>
        ) : (
          activities.slice(0, 7).map((act) => (
            <div key={act.id} className="py-2 flex items-center justify-between gap-2 hover:bg-slate-50/60 px-1 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">{act.companyName}</span>
                  <span className="font-mono text-xs text-muted-foreground">[{act.reference}]</span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{act.result}</div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-medium text-foreground">{act.actor.split(" ")[0]}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(act.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center">
        <span>Total Logged Events: {activities.length}</span>
        <span className="italic">Immutable audit log</span>
      </div>
    </div>
  );
}
