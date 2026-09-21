/**
 * EnCodency OmniPlatform - Collections Requiring Attention Queue
 * Actionable exceptions requiring operations intervention with direct drilldown links.
 */

"use client";

import Link from "next/link";
import { formatMoney } from "../../data/money";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, ArrowUpRightIcon } from "lucide-react";
import type { Invoice, Payment, Refund, ReconciliationException } from "../../data/types";

interface AttentionQueueProps {
  invoices: Invoice[];
  payments: Payment[];
  refunds: Refund[];
  exceptions: ReconciliationException[];
}

export function AttentionQueue({
  invoices,
  payments,
  refunds,
  exceptions,
}: AttentionQueueProps) {
  // Aggregate actionable items
  const items: Array<{
    id: string;
    company: string;
    issue: string;
    amountMinor: number;
    currency: string;
    date: string;
    severity: "critical" | "warning" | "info";
    actionLabel: string;
    actionHref: string;
  }> = [];

  // Overdue Invoices
  invoices
    .filter((i) => i.documentState === "issued" && i.timingState === "overdue")
    .forEach((inv) => {
      items.push({
        id: `att_inv_${inv.id}`,
        company: inv.companyName,
        issue: `Overdue Invoice (${inv.number})`,
        amountMinor: inv.outstandingBalanceMinor,
        currency: inv.currency,
        date: inv.dueAt,
        severity: "critical",
        actionLabel: "Open Invoice",
        actionHref: `/super-admin/billing/invoices/${inv.id}`,
      });
    });

  // Failed Payments
  payments
    .filter((p) => p.attemptStatus === "failed")
    .forEach((p) => {
      items.push({
        id: `att_pay_${p.id}`,
        company: p.companyName,
        issue: `Failed Payment (${p.reference}) - ${p.failureReason ?? "Declined"}`,
        amountMinor: p.grossAmountMinor,
        currency: p.currency,
        date: p.createdAt,
        severity: "critical",
        actionLabel: "Open Payment",
        actionHref: `/super-admin/billing/payments/${p.id}`,
      });
    });

  // Unallocated Settled Payments
  payments
    .filter((p) => p.attemptStatus === "succeeded" && p.unallocatedBalanceMinor > 0)
    .forEach((p) => {
      items.push({
        id: `att_unalloc_${p.id}`,
        company: p.companyName,
        issue: `Unallocated Funds (${p.reference})`,
        amountMinor: p.unallocatedBalanceMinor,
        currency: p.currency,
        date: p.createdAt,
        severity: "warning",
        actionLabel: "Allocate Payment",
        actionHref: `/super-admin/billing/payments/${p.id}`,
      });
    });

  // Pending Refunds
  refunds
    .filter((r) => r.status === "pending_approval")
    .forEach((r) => {
      items.push({
        id: `att_rfd_${r.id}`,
        company: r.companyName,
        issue: `Refund Pending Approval (${r.reference})`,
        amountMinor: r.requestedAmountMinor,
        currency: r.currency,
        date: r.createdAt,
        severity: "warning",
        actionLabel: "Review Refund",
        actionHref: `/super-admin/billing/credits-refunds?tab=refunds`,
      });
    });

  // Reconciliation Exceptions
  exceptions
    .filter((e) => e.status === "open" || e.status === "investigating")
    .forEach((e) => {
      items.push({
        id: `att_exp_${e.id}`,
        company: e.companyName,
        issue: `Reconciliation Exception (${e.financialReference})`,
        amountMinor: e.differenceMinor || e.expectedAmountMinor,
        currency: e.currency,
        date: e.detectedAt,
        severity: e.severity === "high" || e.severity === "critical" ? "critical" : "warning",
        actionLabel: "Investigate",
        actionHref: `/super-admin/billing/reconciliation`,
      });
    });

  const severityBadge = {
    critical: "bg-rose-50 text-rose-700 border-rose-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-sm border border-border p-3 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <AlertCircleIcon className="size-4 text-rose-600 shrink-0" />
          <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
            Collections Requiring Attention
          </h2>
          <span className="px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
            {items.length} Issues
          </span>
        </div>
        <Link
          href="/super-admin/billing/reconciliation"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View All Exceptions <ArrowUpRightIcon className="size-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px] scrollbar-thin mt-2 divide-y divide-border/60">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No outstanding issues or overdue collections detected.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="py-2 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors px-1"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {item.company}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded-sm border text-xs capitalize ${severityBadge[item.severity]}`}>
                    {item.severity}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{item.issue}</div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-xs font-semibold text-foreground">
                  {formatMoney(item.amountMinor, item.currency)}
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
              </div>

              <div className="shrink-0 pl-1">
                <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-sm px-2 border-border">
                  <Link href={item.actionHref}>{item.actionLabel}</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
