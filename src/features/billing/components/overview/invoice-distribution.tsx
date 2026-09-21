/**
 * EnCodency OmniPlatform - Invoice Status Distribution
 * Breakdown of invoices by document and collection state with deep-link filters.
 */

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatMoney } from "../../data/money";
import type { Invoice } from "../../data/types";
import { ArrowRightIcon } from "lucide-react";

interface InvoiceDistributionProps {
  invoices: Invoice[];
  currency: string;
}

export function InvoiceDistribution({ invoices, currency }: InvoiceDistributionProps) {
  const currencyMatch = (c: string) => (currency === "ALL" ? true : c.toUpperCase() === currency.toUpperCase());

  const distribution = useMemo(() => {
    const active = invoices.filter((i) => currencyMatch(i.currency));
    const totalCount = active.length || 1;

    const drafts = active.filter((i) => i.documentState === "draft");
    const openUnpaid = active.filter((i) => i.documentState === "issued" && i.collectionState === "unpaid" && i.timingState !== "overdue");
    const partiallyPaid = active.filter((i) => i.documentState === "issued" && i.collectionState === "partially_paid");
    const overdue = active.filter((i) => i.documentState === "issued" && i.timingState === "overdue");
    const fullyPaid = active.filter((i) => i.documentState === "issued" && i.collectionState === "paid");
    const voidInvoices = active.filter((i) => i.documentState === "void");

    const categories = [
      {
        label: "Fully Paid",
        count: fullyPaid.length,
        amountMinor: fullyPaid.reduce((acc, i) => acc + i.totalMinor, 0),
        color: "bg-emerald-500",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        filter: "paid",
      },
      {
        label: "Overdue Receivables",
        count: overdue.length,
        amountMinor: overdue.reduce((acc, i) => acc + i.outstandingBalanceMinor, 0),
        color: "bg-rose-500",
        pill: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
        filter: "overdue",
      },
      {
        label: "Partially Paid",
        count: partiallyPaid.length,
        amountMinor: partiallyPaid.reduce((acc, i) => acc + i.outstandingBalanceMinor, 0),
        color: "bg-indigo-500",
        pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
        filter: "partially_paid",
      },
      {
        label: "Open (Due Soon / Not Due)",
        count: openUnpaid.length,
        amountMinor: openUnpaid.reduce((acc, i) => acc + i.outstandingBalanceMinor, 0),
        color: "bg-amber-500",
        pill: "bg-amber-50 text-amber-700 border-amber-200",
        filter: "open",
      },
      {
        label: "Draft Documents",
        count: drafts.length,
        amountMinor: drafts.reduce((acc, i) => acc + i.totalMinor, 0),
        color: "bg-slate-400",
        pill: "bg-slate-50 text-slate-700 border-slate-200",
        filter: "draft",
      },
      {
        label: "Void / Cancelled",
        count: voidInvoices.length,
        amountMinor: voidInvoices.reduce((acc, i) => acc + i.totalMinor, 0),
        color: "bg-neutral-300",
        pill: "bg-neutral-50 text-neutral-600 border-neutral-200",
        filter: "void",
      },
    ];

    return { totalCount, categories };
  }, [invoices, currency]);

  return (
    <div className="flex flex-col justify-between h-full bg-card rounded-sm border border-border p-3 shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div>
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Invoice Status Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown across document and collection states.
            </p>
          </div>
          <Link
            href="/super-admin/billing/invoices"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Directory <ArrowRightIcon className="size-3" />
          </Link>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex h-2 w-full overflow-hidden rounded-sm bg-slate-100 my-3">
          {distribution.categories.map((cat, idx) => {
            const pct = Math.max(2, Math.round((cat.count / distribution.totalCount) * 100));
            if (cat.count === 0) return null;
            return <div key={idx} style={{ width: `${pct}%` }} className={cat.color} title={`${cat.label}: ${cat.count}`} />;
          })}
        </div>

        {/* Category List */}
        <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
          {distribution.categories.map((cat, idx) => (
            <Link
              key={idx}
              href={`/super-admin/billing/invoices?quick=${cat.filter}`}
              className="flex items-center justify-between p-1.5 rounded-sm hover:bg-slate-50 transition-colors group text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`size-2 rounded-full ${cat.color} shrink-0`} />
                <span className="font-medium text-foreground truncate">{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-sm border text-xs ${cat.pill}`}>
                  {cat.count}
                </span>
              </div>
              <div className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
                {formatMoney(cat.amountMinor, currency === "ALL" ? "INR" : currency)}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center">
        <span>Total Records: {invoices.length}</span>
        <span className="italic">Click row to filter Invoices directory</span>
      </div>
    </div>
  );
}
