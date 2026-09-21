/**
 * EnCodency OmniPlatform - Payment Quick Preview Drawer
 * Slide-out panel for fast payment transaction inspection and quick allocation.
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
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import {
  PaymentAttemptBadge,
  SettlementBadge,
  AllocationBadge,
} from "../status-badges";
import type { Payment } from "../../data/types";
import {
  WalletCardsIcon,
  Building2Icon,
  CalendarIcon,
  SplitIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
} from "lucide-react";

interface PaymentPreviewDrawerProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAllocate: (payment: Payment) => void;
}

export function PaymentPreviewDrawer({
  payment,
  isOpen,
  onClose,
  onOpenAllocate,
}: PaymentPreviewDrawerProps) {
  if (!payment) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full p-0 flex flex-col justify-between overflow-hidden rounded-l-sm bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/20">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
                {payment.provider} TRANSACTION
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <PaymentAttemptBadge status={payment.attemptStatus} />
                <SettlementBadge status={payment.settlementStatus} />
                <AllocationBadge status={payment.allocationStatus} />
              </div>
            </div>
            <SheetTitle className="text-lg font-bold tracking-tight text-foreground font-mono">
              {payment.reference}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2Icon className="size-3.5" />
              <span>{payment.companyName}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* Key Amounts Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
              <div className="text-muted-foreground font-medium">Gross Amount</div>
              <div className="text-base font-bold font-mono text-foreground mt-0.5">
                {formatMoney(payment.grossAmountMinor, payment.currency)}
              </div>
            </div>
            <div className="p-2.5 rounded-sm bg-blue-50/60 border border-blue-200">
              <div className="text-blue-800 font-medium">Unallocated Balance</div>
              <div className="text-base font-bold font-mono text-blue-900 mt-0.5">
                {formatMoney(payment.unallocatedBalanceMinor, payment.currency)}
              </div>
            </div>
          </div>

          {/* Payment Method & Gateway Info */}
          <div className="space-y-2 p-3 rounded-sm border border-border bg-card">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium text-foreground">{payment.method}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground">Provider Reference</span>
              <span className="font-mono text-foreground">{payment.providerReference ?? "Manual Entry"}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="size-3" /> Timestamp
              </span>
              <span className="text-foreground">{formatDateTime(payment.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Settlement Status</span>
              <span className="font-semibold text-teal-700 capitalize">
                {payment.settlementStatus}
              </span>
            </div>
          </div>

          {/* Failure reason notice if failed */}
          {payment.attemptStatus === "failed" && (
            <div className="p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-800">
              <div className="font-semibold flex items-center gap-1">
                <AlertCircleIcon className="size-3.5" /> Decline Reason:
              </div>
              <p className="mt-0.5">{payment.failureReason ?? "Issuing bank declined transaction."}</p>
            </div>
          )}

          {/* Existing Invoice Allocations */}
          <div>
            <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-1.5 flex justify-between items-center">
              <span>Applied Invoice Allocations ({payment.allocations.length})</span>
              <span className="font-mono text-emerald-700">
                {formatMoney(payment.allocatedAmountMinor, payment.currency)}
              </span>
            </div>
            <div className="border border-border rounded-sm divide-y divide-border/60">
              {payment.allocations.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground">
                  No invoice allocations applied yet.
                </div>
              ) : (
                payment.allocations.map((alloc) => (
                  <div key={alloc.id} className="p-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/super-admin/billing/invoices/${alloc.invoiceId}`}
                        className="font-mono font-semibold text-blue-600 hover:underline"
                      >
                        {alloc.invoiceNumber}
                      </Link>
                      <div className="text-muted-foreground text-[11px]">
                        Allocated on {formatDate(alloc.allocatedAt)}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-emerald-700">
                      {formatMoney(alloc.amountMinor, payment.currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap gap-2">
          <Button
            asChild
            variant="default"
            size="sm"
            className="flex-1 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Link href={`/super-admin/billing/payments/${payment.id}`}>
              <WalletCardsIcon className="size-3.5 mr-1.5" />
              Full Transaction Detail
            </Link>
          </Button>

          {payment.unallocatedBalanceMinor > 0 && payment.attemptStatus === "succeeded" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm text-xs border-border bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={() => onOpenAllocate(payment)}
            >
              <SplitIcon className="size-3.5 mr-1.5" />
              Allocate ({formatMoney(payment.unallocatedBalanceMinor, payment.currency, { compact: true })})
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-sm text-xs border-border"
          >
            <Link href={`/super-admin/billing/accounts/${payment.billingAccountId}`}>
              <ExternalLinkIcon className="size-3.5 mr-1.5 text-muted-foreground" />
              Billing Account
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
