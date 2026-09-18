"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BillingCycle, PlanId } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowShell } from "../flow-shell";
import { Button } from "../ui";
import { Segmented } from "@/features/admin/x/components/ui";
import { cn } from "@/lib/utils/cn";

export function UpgradeFlow() {
  const { flow, snapshot, actions, closeFlow } = useBilling();
  
  const open = flow?.kind === "upgrade";
  const requestedPlan = open ? flow.planId : undefined;
  const requestedCycle = open ? flow.cycle : undefined;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>(requestedCycle || "annual");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(requestedPlan || null);

  if (!open || !snapshot) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!selectedPlanId) return;
    setSaving(true);
    const res = await actions.changePlan({ planId: selectedPlanId, cycle });
    setSaving(false);

    if (res.ok) {
      toast.success("Subscription upgraded successfully", {
        icon: <Sparkles className="size-4 text-[#EB0711]" />
      });
      closeFlow();
    } else {
      toast.error(res.message, { description: res.hint });
    }
  };

  const steps = ["Choose Plan", "Review & Pay"];
  const selectedPlan = snapshot.plans.find(p => p.id === selectedPlanId);
  const currentPlan = snapshot.plans.find(p => p.id === snapshot.subscription.planId);

  return (
    <FlowShell
      open={open}
      onOpenChange={(v) => !v && closeFlow()}
      title="Upgrade Subscription"
      description="Select a plan that fits your organization's needs."
      icon={Package}
      width={720}
      steps={steps}
      step={step}
    >
      <div className="flex flex-col">
        {step === 0 && (
          <div className="p-6">
            <div className="mb-6 flex justify-center">
              <Segmented
                label="Billing cycle"
                value={cycle}
                onChange={(c) => setCycle(c as BillingCycle)}
                items={[
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "Annually (Save 20%)" },
                ]}
              />
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {snapshot.plans.map(plan => (
                <label
                  key={plan.id}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-1 rounded-sm border p-4 transition",
                    selectedPlanId === plan.id ? "border-[#2563EB] bg-[#F5F8FF] ring-[3px] ring-[#2563EB]/10" : "border-[#DCE2EA] bg-white hover:border-[#C9D1DC]",
                    plan.rank < (currentPlan?.rank || 0) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <input 
                    type="radio" 
                    name="plan_choice" 
                    checked={selectedPlanId === plan.id} 
                    onChange={() => setSelectedPlanId(plan.id)} 
                    disabled={plan.rank < (currentPlan?.rank || 0)}
                    className="sr-only" 
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[13px] font-semibold text-[#0F1B3D]">{plan.name}</span>
                  </div>
                  <span className="text-[12px] text-[#6B7890]">{plan.tagline}</span>
                  
                  {plan.id === snapshot.subscription.planId && (
                    <div className="absolute right-4 top-4">
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-[#E9EDF3] text-[#3C4A66]">
                        Current
                      </span>
                    </div>
                  )}
                  <div className="mt-3">
                    <span className="text-[20px] font-semibold text-[#0F1B3D]">
                      {plan.contactSales ? "Custom" : `₹${(cycle === "annual" ? plan.annualMonthlyPrice : plan.monthlyPrice)?.toLocaleString("en-IN") || 0}`}
                    </span>
                    {!plan.contactSales && <span className="text-[11px] text-[#6B7890]"> / month</span>}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[12px] text-[#3C4A66]">
                    <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-[#078359]" /> {plan.limits.teamMembers} team members</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-[#078359]" /> {plan.limits.clients} clients</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-[#078359]" /> {plan.limits.aiCredits} AI credits</li>
                  </ul>
                </label>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
              <Button variant="ghost" onClick={closeFlow}>Cancel</Button>
              <Button variant="primary" disabled={!selectedPlanId || selectedPlanId === snapshot.subscription.planId} onClick={handleNext}>
                Continue <ArrowRight className="ml-2 size-3" />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && selectedPlan && (
          <div className="p-6">
            <div className="rounded-md border border-[#DCE2EA] bg-[#F8FAFC] p-4 text-[13px]">
              <div className="flex justify-between py-2 border-b border-[#DCE2EA]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#0F1B3D]">{selectedPlan.name} Plan</span>
                  <span className="text-[#6B7890]">{cycle === "annual" ? "Annual" : "Monthly"} billing</span>
                </div>
                <span className="font-semibold text-[#0F1B3D]">
                  ₹{(cycle === "annual" ? (selectedPlan.annualMonthlyPrice || 0) * 12 : (selectedPlan.monthlyPrice || 0)).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#6B7890]">Prorated refund for current plan</span>
                <span className="text-[#078359]">-₹0</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#DCE2EA] pt-2 text-[15px] font-semibold">
                <span className="text-[#0F1B3D]">Total Due Today</span>
                <span className="text-[#0F1B3D]">
                   ₹{(cycle === "annual" ? (selectedPlan.annualMonthlyPrice || 0) * 12 : (selectedPlan.monthlyPrice || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-md bg-[#FFF0F1] p-4 text-[12px] text-[#EB0711]">
              <p>
                <strong>Note:</strong> By confirming, your payment method ending in <strong>{snapshot.paymentMethods[0]?.last4 || "4242"}</strong> will be charged immediately.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
              <Button variant="ghost" onClick={handleBack} disabled={saving}>Back</Button>
              <Button variant="primary" loading={saving} onClick={handleSubmit}>
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </div>
    </FlowShell>
  );
}
