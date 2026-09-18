"use client";

import { useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { useBilling } from "../../store/billing-store";
import { FlowShell } from "../flow-shell";
import { Button } from "../ui";
import { cn } from "@/lib/utils/cn";

const CREDIT_PACKS = [
  { id: "pack_1k", credits: 1000, price: 500 },
  { id: "pack_5k", credits: 5000, price: 2000, popular: true },
  { id: "pack_10k", credits: 10000, price: 3500 },
];

export function CreditsFlow() {
  const { flow, snapshot, actions, closeFlow } = useBilling();

  const open = flow?.kind === "credits";

  const [saving, setSaving] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string>("pack_5k");

  if (!open || !snapshot) return null;

  const handleSubmit = async () => {
    setSaving(true);
    const res = await actions.buyCredits(selectedPackId);
    setSaving(false);

    if (res.ok) {
      toast.success("AI Credits purchased successfully", {
        icon: <Zap className="size-4 text-[#FDE047]" fill="currentColor" />
      });
      closeFlow();
    } else {
      toast.error(res.message, { description: res.hint });
    }
  };

  const selectedPack = CREDIT_PACKS.find(p => p.id === selectedPackId);

  return (
    <FlowShell
      open={open}
      onOpenChange={(v) => !v && closeFlow()}
      title="Buy AI Credits"
      description="Add more AI credits to generate content, analyze data, and power automations. Credits roll over until used."
      icon={Sparkles}
      width={560}
    >
      <div className="flex flex-col p-6">
        <div className="grid gap-1 sm:grid-cols-3">
          {CREDIT_PACKS.map(pack => (
            <label
              key={pack.id}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-3 rounded-sm border p-4 transition",
                selectedPackId === pack.id ? "border-[#2563EB] bg-[#F5F8FF] ring-[3px] ring-[#2563EB]/10" : "border-[#DCE2EA] bg-white hover:border-[#C9D1DC]"
              )}
            >
              <input
                type="radio"
                name="credit_pack"
                checked={selectedPackId === pack.id}
                onChange={() => setSelectedPackId(pack.id)}
                className="sr-only"
              />
              <div className="flex w-full flex-col items-center gap-1 text-center">
                <Sparkles className="size-5 text-[#8B5CF6]" />
                <span className="text-[16px] font-bold text-[#0F1B3D]">
                  {pack.credits.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-[#6B7890]">credits</span>
                {pack.popular && (
                  <span className="mt-2 text-[9px] font-semibold tracking-wider text-white bg-[#8B5CF6] px-2 py-0.5 rounded-full uppercase">
                    Popular
                  </span>
                )}
              </div>
              <div className="mt-auto border-t border-[#EEF1F5] pt-3 text-center w-full">
                <span className="text-[14px] font-semibold text-[#0F1B3D]">
                  ₹{pack.price.toLocaleString("en-IN")}
                </span>
              </div>
            </label>
          ))}
        </div>

        {selectedPack && (
          <div className="mt-6 rounded-md border border-[#DCE2EA] bg-[#F8FAFC] p-4 text-[13px]">
            <div className="flex justify-between py-1">
              <span className="text-[#6B7890]">{selectedPack.credits.toLocaleString("en-IN")} AI Credits</span>
              <span className="font-medium text-[#0F1B3D]">₹{selectedPack.price.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-[#DCE2EA] pt-2 text-[15px] font-semibold">
              <span className="text-[#0F1B3D]">Total Due</span>
              <span className="text-[#0F1B3D]">
                ₹{selectedPack.price.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 rounded-md bg-[#FFF0F1] p-4 text-[12px] text-[#EB0711]">
          <p>
            <strong>Note:</strong> By confirming, your payment method ending in <strong>{snapshot.paymentMethods[0]?.last4 || "4242"}</strong> will be charged immediately.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
          <Button variant="ghost" onClick={closeFlow} disabled={saving}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>
            Pay ₹{selectedPack?.price.toLocaleString("en-IN")}
          </Button>
        </div>
      </div>
    </FlowShell>
  );
}
