"use client";

import { FileText, Download } from "lucide-react";
import { useBilling } from "../../store/billing-store";
import { FlowShell } from "../flow-shell";
import { Badge, Button } from "../ui";
import { useBillingActions } from "../use-billing-actions";
import { INVOICE_STATUS_META } from "../../billing-data/config";

export function InvoiceFlow() {
  const { flow, snapshot, closeFlow } = useBilling();
  const { downloadInvoice, downloadReceipt } = useBillingActions();

  const open = flow?.kind === "invoice";
  const invoiceId = open ? flow.invoiceId : null;
  const invoice = snapshot?.invoices.find((i) => i.id === invoiceId);

  if (!open || !invoice) return null;

  const tone = INVOICE_STATUS_META[invoice.status].tone;

  return (
    <FlowShell
      open={open}
      onOpenChange={(v) => !v && closeFlow()}
      title={
        <div className="flex items-center gap-2">
          Invoice {invoice.number}
          <Badge
            className="ml-2"
            tone={tone}
          >
            {INVOICE_STATUS_META[invoice.status].label}
          </Badge>
        </div>
      }
      description={`Issued on ${new Date(invoice.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
      icon={FileText}
      width={640}
    >
      <div className="flex flex-col">
        <div className="p-6">
          <div className="rounded-md border border-[#DCE2EA] bg-white text-[13px]">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b border-[#DCE2EA]">Description</th>
                  <th className="px-4 py-3 border-b border-[#DCE2EA] text-right">Qty</th>
                  <th className="px-4 py-3 border-b border-[#DCE2EA] text-right">Unit Price</th>
                  <th className="px-4 py-3 border-b border-[#DCE2EA] text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F5]">
                {invoice.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-[#0F1B3D]">
                      {line.description}
                      <span className="block text-[11px] font-normal text-[#6B7890]">{line.kind.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#3C4A66]">{line.quantity}</td>
                    <td className="px-4 py-3 text-right text-[#3C4A66]">
                      ₹{line.unitAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#0F1B3D]">
                      ₹{line.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t border-[#DCE2EA] bg-[#F8FAFC] p-4 text-[13px]">
              <div className="flex justify-between py-1">
                <span className="text-[#6B7890]">Subtotal</span>
                <span className="font-medium text-[#0F1B3D]">₹{invoice.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6B7890]">GST ({(invoice.taxRate * 100).toFixed(0)}%)</span>
                <span className="font-medium text-[#0F1B3D]">₹{invoice.tax.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#DCE2EA] pt-2 text-[15px] font-semibold">
                <span className="text-[#0F1B3D]">Total</span>
                <span className="text-[#0F1B3D]">₹{invoice.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-md bg-[#F3F5F9] p-4 text-[12px] text-[#3C4A66]">
            {invoice.paymentMethodLabel && (
              <p>
                <strong>Payment Method:</strong> {invoice.paymentMethodLabel}
              </p>
            )}
            {invoice.paidAt && (
              <p>
                <strong>Paid On:</strong> {new Date(invoice.paidAt).toLocaleDateString("en-IN")}
              </p>
            )}
            {invoice.transactionId && (
              <p>
                <strong>Transaction ID:</strong> {invoice.transactionId}
              </p>
            )}
            {invoice.note && (
              <p className="mt-2 text-[#6B7890]">
                <strong>Note:</strong> {invoice.note}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#EEF1F5] p-4 bg-[#F8FAFC]">
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={closeFlow}>
            Close
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => downloadInvoice(invoice)}
            className="gap-2"
          >
            <Download className="size-3.5" /> Download Invoice
          </Button>
          {invoice.status === "paid" && (
            <Button 
              type="button" 
              variant="primary" 
              onClick={() => downloadReceipt(invoice)}
              className="gap-2"
            >
              <Download className="size-3.5" /> Download Receipt
            </Button>
          )}
        </div>
      </div>
    </FlowShell>
  );
}
