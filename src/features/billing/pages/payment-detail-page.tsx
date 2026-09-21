/**
 * EnCodency OmniPlatform - Payment Detail Page
 * Detailed inspection of gateway transaction, settlements, invoice allocations, and refunds.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { formatMoney } from "../data/money";
import { usePaymentDetail } from "../data/hooks";
import {
  PaymentAttemptBadge,
  SettlementBadge,
  AllocationBadge,
  RefundStatusBadge,
} from "../components/status-badges";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { PaymentAllocationDrawer } from "../components/payments/payment-allocation-drawer";
import {
  ArrowLeftIcon,
  Building2Icon,
  SplitIcon,
  RotateCcwIcon,
  ScaleIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
} from "lucide-react";

import { useParams } from "next/navigation";

interface PaymentDetailPageProps {
  paymentId?: string;
}

export function PaymentDetailPage({ paymentId: propPaymentId }: PaymentDetailPageProps) {
  const params = useParams();
  const paymentId = propPaymentId ?? (params?.paymentId as string) ?? "";
  const { payment, relatedRefunds } = usePaymentDetail(paymentId);
  const [isAllocationOpen, setIsAllocationOpen] = useState<boolean>(false);

  if (!payment) {
    return (
      <div className="p-8 text-center bg-card rounded-sm border border-border space-y-3">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-muted-foreground">
          <AlertCircleIcon className="size-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Payment Transaction Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested payment reference &quot;{paymentId}&quot; does not exist in the platform treasury records.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-sm text-xs border-border">
          <Link href="/super-admin/billing/payments">
            <ArrowLeftIcon className="size-3.5 mr-1.5" /> Return to Payments Directory
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Top Navigation & Status Header */}
      <div className="bg-card rounded-sm border border-border p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/super-admin/billing/payments"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" /> Back to Payments
          </Link>

          <div className="flex items-center gap-1.5">
            <PaymentAttemptBadge status={payment.attemptStatus} />
            <SettlementBadge status={payment.settlementStatus} />
            <AllocationBadge status={payment.allocationStatus} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1 border-t border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">
                {payment.reference}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 uppercase font-semibold">
                {payment.provider}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Building2Icon className="size-3.5 text-muted-foreground" />
                <Link
                  href={`/super-admin/billing/accounts/${payment.billingAccountId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {payment.companyName}
                </Link>
              </span>
              <span>•</span>
              <span>Attempted: {formatDateTime(payment.createdAt)}</span>
              {payment.settledAt && (
                <>
                  <span>•</span>
                  <span>Settled: {formatDate(payment.settledAt)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {payment.unallocatedBalanceMinor > 0 && payment.attemptStatus === "succeeded" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAllocationOpen(true)}
                className="h-8 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
              >
                <SplitIcon className="size-3.5" />
                <span>Allocate Funds ({formatMoney(payment.unallocatedBalanceMinor, payment.currency)})</span>
              </Button>
            )}

            <Button asChild variant="outline" size="sm" className="h-8 rounded-sm text-xs border-border">
              <Link href={`/super-admin/billing/accounts/${payment.billingAccountId}`}>
                Company Billing Account
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Financial KPIs (gap-2, rounded-sm, equal-height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-stretch">
        <BillingKpiCard
          label="Gross Payment"
          value={formatMoney(payment.grossAmountMinor, payment.currency)}
          hint="Total transaction amount"
          badge="Gross"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="Gateway Fee"
          value={formatMoney(payment.feeMinor, payment.currency)}
          hint="Provider processing charge"
          badge="Fee"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="Net Settlement"
          value={formatMoney(payment.netAmountMinor, payment.currency)}
          hint="Net credited to treasury"
          badge="Net Cash"
          badgeTone="success"
        />
        <BillingKpiCard
          label="Allocated to Invoices"
          value={formatMoney(payment.allocatedAmountMinor, payment.currency)}
          hint="Applied to open balances"
          badge="Applied"
          badgeTone="info"
        />
        <BillingKpiCard
          label="Unallocated Balance"
          value={formatMoney(payment.unallocatedBalanceMinor, payment.currency)}
          hint="Funds available for invoices"
          badge={payment.unallocatedBalanceMinor > 0 ? "Available" : "Exhausted"}
          badgeTone={payment.unallocatedBalanceMinor > 0 ? "warning" : "success"}
        />
        <BillingKpiCard
          label="Settlement State"
          value={payment.settlementStatus.toUpperCase()}
          hint={payment.settledAt ? `Settled on ${formatDate(payment.settledAt)}` : "Pending bank transfer"}
          badge={payment.settlementStatus}
          badgeTone={payment.settlementStatus === "settled" ? "success" : "warning"}
          icon={CheckCircle2Icon}
        />
      </div>

      {/* Main Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">
        {/* Applied Invoice Allocations Table */}
        <div className="lg:col-span-2 bg-card rounded-sm border border-border p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
                Invoice Allocations ({payment.allocations.length})
              </h2>
              <span className="text-xs text-muted-foreground">Currency: {payment.currency}</span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/30 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Invoice Number</th>
                    <th className="py-2 px-3">Allocation Date</th>
                    <th className="py-2 px-3">Allocated By</th>
                    <th className="py-2 px-3 text-right">Allocated Amount</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payment.allocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No invoice allocations have been applied from this payment yet.
                      </td>
                    </tr>
                  ) : (
                    payment.allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-mono font-semibold text-foreground">
                          <Link href={`/super-admin/billing/invoices/${alloc.invoiceId}`} className="text-blue-600 hover:underline">
                            {alloc.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(alloc.allocatedAt)}</td>
                        <td className="py-2 px-3 text-muted-foreground">{alloc.allocatedBy}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatMoney(alloc.amountMinor, payment.currency)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button asChild variant="outline" size="sm" className="h-6 text-[11px] rounded-sm px-2 border-border">
                            <Link href={`/super-admin/billing/invoices/${alloc.invoiceId}`}>Open Invoice</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {payment.unallocatedBalanceMinor > 0 && (
            <div className="mt-4 p-3 bg-blue-50/50 border border-blue-200 rounded-sm flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-blue-950">
                  {formatMoney(payment.unallocatedBalanceMinor, payment.currency)}
                </span>{" "}
                in settled funds remains unallocated.
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAllocationOpen(true)}
                className="h-7 text-xs rounded-sm bg-blue-600 text-white hover:bg-blue-700"
              >
                <SplitIcon className="size-3 mr-1" /> Allocate Now
              </Button>
            </div>
          )}
        </div>

        {/* Transaction Telemetry Panel */}
        <div className="bg-card rounded-sm border border-border p-3 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-border/60">
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Transaction Telemetry
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Provider gateway metadata and settlement logs.
            </p>
          </div>

          <div className="space-y-2 text-xs divide-y divide-border/50">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-semibold text-foreground">{payment.provider}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-medium text-foreground">{payment.method}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Gateway Ref:</span>
              <span className="font-mono text-foreground">{payment.providerReference ?? "Direct Wire Record"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Reconciliation:</span>
              <span className="font-medium capitalize text-foreground">{payment.reconciliationStatus.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Gross Amount:</span>
              <span className="font-mono font-bold text-foreground">{formatMoney(payment.grossAmountMinor, payment.currency)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Provider Fee:</span>
              <span className="font-mono text-muted-foreground">{formatMoney(payment.feeMinor, payment.currency)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-foreground border-t border-border">
              <span>Net Settlement:</span>
              <span className="font-mono text-emerald-700">{formatMoney(payment.netAmountMinor, payment.currency)}</span>
            </div>
          </div>

          {payment.failureReason && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-800">
              <span className="font-semibold">Failure Notice:</span> {payment.failureReason}
            </div>
          )}
        </div>
      </div>

      {/* Related Refunds Section */}
      <div className="bg-card rounded-sm border border-border p-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <RotateCcwIcon className="size-4 text-blue-600" />
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Related Refund Operations ({relatedRefunds.length})
            </h2>
          </div>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-sm border-border">
            <Link href="/super-admin/billing/credits-refunds?tab=refunds">Refunds Directory</Link>
          </Button>
        </div>

        <div className="mt-2 divide-y divide-border/60 text-xs">
          {relatedRefunds.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No refund requests or returns recorded against this payment.
            </div>
          ) : (
            relatedRefunds.map((rfd) => (
              <div key={rfd.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono font-semibold text-foreground flex items-center gap-2">
                    <span>{rfd.reference}</span>
                    <RefundStatusBadge status={rfd.status} />
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    Reason: {rfd.reason} • Requested by {rfd.requestedBy}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-rose-600">
                    -{formatMoney(rfd.requestedAmountMinor, rfd.currency)}
                  </div>
                  <div className="text-muted-foreground text-[11px]">{formatDate(rfd.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Allocation Drawer */}
      <PaymentAllocationDrawer
        payment={payment}
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
      />
    </div>
  );
}
