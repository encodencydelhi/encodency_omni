/**
 * EnCodency OmniPlatform - Invoice Quick Preview Drawer
 * Slide-out panel for fast invoice inspection without leaving the directory.
 */

"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import {
  DocumentStateBadge,
  CollectionStateBadge,
  TimingStateBadge,
} from "../status-badges";
import type { Invoice } from "../../data/types";
import {
  ReceiptIcon,
  PrinterIcon,
  ExternalLinkIcon,
  Building2Icon,
  CalendarIcon,
  CreditCardIcon,
} from "lucide-react";

interface InvoicePreviewDrawerProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument: (invoice: Invoice) => void;
}

export function InvoicePreviewDrawer({
  invoice,
  isOpen,
  onClose,
  onOpenDocument,
}: InvoicePreviewDrawerProps) {
  if (!invoice) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full p-0 flex flex-col justify-between overflow-hidden rounded-l-sm bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/20">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
                {invoice.type.replace(/_/g, " ")} INVOICE
              </span>
              <div className="flex items-center gap-1.5">
                <DocumentStateBadge state={invoice.documentState} />
                <CollectionStateBadge state={invoice.collectionState} />
                <TimingStateBadge state={invoice.timingState} />
              </div>
            </div>
            <SheetTitle className="text-lg font-bold tracking-tight text-foreground font-mono">
              {invoice.number}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2Icon className="size-3.5" />
              <span>{invoice.companyName}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* Key Financial Totals Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
              <div className="text-muted-foreground font-medium">Invoice Total</div>
              <div className="text-base font-bold font-mono text-foreground mt-0.5">
                {formatMoney(invoice.totalMinor, invoice.currency)}
              </div>
            </div>
            <div className="p-2.5 rounded-sm bg-amber-50/60 border border-amber-200">
              <div className="text-amber-800 font-medium">Balance Due</div>
              <div className="text-base font-bold font-mono text-amber-900 mt-0.5">
                {formatMoney(invoice.outstandingBalanceMinor, invoice.currency)}
              </div>
            </div>
          </div>

          {/* Dates & Reference Info */}
          <div className="space-y-2 p-3 rounded-sm border border-border bg-card">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="size-3" /> Issue Date
              </span>
              <span className="font-medium text-foreground">{formatDate(invoice.issuedAt)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="size-3" /> Due Date
              </span>
              <span className="font-medium text-foreground">{formatDate(invoice.dueAt)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCardIcon className="size-3" /> Payments Allocated
              </span>
              <span className="font-mono font-medium text-emerald-700">
                {formatMoney(invoice.allocatedPaymentsMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Account Credit Applied</span>
              <span className="font-mono font-medium text-indigo-700">
                {formatMoney(invoice.accountCreditAppliedMinor, invoice.currency)}
              </span>
            </div>
          </div>

          {/* Line Items Snapshot */}
          <div>
            <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-1.5">
              Line Items ({invoice.lineItems.length})
            </div>
            <div className="border border-border rounded-sm divide-y divide-border/60">
              {invoice.lineItems.map((li) => (
                <div key={li.id} className="p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{li.description}</div>
                    <div className="text-muted-foreground text-[11px]">Qty: {li.quantity}</div>
                  </div>
                  <div className="font-mono font-semibold text-foreground shrink-0">
                    {formatMoney(li.totalMinor, invoice.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {invoice.notes && (
            <div className="p-2.5 rounded-sm bg-muted/40 border border-border text-muted-foreground">
              <div className="font-semibold text-foreground text-[11px] mb-0.5">Notes</div>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap gap-2">
          <Button
            asChild
            variant="default"
            size="sm"
            className="flex-1 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Link href={`/super-admin/billing/invoices/${invoice.id}`}>
              <ReceiptIcon className="size-3.5 mr-1.5" />
              Full Invoice Details
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-sm text-xs border-border"
            onClick={() => onOpenDocument(invoice)}
          >
            <PrinterIcon className="size-3.5 mr-1.5 text-muted-foreground" />
            Print Preview
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-sm text-xs border-border"
          >
            <Link href={`/super-admin/billing/accounts/${invoice.billingAccountId}`}>
              <ExternalLinkIcon className="size-3.5 mr-1.5 text-muted-foreground" />
              Billing Account
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
