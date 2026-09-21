/**
 * EnCodency OmniPlatform - Create Credit Note Draft Modal
 * Drafts an authorized credit note adjustment against an eligible issued invoice.
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
import { formatMoney, parseAmountToMinor } from "../../data/money";
import { useInvoices, useCreditsAndRefunds } from "../../data/hooks";
import type { CreditNoteDisposition } from "../../data/types";
import { toast } from "sonner";
import { RotateCcwIcon, CheckIcon } from "lucide-react";

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCreditNoteModalProps) {
  const { invoices } = useInvoices();
  const { createCreditNote } = useCreditsAndRefunds();

  // Eligible invoices are issued ones
  const eligibleInvoices = invoices.filter((i) => i.documentState === "issued");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(eligibleInvoices[0]?.id ?? "");
  const [amountMajor, setAmountMajor] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [disposition, setDisposition] = useState<CreditNoteDisposition>("retain_as_account_credit");

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) ?? eligibleInvoices[0];

  const handleSubmit = () => {
    try {
      if (!selectedInvoice) {
        toast.error("Please select an eligible invoice");
        return;
      }
      const amountMinor = parseAmountToMinor(amountMajor);
      if (amountMinor <= 0) {
        toast.error("Credit note amount must be greater than zero");
        return;
      }
      if (amountMinor > selectedInvoice.totalMinor) {
        toast.error(`Credit note cannot exceed original invoice total (${formatMoney(selectedInvoice.totalMinor, selectedInvoice.currency)})`);
        return;
      }
      if (!reason.trim()) {
        toast.error("Please provide a commercial or service reason for the credit adjustment");
        return;
      }

      createCreditNote({
        invoiceId: selectedInvoice.id,
        amountMinor,
        reason: reason.trim(),
        disposition,
      });

      toast.success("Credit note draft submitted for finance approval");
      setAmountMajor("");
      setReason("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create credit note");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 rounded-sm bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="size-9 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <RotateCcwIcon className="size-4" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Draft Credit Note Adjustment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Issue a credit note against an existing invoice. Historical invoice records remain immutable while adjustments are posted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Target Invoice</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {eligibleInvoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id} className="text-xs">
                    {inv.number} — {inv.companyName} ({formatMoney(inv.totalMinor, inv.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedInvoice && (
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Invoice Total:</span>
                <span className="font-mono font-semibold">{formatMoney(selectedInvoice.totalMinor, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Outstanding:</span>
                <span className="font-mono font-semibold text-amber-900">
                  {formatMoney(selectedInvoice.outstandingBalanceMinor, selectedInvoice.currency)}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Credit Amount ({selectedInvoice?.currency})
              </Label>
              <Input
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Disposition</Label>
              <Select value={disposition} onValueChange={(val: any) => setDisposition(val)}>
                <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="retain_as_account_credit" className="text-xs">
                    Post to Account Credit
                  </SelectItem>
                  <SelectItem value="balance_adjustment" className="text-xs">
                    Direct Balance Reduction
                  </SelectItem>
                  <SelectItem value="direct_refund_pending" className="text-xs">
                    Direct Refund Pending
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Adjustment Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Service outage discount, courtesy waiver, or SLA credit"
              className="h-8 text-xs rounded-sm bg-background border-border"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-sm text-xs border-border">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            className="rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <CheckIcon className="size-3.5 mr-1" />
            Submit Credit Note Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
