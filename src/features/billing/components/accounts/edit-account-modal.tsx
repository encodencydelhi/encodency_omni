/**
 * EnCodency OmniPlatform - Edit Billing Account Modal
 * Manages company billing identity, legal entity name, and tax configuration.
 */

"use client";

import { useState, useEffect } from "react";
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
import { useBillingAccounts } from "../../data/hooks";
import type { BillingAccount } from "../../data/types";
import { toast } from "sonner";
import { Building2Icon, CheckIcon } from "lucide-react";

interface EditAccountModalProps {
  account: BillingAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditAccountModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  const { updateBillingAccount } = useBillingAccounts();

  const [legalName, setLegalName] = useState<string>("");
  const [billingEmail, setBillingEmail] = useState<string>("");
  const [billingContact, setBillingContact] = useState<string>("");
  const [billingPhone, setBillingPhone] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<BillingAccount["paymentTerms"]>("Net 30");

  useEffect(() => {
    if (account) {
      setLegalName(account.legalName);
      setBillingEmail(account.billingEmail);
      setBillingContact(account.billingContact);
      setBillingPhone(account.billingPhone ?? "");
      setTaxId(account.taxId ?? "");
      setPaymentTerms(account.paymentTerms);
    }
  }, [account]);

  if (!account) return null;

  const handleSubmit = () => {
    try {
      if (!legalName.trim()) {
        toast.error("Legal billing entity name is required");
        return;
      }
      if (!billingEmail.trim()) {
        toast.error("Billing notification email is required");
        return;
      }

      updateBillingAccount(account.id, {
        legalName: legalName.trim(),
        billingEmail: billingEmail.trim(),
        billingContact: billingContact.trim(),
        billingPhone: billingPhone.trim() || null,
        taxId: taxId.trim() || null,
        paymentTerms,
      });

      toast.success("Billing account identity and terms updated successfully");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update billing account");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 rounded-sm bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="size-9 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Building2Icon className="size-4" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Edit Billing Account — {account.companyName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update legal company name, invoice notification contact, and tax identification details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Legal Entity / Billing Name</Label>
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="h-8 text-xs rounded-sm bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Billing Email</Label>
              <Input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="h-8 text-xs rounded-sm bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Billing Contact Person</Label>
              <Input
                value={billingContact}
                onChange={(e) => setBillingContact(e.target.value)}
                className="h-8 text-xs rounded-sm bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Tax Identifier / GSTIN</Label>
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 27AAAFB4492K1ZX"
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={(val: any) => setPaymentTerms(val)}>
                <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="Due on Receipt" className="text-xs">Due on Receipt</SelectItem>
                  <SelectItem value="Net 15" className="text-xs">Net 15 Days</SelectItem>
                  <SelectItem value="Net 30" className="text-xs">Net 30 Days</SelectItem>
                  <SelectItem value="Net 60" className="text-xs">Net 60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            Save Billing Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
