/**
 * EnCodency OmniPlatform - Void Invoice Dialog
 * Impact-aware confirmation modal for canceling an issued invoice.
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "../../data/money";
import type { Invoice } from "../../data/types";
import { toast } from "sonner";
import { AlertTriangleIcon } from "lucide-react";

interface VoidInvoiceDialogProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVoid: (invoiceId: string, reason: string) => void;
}

export function VoidInvoiceDialog({
  invoice,
  isOpen,
  onClose,
  onConfirmVoid,
}: VoidInvoiceDialogProps) {
  const [reason, setReason] = useState<string>("");

  if (!invoice) return null;

  const hasAllocations = invoice.allocatedPaymentsMinor > 0;

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Please provide a cancellation/void reason");
      return;
    }
    try {
      onConfirmVoid(invoice.id, reason.trim());
      toast.success(`Invoice ${invoice.number} voided successfully`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to void invoice");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 rounded-sm bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="size-9 rounded-sm bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <AlertTriangleIcon className="size-4" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Void Invoice {invoice.number}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Voiding marks this financial document as legally cancelled. The receivable balance will be cleared from company accounts.
          </DialogDescription>
        </DialogHeader>

        {hasAllocations ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-800 space-y-1.5">
            <strong>Action Blocked:</strong> This invoice has{" "}
            <span className="font-semibold font-mono">
              {formatMoney(invoice.allocatedPaymentsMinor, invoice.currency)}
            </span>{" "}
            in allocated payments. Invoices with applied payments cannot be voided directly. Please unallocate the payment or issue an eligible Credit Note instead.
          </div>
        ) : (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Company:</span>
                <span className="font-semibold text-slate-900">{invoice.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Total:</span>
                <span className="font-mono">{formatMoney(invoice.totalMinor, invoice.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Receivable Reduction:</span>
                <span className="font-mono text-rose-600">
                  -{formatMoney(invoice.outstandingBalanceMinor, invoice.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Reason for Voiding</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Invoiced in error, duplicate subscription billing, or agreement renegotiated"
                className="h-8 text-xs rounded-sm bg-background border-border"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-sm text-xs border-border">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={hasAllocations || !reason.trim()}
            onClick={handleConfirm}
            className="rounded-sm text-xs"
          >
            Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
