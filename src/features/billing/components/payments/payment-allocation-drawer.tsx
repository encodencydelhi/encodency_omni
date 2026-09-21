/**
 * EnCodency OmniPlatform - Payment Allocation Drawer
 * Many-to-many payment allocation interface with integer validation and live balance recalculations.
 */

"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/format";
import { formatMoney, parseAmountToMinor, minorToInputValue } from "../../data/money";
import { useInvoices, usePayments } from "../../data/hooks";
import type { Payment, Invoice } from "../../data/types";
import { toast } from "sonner";
import { SplitIcon, CheckIcon, AlertCircleIcon, ArrowRightIcon } from "lucide-react";

interface PaymentAllocationDrawerProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentAllocationDrawer({
  payment,
  isOpen,
  onClose,
  onSuccess,
}: PaymentAllocationDrawerProps) {
  const { invoices } = useInvoices();
  const { allocatePayment } = usePayments();

  // State mapping invoiceId -> proposed minor amount string
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});

  // Eligible open invoices for this payment's company & currency
  const eligibleInvoices = useMemo(() => {
    if (!payment) return [];
    return invoices.filter(
      (inv) =>
        inv.companyId === payment.companyId &&
        inv.currency === payment.currency &&
        inv.documentState === "issued" &&
        inv.outstandingBalanceMinor > 0,
    );
  }, [invoices, payment]);

  if (!payment) return null;

  // Calculate proposed totals
  const proposedTotalMinor = Object.entries(allocationInputs).reduce((acc, [_, val]) => {
    return acc + parseAmountToMinor(val);
  }, 0);

  const remainingUnallocatedMinor = payment.unallocatedBalanceMinor - proposedTotalMinor;
  const isOverAllocated = remainingUnallocatedMinor < 0;

  const handleSetFull = (invoice: Invoice) => {
    const maxApplicable = Math.min(invoice.outstandingBalanceMinor, payment.unallocatedBalanceMinor);
    setAllocationInputs((prev) => ({
      ...prev,
      [invoice.id]: minorToInputValue(maxApplicable),
    }));
  };

  const handleInputChange = (invoiceId: string, value: string) => {
    setAllocationInputs((prev) => ({
      ...prev,
      [invoiceId]: value,
    }));
  };

  const handleConfirmAllocation = () => {
    try {
      if (proposedTotalMinor <= 0) {
        toast.error("Please specify at least one positive allocation amount");
        return;
      }
      if (isOverAllocated) {
        toast.error("Proposed allocation exceeds available unallocated funds");
        return;
      }

      const allocationsToApply = Object.entries(allocationInputs)
        .map(([invoiceId, val]) => ({
          invoiceId,
          amountMinor: parseAmountToMinor(val),
        }))
        .filter((a) => a.amountMinor > 0);

      allocatePayment(payment.id, allocationsToApply);
      toast.success(
        `Successfully allocated ${formatMoney(proposedTotalMinor, payment.currency)} across ${allocationsToApply.length} invoice(s)`,
      );
      setAllocationInputs({});
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to allocate payment");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col justify-between overflow-hidden rounded-l-sm bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/20">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-blue-600 uppercase">
                Payment Allocation
              </span>
              <span className="font-mono text-xs text-muted-foreground">{payment.reference}</span>
            </div>
            <SheetTitle className="text-lg font-bold tracking-tight text-foreground">
              Allocate Funds to Invoices
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Apply unallocated settled money from {payment.companyName} to open receivable invoices.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* Payment Available Funds Banner */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
              <div className="text-muted-foreground font-medium">Payment Total</div>
              <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                {formatMoney(payment.grossAmountMinor, payment.currency)}
              </div>
            </div>
            <div className="p-2.5 rounded-sm bg-blue-50/60 border border-blue-200">
              <div className="text-blue-800 font-medium">Available Unallocated</div>
              <div className="text-sm font-bold font-mono text-blue-900 mt-0.5">
                {formatMoney(payment.unallocatedBalanceMinor, payment.currency)}
              </div>
            </div>
          </div>

          {/* Eligible Open Invoices List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Eligible Open Invoices ({eligibleInvoices.length})
              </div>
              <span className="text-muted-foreground text-[11px]">Currency: {payment.currency}</span>
            </div>

            {eligibleInvoices.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground border border-border rounded-sm bg-muted/20">
                No open invoices with outstanding balance exist for {payment.companyName} in {payment.currency}.
              </div>
            ) : (
              eligibleInvoices.map((inv) => {
                const currentVal = allocationInputs[inv.id] ?? "";
                const valMinor = parseAmountToMinor(currentVal);
                const isExceedingInvoice = valMinor > inv.outstandingBalanceMinor;

                return (
                  <div
                    key={inv.id}
                    className={`p-3 rounded-sm border transition-colors ${
                      isExceedingInvoice ? "border-rose-300 bg-rose-50/30" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-foreground flex items-center gap-1.5">
                          <span>{inv.number}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            (Due {formatDate(inv.dueAt)})
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[11px] mt-0.5">
                          Total: {formatMoney(inv.totalMinor, inv.currency)} • Outstanding:{" "}
                          <span className="font-bold text-amber-900 font-mono">
                            {formatMoney(inv.outstandingBalanceMinor, inv.currency)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetFull(inv)}
                        className="h-6 text-[11px] rounded-sm px-2 border-border"
                      >
                        Apply Max
                      </Button>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground shrink-0">
                        Allocate ({payment.currency}):
                      </Label>
                      <Input
                        value={currentVal}
                        onChange={(e) => handleInputChange(inv.id, e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs font-mono rounded-sm bg-background border-border"
                      />
                    </div>

                    {isExceedingInvoice && (
                      <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircleIcon className="size-3" />
                        Cannot exceed invoice balance of {formatMoney(inv.outstandingBalanceMinor, inv.currency)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Allocation Breakdown Card */}
          <div className="p-3 rounded-sm bg-muted/40 border border-border space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Proposed Allocation Total:</span>
              <span className="font-bold text-foreground">
                {formatMoney(proposedTotalMinor, payment.currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
              <span className={isOverAllocated ? "text-rose-600" : "text-slate-700"}>
                Remaining Unallocated:
              </span>
              <span className={isOverAllocated ? "text-rose-600" : "text-emerald-700"}>
                {formatMoney(remainingUnallocatedMinor, payment.currency)}
              </span>
            </div>
            {isOverAllocated && (
              <div className="text-[11px] text-rose-600 pt-1 font-sans">
                Proposed allocation exceeds total available unallocated payment balance.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-sm text-xs border-border">
            Cancel
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={proposedTotalMinor <= 0 || isOverAllocated}
            onClick={handleConfirmAllocation}
            className="rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <CheckIcon className="size-3.5 mr-1" />
            Confirm Demo Allocation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
