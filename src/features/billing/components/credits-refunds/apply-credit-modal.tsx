/**
 * EnCodency OmniPlatform - Apply Account Credit Modal
 * Applies available company credit balance to reduce open invoice receivables.
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
import { useCreditsAndRefunds } from "../../data/hooks";
import { toast } from "sonner";
import { CoinsIcon, CheckIcon } from "lucide-react";

interface ApplyCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ApplyCreditModal({
  isOpen,
  onClose,
  onSuccess,
}: ApplyCreditModalProps) {
  const { accounts, invoices, applyAccountCredit } = useCreditsAndRefunds();

  // Accounts with credit > 0
  const accountsWithCredit = accounts.filter((a) => a.availableCreditMinor > 0);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accountsWithCredit[0]?.id ?? "");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [amountMajor, setAmountMajor] = useState<string>("");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accountsWithCredit[0];

  // Invoices for this account that are open and have outstanding balance
  const eligibleInvoices = invoices.filter(
    (inv) =>
      inv.billingAccountId === selectedAccount?.id &&
      inv.currency === selectedAccount?.currency &&
      inv.documentState === "issued" &&
      inv.outstandingBalanceMinor > 0,
  );

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) ?? eligibleInvoices[0];

  const handleApplyMax = () => {
    if (!selectedAccount || !selectedInvoice) return;
    const maxApplicable = Math.min(selectedAccount.availableCreditMinor, selectedInvoice.outstandingBalanceMinor);
    setAmountMajor(minorToInputValue(maxApplicable));
  };

  const handleSubmit = () => {
    try {
      if (!selectedAccount) {
        toast.error("Please select a billing account with available credit");
        return;
      }
      if (!selectedInvoice) {
        toast.error("Please select an open invoice to apply credit to");
        return;
      }
      const amountMinor = parseAmountToMinor(amountMajor);
      if (amountMinor <= 0) {
        toast.error("Application amount must be greater than zero");
        return;
      }
      if (amountMinor > selectedAccount.availableCreditMinor) {
        toast.error("Amount exceeds available account credit");
        return;
      }
      if (amountMinor > selectedInvoice.outstandingBalanceMinor) {
        toast.error("Amount exceeds outstanding invoice balance");
        return;
      }

      applyAccountCredit(selectedAccount.id, selectedInvoice.id, amountMinor);
      toast.success(
        `Applied ${formatMoney(amountMinor, selectedAccount.currency)} credit to invoice ${selectedInvoice.number}`,
      );
      setAmountMajor("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply account credit");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 rounded-sm bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="size-9 rounded-sm bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CoinsIcon className="size-4" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Apply Available Account Credit
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Deduct from company's available credit balance to satisfy an open invoice receivable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Billing Account</Label>
            <Select value={selectedAccountId} onValueChange={(val) => {
              setSelectedAccountId(val);
              setSelectedInvoiceId("");
            }}>
              <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {accountsWithCredit.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    {acc.companyName} (Available: {formatMoney(acc.availableCreditMinor, acc.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccount && (
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Available Balance:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatMoney(selectedAccount.availableCreditMinor, selectedAccount.currency)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Target Open Invoice</Label>
            {eligibleInvoices.length === 0 ? (
              <div className="p-2.5 rounded-sm bg-muted/30 border border-border text-muted-foreground">
                No open invoices with outstanding balances found for this account.
              </div>
            ) : (
              <Select value={selectedInvoice?.id} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {eligibleInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id} className="text-xs">
                      {inv.number} (Due: {formatMoney(inv.outstandingBalanceMinor, inv.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedInvoice && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium text-foreground">
                  Application Amount ({selectedAccount?.currency})
                </Label>
                <button
                  type="button"
                  onClick={handleApplyMax}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Use Max Available
                </button>
              </div>
              <Input
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-sm text-xs border-border">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!selectedAccount || !selectedInvoice || parseAmountToMinor(amountMajor) <= 0}
            onClick={handleSubmit}
            className="rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <CheckIcon className="size-3.5 mr-1" />
            Apply Account Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
