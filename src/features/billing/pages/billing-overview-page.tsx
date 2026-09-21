/**
 * EnCodency OmniPlatform - Super Admin Billing Overview Page
 * High-density financial operations dashboard with live KPI aggregations.
 */

"use client";

import { useState } from "react";
import { BillingHeader } from "../components/billing-header";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { BillingTrendChart } from "../components/overview/billing-trend-chart";
import { InvoiceDistribution } from "../components/overview/invoice-distribution";
import { AttentionQueue } from "../components/overview/attention-queue";
import { UpcomingEvents } from "../components/overview/upcoming-events";
import { RecentActivityWidget } from "../components/overview/recent-activity-widget";
import { useBillingOverview, useBillingAccounts } from "../data/hooks";
import { formatMoney } from "../data/money";
import {
  FileTextIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  FileQuestionIcon,
  SplitIcon,
  XCircleIcon,
  RotateCcwIcon,
} from "lucide-react";

export function BillingOverviewPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");

  const { kpis, invoices, payments, refunds, exceptions, activities } = useBillingOverview({
    periodDays: selectedPeriod,
    currency: selectedCurrency,
  });

  const { accounts } = useBillingAccounts();

  return (
    <div className="space-y-2">
      {/* Module Header */}
      <BillingHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />

      {/* KPI Cards Grid - Row 1 (Money metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-stretch">
        <BillingKpiCard
          label="Issued Invoice Amount"
          value={formatMoney(kpis.issuedInvoiceMinor, kpis.currency)}
          hint={`Issued in selected ${selectedPeriod}D period`}
          badge={selectedPeriod === 30 ? "Last 30D" : `${selectedPeriod}D`}
          badgeTone="info"
          icon={FileTextIcon}
          href="/super-admin/billing/invoices"
        />
        <BillingKpiCard
          label="Collected Payments"
          value={formatMoney(kpis.collectedPaymentsMinor, kpis.currency)}
          hint="Settled & verified collections"
          badge="Settled"
          badgeTone="success"
          icon={CheckCircle2Icon}
          href="/super-admin/billing/payments"
        />
        <BillingKpiCard
          label="Outstanding Balance"
          value={formatMoney(kpis.outstandingBalanceMinor, kpis.currency)}
          hint="Remaining receivables as of today"
          badge={kpis.outstandingBalanceMinor > 0 ? "Open" : "Cleared"}
          badgeTone={kpis.outstandingBalanceMinor > 0 ? "warning" : "success"}
          icon={ClockIcon}
          href="/super-admin/billing/invoices?quick=open"
        />
        <BillingKpiCard
          label="Overdue Amount"
          value={formatMoney(kpis.overdueAmountMinor, kpis.currency)}
          hint="Receivables past scheduled due date"
          badge={kpis.overdueAmountMinor > 0 ? "Action Required" : "No Delinquency"}
          badgeTone={kpis.overdueAmountMinor > 0 ? "danger" : "neutral"}
          icon={AlertTriangleIcon}
          href="/super-admin/billing/invoices?quick=overdue"
        />
      </div>

      {/* KPI Cards Grid - Row 2 (Counts & Operational metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-stretch">
        <BillingKpiCard
          label="Unpaid Invoices"
          value={kpis.unpaidInvoicesCount}
          hint="Invoices awaiting full payment"
          badge={`${kpis.unpaidInvoicesCount} Invoices`}
          badgeTone="warning"
          icon={FileQuestionIcon}
          href="/super-admin/billing/invoices?quick=open"
        />
        <BillingKpiCard
          label="Partially Paid Invoices"
          value={kpis.partiallyPaidCount}
          hint="Invoices with partial payments applied"
          badge={`${kpis.partiallyPaidCount} Invoices`}
          badgeTone="info"
          icon={SplitIcon}
          href="/super-admin/billing/invoices?quick=partially_paid"
        />
        <BillingKpiCard
          label="Failed Payment Attempts"
          value={kpis.failedPaymentsCount}
          hint="Payment gateway card / bank declines"
          badge={kpis.failedPaymentsCount > 0 ? "Failed" : "Zero"}
          badgeTone={kpis.failedPaymentsCount > 0 ? "danger" : "neutral"}
          icon={XCircleIcon}
          href="/super-admin/billing/payments?quick=failed"
        />
        <BillingKpiCard
          label="Pending Refunds"
          value={kpis.pendingRefundsCount}
          hint="Refund requests awaiting approval"
          badge={`${kpis.pendingRefundsCount} Pending`}
          badgeTone="info"
          icon={RotateCcwIcon}
          href="/super-admin/billing/credits-refunds?tab=refunds"
        />
      </div>

      {/* Charts & Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">
        <div className="lg:col-span-2 h-full">
          <BillingTrendChart
            invoices={invoices}
            payments={payments}
            refunds={refunds}
            currency={selectedCurrency}
          />
        </div>
        <div className="lg:col-span-1 h-full">
          <InvoiceDistribution invoices={invoices} currency={selectedCurrency} />
        </div>
      </div>

      {/* Actionable Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        <AttentionQueue
          invoices={invoices}
          payments={payments}
          refunds={refunds}
          exceptions={exceptions}
        />
        <UpcomingEvents invoices={invoices} accounts={accounts} />
      </div>

      {/* Activity Snapshot */}
      <div>
        <RecentActivityWidget activities={activities} />
      </div>
    </div>
  );
}
