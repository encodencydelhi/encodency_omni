/**
 * EnCodency OmniPlatform - Credits & Refunds Workspace
 * 3-Tab financial control center: Credit Notes, Account Credit Ledger, and Refunds.
 */

"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { formatMoney } from "../data/money";
import { exportToCsv } from "../data/export";
import {
  CreditNoteStatusBadge,
  RefundStatusBadge,
} from "../components/status-badges";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { CreateCreditNoteModal } from "../components/credits-refunds/create-credit-note-modal";
import { ApplyCreditModal } from "../components/credits-refunds/apply-credit-modal";
import { CreateRefundModal } from "../components/credits-refunds/create-refund-modal";
import { useCreditsAndRefunds } from "../data/hooks";
import { toast } from "sonner";
import {
  PlusIcon,
  DownloadIcon,
  RotateCcwIcon,
  CoinsIcon,
  CheckIcon,
  ReceiptIcon,
  ClockIcon,
  XCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";

export function CreditsRefundsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"credit_notes" | "ledger" | "refunds">(
    tabParam === "refunds" ? "refunds" : tabParam === "ledger" ? "ledger" : "credit_notes",
  );

  const {
    creditNotes,
    ledgerEntries,
    refunds,
    approveCreditNote,
  } = useCreditsAndRefunds();

  // Modals
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState<boolean>(false);
  const [isApplyCreditModalOpen, setIsApplyCreditModalOpen] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);

  // KPIs
  const kpis = useMemo(() => {
    const issuedCn = creditNotes.filter((c) => c.status === "issued");
    const pendingCn = creditNotes.filter((c) => c.status === "pending_approval");
    const totalAvailableCredit = ledgerEntries
      .filter((e) => e.status === "posted")
      .reduce((acc, e) => acc + (e.creditMinor - e.debitMinor), 0);
    const appliedCredit = ledgerEntries.reduce((acc, e) => acc + e.debitMinor, 0);

    const pendingRefunds = refunds.filter((r) => r.status === "pending_approval" || r.status === "draft");
    const succeededRefunds = refunds.filter((r) => r.status === "succeeded");
    const failedRefunds = refunds.filter((r) => r.status === "failed");

    return {
      issuedCnCount: issuedCn.length,
      pendingCnCount: pendingCn.length,
      availableCreditMinor: Math.max(0, totalAvailableCredit),
      appliedCreditMinor: appliedCredit,
      pendingRefundsCount: pendingRefunds.length,
      succeededRefundsMinor: succeededRefunds.reduce((acc, r) => acc + r.requestedAmountMinor, 0),
      failedRefundsCount: failedRefunds.length,
    };
  }, [creditNotes, ledgerEntries, refunds]);

  // Approve action
  const handleApproveCreditNote = (id: string) => {
    try {
      approveCreditNote(id);
      toast.success("Credit note approved and posted to financial accounts");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve credit note");
    }
  };

  // Export CSV
  const handleExport = () => {
    if (activeTab === "credit_notes") {
      const headers = ["Credit Note #", "Company", "Invoice", "Currency", "Amount", "Reason", "Status", "Date"];
      const rows = creditNotes.map((c) => [
        c.number,
        c.companyName,
        c.invoiceNumber,
        c.currency,
        formatMoney(c.amountMinor, c.currency),
        c.reason,
        c.status,
        formatDate(c.createdAt),
      ]);
      exportToCsv("credit-notes-export", headers, rows);
    } else if (activeTab === "ledger") {
      const headers = ["Date", "Company ID", "Entry Type", "Reference", "Credit", "Debit", "Running Balance", "Currency"];
      const rows = ledgerEntries.map((l) => [
        formatDate(l.date),
        l.companyId,
        l.entryType,
        l.reference,
        formatMoney(l.creditMinor, l.currency),
        formatMoney(l.debitMinor, l.currency),
        formatMoney(l.runningBalanceMinor, l.currency),
        l.currency,
      ]);
      exportToCsv("account-credit-ledger-export", headers, rows);
    } else {
      const headers = ["Refund ID", "Company", "Payment Ref", "Amount", "Reason", "Status", "Requested By", "Date"];
      const rows = refunds.map((r) => [
        r.reference,
        r.companyName,
        r.paymentReference,
        formatMoney(r.requestedAmountMinor, r.currency),
        r.reason,
        r.status,
        r.requestedBy,
        formatDate(r.createdAt),
      ]);
      exportToCsv("refunds-export", headers, rows);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Credits & Refunds</h1>
            <span className="rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              Financial Adjustments
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Credit note drafting, account balance ledgers, and governed refund requests.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 rounded-sm text-xs border-border gap-1.5"
          >
            <DownloadIcon className="size-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsApplyCreditModalOpen(true)}
            className="h-8 rounded-sm text-xs border-border gap-1.5 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
          >
            <CoinsIcon className="size-3.5" />
            <span>Apply Credit to Invoice</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreditNoteModalOpen(true)}
            className="h-8 rounded-sm text-xs border-border gap-1.5"
          >
            <RotateCcwIcon className="size-3.5 text-muted-foreground" />
            <span>Create Credit Note</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsRefundModalOpen(true)}
            className="h-8 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            <span>Request Refund</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-stretch">
        <BillingKpiCard
          label="Credit Notes Issued"
          value={kpis.issuedCnCount}
          hint="Active concessions"
          badge="Issued"
          badgeTone="success"
          icon={ReceiptIcon}
        />
        <BillingKpiCard
          label="Pending Credit Notes"
          value={kpis.pendingCnCount}
          hint="Awaiting finance approval"
          badge="Review"
          badgeTone="warning"
          icon={ClockIcon}
        />
        <BillingKpiCard
          label="Available Credit"
          value={formatMoney(kpis.availableCreditMinor, "INR", { compact: true })}
          hint="Unapplied company balances"
          badge="Available"
          badgeTone="info"
          icon={CoinsIcon}
        />
        <BillingKpiCard
          label="Applied Credit"
          value={formatMoney(kpis.appliedCreditMinor, "INR", { compact: true })}
          hint="Deducted from invoices"
          badge="Applied"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="Pending Refunds"
          value={kpis.pendingRefundsCount}
          hint="Queued for decision"
          badge="Pending"
          badgeTone="warning"
          icon={RotateCcwIcon}
        />
        <BillingKpiCard
          label="Completed Refunds"
          value={formatMoney(kpis.succeededRefundsMinor, "INR", { compact: true })}
          hint="Returned money"
          badge="Settled"
          badgeTone="neutral"
          icon={CheckCircle2Icon}
        />
        <BillingKpiCard
          label="Failed Refunds"
          value={kpis.failedRefundsCount}
          hint="Declined by gateway"
          badge="Failed"
          badgeTone={kpis.failedRefundsCount > 0 ? "danger" : "neutral"}
          icon={XCircleIcon}
        />
      </div>

      {/* Secondary Subnavigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-card px-3 py-1.5 rounded-sm">
        {[
          { id: "credit_notes", label: "Credit Notes Directory", count: creditNotes.length },
          { id: "ledger", label: "Account Credit Ledger", count: ledgerEntries.length },
          { id: "refunds", label: "Refund Requests", count: refunds.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1 text-xs rounded-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* TAB 1: Credit Notes Directory */}
      {activeTab === "credit_notes" && (
        <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                <tr>
                  <th className="py-2 px-3">Credit Note #</th>
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Target Invoice</th>
                  <th className="py-2 px-3 text-right">Adjustment Amount</th>
                  <th className="py-2 px-3">Adjustment Reason</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3">Issued Date</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                      No credit note records found.
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{cn.number}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{cn.companyName}</td>
                      <td className="py-2 px-3 font-mono text-blue-600">
                        <a href={`/super-admin/billing/invoices/${cn.invoiceId}`} className="hover:underline">
                          {cn.invoiceNumber}
                        </a>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                        {formatMoney(cn.amountMinor, cn.currency)}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground max-w-xs truncate">{cn.reason}</td>
                      <td className="py-2 px-3 text-center">
                        <CreditNoteStatusBadge status={cn.status} />
                      </td>
                      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                        {cn.issuedAt ? formatDate(cn.issuedAt) : "Awaiting approval"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {cn.status === "pending_approval" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveCreditNote(cn.id)}
                            className="h-6 text-[11px] rounded-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckIcon className="size-3 mr-1" /> Approve
                          </Button>
                        ) : (
                          <Button asChild variant="outline" size="sm" className="h-6 text-[11px] rounded-sm border-border">
                            <a href={`/super-admin/billing/invoices/${cn.invoiceId}`}>View Invoice</a>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Account Credit Ledger */}
      {activeTab === "ledger" && (
        <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Account Reference</th>
                  <th className="py-2 px-3">Entry Type</th>
                  <th className="py-2 px-3">Reference / Memo</th>
                  <th className="py-2 px-3 text-right">Credit (+)</th>
                  <th className="py-2 px-3 text-right">Debit (-)</th>
                  <th className="py-2 px-3 text-right">Running Balance</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ledgerEntries.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{formatDate(l.date)}</td>
                    <td className="py-2 px-3 font-mono font-medium text-foreground">{l.billingAccountId}</td>
                    <td className="py-2 px-3 capitalize text-foreground">{l.entryType.replace(/_/g, " ")}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.description}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {l.creditMinor > 0 ? `+${formatMoney(l.creditMinor, l.currency)}` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-600 font-semibold">
                      {l.debitMinor > 0 ? `-${formatMoney(l.debitMinor, l.currency)}` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {formatMoney(l.runningBalanceMinor, l.currency)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold capitalize">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Refunds Directory */}
      {activeTab === "refunds" && (
        <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                <tr>
                  <th className="py-2 px-3">Refund ID</th>
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Original Payment</th>
                  <th className="py-2 px-3 text-right">Requested Amount</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Requested By</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                      No refund requests recorded.
                    </td>
                  </tr>
                ) : (
                  refunds.map((rfd) => (
                    <tr key={rfd.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{rfd.reference}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{rfd.companyName}</td>
                      <td className="py-2 px-3 font-mono text-blue-600">
                        <a href={`/super-admin/billing/payments/${rfd.paymentId}`} className="hover:underline">
                          {rfd.paymentReference}
                        </a>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        {formatMoney(rfd.requestedAmountMinor, rfd.currency)}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground max-w-xs truncate">{rfd.reason}</td>
                      <td className="py-2 px-3 text-muted-foreground">{rfd.requestedBy}</td>
                      <td className="py-2 px-3 text-center">
                        <RefundStatusBadge status={rfd.status} />
                      </td>
                      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{formatDate(rfd.createdAt)}</td>
                      <td className="py-2 px-3 text-right">
                        <Button asChild variant="outline" size="sm" className="h-6 text-[11px] rounded-sm border-border">
                          <a href={`/super-admin/billing/payments/${rfd.paymentId}`}>Open Payment</a>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateCreditNoteModal
        isOpen={isCreditNoteModalOpen}
        onClose={() => setIsCreditNoteModalOpen(false)}
      />

      <ApplyCreditModal
        isOpen={isApplyCreditModalOpen}
        onClose={() => setIsApplyCreditModalOpen(false)}
      />

      <CreateRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
      />
    </div>
  );
}
