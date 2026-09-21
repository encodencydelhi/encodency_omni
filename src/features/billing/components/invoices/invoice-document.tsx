/**
 * EnCodency OmniPlatform - Printable Demo Invoice Document
 * Structured financial document layout with Issuer, Bill-To, Line Items, and Print trigger.
 */

"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import type { Invoice } from "../../data/types";
import { PrinterIcon, DownloadIcon } from "lucide-react";
import { exportToCsv } from "../../data/export";

interface InvoiceDocumentModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDocumentModal({
  invoice,
  isOpen,
  onClose,
}: InvoiceDocumentModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ["Item", "Description", "Quantity", "Unit Price", "Discount", "Tax %", "Line Total"];
    const rows = invoice.lineItems.map((li, idx) => [
      idx + 1,
      li.description,
      li.quantity,
      formatMoney(li.unitPriceMinor, invoice.currency),
      formatMoney(li.discountMinor, invoice.currency),
      `${li.taxRatePercent}%`,
      formatMoney(li.totalMinor, invoice.currency),
    ]);
    exportToCsv(`invoice-${invoice.number}-details`, headers, rows);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden rounded-sm bg-white text-slate-900 border-border">
        {/* Controls Toolbar (Hidden during print) */}
        <div className="p-3 pr-12 bg-slate-100 border-b border-border flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-700">
              DOCUMENT PREVIEW: {invoice.number}
            </span>
            <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold">
              SIMULATED DEMO RECORD
            </span>
          </div>

          <div className="flex items-center gap-2 mr-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-sm text-xs border-slate-300 text-slate-700 hover:bg-slate-200"
              onClick={handleExportCsv}
            >
              <DownloadIcon className="size-3.5 mr-1" />
              Download CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
              onClick={handlePrint}
            >
              <PrinterIcon className="size-3.5 mr-1" />
              Print Invoice
            </Button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[80vh] scrollbar-thin">
          {/* Header & Logo */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-sm bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
                  EO
                </div>
                <div className="text-xl font-extrabold tracking-tight text-slate-900">
                  EnCodency OmniPlatform
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Enterprise Multi-tenant SaaS Marketing & Operations Platform
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900">
                INVOICE
              </div>
              <div className="font-mono text-xs font-bold text-slate-600 mt-0.5">
                {invoice.number}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Issued: <span className="font-medium text-slate-800">{formatDate(invoice.issuedAt)}</span>
              </div>
              <div className="text-xs text-slate-500">
                Due: <span className="font-medium text-slate-800">{formatDate(invoice.dueAt)}</span>
              </div>
            </div>
          </div>

          {/* Issuer and Recipient Info */}
          <div className="grid grid-cols-2 gap-8 text-xs leading-relaxed">
            <div>
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                ISSUED BY:
              </div>
              <div className="font-semibold text-slate-800">{invoice.issuerLegalName}</div>
              <div className="text-slate-600">{invoice.issuerAddress.line1}</div>
              <div className="text-slate-600">
                {invoice.issuerAddress.city}, {invoice.issuerAddress.state} {invoice.issuerAddress.postalCode}
              </div>
              <div className="text-slate-600">{invoice.issuerAddress.country}</div>
              <div className="text-slate-700 font-mono mt-1">
                GSTIN/Tax ID: <span className="font-semibold">{invoice.issuerTaxId}</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                BILLED TO:
              </div>
              <div className="font-semibold text-slate-800">{invoice.companyName}</div>
              <div className="text-slate-600">{invoice.billingAddress.line1}</div>
              {invoice.billingAddress.line2 && (
                <div className="text-slate-600">{invoice.billingAddress.line2}</div>
              )}
              <div className="text-slate-600">
                {invoice.billingAddress.city}, {invoice.billingAddress.state} {invoice.billingAddress.postalCode}
              </div>
              <div className="text-slate-600">{invoice.billingAddress.country}</div>
              {invoice.clientTaxId && (
                <div className="text-slate-700 font-mono mt-1">
                  Tax Identifier: <span className="font-semibold">{invoice.clientTaxId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatMoney(item.unitPriceMinor, invoice.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{item.taxRatePercent}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatMoney(item.totalMinor, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end text-xs">
            <div className="w-72 space-y-1.5 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatMoney(invoice.subtotalMinor, invoice.currency)}</span>
              </div>
              {invoice.discountMinor > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discounts Applied:</span>
                  <span className="font-mono">-{formatMoney(invoice.discountMinor, invoice.currency)}</span>
                </div>
              )}
              {invoice.taxMinor > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxes:</span>
                  <span className="font-mono">+{formatMoney(invoice.taxMinor, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-300 pt-1.5 text-sm">
                <span>Invoice Total:</span>
                <span className="font-mono">{formatMoney(invoice.totalMinor, invoice.currency)}</span>
              </div>
              {invoice.allocatedPaymentsMinor > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Allocated Payments:</span>
                  <span className="font-mono">-{formatMoney(invoice.allocatedPaymentsMinor, invoice.currency)}</span>
                </div>
              )}
              {invoice.accountCreditAppliedMinor > 0 && (
                <div className="flex justify-between text-indigo-700">
                  <span>Account Credit Applied:</span>
                  <span className="font-mono">-{formatMoney(invoice.accountCreditAppliedMinor, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-extrabold border-t-2 border-slate-900 pt-1.5 text-sm bg-slate-50 px-2 py-1 rounded-sm">
                <span>Balance Due:</span>
                <span className="font-mono text-amber-900">
                  {formatMoney(invoice.outstandingBalanceMinor, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 leading-relaxed text-center">
            <p className="font-semibold text-slate-700">
              SIMULATED DEMO DOCUMENT — ENCODENCY OMNIPLATFORM FINANCIAL GOVERNANCE
            </p>
            <p className="mt-0.5">
              This document was generated for demonstration, testing, and operational reconciliation inside EnCodency OmniPlatform.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
