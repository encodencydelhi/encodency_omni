"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileDown, FileText, History, MoreHorizontal, Receipt, ReceiptText, SearchX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { INVOICE_STATUS_META } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { dateTime, downloadFile, filterInvoices, hasReceipt, invoicePeriod, money, shortDate, toCsv, type InvoiceFilter } from "../../billing-data/selectors";
import type { Invoice, Payment } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { useBillingActions } from "../use-billing-actions";
import {
  ActionMenu,
  Button,
  EmptyState,
  InvoiceChip,
  Pagination,
  PaymentChip,
  SearchField,
  Section,
  SectionHeader,
  SelectMenu,
  Skeleton,
  buttonClass,
  numClass,
  tdClass,
  thClass,
  useDebounced,
  x,
  type MenuItem,
} from "../ui";

const INVOICE_PAGE = 8;
const PAYMENT_PAGE = 6;

function useInvoiceMenu() {
  const { gates, openFlow } = useBilling();
  const { downloadInvoice, downloadReceipt } = useBillingActions();
  return (invoice: Invoice): MenuItem[] => [
    { label: "View invoice", icon: Eye, onSelect: () => openFlow({ kind: "invoice", invoiceId: invoice.id }) },
    { label: "Download invoice", icon: FileDown, onSelect: () => downloadInvoice(invoice), gate: gates?.downloadInvoices },
    {
      label: "Download receipt",
      icon: Receipt,
      onSelect: () => downloadReceipt(invoice),
      gate: gates?.downloadInvoices,
      disabledReason: hasReceipt(invoice) ? undefined : invoice.status === "voided" ? "Voided invoices have no receipt." : "A receipt is issued once the invoice is paid.",
    },
  ];
}

export function InvoicesCard() {
  const { snapshot } = useBillingView();
  const { gates, openFlow } = useBilling();
  const menu = useInvoiceMenu();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvoiceFilter>("all");
  const [page, setPage] = useState(1);
  const search = useDebounced(query, 200);
  const invoices = snapshot.invoices;
  const filtered = useMemo(() => filterInvoices(invoices, status, search.value), [invoices, status, search.value]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / INVOICE_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * INVOICE_PAGE, current * INVOICE_PAGE);

  const exportCsv = () => {
    const csv = toCsv(
      filtered.map((invoice) => ({
        invoice: invoice.number,
        period: invoicePeriod(invoice),
        issued: shortDate(invoice.issuedAt),
        subtotal: invoice.subtotal.toFixed(2),
        tax: invoice.tax.toFixed(2),
        total: invoice.total.toFixed(2),
        status: INVOICE_STATUS_META[invoice.status].label,
        payment_method: invoice.paymentMethodLabel ?? "",
        transaction_id: invoice.transactionId ?? "",
      })),
    );
    downloadFile(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    toast.success(`${filtered.length} invoice${filtered.length === 1 ? "" : "s"} exported`);
  };

  const statusOptions = [
    { value: "all" as const, label: "All statuses" },
    ...(Object.keys(INVOICE_STATUS_META) as (keyof typeof INVOICE_STATUS_META)[]).map((key) => ({
      value: key,
      label: `${INVOICE_STATUS_META[key].label} (${invoices.filter((invoice) => invoice.status === key).length})`,
    })),
  ];

  return (
    <Section id="invoices">
      <SectionHeader
        id="invoices"
        icon={FileText}
        title="Invoices"
        description={invoices.length ? `${invoices.length} invoices · GST at ${Math.round(snapshot.taxRate * 100)}%` : "Issued each billing period and for one-off purchases"}
        actions={
          invoices.length > 0 && (
            <>
              <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search invoices" loading={search.pending} className="w-full min-w-0 sm:w-[200px]" />
              <SelectMenu label="Invoice status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} align="end" className="min-w-[140px]" />
              <Button size="sm" variant="secondary" icon={Download} onClick={exportCsv} disabled={!filtered.length} disabledReason="Nothing to export with these filters." gate={gates?.downloadInvoices}>
                Export CSV
              </Button>
            </>
          )
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          compact
          icon={ReceiptText}
          title="No invoices yet"
          description={
            snapshot.subscription.trialEndsAt
              ? `Your first invoice is issued when the trial ends on ${shortDate(snapshot.subscription.trialEndsAt)}.`
              : "Invoices appear here after your first payment."
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={SearchX}
          title="No invoices match"
          description="Try a different invoice number, or clear the filters."
          action={
            <Button size="sm" variant="secondary" onClick={() => { setQuery(""); setStatus("all"); setPage(1); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="scrollbar-thin hidden overflow-x-auto border-t border-[#EEF1F5] lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={thClass}>Invoice ID</th>
                  <th scope="col" className={thClass}>Billing period</th>
                  <th scope="col" className={thClass}>Date</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Subtotal</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Tax</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Total</th>
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={cn(thClass, "max-xl:hidden")}>Payment method</th>
                  <th scope="col" className={cn(thClass, "w-px text-right")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-[#FAFBFD]">
                    <td className={tdClass}>
                      <button type="button" onClick={() => openFlow({ kind: "invoice", invoiceId: invoice.id })} className={cn("rounded font-semibold tabular-nums text-[#0F1B3D] hover:text-[#2563EB] hover:underline", x.focus)}>
                        {invoice.number}
                      </button>
                    </td>
                    <td className={cn(tdClass, "whitespace-nowrap")}>{invoicePeriod(invoice)}</td>
                    <td className={cn(tdClass, "whitespace-nowrap")}>{shortDate(invoice.issuedAt)}</td>
                    <td className={cn(tdClass, numClass)}>{money(invoice.subtotal)}</td>
                    <td className={cn(tdClass, numClass, "text-[#6B7890]")}>{money(invoice.tax)}</td>
                    <td className={cn(tdClass, numClass, "font-semibold text-[#0F1B3D]")}>{money(invoice.total)}</td>
                    <td className={tdClass}>
                      <InvoiceChip status={invoice.status} />
                    </td>
                    <td className={cn(tdClass, "whitespace-nowrap max-xl:hidden")}>{invoice.paymentMethodLabel ?? <span className="text-[#98A2B3]">—</span>}</td>
                    <td className={cn(tdClass, "whitespace-nowrap text-right")}>
                      <span className="inline-flex items-center gap-0.5">
                        <Button size="xs" variant="ghost" onClick={() => openFlow({ kind: "invoice", invoiceId: invoice.id })}>
                          View
                        </Button>
                        <RowMenu label={`More actions for ${invoice.number}`} items={menu(invoice)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5] lg:hidden">
            {rows.map((invoice) => (
              <li key={invoice.id} className="flex items-start gap-3 px-4 py-3">
                <button type="button" onClick={() => openFlow({ kind: "invoice", invoiceId: invoice.id })} className={cn("min-w-0 flex-1 rounded text-left", x.focus)}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{invoice.number}</span>
                    <InvoiceChip status={invoice.status} />
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#6B7890]">
                    {invoicePeriod(invoice)} · issued {shortDate(invoice.issuedAt)}
                  </span>
                  <span className="mt-0.5 block text-[12px] tabular-nums text-[#6B7890]">
                    {money(invoice.subtotal)} + {money(invoice.tax)} GST
                  </span>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[13px] font-semibold tabular-nums text-[#0F1B3D]">{money(invoice.total)}</span>
                  <RowMenu label={`Actions for ${invoice.number}`} items={menu(invoice)} />
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#EEF1F5]">
            <Pagination page={current} pageCount={pageCount} total={filtered.length} pageSize={INVOICE_PAGE} onPage={setPage} noun="invoices" />
          </div>
        </>
      )}
    </Section>
  );
}

function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  return (
    <ActionMenu
      label={label}
      width={200}
      trigger={
        <button type="button" className={buttonClass("ghost", "iconSm")} aria-label={label}>
          <MoreHorizontal className="size-4" />
        </button>
      }
      items={items}
    />
  );
}

export function PaymentHistoryCard() {
  const { snapshot } = useBillingView();
  const { openFlow } = useBilling();
  const [page, setPage] = useState(1);
  const payments = snapshot.payments;
  const pageCount = Math.max(1, Math.ceil(payments.length / PAYMENT_PAGE));
  const current = Math.min(page, pageCount);
  const rows = payments.slice((current - 1) * PAYMENT_PAGE, current * PAYMENT_PAGE);
  const invoiceFor = (payment: Payment) => snapshot.invoices.find((invoice) => invoice.id === payment.invoiceId) ?? null;

  const menu = (payment: Payment): MenuItem[] => {
    const invoice = invoiceFor(payment);
    return [
      { label: "View details", icon: Eye, onSelect: () => openFlow({ kind: "payment_detail", paymentId: payment.id }) },
      { label: "Open invoice", icon: FileText, onSelect: () => invoice && openFlow({ kind: "invoice", invoiceId: invoice.id }), disabledReason: invoice ? undefined : "This payment has no invoice." },
    ];
  };

  return (
    <Section id="payment-history">
      <SectionHeader id="payment-history" icon={History} title="Payment history" description={payments.length ? `${payments.length} transactions, newest first` : "Charges, refunds and failed attempts"} />
      {payments.length === 0 ? (
        <EmptyState compact icon={History} title="No payment history" description="Charges, refunds and failed attempts will be listed here once billing starts." />
      ) : (
        <>
          <div className="scrollbar-thin hidden overflow-x-auto border-t border-[#EEF1F5] md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={thClass}>Date</th>
                  <th scope="col" className={thClass}>Reference</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Amount</th>
                  <th scope="col" className={cn(thClass, "max-lg:hidden")}>Payment method</th>
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={thClass}>Invoice</th>
                  <th scope="col" className={cn(thClass, "w-px")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => {
                  const invoice = invoiceFor(payment);
                  return (
                    <tr key={payment.id} className="transition-colors hover:bg-[#FAFBFD]">
                      <td className={cn(tdClass, "whitespace-nowrap")}>{dateTime(payment.date)}</td>
                      <td className={cn(tdClass, "max-w-[220px]")}>
                        <span className="block truncate font-mono text-[11.5px] text-[#3C4A66]" title={payment.reference}>
                          {payment.reference}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#6B7890]" title={payment.description}>
                          {payment.description}
                        </span>
                      </td>
                      <td className={cn(tdClass, numClass, "font-semibold", payment.amount < 0 ? "text-[#6D28D9]" : "text-[#0F1B3D]", payment.status === "failed" && "text-[#98A2B3] line-through decoration-[#C9D1DC]")}>
                        {money(payment.amount)}
                      </td>
                      <td className={cn(tdClass, "whitespace-nowrap max-lg:hidden")}>{payment.methodLabel}</td>
                      <td className={tdClass}>
                        <PaymentChip status={payment.status} />
                      </td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>
                        {invoice ? (
                          <button type="button" onClick={() => openFlow({ kind: "invoice", invoiceId: invoice.id })} className={cn("rounded font-medium tabular-nums text-[#2563EB] hover:underline", x.focus)}>
                            {invoice.number}
                          </button>
                        ) : (
                          <span className="text-[#98A2B3]">—</span>
                        )}
                      </td>
                      <td className={cn(tdClass, "whitespace-nowrap text-right")}>
                        <span className="inline-flex items-center gap-0.5">
                          <Button size="xs" variant="ghost" onClick={() => openFlow({ kind: "payment_detail", paymentId: payment.id })}>
                            Details
                          </Button>
                          <RowMenu label={`More actions for ${payment.reference}`} items={menu(payment)} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5] md:hidden">
            {rows.map((payment) => (
              <li key={payment.id} className="flex items-start gap-3 px-4 py-3">
                <button type="button" onClick={() => openFlow({ kind: "payment_detail", paymentId: payment.id })} className={cn("min-w-0 flex-1 rounded text-left", x.focus)}>
                  <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
                    {shortDate(payment.date)}
                    <PaymentChip status={payment.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-[#6B7890]">{payment.description}</span>
                  <span className="block truncate font-mono text-[11px] text-[#98A2B3]">{payment.reference}</span>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn("text-[13px] font-semibold tabular-nums", payment.amount < 0 ? "text-[#6D28D9]" : "text-[#0F1B3D]", payment.status === "failed" && "text-[#98A2B3] line-through")}>{money(payment.amount)}</span>
                  <RowMenu label={`Actions for ${payment.reference}`} items={menu(payment)} />
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#EEF1F5]">
            <Pagination page={current} pageCount={pageCount} total={payments.length} pageSize={PAYMENT_PAGE} onPage={setPage} noun="transactions" />
          </div>
        </>
      )}
    </Section>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={cn(x.card, "p-4")} aria-hidden="true">
      <Skeleton className="mb-4 h-3 w-28" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-[#F1F4F8] py-2.5 last:border-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
