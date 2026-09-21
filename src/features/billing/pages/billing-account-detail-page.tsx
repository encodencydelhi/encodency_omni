/**
 * EnCodency OmniPlatform - Billing Account Detail Page
 * Scoped view of company financial identity, preferences, invoices, payments, and credit ledger.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../data/money";
import { useBillingAccountDetail } from "../data/hooks";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { EditAccountModal } from "../components/accounts/edit-account-modal";
import {
  DocumentStateBadge,
  CollectionStateBadge,
  PaymentAttemptBadge,
} from "../components/status-badges";
import {
  ArrowLeftIcon,
  EditIcon,
  ReceiptIcon,
  CoinsIcon,
  ClockIcon,
  AlertTriangleIcon,
} from "lucide-react";

import { useParams } from "next/navigation";

interface BillingAccountDetailPageProps {
  accountId?: string;
}

export function BillingAccountDetailPage({ accountId: propAccountId }: BillingAccountDetailPageProps) {
  const params = useParams();
  const accountId = propAccountId ?? (params?.accountId as string) ?? "";
  const {
    account,
    companyInvoices,
    companyPayments,
    companyLedger,
  } = useBillingAccountDetail(accountId);

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "ledger">("invoices");

  if (!account) {
    return (
      <div className="p-8 text-center bg-card rounded-sm border border-border space-y-3">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-muted-foreground">
          <AlertTriangleIcon className="size-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Billing Account Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested billing account &quot;{accountId}&quot; was not found in the platform registry.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-sm text-xs border-border">
          <Link href="/super-admin/billing/accounts">
            <ArrowLeftIcon className="size-3.5 mr-1.5" /> Return to Billing Accounts
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Top Header */}
      <div className="bg-card rounded-sm border border-border p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/super-admin/billing/accounts"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" /> Back to Billing Accounts
          </Link>

          <span className="px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold capitalize">
            {account.accountStatus}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1 border-t border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {account.companyName}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">
                {account.currency}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Legal Entity: <span className="font-semibold text-foreground">{account.legalName}</span> • Tax ID: {account.taxId ?? "None"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-8 rounded-sm text-xs border-border gap-1.5"
            >
              <EditIcon className="size-3.5 text-muted-foreground" />
              <span>Edit Account Info</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Financial KPIs (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-stretch">
        <BillingKpiCard
          label="OUTSTANDING"
          value={formatMoney(account.currentOutstandingMinor, account.currency)}
          hint="Open balance"
          badge={account.currentOutstandingMinor > 0 ? "Due" : "Paid"}
          badgeTone={account.currentOutstandingMinor > 0 ? "warning" : "success"}
          icon={ClockIcon}
        />
        <BillingKpiCard
          label="OVERDUE"
          value={formatMoney(account.overdueMinor, account.currency)}
          hint="Past due"
          badge={account.overdueMinor > 0 ? "Overdue" : "Clean"}
          badgeTone={account.overdueMinor > 0 ? "danger" : "neutral"}
          icon={AlertTriangleIcon}
        />
        <BillingKpiCard
          label="CREDITS"
          value={formatMoney(account.availableCreditMinor, account.currency)}
          hint="Available"
          badge="Credit"
          badgeTone="info"
          icon={CoinsIcon}
        />
        <BillingKpiCard
          label="UNPAID"
          value={account.unpaidInvoiceCount}
          hint="Invoices"
          badge="Due"
          badgeTone="neutral"
          icon={ReceiptIcon}
        />
        <BillingKpiCard
          label="PLAN"
          value={account.subscriptionTier.toUpperCase()}
          hint="Tier level"
          badge="Plan"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="RENEWAL"
          value={account.renewsAt ? formatDate(account.renewsAt) : "N/A"}
          hint="Next cycle"
          badge="Auto"
          badgeTone="neutral"
        />
      </div>

      {/* Identity & Preferences Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {/* Billing Identity Card */}
        <div className="bg-card rounded-sm border border-border p-3 shadow-2xs space-y-2">
          <div className="pb-1.5 border-b border-border/60">
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Billing Identity & Address
            </h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Legal Name:</span>
              <span className="font-semibold text-foreground">{account.legalName}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Contact Person:</span>
              <span className="text-foreground">{account.billingContact}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Billing Email:</span>
              <span className="text-foreground">{account.billingEmail}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Contact Phone:</span>
              <span className="text-foreground">{account.billingPhone ?? "None provided"}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Tax Identifier / GSTIN:</span>
              <span className="font-mono text-foreground font-semibold">{account.taxId ?? "None specified"}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Registered Address:</span>
              <span className="text-right text-foreground max-w-xs">
                {account.address.line1}, {account.address.city}, {account.address.state} {account.address.postalCode}, {account.address.country}
              </span>
            </div>
          </div>
        </div>

        {/* Billing Preferences Card */}
        <div className="bg-card rounded-sm border border-border p-3 shadow-2xs space-y-2">
          <div className="pb-1.5 border-b border-border/60">
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Billing Preferences & Terms
            </h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Payment Terms:</span>
              <span className="font-semibold text-foreground">{account.paymentTerms}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Invoice Delivery:</span>
              <span className="capitalize text-foreground">{account.invoiceDelivery.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Default Payment Method:</span>
              <span className="text-foreground font-medium">{account.defaultPaymentMethod}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground">Billing Currency:</span>
              <span className="font-mono font-bold text-foreground">{account.currency}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Account Lifecycle Status:</span>
              <span className="font-semibold capitalize text-emerald-700">{account.accountStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped Tables Section */}
      <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
        <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-3 py-1.5">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-3 py-1 text-xs rounded-sm font-medium transition-colors ${
              activeTab === "invoices"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Invoices ({companyInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-3 py-1 text-xs rounded-sm font-medium transition-colors ${
              activeTab === "payments"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Payments ({companyPayments.length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-3 py-1 text-xs rounded-sm font-medium transition-colors ${
              activeTab === "ledger"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Credit Ledger ({companyLedger.length})
          </button>
        </div>

        {/* Tab 1: Scoped Invoices */}
        {activeTab === "invoices" && (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                <tr>
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Issue Date</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right">Balance Due</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {companyInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      No invoices found for this company.
                    </td>
                  </tr>
                ) : (
                  companyInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">
                        <Link href={`/super-admin/billing/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="py-2 px-3 capitalize text-muted-foreground">{inv.type.replace(/_/g, " ")}</td>
                      <td className="py-2 px-3 text-muted-foreground">{formatDate(inv.issuedAt)}</td>
                      <td className="py-2 px-3 text-muted-foreground">{formatDate(inv.dueAt)}</td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatMoney(inv.totalMinor, inv.currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        {formatMoney(inv.outstandingBalanceMinor, inv.currency)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <DocumentStateBadge state={inv.documentState} />
                          <CollectionStateBadge state={inv.collectionState} />
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button asChild variant="outline" size="sm" className="h-6 text-[11px] rounded-sm border-border">
                          <Link href={`/super-admin/billing/invoices/${inv.id}`}>View Invoice</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Scoped Payments */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                <tr>
                  <th className="py-2 px-3">Payment Ref</th>
                  <th className="py-2 px-3">Provider / Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3 text-center">Attempt</th>
                  <th className="py-2 px-3 text-right">Unallocated</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {companyPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No payments recorded for this company.
                    </td>
                  </tr>
                ) : (
                  companyPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">
                        <Link href={`/super-admin/billing/payments/${p.id}`} className="text-blue-600 hover:underline">
                          {p.reference}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{p.provider} • {p.method}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        {formatMoney(p.grossAmountMinor, p.currency)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <PaymentAttemptBadge status={p.attemptStatus} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-blue-700">
                        {p.unallocatedBalanceMinor > 0 ? formatMoney(p.unallocatedBalanceMinor, p.currency) : "-"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="py-2 px-3 text-right">
                        <Button asChild variant="outline" size="sm" className="h-6 text-[11px] rounded-sm border-border">
                          <Link href={`/super-admin/billing/payments/${p.id}`}>View Payment</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Scoped Credit Ledger */}
        {activeTab === "ledger" && (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Entry Type</th>
                  <th className="py-2 px-3">Reference / Description</th>
                  <th className="py-2 px-3 text-right">Credit (+)</th>
                  <th className="py-2 px-3 text-right">Debit (-)</th>
                  <th className="py-2 px-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {companyLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No credit adjustments recorded for this account.
                    </td>
                  </tr>
                ) : (
                  companyLedger.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground">{formatDate(l.date)}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Account Modal */}
      <EditAccountModal
        account={account}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </div>
  );
}
