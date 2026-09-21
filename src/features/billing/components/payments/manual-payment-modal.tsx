/**
 * EnCodency OmniPlatform - Record Manual Payment Modal
 * Safe offline/bank wire payment logging in Pending Verification state.
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseAmountToMinor } from "../../data/money";
import { useBillingAccounts, usePayments } from "../../data/hooks";
import { toast } from "sonner";
import { WalletIcon, CheckIcon } from "lucide-react";

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ManualPaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualPaymentModalProps) {
  const { accounts } = useBillingAccounts();
  const { recordManualPayment } = usePayments();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [amountMajor, setAmountMajor] = useState<string>("");
  const [method, setMethod] = useState<string>("Bank Wire / NEFT");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  const handleSubmit = () => {
    try {
      if (!selectedAccount) {
        toast.error("Please select a valid billing account");
        return;
      }
      const amountMinor = parseAmountToMinor(amountMajor);
      if (amountMinor <= 0) {
        toast.error("Payment amount must be greater than zero");
        return;
      }
      if (!reference.trim()) {
        toast.error("Please enter an external bank reference / UTR number");
        return;
      }

      recordManualPayment({
        companyId: selectedAccount.companyId,
        billingAccountId: selectedAccount.id,
        amountMinor,
        currency: selectedAccount.currency,
        method,
        providerReference: reference.trim(),
        notes: notes.trim() || undefined,
      });

      toast.success("Manual payment recorded in Pending Verification state");
      setAmountMajor("");
      setReference("");
      setNotes("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 rounded-sm bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="size-9 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <WalletIcon className="size-4" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Record Manual / Wire Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Log external bank wires, cheques or offline settlements. Payment will enter Pending Verification status until confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Company Billing Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    {acc.companyName} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Amount ({selectedAccount?.currency})
              </Label>
              <Input
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                placeholder="e.g. 5000.00"
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="Bank Wire / NEFT" className="text-xs">Bank Wire / NEFT</SelectItem>
                  <SelectItem value="RTGS Transfer" className="text-xs">RTGS Transfer</SelectItem>
                  <SelectItem value="Corporate Cheque" className="text-xs">Corporate Cheque</SelectItem>
                  <SelectItem value="Direct Bank Deposit" className="text-xs">Direct Bank Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">External UTR / Bank Reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR-HDFC-99281742"
              className="h-8 text-xs font-mono rounded-sm bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Verification Notes / Evidence</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Awaiting bank statement confirmation from Treasury..."
              className="text-xs rounded-sm min-h-[60px] bg-background border-border"
            />
          </div>

          <div className="p-2.5 rounded-sm bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <strong>Policy Notice:</strong> Manual payments require subsequent finance verification before automated invoice closure occurs.
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
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
