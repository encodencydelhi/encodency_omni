"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import type { BillingProfile } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowShell, useFlowClose } from "../flow-shell";
import { Button, FormField } from "../ui";

export function DetailsFlow() {
  const { flow, actions, snapshot, closeFlow } = useBilling();
  const open = flow?.kind === "details";

  if (!open || !snapshot) return null;

  return (
    <FlowShell
      open={open}
      onOpenChange={(v) => !v && closeFlow()}
      title="Edit Billing Details"
      description="These details appear on all future invoices."
      icon={Building2}
      width={600}
    >
      <DetailsForm profile={snapshot.profile} />
    </FlowShell>
  );
}

function DetailsForm({ profile }: { profile: BillingProfile }) {
  const { actions } = useBilling();
  const close = useFlowClose();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BillingProfile>(profile);

  // Reset form if profile changes while open
  useEffect(() => {
    setData(profile);
  }, [profile]);

  const dirty = JSON.stringify(data) !== JSON.stringify(profile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await actions.saveProfile(data);
    setSaving(false);
    
    if (res.ok) {
      toast.success("Billing details updated");
      close();
    } else {
      toast.error(res.message, { description: res.hint });
    }
  };

  const update = (field: keyof BillingProfile, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-8 p-5">
        <section className="space-y-4">
          <h3 className="text-[12px] font-semibold text-[#0F1B3D]">Business Information</h3>
          <FormField label="Legal Business Name">
            <input
              required
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={data.legalName}
              onChange={(e) => update("legalName", e.target.value)}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Billing Email">
              <input
                required
                type="email"
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.billingEmail}
                onChange={(e) => update("billingEmail", e.target.value)}
              />
            </FormField>
            <FormField label="Billing Phone">
              <input
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.billingPhone}
                onChange={(e) => update("billingPhone", e.target.value)}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[12px] font-semibold text-[#0F1B3D]">Address</h3>
          <FormField label="Address Line 1">
            <input
              required
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={data.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
            />
          </FormField>
          <FormField label="Address Line 2 (Optional)">
            <input
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={data.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="City">
              <input
                required
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </FormField>
            <FormField label="State / Province">
              <input
                required
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.state}
                onChange={(e) => update("state", e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Postal / ZIP Code">
              <input
                required
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
              />
            </FormField>
            <FormField label="Country">
              <input
                required
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.country}
                onChange={(e) => update("country", e.target.value)}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[12px] font-semibold text-[#0F1B3D]">Tax Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="GSTIN (India)">
              <input
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.gstin}
                onChange={(e) => update("gstin", e.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="PAN (India)">
              <input
                className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={data.pan}
                onChange={(e) => update("pan", e.target.value)}
                placeholder="Optional"
              />
            </FormField>
          </div>
          <FormField label="Tax ID / VAT (International)">
            <input
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={data.taxId}
              onChange={(e) => update("taxId", e.target.value)}
              placeholder="Optional"
            />
          </FormField>
        </section>
      </div>

      <div className="mt-4 flex gap-2 border-t border-[#EEF1F5] p-4">
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!dirty || saving}>
          Save Details
        </Button>
      </div>
    </form>
  );
}
