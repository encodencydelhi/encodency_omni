"use client";

import { ArrowDownRight, ArrowUpRight, CreditCard, FileDown, Receipt, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LINE_KIND_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { dateTime, hasReceipt, invoicePeriod, longDate, money, shortDate } from "../../billing-data/selectors";
import { useBilling } from "../../store/billing-store";
import { useBillingActions } from "../use-billing-actions";
import { FlowShell } from "../flow-shell";
import { Button, InvoiceChip, PaymentChip } from "../ui";

export function InvoiceDetailSheet({ invoiceId }: { invoiceId: string }) {
  const { snapshot } = useBillingView();
  const { closeFlow, gates, openFlow } = useBilling();
  const { downloadInvoice, downloadReceipt } = useBillingActions();
  const invoice = snapshot.invoices.find((item) => item.id === invoiceId);

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      variant="sheet"
      width={480}
      icon={ReceiptText}
      title={invoice ? invoice.number : "Invoice"}
      description={invoice ? `${invoicePeriod(invoice)} billing period` : undefined}
      footer={
        invoice && (
          <>
            {(invoice.status === "failed" || invoice.status === "pending") && (
              <Button variant="primary" icon={CreditCard} gate={gates?.managePayment} onClick={() => openFlow({ kind: "pay", invoiceId: invoice.id })}>
                Pay now
              </Button>
            )}
            <Button variant="secondary" icon={Receipt} gate={gates?.downloadInvoices} disabled={!hasReceipt(invoice)} disabledReason="A receipt is issued once the invoice is paid." onClick={() => downloadReceipt(invoice)}>
              Download receipt
            </Button>
            <Button variant="primary" icon={FileDown} gate={gates?.downloadInvoices} onClick={() => downloadInvoice(invoice)}>
              Download invoice
            </Button>
          </>
        )
      }
    >
      {!invoice ? (
        <p className="text-[12.5px] text-[#6B7890]">This invoice is unavailable. It may have been on a subscription that has since changed.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-[8px] border border-[#E4E9F0] p-3.5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
              <div>
                <dt className="text-[11px] text-[#6B7890]">Invoice ID</dt>
                <dd className="font-semibold text-[#0F1B3D]">{invoice.number}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7890]">Status</dt>
                <dd><InvoiceChip status={invoice.status} /></dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7890]">Issue date</dt>
                <dd className="font-medium text-[#0F1B3D]">{shortDate(invoice.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7890]">Due date</dt>
                <dd className="font-medium text-[#0F1B3D]">{shortDate(invoice.dueAt)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Line items</p>
            <div className="overflow-hidden rounded-[8px] border border-[#E4E9F0]">
              {invoice.lines.map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-3 border-b border-[#EEF1F5] px-3 py-2 text-[12.5px] last:border-0">
                  <div className="min-w-0">
                    <p className="text-[#24324F]">{line.description}</p>
                    <p className="text-[11px] text-[#98A2B3]">{LINE_KIND_LABEL[line.kind]}{line.quantity !== 1 ? ` · ×${line.quantity}` : ""}</p>
                  </div>
                  <span className={cn("shrink-0 tabular-nums", line.amount < 0 ? "text-[#067647]" : "text-[#0F1B3D]")}>{money(line.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-b border-[#EEF1F5] px-3 py-2 text-[12.5px] text-[#3C4A66]">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-[#EEF1F5] px-3 py-2 text-[12.5px] text-[#3C4A66]">
                <span>GST ({Math.round(invoice.taxRate * 100)}%)</span>
                <span className="tabular-nums">{money(invoice.tax)}</span>
              </div>
              <div className="flex justify-between gap-3 bg-[#F8FAFC] px-3 py-2.5 text-[14px] font-semibold text-[#0F1B3D]">
                <span>Total</span>
                <span className="tabular-nums">{money(invoice.total)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Payment</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[8px] border border-[#E4E9F0] p-3.5 text-[12.5px]">
              <div>
                <dt className="text-[11px] text-[#6B7890]">Paid date</dt>
                <dd className="font-medium text-[#0F1B3D]">{invoice.paidAt ? shortDate(invoice.paidAt) : "Not paid"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7890]">Method</dt>
                <dd className="font-medium text-[#0F1B3D]">{invoice.paymentMethodLabel ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] text-[#6B7890]">Transaction ID</dt>
                <dd className="break-all font-mono text-[11.5px] text-[#0F1B3D]">{invoice.transactionId ?? "—"}</dd>
              </div>
              {invoice.refundedAt && (
                <div className="col-span-2">
                  <dt className="text-[11px] text-[#6B7890]">Refunded</dt>
                  <dd className="font-medium text-[#0F1B3D]">{longDate(invoice.refundedAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {invoice.note && <p className="rounded-sm bg-[#F8FAFC] px-3 py-2 text-[12px] leading-4 text-[#6B7890]">{invoice.note}</p>}
        </div>
      )}
    </FlowShell>
  );
}

export function PaymentDetailSheet({ paymentId }: { paymentId: string }) {
  const { snapshot } = useBillingView();
  const { closeFlow, openFlow } = useBilling();
  const payment = snapshot.payments.find((item) => item.id === paymentId);
  const invoice = payment?.invoiceId ? snapshot.invoices.find((item) => item.id === payment.invoiceId) : null;
  const Icon = payment && payment.amount < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={440}
      icon={ReceiptText}
      title="Payment details"
      footer={
        <>
          {invoice && (
            <Button variant="secondary" onClick={() => openFlow({ kind: "invoice", invoiceId: invoice.id })}>
              Open invoice
            </Button>
          )}
          <Button variant="primary" onClick={closeFlow}>Close</Button>
        </>
      }
    >
      {!payment ? (
        <p className="text-[12.5px] text-[#6B7890]">This payment is no longer available.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-[8px] border border-[#E4E9F0] p-3.5">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", payment.amount < 0 ? "bg-[#F4F0FF] text-[#6D28D9]" : "bg-[#EFF4FF] text-[#1D4ED8]")}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-[18px] font-semibold tabular-nums text-[#0F1B3D]">{money(payment.amount)}</p>
              <p className="text-[12px] text-[#6B7890]">{dateTime(payment.date)}</p>
            </div>
            <PaymentChip status={payment.status} />
          </div>
          <dl className="text-[12.5px]">
            {[
              ["Description", payment.description],
              ["Reference", payment.reference],
              ["Method", payment.methodLabel],
              ["Invoice", invoice?.number ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-[#EEF1F5] py-2 last:border-0">
                <dt className="text-[#6B7890]">{label}</dt>
                <dd className="text-right font-medium text-[#0F1B3D]">{value}</dd>
              </div>
            ))}
          </dl>
          {payment.failureReason && <p className="rounded-sm bg-[#FEF6F7] px-3 py-2 text-[12px] text-[#C81E2B]">{payment.failureReason}</p>}
        </div>
      )}
    </FlowShell>
  );
}
