/**
 * EnCodency OmniPlatform - Create Refund Request Modal
 * Submits structured refund request for finance review without claiming live external processing.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, parseAmountToMinor, minorToInputValue } from "../../data/money";
import { usePayments, useCreditsAndRefunds } from "../../data/hooks";
import { toast } from "sonner";
import { RotateCcwIcon, CheckIcon } from "lucide-react";

interface CreateRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateRefundModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateRefundModalProps) {
  const { payments } = usePayments();
  const { requestRefund } = useCreditsAndRefunds();

  // Succeeded payments eligible for refund
  const eligiblePayments = payments.filter((p) => p.attemptStatus === "succeeded");

  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(eligiblePayments[0]?.id ?? "");
  const [amountMajor, setAmountMajor] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId) ?? eligiblePayments[0];

  const handleApplyFull = () => {
    if (!selectedPayment) return;
    setAmountMajor(minorToInputValue(selectedPayment.grossAmountMinor));
  };

  const handleSubmit = () => {
    try {
      if (!selectedPayment) {
        toast.error("Please select an eligible payment");
        return;
      }
      const amountMinor = parseAmountToMinor(amountMajor);
      if (amountMinor <= 0) {
        toast.error("Refund amount must be greater than zero");
        return;
      }
      if (amountMinor > selectedPayment.grossAmountMinor) {
        toast.error("Refund amount cannot exceed original payment amount");
        return;
      }
      if (!reason.trim()) {
        toast.error("Please provide a reason for the refund request");
        return;
      }

      requestRefund({
        paymentId: selectedPayment.id,
        requestedAmountMinor: amountMinor,
        reason: reason.trim(),
      });

      toast.success("Refund request submitted in Pending Approval status");
      setAmountMajor("");
      setReason("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit refund request");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 rounded-sm bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="size-9 rounded-sm bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <RotateCcwIcon className="size-4" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Create Refund Request
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Initiate an approval flow to return funds to customer bank/card. Actual refund processing depends on gateway authorization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Original Payment Transaction</Label>
            <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
              <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                <SelectValue placeholder="Select payment" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {eligiblePayments.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.reference} — {p.companyName} ({formatMoney(p.grossAmountMinor, p.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPayment && (
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold text-slate-900">{selectedPayment.method}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Amount:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(selectedPayment.grossAmountMinor, selectedPayment.currency)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium text-foreground">
                Requested Refund Amount ({selectedPayment?.currency})
              </Label>
              <button
                type="button"
                onClick={handleApplyFull}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Full Refund
              </button>
            </div>
            <Input
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              placeholder="0.00"
              className="h-8 text-xs font-mono rounded-sm bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Refund Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Accidental duplicate charge, customer cancellation, or overpayment return"
              className="h-8 text-xs rounded-sm bg-background border-border"
            />
          </div>

          <div className="p-2.5 rounded-sm bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <strong>Governance Policy:</strong> Submitting this request creates an auditable record. Approved refunds will be queued for gateway settlement.
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-sm text-xs border-border">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!selectedPayment || parseAmountToMinor(amountMajor) <= 0}
            onClick={handleSubmit}
            className="rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <CheckIcon className="size-3.5 mr-1" />
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
