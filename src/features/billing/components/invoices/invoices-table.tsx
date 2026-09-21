/**
 * EnCodency OmniPlatform - Invoices Directory Table
 * High-density financial table with quick preview drawer and multi-dimensional status badges.
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import { exportToCsv } from "../../data/export";
import {
  DocumentStateBadge,
  CollectionStateBadge,
  TimingStateBadge,
} from "../status-badges";
import { BillingKpiCard } from "../billing-kpi-card";
import { InvoicePreviewDrawer } from "./invoice-preview-drawer";
import { InvoiceDocumentModal } from "./invoice-document";
import { CreateInvoiceWizard } from "./create-invoice-wizard";
import { VoidInvoiceDialog } from "./void-invoice-dialog";
import { useInvoices } from "../../data/hooks";
import type { Invoice } from "../../data/types";
import {
  PlusIcon,
  DownloadIcon,
  SearchIcon,
  MoreHorizontalIcon,
  ReceiptIcon,
  PrinterIcon,
  ExternalLinkIcon,
  BanIcon,
  FileTextIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CreditCardIcon,
} from "lucide-react";

interface InvoicesTableProps {
  initialQuickFilter?: string;
}

export function InvoicesTable({ initialQuickFilter }: InvoicesTableProps) {
  const router = useRouter();
  const { invoices, voidInvoice } = useInvoices();

  const [search, setSearch] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<string>(initialQuickFilter ?? "all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("newest");

  // Modal / Drawer states
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [documentInvoice, setDocumentInvoice] = useState<Invoice | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          inv.number.toLowerCase().includes(q) ||
          inv.companyName.toLowerCase().includes(q) ||
          (inv.subscriptionName && inv.subscriptionName.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Currency
      if (currencyFilter !== "ALL" && inv.currency.toUpperCase() !== currencyFilter.toUpperCase()) {
        return false;
      }

      // Quick filter
      if (quickFilter === "draft") return inv.documentState === "draft";
      if (quickFilter === "open") return inv.documentState === "issued" && inv.collectionState === "unpaid" && inv.timingState !== "overdue";
      if (quickFilter === "partially_paid") return inv.documentState === "issued" && inv.collectionState === "partially_paid";
      if (quickFilter === "paid") return inv.documentState === "issued" && inv.collectionState === "paid";
      if (quickFilter === "overdue") return inv.documentState === "issued" && inv.timingState === "overdue";
      if (quickFilter === "void") return inv.documentState === "void";

      return true;
    }).sort((a, b) => {
      if (sortField === "newest") return Date.parse(b.issuedAt) - Date.parse(a.issuedAt);
      if (sortField === "due_soonest") return Date.parse(a.dueAt) - Date.parse(b.dueAt);
      if (sortField === "highest_balance") return b.outstandingBalanceMinor - a.outstandingBalanceMinor;
      if (sortField === "highest_total") return b.totalMinor - a.totalMinor;
      if (sortField === "company") return a.companyName.localeCompare(b.companyName);
      return 0;
    });
  }, [invoices, search, quickFilter, currencyFilter, sortField]);

  // KPI calculations
  const kpis = useMemo(() => {
    const active = invoices.filter((i) => (currencyFilter === "ALL" ? true : i.currency === currencyFilter));
    const totalIssued = active.filter((i) => i.documentState === "issued");
    const drafts = active.filter((i) => i.documentState === "draft");
    const open = active.filter((i) => i.documentState === "issued" && i.collectionState === "unpaid" && i.timingState !== "overdue");
    const partiallyPaid = active.filter((i) => i.documentState === "issued" && i.collectionState === "partially_paid");
    const paid = active.filter((i) => i.documentState === "issued" && i.collectionState === "paid");
    const overdue = active.filter((i) => i.documentState === "issued" && i.timingState === "overdue");
    const voidCount = active.filter((i) => i.documentState === "void").length;
    const outstanding = totalIssued.reduce((acc, i) => acc + i.outstandingBalanceMinor, 0);

    return {
      issuedCount: totalIssued.length,
      draftCount: drafts.length,
      openCount: open.length,
      partiallyPaidCount: partiallyPaid.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      voidCount,
      outstandingMinor: outstanding,
    };
  }, [invoices, currencyFilter]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Invoice Number",
      "Company",
      "Type",
      "Document State",
      "Collection State",
      "Timing State",
      "Issue Date",
      "Due Date",
      "Currency",
      "Total Amount",
      "Paid Amount",
      "Balance Due",
    ];
    const rows = filteredInvoices.map((i) => [
      i.number,
      i.companyName,
      i.type,
      i.documentState,
      i.collectionState,
      i.timingState,
      formatDate(i.issuedAt),
      formatDate(i.dueAt),
      i.currency,
      formatMoney(i.totalMinor, i.currency),
      formatMoney(i.allocatedPaymentsMinor, i.currency),
      formatMoney(i.outstandingBalanceMinor, i.currency),
    ]);
    exportToCsv(`invoices-export-${quickFilter}`, headers, rows);
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Invoices Directory</h1>
            <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              {filteredInvoices.length} Documents
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review invoice documents, collection progress and outstanding company balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 rounded-sm text-xs border-border gap-1.5"
          >
            <DownloadIcon className="size-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="h-8 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            <span>Create Draft Invoice</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-stretch">
        <BillingKpiCard
          label="ISSUED"
          value={kpis.issuedCount}
          hint="Active docs"
          badge="Total"
          badgeTone="info"
          icon={FileTextIcon}
        />
        <BillingKpiCard
          label="OPEN"
          value={kpis.openCount}
          hint="Unpaid"
          badge="Pending"
          badgeTone="warning"
          icon={ClockIcon}
        />
        <BillingKpiCard
          label="PARTIAL"
          value={kpis.partiallyPaidCount}
          hint="Part paid"
          badge="Partial"
          badgeTone="info"
          icon={CreditCardIcon}
        />
        <BillingKpiCard
          label="PAID"
          value={kpis.paidCount}
          hint="Settled"
          badge="Cleared"
          badgeTone="success"
          icon={CheckCircle2Icon}
        />
        <BillingKpiCard
          label="OVERDUE"
          value={kpis.overdueCount}
          hint="Past due"
          badge={kpis.overdueCount > 0 ? "Action" : "None"}
          badgeTone={kpis.overdueCount > 0 ? "danger" : "neutral"}
          icon={AlertTriangleIcon}
        />
        <BillingKpiCard
          label="DRAFTS"
          value={kpis.draftCount}
          hint="Unissued"
          badge="Draft"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="BALANCE"
          value={formatMoney(kpis.outstandingMinor, currencyFilter === "ALL" ? "INR" : currencyFilter, { compact: true })}
          hint="Receivable"
          badge="Due"
          badgeTone="warning"
        />
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-card rounded-sm border border-border p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        {/* Search */}
        <div className="relative min-w-60 max-w-sm flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, company..."
            className="h-8 pl-8 text-xs rounded-sm bg-background border-border"
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "all", label: "All" },
            { id: "draft", label: "Draft" },
            { id: "open", label: "Open" },
            { id: "partially_paid", label: "Partially Paid" },
            { id: "paid", label: "Paid" },
            { id: "overdue", label: "Overdue" },
            { id: "void", label: "Void" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setQuickFilter(pill.id)}
              className={`px-2.5 py-1 text-xs rounded-sm font-medium transition-colors border ${
                quickFilter === pill.id
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-slate-500 hover:text-slate-700 bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Currency & Sort Dropdowns */}
        <div className="flex items-center gap-2">
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="h-8 w-28 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="ALL" className="text-xs">All Currencies</SelectItem>
              <SelectItem value="INR" className="text-xs">INR (₹)</SelectItem>
              <SelectItem value="USD" className="text-xs">USD ($)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger className="h-8 w-36 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
              <SelectItem value="due_soonest" className="text-xs">Due Soonest</SelectItem>
              <SelectItem value="highest_balance" className="text-xs">Highest Balance</SelectItem>
              <SelectItem value="highest_total" className="text-xs">Highest Total</SelectItem>
              <SelectItem value="company" className="text-xs">Company Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoices Directory Table */}
      <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
              <tr>
                <th className="py-2 px-3">Invoice Number</th>
                <th className="py-2 px-3">Company</th>
                <th className="py-2 px-3">Type / Subscription</th>
                <th className="py-2 px-3">Issue Date</th>
                <th className="py-2 px-3">Due Date</th>
                <th className="py-2 px-3 text-right">Total</th>
                <th className="py-2 px-3 text-right">Paid</th>
                <th className="py-2 px-3 text-right">Balance Due</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    No invoices match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setPreviewInvoice(inv)}
                  >
                    <td className="py-2 px-3 font-mono font-bold text-foreground">
                      {inv.number}
                    </td>
                    <td className="py-2 px-3 font-medium text-foreground">
                      {inv.companyName}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground capitalize">
                      {inv.subscriptionName ?? inv.type.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(inv.issuedAt)}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(inv.dueAt)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {formatMoney(inv.totalMinor, inv.currency)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700">
                      {inv.allocatedPaymentsMinor > 0 ? formatMoney(inv.allocatedPaymentsMinor, inv.currency) : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      <span className={inv.outstandingBalanceMinor > 0 ? "text-amber-900 font-semibold" : "text-slate-400"}>
                        {formatMoney(inv.outstandingBalanceMinor, inv.currency)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <DocumentStateBadge state={inv.documentState} />
                        <CollectionStateBadge state={inv.collectionState} />
                        <TimingStateBadge state={inv.timingState} />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 rounded-sm hover:bg-muted">
                            <MoreHorizontalIcon className="size-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-sm text-xs">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => router.push(`/super-admin/billing/invoices/${inv.id}`)}
                          >
                            <ReceiptIcon className="size-3.5 text-muted-foreground" />
                            <span>View Full Invoice</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => setPreviewInvoice(inv)}
                          >
                            <FileTextIcon className="size-3.5 text-muted-foreground" />
                            <span>Quick Preview</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => setDocumentInvoice(inv)}
                          >
                            <PrinterIcon className="size-3.5 text-muted-foreground" />
                            <span>Printable Document</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => router.push(`/super-admin/billing/accounts/${inv.billingAccountId}`)}
                          >
                            <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
                            <span>Open Billing Account</span>
                          </DropdownMenuItem>

                          {inv.documentState !== "void" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700"
                                onClick={() => setVoidTarget(inv)}
                              >
                                <BanIcon className="size-3.5 text-rose-600" />
                                <span>Void Invoice</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-2.5 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filteredInvoices.length} of {invoices.length} total invoices</span>
          <span className="italic">Click any row to open slide-out preview drawer</span>
        </div>
      </div>

      {/* Quick Preview Drawer */}
      <InvoicePreviewDrawer
        invoice={previewInvoice}
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        onOpenDocument={(inv) => {
          setPreviewInvoice(null);
          setDocumentInvoice(inv);
        }}
      />

      {/* Printable Invoice Document Modal */}
      <InvoiceDocumentModal
        invoice={documentInvoice}
        isOpen={Boolean(documentInvoice)}
        onClose={() => setDocumentInvoice(null)}
      />

      {/* Create Draft Invoice Wizard */}
      <CreateInvoiceWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={(id) => {
          router.push(`/super-admin/billing/invoices/${id}`);
        }}
      />

      {/* Void Invoice Dialog */}
      <VoidInvoiceDialog
        invoice={voidTarget}
        isOpen={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        onConfirmVoid={voidInvoice}
      />
    </div>
  );
}
