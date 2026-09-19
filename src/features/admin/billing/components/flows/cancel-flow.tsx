"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import { CalendarClock, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CANCEL_REASONS, type CancelReason } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { longDate } from "../../billing-data/selectors";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell } from "../flow-shell";
import { Button, ChoiceCard, x } from "../ui";

const STEPS = ["Reason", "Impact", "Confirm"];

export function CancelFlow() {
  const { snapshot, plan } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState<CancelReason>("too_expensive");
  const [feedback, setFeedback] = useState("");
  const [phase, setPhase] = useState<"edit" | "processing" | "done" | "failed">("edit");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const { subscription } = snapshot;
  const dependent = snapshot.usage.filter((row) => row.key === "automations" || row.key === "scheduledPosts").reduce((sum, row) => sum + row.used, 0);
  const channels = snapshot.usage.find((row) => row.key === "channels")?.used ?? 0;
  const retentionEnds = addDays(new Date(subscription.currentPeriodEnd), 90).toISOString();

  const confirm = async () => {
    setPhase("processing");
    setError(null);
    const label = CANCEL_REASONS.find((item) => item.value === reason)?.label ?? reason;
    const result = await actions.cancel(label, feedback.trim());
    if (result.ok) {
      setPhase("done");
      toast("Cancellation scheduled", { description: `Access continues until ${longDate(subscription.currentPeriodEnd)}.` });
    } else {
      setPhase("failed");
      setError({ message: `Cancellation failed. ${result.message}`, hint: result.hint });
    }
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={560}
      icon={XCircle}
      title="Cancel subscription"
      description={phase === "done" ? undefined : `${plan.name} plan`}
      steps={phase === "done" ? undefined : STEPS}
      step={step}
      locked={phase === "processing"}
      footer={
        phase === "done" ? (
          <Button variant="primary" onClick={closeFlow}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={phase === "processing"}>Keep subscription</Button>
            {step > 0 && (
              <Button variant="secondary" disabled={phase === "processing"} onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 2 ? (
              <Button variant="danger" onClick={() => setStep(step + 1)}>Continue</Button>
            ) : (
              <Button variant="dangerSolid" loading={phase === "processing"} onClick={confirm}>
                {phase === "failed" ? "Retry" : "Confirm cancellation"}
              </Button>
            )}
          </>
        )
      }
    >
      {phase === "done" ? (
        <div className="flex items-start gap-3 py-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FFF7E8] text-[#B54708]">
            <CalendarClock className="size-5" />
          </span>
          <div className="text-[12.5px] text-[#3C4A66]">
            <p className="text-[15px] font-semibold text-[#0F1B3D]">Scheduled cancellation</p>
            <p>
              Cancels on <b className="font-semibold text-[#0F1B3D]">{longDate(subscription.currentPeriodEnd)}</b>. You keep full access until then. Changed your mind? Resume any time before that from Subscription management.
            </p>
          </div>
        </div>
      ) : step === 0 ? (
        <div className="space-y-3">
          <p className="text-[12.5px] text-[#3C4A66]">Help us understand why you&apos;re leaving. This doesn&apos;t change what happens next.</p>
          <div className="space-y-1.5">
            {CANCEL_REASONS.map((item) => (
              <ChoiceCard key={item.value} name="cancel-reason" checked={reason === item.value} onSelect={() => setReason(item.value)} title={item.label} />
            ))}
          </div>
          <div>
            <label htmlFor="cancel-feedback" className="mb-1.5 block text-[12.5px] font-semibold text-[#24324F]">
              Anything else? <span className="font-normal text-[#98A2B3]">(optional)</span>
            </label>
            <textarea id="cancel-feedback" rows={3} className={x.textarea} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="What would have kept you?" />
          </div>
        </div>
      ) : step === 1 ? (
        <div className="space-y-3">
          {error && <FlowError message={error.message} hint={error.hint} />}
          <div className="rounded-[8px] border border-[#E4E9F0] p-3.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Access until</p>
            <p className="text-[18px] font-semibold text-[#0F1B3D]">{longDate(subscription.currentPeriodEnd)}</p>
            <p className="text-[12px] text-[#6B7890]">Full access and support continue until then — this isn&apos;t immediate.</p>
          </div>
          <ImpactRow icon={CalendarClock} title="Scheduled content" description={`Posts scheduled after ${longDate(subscription.currentPeriodEnd)} won't be published. Anything before that date still goes out.`} />
          <ImpactRow icon={CalendarClock} title="Automation" description={dependent > 0 ? `${dependent} active automations and scheduled posts stop running when access ends.` : "No active automations will be affected."} />
          <ImpactRow icon={CalendarClock} title="Integrations" description={channels > 0 ? `${channels} connected channels are disconnected when access ends. You'll need to reconnect them if you come back.` : "No connected channels."} />
          <ImpactRow icon={CalendarClock} title="Data retention" description={`Your clients, content and reports are kept until ${longDate(retentionEnds)} in case you return, then permanently deleted.`} />
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message={error.message} hint={error.hint} />}
          <div className="rounded-[8px] border border-[#FBD5D9] bg-[#FEF6F7] p-3.5">
            <p className="text-[13px] font-semibold text-[#C81E2B]">You&apos;re about to schedule cancellation of {plan.name}.</p>
            <p className="mt-1 text-[12.5px] text-[#3C4A66]">
              Access continues until <b className="font-semibold">{longDate(subscription.currentPeriodEnd)}</b>. No further payments will be taken. You can resume at any point before then.
            </p>
          </div>
        </div>
      )}
    </FlowShell>
  );
}

function ImpactRow({ icon: Icon, title, description }: { icon: typeof CalendarClock; title: string; description: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[8px] border border-[#E4E9F0] p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#6B7890]" />
      <div>
        <p className="text-[12.5px] font-semibold text-[#24324F]">{title}</p>
        <p className="text-[12px] leading-4 text-[#6B7890]">{description}</p>
      </div>
    </div>
  );
}

export function ResumeFlow() {
  const { snapshot, plan } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const { subscription } = snapshot;

  const resume = async () => {
    setBusy(true);
    setError(null);
    const result = await actions.resume();
    setBusy(false);
    if (result.ok) {
      toast.success("Subscription resumed");
      closeFlow();
    } else {
      setError({ message: result.message, hint: result.hint });
    }
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={440}
      icon={RotateCcw}
      title="Resume subscription"
      description={`${plan.name} plan`}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={busy}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={resume}>Resume subscription</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <FlowError message="Couldn't resume your subscription" hint={error.hint} />}
        {subscription.status === "scheduled_cancellation" ? (
          <p className="text-[12.5px] text-[#3C4A66]">
            Billing continues as before. Nothing is charged today — your next payment is {longDate(subscription.currentPeriodEnd)}, exactly as it would have been without the cancellation.
          </p>
        ) : (
          <p className="text-[12.5px] text-[#3C4A66]">Your subscription isn&apos;t scheduled to cancel.</p>
        )}
      </div>
    </FlowShell>
  );
}
