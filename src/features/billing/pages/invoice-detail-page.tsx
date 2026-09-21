/**
 * EnCodency OmniPlatform - Invoice Detail Page
 * Route-level deep inspection of invoice line items, adjustments, allocations and document history.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../data/money";
import { useInvoiceDetail } from "../data/hooks";
import {
  DocumentStateBadge,
  CollectionStateBadge,
  TimingStateBadge,
} from "../components/status-badges";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { InvoiceDocumentModal } from "../components/invoices/invoice-document";
import { VoidInvoiceDialog } from "../components/invoices/void-invoice-dialog";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../data/money";
import { useInvoiceDetail } from "../data/hooks";
import {
  ArrowLeftIcon,
  PrinterIcon,
  Building2Icon,
  CreditCardIcon,
  RotateCcwIcon,
  LayersIcon,
  BanIcon,
  FileCheckIcon,
  ClockIcon,
  AlertCircleIcon,
} from "lucide-react";

interface InvoiceDetailPageProps {
  invoiceId?: string;
}

export function InvoiceDetailPage({ invoiceId: propInvoiceId }: InvoiceDetailPageProps) {
  const router = useRouter();
  const params = useParams();
  const invoiceId = propInvoiceId ?? (params?.invoiceId as string) ?? "";
  const { invoice, relatedAllocations, relatedCreditNotes, voidInvoice } = useInvoiceDetail(invoiceId);

  const [isDocumentOpen, setIsDocumentOpen] = useState<boolean>(false);
  const [isVoidOpen, setIsVoidOpen] = useState<boolean>(false);

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-card rounded-sm border border-border space-y-3">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-muted-foreground">
          <AlertCircleIcon className="size-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Invoice Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested invoice identifier &quot;{invoiceId}&quot; does not exist or has been removed from the platform treasury records.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-sm text-xs border-border">
          <Link href="/super-admin/billing/invoices">
            <ArrowLeftIcon className="size-3.5 mr-1.5" /> Return to Invoices Directory
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
            href="/super-admin/billing/invoices"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" /> Back to Invoices
          </Link>

          <div className="flex items-center gap-1.5">
            <DocumentStateBadge state={invoice.documentState} />
            <CollectionStateBadge state={invoice.collectionState} />
            <TimingStateBadge state={invoice.timingState} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1 border-t border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">
                {invoice.number}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 uppercase font-semibold">
                {invoice.type.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Building2Icon className="size-3.5 text-muted-foreground" />
                <Link
                  href={`/super-admin/billing/accounts/${invoice.billingAccountId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {invoice.companyName}
                </Link>
              </span>
              <span>•</span>
              <span>Issued: {formatDate(invoice.issuedAt)}</span>
              <span>•</span>
              <span>Due: {formatDate(invoice.dueAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDocumentOpen(true)}
              className="h-8 rounded-sm text-xs border-border gap-1.5"
            >
              <PrinterIcon className="size-3.5 text-muted-foreground" />
              <span>Printable Document</span>
            </Button>

            {invoice.documentState !== "void" && invoice.allocatedPaymentsMinor === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVoidOpen(true)}
                className="h-8 rounded-sm text-xs border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
              >
                <BanIcon className="size-3.5" />
                <span>Void Invoice</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Breakdown KPIs (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-stretch">
        <BillingKpiCard
          label="Original Total"
          value={formatMoney(invoice.totalMinor, invoice.currency)}
          hint="Gross invoice amount"
          badge="Issued Total"
          badgeTone="neutral"
        />
        <BillingKpiCard
          label="Adjusted Receivable"
          value={formatMoney(invoice.adjustedReceivableMinor, invoice.currency)}
          hint="Net after credit notes"
          badge="Net Amount"
          badgeTone="info"
        />
        <BillingKpiCard
          label="Allocated Payments"
          value={formatMoney(invoice.allocatedPaymentsMinor, invoice.currency)}
          hint="Applied payment transactions"
          badge="Cash Applied"
          badgeTone="success"
        />
        <BillingKpiCard
          label="Account Credit"
          value={formatMoney(invoice.accountCreditAppliedMinor, invoice.currency)}
          hint="From available ledger"
          badge="Credits Applied"
          badgeTone="info"
        />
        <BillingKpiCard
          label="Outstanding Balance"
          value={formatMoney(invoice.outstandingBalanceMinor, invoice.currency)}
          hint="Remaining balance due"
          badge={invoice.outstandingBalanceMinor > 0 ? "Receivable" : "Cleared"}
          badgeTone={invoice.outstandingBalanceMinor > 0 ? "warning" : "success"}
        />
        <BillingKpiCard
          label="Scheduled Due Date"
          value={formatDate(invoice.dueAt)}
          hint={invoice.timingState === "overdue" ? "Past Due Date" : "Normal cycle"}
          badge={invoice.timingState === "overdue" ? "Overdue" : "On Track"}
          badgeTone={invoice.timingState === "overdue" ? "danger" : "neutral"}
          icon={ClockIcon}
        />
      </div>

      {/* Main Details Layout: Line Items & Document Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">
        {/* Line Items Table */}
        <div className="lg:col-span-2 bg-card rounded-sm border border-border p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
                Invoice Line Items ({invoice.lineItems.length})
              </h2>
              <span className="text-xs text-muted-foreground">Currency: {invoice.currency}</span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/30 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Discount</th>
                    <th className="py-2 px-3 text-right">Tax (%)</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground">{item.description}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatMoney(item.unitPriceMinor, invoice.currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">
                        {item.discountMinor > 0 ? `-${formatMoney(item.discountMinor, invoice.currency)}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{item.taxRatePercent}%</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                        {formatMoney(item.totalMinor, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-4 p-2.5 bg-muted/20 border border-border rounded-sm text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Invoice Memo:</span> {invoice.notes}
            </div>
          )}
        </div>

        {/* Billing & Settlement Summary */}
        <div className="bg-card rounded-sm border border-border p-3 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-border/60">
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Billing Ledger Summary
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reconciled adjustments and applied payments.
            </p>
          </div>

          <div className="space-y-2 text-xs divide-y divide-border/50">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono font-medium text-foreground">{formatMoney(invoice.subtotalMinor, invoice.currency)}</span>
            </div>
            {invoice.discountMinor > 0 && (
              <div className="flex justify-between py-1 text-emerald-700 font-medium">
                <span>Total Discounts:</span>
                <span className="font-mono">-{formatMoney(invoice.discountMinor, invoice.currency)}</span>
              </div>
            )}
            {invoice.taxMinor > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Taxes Applied:</span>
                <span className="font-mono font-medium text-foreground">+{formatMoney(invoice.taxMinor, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 font-bold text-foreground border-t border-border">
              <span>Invoice Total:</span>
              <span className="font-mono text-sm">{formatMoney(invoice.totalMinor, invoice.currency)}</span>
            </div>
            {invoice.totalMinor !== invoice.adjustedReceivableMinor && (
              <div className="flex justify-between py-1 text-amber-700 font-medium">
                <span>Credit Adjustments:</span>
                <span className="font-mono">
                  -{formatMoney(invoice.totalMinor - invoice.adjustedReceivableMinor, invoice.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 text-emerald-700">
              <span>Payments Allocated:</span>
              <span className="font-mono">-{formatMoney(invoice.allocatedPaymentsMinor, invoice.currency)}</span>
            </div>
            {invoice.accountCreditAppliedMinor > 0 && (
              <div className="flex justify-between py-1 text-indigo-700">
                <span>Account Credit:</span>
                <span className="font-mono">-{formatMoney(invoice.accountCreditAppliedMinor, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-extrabold text-foreground border-t-2 border-border bg-slate-50 px-2 rounded-sm text-sm">
              <span>Remaining Due:</span>
              <span className="font-mono text-amber-900">
                {formatMoney(invoice.outstandingBalanceMinor, invoice.currency)}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">Billing Entity</div>
            <div>{invoice.issuerLegalName}</div>
            <div className="font-mono text-slate-600">GSTIN: {invoice.issuerTaxId}</div>
          </div>
        </div>
      </div>

      {/* Allocations & Adjustments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {/* Payment Allocations */}
        <div className="bg-card rounded-sm border border-border p-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <CreditCardIcon className="size-4 text-emerald-600" />
              <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
                Payment Allocations ({relatedAllocations.length})
              </h2>
            </div>
          </div>

          <div className="mt-2 divide-y divide-border/60 text-xs">
            {relatedAllocations.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No payment allocations have been applied to this invoice yet.
              </div>
            ) : (
              relatedAllocations.map((alloc) => (
                <div key={alloc.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-semibold text-foreground">
                      <Link href={`/super-admin/billing/payments/${alloc.paymentId}`} className="hover:underline">
                        {alloc.paymentReference}
                      </Link>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {alloc.provider} • {alloc.method} • {formatDate(alloc.allocatedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-700">
                      {formatMoney(alloc.amountMinor, alloc.currency)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">{alloc.allocatedBy}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Credit Notes & Adjustments */}
        <div className="bg-card rounded-sm border border-border p-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <RotateCcwIcon className="size-4 text-blue-600" />
              <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
                Credit Notes & Adjustments ({relatedCreditNotes.length})
              </h2>
            </div>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-sm border-border">
              <Link href="/super-admin/billing/credits-refunds">Credits Directory</Link>
            </Button>
          </div>

          <div className="mt-2 divide-y divide-border/60 text-xs">
            {relatedCreditNotes.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No credit notes or concession adjustments issued against this invoice.
              </div>
            ) : (
              relatedCreditNotes.map((cn) => (
                <div key={cn.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-semibold text-foreground">{cn.number}</div>
                    <div className="text-muted-foreground text-[11px]">{cn.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-blue-700">
                      -{formatMoney(cn.amountMinor, cn.currency)}
                    </div>
                    <div className="text-muted-foreground text-[11px] capitalize">{cn.status.replace(/_/g, " ")}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      <InvoiceDocumentModal
        invoice={invoice}
        isOpen={isDocumentOpen}
        onClose={() => setIsDocumentOpen(false)}
      />

      {/* Void Dialog */}
      <VoidInvoiceDialog
        invoice={invoice}
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirmVoid={voidInvoice}
      />
    </div>
  );
}
