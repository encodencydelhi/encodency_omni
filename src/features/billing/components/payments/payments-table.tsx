/**
 * EnCodency OmniPlatform - Payments Directory Table
 * Transaction ledger with allocation status, multi-currency filtering and quick preview.
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import { exportToCsv } from "../../data/export";
import {
  PaymentAttemptBadge,
  SettlementBadge,
  AllocationBadge,
} from "../status-badges";
import { BillingKpiCard } from "../billing-kpi-card";
import { PaymentPreviewDrawer } from "./payment-preview-drawer";
import { PaymentAllocationDrawer } from "./payment-allocation-drawer";
import { ManualPaymentModal } from "./manual-payment-modal";
import { usePayments, useCreditsAndRefunds } from "../../data/hooks";
import type { Payment } from "../../data/types";
import {
  PlusIcon,
  DownloadIcon,
  SearchIcon,
  MoreHorizontalIcon,
  WalletCardsIcon,
  SplitIcon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  RotateCcwIcon,
  ScaleIcon,
} from "lucide-react";

interface PaymentsTableProps {
  initialQuickFilter?: string;
}

export function PaymentsTable({ initialQuickFilter }: PaymentsTableProps) {
  const router = useRouter();
  const { payments } = usePayments();
  const { refunds } = useCreditsAndRefunds();

  const [search, setSearch] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<string>(initialQuickFilter ?? "all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("newest");

  // Drawer / Modal states
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);
  const [allocationPayment, setAllocationPayment] = useState<Payment | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.reference.toLowerCase().includes(q) ||
          p.companyName.toLowerCase().includes(q) ||
          (p.providerReference && p.providerReference.toLowerCase().includes(q)) ||
          p.method.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Currency
      if (currencyFilter !== "ALL" && p.currency.toUpperCase() !== currencyFilter.toUpperCase()) {
        return false;
      }

      // Provider
      if (providerFilter !== "ALL" && p.provider !== providerFilter) {
        return false;
      }

      // Quick filter
      if (quickFilter === "succeeded") return p.attemptStatus === "succeeded";
      if (quickFilter === "pending") return p.attemptStatus === "pending";
      if (quickFilter === "failed") return p.attemptStatus === "failed";
      if (quickFilter === "unallocated") return p.attemptStatus === "succeeded" && p.unallocatedBalanceMinor > 0;
      if (quickFilter === "reconciliation") return p.reconciliationStatus === "needs_review" || p.reconciliationStatus === "mismatch";

      return true;
    }).sort((a, b) => {
      if (sortField === "newest") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sortField === "highest_amount") return b.grossAmountMinor - a.grossAmountMinor;
      if (sortField === "highest_unallocated") return b.unallocatedBalanceMinor - a.unallocatedBalanceMinor;
      if (sortField === "company") return a.companyName.localeCompare(b.companyName);
      return 0;
    });
  }, [payments, search, quickFilter, currencyFilter, providerFilter, sortField]);

  // KPI calculations
  const kpis = useMemo(() => {
    const active = payments.filter((p) => (currencyFilter === "ALL" ? true : p.currency === currencyFilter));
    const succeeded = active.filter((p) => p.attemptStatus === "succeeded");
    const pending = active.filter((p) => p.attemptStatus === "pending");
    const failed = active.filter((p) => p.attemptStatus === "failed");
    const unallocated = active.filter((p) => p.attemptStatus === "succeeded" && p.unallocatedBalanceMinor > 0);
    const collected = succeeded.reduce((acc, p) => acc + p.grossAmountMinor, 0);
    const pendingSettlement = active.filter((p) => p.settlementStatus === "pending").length;
    const recRequired = active.filter((p) => p.reconciliationStatus === "needs_review" || p.reconciliationStatus === "mismatch").length;

    const activeRefunds = refunds.filter((r) => (currencyFilter === "ALL" ? true : r.currency === currencyFilter));
    const refundedMinor = activeRefunds
      .filter((r) => r.status === "succeeded")
      .reduce((acc, r) => acc + r.requestedAmountMinor, 0);

    return {
      succeededCount: succeeded.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      collectedMinor: collected,
      unallocatedCount: unallocated.length,
      pendingSettlementCount: pendingSettlement,
      reconciliationCount: recRequired,
      refundedMinor,
    };
  }, [payments, refunds, currencyFilter]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Payment ID",
      "Company",
      "Provider",
      "Method",
      "Currency",
      "Gross Amount",
      "Attempt Status",
      "Settlement Status",
      "Allocation Status",
      "Unallocated Balance",
      "Date",
    ];
    const rows = filteredPayments.map((p) => [
      p.reference,
      p.companyName,
      p.provider,
      p.method,
      p.currency,
      formatMoney(p.grossAmountMinor, p.currency),
      p.attemptStatus,
      p.settlementStatus,
      p.allocationStatus,
      formatMoney(p.unallocatedBalanceMinor, p.currency),
      formatDate(p.createdAt),
    ]);
    exportToCsv(`payments-export-${quickFilter}`, headers, rows);
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Payments Directory</h1>
            <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              {filteredPayments.length} Transactions
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transaction inspection, payment lifecycle visibility, and unallocated fund management.
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
            onClick={() => setIsManualModalOpen(true)}
            className="h-8 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            <span>Record Manual Payment</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-stretch">
        <BillingKpiCard
          label="Succeeded"
          value={kpis.succeededCount}
          hint="Captured payments"
          badge="Success"
          badgeTone="success"
          icon={CheckCircle2Icon}
        />
        <BillingKpiCard
          label="Pending"
          value={kpis.pendingCount}
          hint="Awaiting verification"
          badge="In Flight"
          badgeTone="warning"
          icon={ClockIcon}
        />
        <BillingKpiCard
          label="Failed"
          value={kpis.failedCount}
          hint="Gateway declines"
          badge="Declined"
          badgeTone={kpis.failedCount > 0 ? "danger" : "neutral"}
          icon={XCircleIcon}
        />
        <BillingKpiCard
          label="Collected"
          value={formatMoney(kpis.collectedMinor, currencyFilter === "ALL" ? "INR" : currencyFilter, { compact: true })}
          hint="Total cash collected"
          badge="Settled"
          badgeTone="success"
        />
        <BillingKpiCard
          label="Unallocated"
          value={kpis.unallocatedCount}
          hint="Available for invoice"
          badge="Open Cash"
          badgeTone="info"
          icon={SplitIcon}
        />
        <BillingKpiCard
          label="Pending Settlement"
          value={kpis.pendingSettlementCount}
          hint="Bank batch pending"
          badge="Settlement"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="Recon Issues"
          value={kpis.reconciliationCount}
          hint="Discrepancy review"
          badge="Audit"
          badgeTone={kpis.reconciliationCount > 0 ? "danger" : "neutral"}
          icon={ScaleIcon}
        />
        <BillingKpiCard
          label="Refunded"
          value={formatMoney(kpis.refundedMinor, currencyFilter === "ALL" ? "INR" : currencyFilter, { compact: true })}
          hint="Returned money"
          badge="Refunds"
          badgeTone="neutral"
          icon={RotateCcwIcon}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-sm border border-border p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        {/* Search */}
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment ID, company, reference..."
            className="h-8 pl-8 text-xs rounded-sm bg-background border-border"
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "all", label: "All" },
            { id: "succeeded", label: "Succeeded" },
            { id: "pending", label: "Pending" },
            { id: "failed", label: "Failed" },
            { id: "unallocated", label: "Unallocated" },
            { id: "reconciliation", label: "Needs Recon" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setQuickFilter(pill.id)}
              className={`px-2 py-1 text-xs rounded-sm font-medium transition-colors ${
                quickFilter === pill.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-2">
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="h-8 w-32 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="ALL" className="text-xs">All Providers</SelectItem>
              <SelectItem value="Razorpay" className="text-xs">Razorpay</SelectItem>
              <SelectItem value="Stripe" className="text-xs">Stripe</SelectItem>
              <SelectItem value="Manual Bank Wire" className="text-xs">Manual Bank Wire</SelectItem>
            </SelectContent>
          </Select>

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
              <SelectItem value="highest_amount" className="text-xs">Highest Amount</SelectItem>
              <SelectItem value="highest_unallocated" className="text-xs">Highest Unallocated</SelectItem>
              <SelectItem value="company" className="text-xs">Company Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
              <tr>
                <th className="py-2 px-3">Payment ID</th>
                <th className="py-2 px-3">Company</th>
                <th className="py-2 px-3">Provider / Method</th>
                <th className="py-2 px-3 text-right">Gross Amount</th>
                <th className="py-2 px-3 text-center">Attempt</th>
                <th className="py-2 px-3 text-center">Settlement</th>
                <th className="py-2 px-3 text-center">Allocation</th>
                <th className="py-2 px-3 text-right">Unallocated</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    No payment records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setPreviewPayment(p)}
                  >
                    <td className="py-2 px-3 font-mono font-bold text-foreground">
                      {p.reference}
                    </td>
                    <td className="py-2 px-3 font-medium text-foreground">
                      {p.companyName}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      <div className="font-medium text-foreground">{p.provider}</div>
                      <div className="text-[11px] text-muted-foreground">{p.method}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {formatMoney(p.grossAmountMinor, p.currency)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <PaymentAttemptBadge status={p.attemptStatus} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <SettlementBadge status={p.settlementStatus} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <AllocationBadge status={p.allocationStatus} />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {p.unallocatedBalanceMinor > 0 ? (
                        <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-sm">
                          {formatMoney(p.unallocatedBalanceMinor, p.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(p.createdAt)}
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
                            onClick={() => router.push(`/super-admin/billing/payments/${p.id}`)}
                          >
                            <WalletCardsIcon className="size-3.5 text-muted-foreground" />
                            <span>View Payment Detail</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => setPreviewPayment(p)}
                          >
                            <WalletCardsIcon className="size-3.5 text-muted-foreground" />
                            <span>Quick Preview</span>
                          </DropdownMenuItem>

                          {p.unallocatedBalanceMinor > 0 && p.attemptStatus === "succeeded" && (
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-blue-600 focus:text-blue-700"
                              onClick={() => setAllocationPayment(p)}
                            >
                              <SplitIcon className="size-3.5 text-blue-600" />
                              <span>Allocate Funds</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => router.push(`/super-admin/billing/accounts/${p.billingAccountId}`)}
                          >
                            <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
                            <span>Open Billing Account</span>
                          </DropdownMenuItem>
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
          <span>Showing {filteredPayments.length} of {payments.length} total payment transactions</span>
          <span className="italic">Click row to preview transaction allocations</span>
        </div>
      </div>

      {/* Quick Preview Drawer */}
      <PaymentPreviewDrawer
        payment={previewPayment}
        isOpen={Boolean(previewPayment)}
        onClose={() => setPreviewPayment(null)}
        onOpenAllocate={(pay) => {
          setPreviewPayment(null);
          setAllocationPayment(pay);
        }}
      />

      {/* Allocation Drawer */}
      <PaymentAllocationDrawer
        payment={allocationPayment}
        isOpen={Boolean(allocationPayment)}
        onClose={() => setAllocationPayment(null)}
      />

      {/* Record Manual Payment Modal */}
      <ManualPaymentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
}
