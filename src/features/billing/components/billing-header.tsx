/**
 * EnCodency OmniPlatform - Super Admin Billing Header
 * Main module header with actions, currency/period filters, and more menu.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ReceiptIcon,
  WalletCardsIcon,
  MoreVerticalIcon,
  DownloadIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { exportToCsv } from "../data/export";
import { useBillingOverview } from "../data/hooks";
import { formatMoney } from "../data/money";

interface BillingHeaderProps {
  selectedPeriod: number;
  onPeriodChange: (days: number) => void;
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export function BillingHeader({
  selectedPeriod,
  onPeriodChange,
  selectedCurrency,
  onCurrencyChange,
}: BillingHeaderProps) {
  const router = useRouter();
  const { kpis } = useBillingOverview({
    periodDays: selectedPeriod,
    currency: selectedCurrency,
  });

  const handleExportSummary = () => {
    const headers = ["Metric", "Value", "Currency", "Period", "As Of"];
    const rows = [
      ["Issued Invoice Amount", formatMoney(kpis.issuedInvoiceMinor, kpis.currency), kpis.currency, kpis.period, kpis.asOf],
      ["Collected Payments", formatMoney(kpis.collectedPaymentsMinor, kpis.currency), kpis.currency, kpis.period, kpis.asOf],
      ["Outstanding Balance", formatMoney(kpis.outstandingBalanceMinor, kpis.currency), kpis.currency, kpis.period, kpis.asOf],
      ["Overdue Amount", formatMoney(kpis.overdueAmountMinor, kpis.currency), kpis.currency, kpis.period, kpis.asOf],
      ["Unpaid Invoices Count", kpis.unpaidInvoicesCount, kpis.currency, kpis.period, kpis.asOf],
      ["Partially Paid Invoices Count", kpis.partiallyPaidCount, kpis.currency, kpis.period, kpis.asOf],
      ["Failed Payments Count", kpis.failedPaymentsCount, kpis.currency, kpis.period, kpis.asOf],
      ["Pending Refunds Count", kpis.pendingRefundsCount, kpis.currency, kpis.period, kpis.asOf],
    ];
    exportToCsv(`billing-summary-${selectedPeriod}d-${selectedCurrency.toLowerCase()}`, headers, rows);
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Billing & Payments</h1>
          <span className="rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            Platform Treasury
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
          Manage company billing, invoices, payments, credits and financial reconciliation across OmniPlatform.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Currency Selector */}
        <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="h-8 w-28 text-xs rounded-sm bg-background border-border">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent className="rounded-sm">
            <SelectItem value="ALL" className="text-xs">All Currencies</SelectItem>
            <SelectItem value="INR" className="text-xs">INR (₹)</SelectItem>
            <SelectItem value="USD" className="text-xs">USD ($)</SelectItem>
          </SelectContent>
        </Select>

        {/* Period Selector */}
        <Select
          value={selectedPeriod.toString()}
          onValueChange={(val) => onPeriodChange(parseInt(val, 10))}
        >
          <SelectTrigger className="h-8 w-24 text-xs rounded-sm bg-background border-border">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent className="rounded-sm">
            <SelectItem value="30" className="text-xs">30 Days</SelectItem>
            <SelectItem value="90" className="text-xs">3 Months</SelectItem>
            <SelectItem value="180" className="text-xs">6 Months</SelectItem>
            <SelectItem value="365" className="text-xs">1 Year</SelectItem>
          </SelectContent>
        </Select>

        {/* Primary Navigation Shortcuts */}
        <Button asChild variant="outline" size="sm" className="h-8 rounded-sm text-xs gap-1.5 border-border">
          <Link href="/super-admin/billing/invoices">
            <ReceiptIcon className="size-3.5 text-muted-foreground" />
            <span>View Invoices</span>
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm" className="h-8 rounded-sm text-xs gap-1.5 border-border">
          <Link href="/super-admin/billing/payments">
            <WalletCardsIcon className="size-3.5 text-muted-foreground" />
            <span>View Payments</span>
          </Link>
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8 rounded-sm border-border">
              <MoreVerticalIcon className="size-4 text-muted-foreground" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-sm">
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2"
              onClick={() => router.push("/super-admin/billing/invoices?quick=overdue")}
            >
              <AlertCircleIcon className="size-3.5 text-rose-600" />
              <span>Review Overdue Invoices</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2"
              onClick={() => router.push("/super-admin/billing/payments?quick=failed")}
            >
              <XCircleIcon className="size-3.5 text-amber-600" />
              <span>Review Failed Payments</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2"
              onClick={() => router.push("/super-admin/billing/credits-refunds?tab=refunds")}
            >
              <RotateCcwIcon className="size-3.5 text-blue-600" />
              <span>Review Pending Refunds</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs cursor-pointer gap-2" onClick={handleExportSummary}>
              <DownloadIcon className="size-3.5 text-slate-600" />
              <span>Export Billing Summary</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
