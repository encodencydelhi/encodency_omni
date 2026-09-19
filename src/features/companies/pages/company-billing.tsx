"use client";

import { DownloadIcon, ReceiptIcon, StickyNoteIcon, WalletIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { ErrorBanner, FlowDialog, SubmitButton } from "../components/flows/flow-kit";
import { ModuleLinkButton } from "../components/module-link";
import { KeyValue, Panel, StatCard, StatGrid } from "../components/primitives";
import { PanelSkeleton, SectionError, StatGridSkeleton, TableSkeleton } from "../components/states";
import { BillingStatusBadge, InvoiceStatusBadge, PaymentStateBadge } from "../components/status-badges";
import { useCompanyCapabilities } from "../data/capability-provider";
import { resolveModuleLink } from "../data/config";
import { describeError, useCompanyBilling, useCompanyMutations } from "../data/hooks";
import type { CompanyBillingData } from "../data/repository";
import type { CompanyInvoice, CompanyPayment } from "../data/types";
import { downloadCsv } from "../lib/csv";
import { formatMrr } from "../lib/format";
import { useCompanyId } from "./company-shell";

export function CompanyBillingPage() {
  const companyId = useCompanyId();
  const query = useCompanyBilling(companyId);

  if (query.error) return <SectionError subject="Billing data" error={query.error} onRetry={() => void query.refetch()} module={{ key: "billing", label: "Billing & Payments" }} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
        <PanelSkeleton rows={2} />
        <TableSkeleton rows={4} columns={7} />
      </div>
    );
  }
  return <BillingBody companyId={companyId} data={query.data} />;
}

function BillingBody({ companyId, data }: { companyId: string; data: CompanyBillingData }) {
  const capabilities = useCompanyCapabilities();
  const { summary, invoices, payments, billingNotes, plan } = data;
  const [invoice, setInvoice] = useState<CompanyInvoice | null>(null);
  const [payment, setPayment] = useState<CompanyPayment | null>(null);
  const [noting, setNoting] = useState(false);
  const paymentFor = (id: string | null) => payments.find((item) => item.id === id) ?? null;
  const globalBilling = resolveModuleLink("billing", { companyId });

  const invoiceMenu = (item: CompanyInvoice): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      { id: "view", label: "View Invoice", icon: ReceiptIcon, onSelect: () => setInvoice(item) },
      {
        id: "download",
        label: "Download Invoice",
        icon: DownloadIcon,
        onSelect: () =>
          downloadCsv(`${item.number}-demo.csv`, ["Field", "Value"], [
            ["Invoice", item.number],
            ["Status", item.status],
            ["Description", item.description],
            ["Billing period", `${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}`],
            ["Issued", formatDate(item.issuedAt)],
            ["Due", formatDate(item.dueAt)],
            ["Amount", formatCurrency(item.amountMinor, item.currency)],
            ["Note", "Demo invoice summary. Not a tax invoice."],
          ]),
      },
    ];
    if (item.paymentId) {
      const linked = paymentFor(item.paymentId);
      if (linked) items.push({ id: "payment", label: "View Payment", icon: WalletIcon, onSelect: () => setPayment(linked) });
    }
    return items;
  };

  const invoiceColumns: Array<DataTableColumn<CompanyInvoice>> = [
    { id: "number", header: "Invoice", hideable: false, cell: (item) => <span className="font-mono text-[0.8125rem] font-medium text-foreground">{item.number}</span> },
    { id: "period", header: "Billing period", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(item.periodStart)} - {formatDate(item.periodEnd)}</span> },
    { id: "issued", header: "Issued", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(item.issuedAt)}</span> },
    { id: "due", header: "Due", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(item.dueAt)}</span> },
    { id: "amount", header: "Amount", align: "right", cell: (item) => <span className="tabular text-foreground">{formatCurrency(item.amountMinor, item.currency)}</span> },
    { id: "status", header: "Status", cell: (item) => <InvoiceStatusBadge status={item.status} /> },
    { id: "payment", header: "Payment", cell: (item) => <PaymentStateBadge status={item.paymentStatus} /> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (item) => <ActionMenu items={invoiceMenu(item)} label={`Actions for ${item.number}`} /> },
  ];

  const paymentColumns: Array<DataTableColumn<CompanyPayment>> = [
    { id: "reference", header: "Reference", hideable: false, cell: (item) => <span className="font-mono text-[0.8125rem] font-medium text-foreground">{item.reference}</span> },
    { id: "invoice", header: "Invoice", cell: (item) => <span className="font-mono text-2xs text-muted-foreground">{item.invoiceNumber ?? "-"}</span> },
    { id: "amount", header: "Amount", align: "right", cell: (item) => <span className={item.amountMinor < 0 ? "tabular text-danger" : "tabular text-foreground"}>{formatCurrency(item.amountMinor, item.currency)}</span> },
    { id: "method", header: "Method", cell: (item) => <span className="text-[0.8125rem] text-foreground">{item.method}</span> },
    { id: "status", header: "Status", cell: (item) => <PaymentStateBadge status={item.status} /> },
    { id: "date", header: "Date", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(item.createdAt)}</span> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      cell: (item) => <ActionMenu items={[{ id: "view", label: "View Payment", icon: WalletIcon, onSelect: () => setPayment(item) }]} label={`Actions for ${item.reference}`} />,
    },
  ];

  return (
    <div className="space-y-1">
      <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        <StatCard label="MRR" value={formatMrr(summary.mrrMinor, summary.currency)} hint={summary.mrrMinor === 0 ? "Not generating revenue" : `${plan.name} plan`} />
        <StatCard label="Outstanding" value={summary.outstandingMinor === 0 ? "-" : formatCurrency(summary.outstandingMinor, summary.currency)} tone={summary.outstandingMinor > 0 ? "danger" : "neutral"} hint={summary.outstandingMinor > 0 ? "Open or overdue invoices" : "Nothing owed"} />
        <StatCard label="Last payment" value={summary.lastPayment ? formatCurrency(summary.lastPayment.amountMinor, summary.lastPayment.currency) : "-"} hint={summary.lastPayment ? formatDate(summary.lastPayment.createdAt) : "No payment yet"} />
        <StatCard label="Next invoice" value={summary.nextInvoice ? formatDate(summary.nextInvoice.date) : "-"} hint={summary.nextInvoice ? `${formatCurrency(summary.nextInvoice.amountMinor, summary.currency)} · ${summary.nextInvoice.note}` : "None scheduled"} />
        <StatCard label="Payment status" value={<BillingStatusBadge status={summary.status} />} />
        <StatCard label="Billing cycle" value={<span className="capitalize">{summary.billingCycle}</span>} />
        <StatCard
          label="Payment method"
          value={summary.paymentMethod ? `${summary.paymentMethod.brand} ...${summary.paymentMethod.last4}` : <span className="text-muted-foreground">None</span>}
          hint={summary.paymentMethod?.expiresAt ? `Expires ${formatDate(summary.paymentMethod.expiresAt)}` : "Nothing on file"}
        />
      </StatGrid>

      <AlertBanner
        tone="info"
        title="Billing actions are not available in demo mode"
        action={
          <ModuleLinkButton module="billing" query={{ companyId }}>
            Open Billing &amp; Payments
          </ModuleLinkButton>
        }
      >
        Refunds, account credits, manual payments and payment retries need server-side authorisation and a payment provider. Nothing on this page moves money.
        {globalBilling.available ? "" : " The global Billing & Payments module is not available in this build yet."}
      </AlertBanner>

      <Panel
        title="Invoices"
        flush
        action={
          capabilities.canManageBilling ? (
            <Button variant="ghost" size="sm" onClick={() => setNoting(true)}>
              <StickyNoteIcon />
              Add internal billing note
            </Button>
          ) : null
        }
      >
        <DataTable
          columns={invoiceColumns}
          rows={invoices}
          getRowId={(item) => item.id}
          isLoading={false}
          caption="Invoices"
          emptyState={
            <EmptyState
              icon={ReceiptIcon}
              size="sm"
              title="No invoices"
              description={summary.nextInvoice ? "The first invoice is issued at the end of the trial or on the next renewal." : "No invoice has been issued for this company."}
            />
          }
        />
      </Panel>

      <Panel title="Payment history" flush>
        <DataTable
          columns={paymentColumns}
          rows={payments}
          getRowId={(item) => item.id}
          isLoading={false}
          caption="Payments"
          emptyState={<EmptyState icon={WalletIcon} size="sm" title="No payments" description="Payments appear here once an invoice is paid." />}
        />
      </Panel>

      {billingNotes.length > 0 ? (
        <Panel title="Billing notes" description="Internal - never shown to the company.">
          <ul className="divide-y divide-border">
            {billingNotes.map((note) => (
              <li key={note.id} className="py-2">
                <p className="text-[0.8125rem] text-foreground">{note.content}</p>
                <p className="text-2xs text-muted-foreground">{note.authorName} · {formatDateTime(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <InvoiceDialog invoice={invoice} payment={paymentFor(invoice?.paymentId ?? null)} onClose={() => setInvoice(null)} />
      <PaymentDialog payment={payment} onClose={() => setPayment(null)} />
      {noting ? <BillingNoteDialog companyId={companyId} onClose={() => setNoting(false)} /> : null}
    </div>
  );
}

function InvoiceDialog({ invoice, payment, onClose }: { invoice: CompanyInvoice | null; payment: CompanyPayment | null; onClose: () => void }) {
  return (
    <FlowDialog
      open={invoice !== null}
      onOpenChange={(open) => !open && onClose()}
      title={invoice ? `Invoice ${invoice.number}` : "Invoice"}
      description="Read-only view of the demo billing record."
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      {invoice ? (
        <>
          <dl className="divide-y divide-border rounded-sm border border-border px-3">
            <KeyValue label="Status"><InvoiceStatusBadge status={invoice.status} /></KeyValue>
            <KeyValue label="Description">{invoice.description}</KeyValue>
            <KeyValue label="Billing period">{formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</KeyValue>
            <KeyValue label="Issued">{formatDate(invoice.issuedAt)}</KeyValue>
            <KeyValue label="Due">{formatDate(invoice.dueAt)}</KeyValue>
            <KeyValue label="Amount"><span className="font-semibold">{formatCurrency(invoice.amountMinor, invoice.currency)}</span></KeyValue>
            <KeyValue label="Payment"><PaymentStateBadge status={invoice.paymentStatus} /></KeyValue>
            <KeyValue label="Payment reference">{payment?.reference ?? "-"}</KeyValue>
          </dl>
          {payment?.failureReason ? <AlertBanner tone="danger" title="Payment failed">{payment.failureReason}</AlertBanner> : null}
        </>
      ) : null}
    </FlowDialog>
  );
}

function PaymentDialog({ payment, onClose }: { payment: CompanyPayment | null; onClose: () => void }) {
  return (
    <FlowDialog
      open={payment !== null}
      onOpenChange={(open) => !open && onClose()}
      title={payment ? `Payment ${payment.reference}` : "Payment"}
      description="Read-only view of the demo billing record. No payment provider is connected."
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      {payment ? (
        <>
          <dl className="divide-y divide-border rounded-sm border border-border px-3">
            <KeyValue label="Status"><PaymentStateBadge status={payment.status} /></KeyValue>
            <KeyValue label="Amount"><span className="font-semibold">{formatCurrency(payment.amountMinor, payment.currency)}</span></KeyValue>
            <KeyValue label="Method">{payment.method}</KeyValue>
            <KeyValue label="Invoice">{payment.invoiceNumber ?? "-"}</KeyValue>
            <KeyValue label="Date">{formatDateTime(payment.createdAt)}</KeyValue>
          </dl>
          {payment.failureReason ? <AlertBanner tone="danger" title="Why it failed">{payment.failureReason}</AlertBanner> : null}
        </>
      ) : null}
    </FlowDialog>
  );
}

function BillingNoteDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Add internal billing note"
      description="Tagged Billing and visible to Super Admin only."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton
            pending={pending}
            disabled={content.trim().length === 0}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await mutations.addNote(companyId, { content, tags: ["billing"] });
                toast.success("Billing note added");
                onClose();
              } catch (failure) {
                setError(describeError(failure).message);
              } finally {
                setPending(false);
              }
            }}
          >
            Add note
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-24" aria-label="Billing note" placeholder="e.g. Customer confirmed a replacement card; retry after the 15th." />
    </FlowDialog>
  );
}
