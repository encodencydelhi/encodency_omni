"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useBilling } from "../../store/billing-store";
import { FlowShell } from "../flow-shell";
import { Button, ChoiceCard } from "../ui";
import { CANCEL_REASONS, type CancelReason } from "../../billing-data/config";

export function CancellationFlow() {
  const { flow, snapshot, actions, closeFlow } = useBilling();
  
  const open = flow?.kind === "cancel";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [feedback, setFeedback] = useState("");

  if (!open || !snapshot) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!reason) return;
    setSaving(true);
    const res = await actions.cancel(reason, feedback);
    setSaving(false);

    if (res.ok) {
      toast.success("Subscription cancellation scheduled");
      closeFlow();
    } else {
      toast.error(res.message, { description: res.hint });
    }
  };

  const steps = ["Reason", "Impact Analysis", "Confirm"];

  return (
    <FlowShell
      open={open}
      onOpenChange={(v) => !v && closeFlow()}
      title="Cancel Subscription"
      description="We're sorry to see you go. Please tell us why you're cancelling."
      icon={ShieldAlert}
      width={600}
      steps={steps}
      step={step}
    >
      <div className="flex flex-col">
        {step === 0 && (
          <div className="p-6">
            <div className="grid gap-1 sm:grid-cols-2">
              {CANCEL_REASONS.map(r => (
                <ChoiceCard
                  key={r.value}
                  name="cancel_reason"
                  checked={reason === r.value}
                  onSelect={() => setReason(r.value)}
                  title={r.label}
                />
              ))}
            </div>

            {reason && (
              <div className="mt-6">
                <label className="text-[12px] font-semibold text-[#0F1B3D] mb-2 block">
                  Any additional feedback? (Optional)
                </label>
                <textarea
                  placeholder="How could we improve?"
                  value={feedback}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                  className="w-full text-[13px] rounded-sm border border-[#DCE2EA] bg-white p-3 outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  rows={3}
                />
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
              <Button variant="ghost" onClick={closeFlow}>Keep Subscription</Button>
              <Button variant="primary" disabled={!reason} onClick={handleNext}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="p-6">
            <div className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-4 flex gap-3">
              <AlertTriangle className="size-5 shrink-0 text-[#DC2626]" />
              <div className="text-[13px] text-[#991B1B]">
                <h4 className="font-semibold mb-1">Important: What happens next</h4>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li>Your workspace will remain active until the end of your current billing period ({new Date(snapshot.subscription.currentPeriodEnd).toLocaleDateString()}).</li>
                  <li>After that date, your organization will be downgraded to the Free Plan.</li>
                  <li>You will lose access to premium features, including advanced analytics and custom branding.</li>
                  <li>Connected channels and team members exceeding Free Plan limits will be paused.</li>
                  <li>You will not be charged again unless you manually reactivate your subscription.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
              <Button variant="ghost" onClick={handleBack} disabled={saving}>Back</Button>
              <Button variant="danger" onClick={handleNext}>
                I Understand
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6">
            <p className="text-[14px] text-[#0F1B3D] font-medium text-center py-4">
              Are you absolutely sure you want to cancel your subscription?
            </p>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
              <Button variant="ghost" onClick={handleBack} disabled={saving}>Go Back</Button>
              <Button variant="danger" loading={saving} onClick={handleSubmit}>
                Yes, Cancel Subscription
              </Button>
            </div>
          </div>
        )}
      </div>
    </FlowShell>
  );
}
