/**
 * EnCodency OmniPlatform - Billing Settings & Governance Page
 * Policy configuration for invoice generation, payment reconciliation and refund approvals.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBillingPolicies } from "../data/hooks";
import { parseAmountToMinor, minorToInputValue } from "../data/money";
import type { BillingPolicies } from "../data/types";
import { toast } from "sonner";
import {
  CheckIcon,
  ReceiptIcon,
  WalletCardsIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
} from "lucide-react";

export function BillingSettingsPage() {
  const { policies, updatePolicies } = useBillingPolicies();

  const [formState, setFormState] = useState<BillingPolicies>({ ...policies });
  const [instantRefundMajor, setInstantRefundMajor] = useState<string>(
    minorToInputValue(policies.refundMaxInstantThresholdMinor),
  );
  const [highImpactMajor, setHighImpactMajor] = useState<string>(
    minorToInputValue(policies.highImpactThresholdMinor),
  );

  const handleSave = () => {
    try {
      const updated: BillingPolicies = {
        ...formState,
        refundMaxInstantThresholdMinor: parseAmountToMinor(instantRefundMajor),
        highImpactThresholdMinor: parseAmountToMinor(highImpactMajor),
      };

      updatePolicies(updated);
      toast.success("Billing and financial governance policies updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update policies");
    }
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Billing Settings</h1>
            <span className="rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              Governance & Policies
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure invoice numbering, payment verification rules, refund approval thresholds, and legal issuer records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="h-8 rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
          >
            <CheckIcon className="size-3.5" />
            <span>Save All Policies</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {/* Section 1: Invoice Configuration */}
        <div className="bg-card rounded-sm border border-border p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <ReceiptIcon className="size-4 text-blue-600" />
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              1. Invoicing & Document Policy
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Invoice Number Prefix</Label>
                <Input
                  value={formState.invoicePrefix}
                  onChange={(e) => setFormState({ ...formState, invoicePrefix: e.target.value })}
                  className="h-8 text-xs font-mono rounded-sm bg-background border-border"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Default Payment Due Days</Label>
                <Input
                  type="number"
                  value={formState.defaultDueDays}
                  onChange={(e) => setFormState({ ...formState, defaultDueDays: parseInt(e.target.value, 10) || 14 })}
                  className="h-8 text-xs rounded-sm bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Issuer Legal Name</Label>
              <Input
                value={formState.issuerEntity}
                onChange={(e) => setFormState({ ...formState, issuerEntity: e.target.value })}
                className="h-8 text-xs rounded-sm bg-background border-border"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Platform GSTIN / Tax Identifier</Label>
              <Input
                value={formState.issuerTaxId}
                onChange={(e) => setFormState({ ...formState, issuerTaxId: e.target.value })}
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Printable Invoice Template</Label>
              <Select
                value={formState.invoiceTemplate}
                onValueChange={(val: any) => setFormState({ ...formState, invoiceTemplate: val })}
              >
                <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="modern_compact" className="text-xs">Modern Compact (Standard)</SelectItem>
                  <SelectItem value="enterprise_classic" className="text-xs">Enterprise Classic</SelectItem>
                  <SelectItem value="minimalist" className="text-xs">Minimalist Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Payment Operations */}
        <div className="bg-card rounded-sm border border-border p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <WalletCardsIcon className="size-4 text-emerald-600" />
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              2. Payment Operations & Allocation
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-muted/20 border border-border">
              <div>
                <div className="font-semibold text-foreground">Allow Partial Payment Allocations</div>
                <div className="text-muted-foreground text-[11px]">
                  Permit invoices to accept partial payment transactions.
                </div>
              </div>
              <Switch
                checked={formState.allowPartialPayments}
                onCheckedChange={(checked) => setFormState({ ...formState, allowPartialPayments: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-sm bg-muted/20 border border-border">
              <div>
                <div className="font-semibold text-foreground">Require Approval for Manual Payments</div>
                <div className="text-muted-foreground text-[11px]">
                  Manual wire transfer recordings enter Pending Verification state.
                </div>
              </div>
              <Switch
                checked={formState.manualPaymentRequiresApproval}
                onCheckedChange={(checked) => setFormState({ ...formState, manualPaymentRequiresApproval: checked })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">
                Auto-Reconciliation Variance Threshold
              </Label>
              <Input
                type="number"
                value={formState.autoReconciliationThresholdMinor / 100}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    autoReconciliationThresholdMinor: Math.round((parseFloat(e.target.value) || 0) * 100),
                  })
                }
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
              <p className="text-muted-foreground text-[11px]">
                Max allowable rounding difference (₹50.00) between external webhook and invoice total.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Credits & Refunds Policy */}
        <div className="bg-card rounded-sm border border-border p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <RotateCcwIcon className="size-4 text-purple-600" />
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              3. Credits & Refunds Governance
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-muted/20 border border-border">
              <div>
                <div className="font-semibold text-foreground">Credit Notes Require Finance Approval</div>
                <div className="text-muted-foreground text-[11px]">
                  Mandates senior finance approval before credit notes post to customer ledgers.
                </div>
              </div>
              <Switch
                checked={formState.creditNoteRequiresFinanceApproval}
                onCheckedChange={(checked) =>
                  setFormState({ ...formState, creditNoteRequiresFinanceApproval: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-sm bg-muted/20 border border-border">
              <div>
                <div className="font-semibold text-foreground">Dual Approval for Large Refunds</div>
                <div className="text-muted-foreground text-[11px]">
                  Requires two-person verification for refunds exceeding threshold.
                </div>
              </div>
              <Switch
                checked={formState.requireTwoPersonApprovalForLargeRefunds}
                onCheckedChange={(checked) =>
                  setFormState({ ...formState, requireTwoPersonApprovalForLargeRefunds: checked })
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Instant Refund Threshold (INR)</Label>
              <Input
                value={instantRefundMajor}
                onChange={(e) => setInstantRefundMajor(e.target.value)}
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
              <p className="text-muted-foreground text-[11px]">
                Maximum refund amount eligible for single-step approval (₹5,000.00).
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Governance & Disclaimers */}
        <div className="bg-card rounded-sm border border-border p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <ShieldAlertIcon className="size-4 text-amber-600" />
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              4. Financial Governance & Audit Notice
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">
                High-Impact Operation Threshold (INR)
              </Label>
              <Input
                value={highImpactMajor}
                onChange={(e) => setHighImpactMajor(e.target.value)}
                className="h-8 text-xs font-mono rounded-sm bg-background border-border"
              />
              <p className="text-muted-foreground text-[11px]">
                Transactions exceeding ₹1,00,000 require explicit impact confirmation dialogs.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Legal Disclaimer / Watermark Text</Label>
              <Textarea
                value={formState.disclaimerText}
                onChange={(e) => setFormState({ ...formState, disclaimerText: e.target.value })}
                className="text-xs rounded-sm min-h-[70px] bg-background border-border"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
