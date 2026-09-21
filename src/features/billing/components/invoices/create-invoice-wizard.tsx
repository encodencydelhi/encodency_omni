/**
 * EnCodency OmniPlatform - Create Draft Invoice Wizard
 * 5-Step progressive draft invoice creation wizard with live integer-minor math.
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
import { formatMoney, parseAmountToMinor } from "../../data/money";
import { useBillingAccounts, useInvoices } from "../../data/hooks";
import type { InvoiceType } from "../../data/types";
import { toast } from "sonner";
import {
  PlusIcon,
  Trash2Icon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  Building2Icon,
  ReceiptIcon,
  FileCheckIcon,
} from "lucide-react";

interface CreateInvoiceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoiceId: string) => void;
}

interface DraftLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceMajor: string;
  taxRatePercent: number;
  discountMajor: string;
}

export function CreateInvoiceWizard({
  isOpen,
  onClose,
  onSuccess,
}: CreateInvoiceWizardProps) {
  const { accounts } = useBillingAccounts();
  const { createDraftInvoice } = useInvoices();

  const [step, setStep] = useState<number>(1);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("subscription");
  const [dueDays, setDueDays] = useState<number>(14);
  const [notes, setNotes] = useState<string>("");

  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    {
      id: "draft_li_1",
      description: "Platform Subscription Plan Tier",
      quantity: 1,
      unitPriceMajor: "9999.00",
      taxRatePercent: 18,
      discountMajor: "0.00",
    },
  ]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // Helper to add line item
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `draft_li_${Date.now()}`,
        description: "",
        quantity: 1,
        unitPriceMajor: "1000.00",
        taxRatePercent: 18,
        discountMajor: "0.00",
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("Invoice must have at least one line item");
      return;
    }
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof DraftLineItem, val: any) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: val } : item)),
    );
  };

  // Calculations
  const calculations = lineItems.reduce(
    (acc, item) => {
      const unitMinor = parseAmountToMinor(item.unitPriceMajor);
      const discountMinor = parseAmountToMinor(item.discountMajor);
      const preTax = Math.max(0, item.quantity * unitMinor - discountMinor);
      const taxMinor = Math.round((preTax * item.taxRatePercent) / 100);
      const totalMinor = preTax + taxMinor;

      return {
        subtotalMinor: acc.subtotalMinor + item.quantity * unitMinor,
        discountMinor: acc.discountMinor + discountMinor,
        taxMinor: acc.taxMinor + taxMinor,
        totalMinor: acc.totalMinor + totalMinor,
      };
    },
    { subtotalMinor: 0, discountMinor: 0, taxMinor: 0, totalMinor: 0 },
  );

  const handleSaveDraft = () => {
    try {
      if (!selectedAccount) {
        toast.error("Please select a valid billing account");
        return;
      }
      if (lineItems.some((li) => !li.description.trim())) {
        toast.error("Please provide descriptions for all line items");
        return;
      }

      const dueAtDate = new Date();
      dueAtDate.setDate(dueAtDate.getDate() + dueDays);

      const created = createDraftInvoice({
        companyId: selectedAccount.companyId,
        billingAccountId: selectedAccount.id,
        type: invoiceType,
        currency: selectedAccount.currency,
        dueAt: dueAtDate.toISOString(),
        notes: notes.trim() || undefined,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: Number(li.quantity) || 1,
          unitPriceMinor: parseAmountToMinor(li.unitPriceMajor),
          taxRatePercent: Number(li.taxRatePercent) || 0,
          discountMinor: parseAmountToMinor(li.discountMajor),
        })),
      });

      toast.success(`Draft invoice ${created.number} created successfully`);
      onClose();
      if (onSuccess) onSuccess(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create draft invoice");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden rounded-sm bg-card border-border">
        {/* Modal Header */}
        <div className="p-4 border-b border-border bg-muted/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase text-blue-600">
                Draft Creation Wizard
              </span>
              <span className="text-xs font-medium text-muted-foreground">Step {step} of 5</span>
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              Create New Draft Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Prepare a verified draft invoice for company subscription, addons or billable usage.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-sm transition-colors ${
                  s === step ? "bg-blue-600" : s < step ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-xs scrollbar-thin">
          {/* STEP 1: Select Company & Account */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Building2Icon className="size-4 text-blue-600" />
                <span>1. Select Company & Billing Account</span>
              </div>
              <p className="text-muted-foreground">
                Choose the target tenant organization. The currency and default payment terms will be loaded from the company's billing account.
              </p>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-medium text-foreground">Company Billing Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="h-9 text-xs rounded-sm bg-background border-border">
                    <SelectValue placeholder="Select company account" />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.companyName} ({acc.legalName}) — {acc.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccount && (
                <div className="p-3 rounded-sm bg-slate-50 border border-slate-200 space-y-1 text-slate-700 mt-2">
                  <div className="font-semibold text-slate-900">{selectedAccount.legalName}</div>
                  <div>Contact: {selectedAccount.billingContact} ({selectedAccount.billingEmail})</div>
                  <div>
                    Billing Currency: <span className="font-bold">{selectedAccount.currency}</span> | Payment Terms: {selectedAccount.paymentTerms}
                  </div>
                  <div>Tax Identifier: {selectedAccount.taxId ?? "None specified"}</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Invoice Details */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <ReceiptIcon className="size-4 text-blue-600" />
                <span>2. Invoice Parameters & Due Date</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Invoice Type</Label>
                  <Select value={invoiceType} onValueChange={(val: any) => setInvoiceType(val)}>
                    <SelectTrigger className="h-9 text-xs rounded-sm bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="subscription" className="text-xs">Subscription Plan</SelectItem>
                      <SelectItem value="overage" className="text-xs">Billable Overage</SelectItem>
                      <SelectItem value="addon" className="text-xs">Add-on Feature</SelectItem>
                      <SelectItem value="custom_service" className="text-xs">Custom Professional Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Payment Due Days</Label>
                  <Select value={dueDays.toString()} onValueChange={(val) => setDueDays(parseInt(val, 10))}>
                    <SelectTrigger className="h-9 text-xs rounded-sm bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="0" className="text-xs">Due on Receipt (Immediate)</SelectItem>
                      <SelectItem value="7" className="text-xs">Net 7 Days</SelectItem>
                      <SelectItem value="14" className="text-xs">Net 14 Days</SelectItem>
                      <SelectItem value="30" className="text-xs">Net 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-foreground">Internal Notes / Description</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional context, purchase order reference or customer notes..."
                  className="text-xs rounded-sm min-h-[70px] bg-background border-border"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Line Items */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground text-sm">3. Charge Components & Line Items</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="h-7 text-xs rounded-sm border-border"
                >
                  <PlusIcon className="size-3 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="p-2.5 rounded-sm border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-muted-foreground text-xs">Item #{idx + 1}</span>
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-rose-600 hover:text-rose-700"
                          onClick={() => handleRemoveLineItem(item.id)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                        placeholder="e.g. Growth Tier Monthly Subscription"
                        className="h-8 text-xs rounded-sm bg-background border-border"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, "quantity", parseInt(e.target.value, 10) || 1)}
                          className="h-8 text-xs rounded-sm bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Unit Price ({selectedAccount?.currency})</Label>
                        <Input
                          value={item.unitPriceMajor}
                          onChange={(e) => handleUpdateItem(item.id, "unitPriceMajor", e.target.value)}
                          className="h-8 text-xs font-mono rounded-sm bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Discount ({selectedAccount?.currency})</Label>
                        <Input
                          value={item.discountMajor}
                          onChange={(e) => handleUpdateItem(item.id, "discountMajor", e.target.value)}
                          className="h-8 text-xs font-mono rounded-sm bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Tax Rate (%)</Label>
                        <Input
                          type="number"
                          value={item.taxRatePercent}
                          onChange={(e) => handleUpdateItem(item.id, "taxRatePercent", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs rounded-sm bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Subtotal Display */}
              <div className="p-3 bg-muted/30 border border-border rounded-sm flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Computed Draft Total:</span>
                <span className="font-bold text-sm text-foreground">
                  {formatMoney(calculations.totalMinor, selectedAccount?.currency)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Review Totals */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <FileCheckIcon className="size-4 text-emerald-600" />
                <span>4. Review Document Structure & Amounts</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1.5 text-xs text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill To:</span>
                  <span className="font-semibold">{selectedAccount?.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Type:</span>
                  <span className="capitalize">{invoiceType.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Currency:</span>
                  <span className="font-bold">{selectedAccount?.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono">{formatMoney(calculations.subtotalMinor, selectedAccount?.currency)}</span>
                </div>
                {calculations.discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discounts:</span>
                    <span className="font-mono">-{formatMoney(calculations.discountMinor, selectedAccount?.currency)}</span>
                  </div>
                )}
                {calculations.taxMinor > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax:</span>
                    <span className="font-mono">+{formatMoney(calculations.taxMinor, selectedAccount?.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-slate-900 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-blue-900">
                    {formatMoney(calculations.totalMinor, selectedAccount?.currency)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-sm bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <strong>Notice:</strong> Saving this draft will not immediately debit or notify the customer. Issuance and external payment collection remain separate authorized operations.
              </div>
            </div>
          )}

          {/* STEP 5: Confirmation */}
          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Ready to Save Draft Invoice</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Click below to persist this draft invoice in the platform billing directory. You can edit line items, record demo payments, or void it anytime prior to issuance.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="rounded-sm text-xs border-border"
          >
            {step === 1 ? "Cancel" : <><ArrowLeftIcon className="size-3.5 mr-1" /> Back</>}
          </Button>

          {step < 5 ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => setStep(step + 1)}
              className="rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              Next <ArrowRightIcon className="size-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveDraft}
              className="rounded-sm text-xs bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckIcon className="size-3.5 mr-1" />
              Save Draft Invoice
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
