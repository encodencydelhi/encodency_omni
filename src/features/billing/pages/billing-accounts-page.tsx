/**
 * EnCodency OmniPlatform - Billing Accounts Directory
 * Platform-wide directory of company billing accounts, legal identities, and terms.
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "../data/money";
import { exportToCsv } from "../data/export";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { EditAccountModal } from "../components/accounts/edit-account-modal";
import { useBillingAccounts } from "../data/hooks";
import type { BillingAccount } from "../data/types";
import {
  Building2Icon,
  SearchIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  ReceiptIcon,
  WalletCardsIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react";

export function BillingAccountsPage() {
  const router = useRouter();
  const { accounts } = useBillingAccounts();

  const [search, setSearch] = useState<string>("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [editTarget, setEditTarget] = useState<BillingAccount | null>(null);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          acc.companyName.toLowerCase().includes(q) ||
          acc.legalName.toLowerCase().includes(q) ||
          acc.billingEmail.toLowerCase().includes(q) ||
          (acc.taxId && acc.taxId.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (currencyFilter !== "ALL" && acc.currency.toUpperCase() !== currencyFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== "ALL" && acc.accountStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [accounts, search, currencyFilter, statusFilter]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Company",
      "Legal Name",
      "Currency",
      "Billing Email",
      "Contact",
      "Tax ID",
      "Payment Terms",
      "Outstanding Balance",
      "Available Credit",
      "Account Status",
    ];
    const rows = filteredAccounts.map((a) => [
      a.companyName,
      a.legalName,
      a.currency,
      a.billingEmail,
      a.billingContact,
      a.taxId ?? "-",
      a.paymentTerms,
      formatMoney(a.currentOutstandingMinor, a.currency),
      formatMoney(a.availableCreditMinor, a.currency),
      a.accountStatus,
    ]);
    exportToCsv("billing-accounts-export", headers, rows);
  };

  const statusBadgeStyle: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delinquent: "bg-rose-50 text-rose-700 border-rose-200",
    suspended: "bg-amber-50 text-amber-700 border-amber-200",
    on_hold: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Billing Accounts</h1>
            <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              {filteredAccounts.length} Accounts
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platform-wide directory of company legal identities, contact info, tax settings and balances.
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
        </div>
      </div>

      {/* KPI Cards (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-stretch">
        <BillingKpiCard
          label="ACCOUNTS"
          value={accounts.length}
          hint="Total tenants"
          badge="Total"
          badgeTone="info"
          icon={Building2Icon}
        />
        <BillingKpiCard
          label="ACTIVE"
          value={accounts.filter((a) => a.accountStatus === "active").length}
          hint="Good standing"
          badge="Active"
          badgeTone="success"
          icon={CheckCircle2Icon}
        />
        <BillingKpiCard
          label="DELINQUENT"
          value={accounts.filter((a) => a.accountStatus === "delinquent").length}
          hint="Past due"
          badge="Overdue"
          badgeTone="danger"
          icon={AlertTriangleIcon}
        />
        <BillingKpiCard
          label="SUSPENDED"
          value={accounts.filter((a) => a.accountStatus === "suspended").length}
          hint="Billing hold"
          badge="Hold"
          badgeTone="warning"
          icon={ClockIcon}
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-card rounded-sm border border-border p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, legal name, email, tax ID..."
            className="h-8 pl-8 text-xs rounded-sm bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Account Status" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="delinquent" className="text-xs">Delinquent</SelectItem>
              <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
              <tr>
                <th className="py-2 px-3">Company</th>
                <th className="py-2 px-3">Billing Legal Name</th>
                <th className="py-2 px-3">Currency</th>
                <th className="py-2 px-3">Billing Contact & Email</th>
                <th className="py-2 px-3">Payment Terms</th>
                <th className="py-2 px-3 text-right">Outstanding</th>
                <th className="py-2 px-3 text-right">Available Credit</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                    No billing accounts found matching query.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/super-admin/billing/accounts/${acc.id}`)}
                  >
                    <td className="py-2 px-3 font-semibold text-foreground">
                      {acc.companyName}
                    </td>
                    <td className="py-2 px-3 text-foreground font-medium">
                      {acc.legalName}
                    </td>
                    <td className="py-2 px-3 font-bold font-mono text-muted-foreground">
                      {acc.currency}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      <div className="text-foreground">{acc.billingContact}</div>
                      <div className="text-[11px] text-muted-foreground">{acc.billingEmail}</div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {acc.paymentTerms}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      <span className={acc.currentOutstandingMinor > 0 ? "text-amber-900" : "text-slate-400"}>
                        {formatMoney(acc.currentOutstandingMinor, acc.currency)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {acc.availableCreditMinor > 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm">
                          {formatMoney(acc.availableCreditMinor, acc.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium capitalize ${
                          statusBadgeStyle[acc.accountStatus] ?? "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {acc.accountStatus}
                      </span>
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
                            onClick={() => router.push(`/super-admin/billing/accounts/${acc.id}`)}
                          >
                            <Building2Icon className="size-3.5 text-muted-foreground" />
                            <span>View Account Detail</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => setEditTarget(acc)}
                          >
                            <Building2Icon className="size-3.5 text-blue-600" />
                            <span>Edit Account Info</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => router.push(`/super-admin/billing/invoices?search=${encodeURIComponent(acc.companyName)}`)}
                          >
                            <ReceiptIcon className="size-3.5 text-muted-foreground" />
                            <span>View Invoices</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => router.push(`/super-admin/billing/payments?search=${encodeURIComponent(acc.companyName)}`)}
                          >
                            <WalletCardsIcon className="size-3.5 text-muted-foreground" />
                            <span>View Payments</span>
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
      </div>

      {/* Edit Account Modal */}
      <EditAccountModal
        account={editTarget}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}
