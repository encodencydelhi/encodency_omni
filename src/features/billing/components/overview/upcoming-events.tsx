/**
 * EnCodency OmniPlatform - Upcoming Billing Events
 * Forward-looking calendar of upcoming invoice due dates and expected subscription renewals.
 */

"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import type { Invoice, BillingAccount } from "../../data/types";

interface UpcomingEventsProps {
  invoices: Invoice[];
  accounts: BillingAccount[];
}

export function UpcomingEvents({ invoices, accounts }: UpcomingEventsProps) {
  const events: Array<{
    id: string;
    company: string;
    type: "Invoice Due" | "Expected Renewal" | "Scheduled Adjustment";
    date: string;
    amountMinor: number;
    currency: string;
    status: string;
    actionHref: string;
  }> = [];

  // Invoices due in next 14 days
  invoices
    .filter((i) => i.documentState === "issued" && i.collectionState !== "paid" && i.timingState !== "overdue")
    .forEach((inv) => {
      events.push({
        id: `evt_inv_${inv.id}`,
        company: inv.companyName,
        type: "Invoice Due",
        date: inv.dueAt,
        amountMinor: inv.outstandingBalanceMinor,
        currency: inv.currency,
        status: inv.timingState === "due_soon" ? "Due Soon" : "Pending",
        actionHref: `/super-admin/billing/invoices/${inv.id}`,
      });
    });

  // Expected subscription renewals from billing accounts
  accounts
    .filter((a) => a.accountStatus === "active" && a.renewsAt)
    .forEach((acc) => {
      // Estimated recurring price based on tier
      const estMinor = acc.subscriptionTier === "enterprise" ? 1500000 : acc.subscriptionTier === "agency" ? 2499900 : acc.subscriptionTier === "growth" ? 999900 : 349900;
      events.push({
        id: `evt_sub_${acc.id}`,
        company: acc.companyName,
        type: "Expected Renewal",
        date: acc.renewsAt,
        amountMinor: estMinor,
        currency: acc.currency,
        status: "Expected Recurring",
        actionHref: `/super-admin/billing/accounts/${acc.id}`,
      });
    });

  // Sort events by date ascending
  events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return (
    <div className="flex flex-col h-full bg-card rounded-sm border border-border p-3 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="size-4 text-blue-600 shrink-0" />
          <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
            Upcoming Billing Events
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Next 30 Days</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px] scrollbar-thin mt-2 divide-y divide-border/60">
        {events.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No upcoming renewals or due invoices scheduled.
          </div>
        ) : (
          events.slice(0, 8).map((evt) => (
            <div key={evt.id} className="py-2 flex items-center justify-between gap-2 hover:bg-slate-50/60 px-1 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">{evt.company}</span>
                  <span className="px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                    {evt.type}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Scheduled for {formatDate(evt.date)}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-xs font-semibold text-foreground">
                  {formatMoney(evt.amountMinor, evt.currency)}
                </div>
                <div className="text-xs text-muted-foreground">{evt.status}</div>
              </div>

              <div className="shrink-0 pl-1">
                <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-sm px-2 border-border">
                  <Link href={evt.actionHref}>View</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <p className="italic">
          Expected subscription renewals are projected estimates based on active plans.
        </p>
      </div>
    </div>
  );
}
