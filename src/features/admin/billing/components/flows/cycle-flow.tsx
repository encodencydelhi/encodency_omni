"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { CYCLE_LABEL } from "../../billing-data/config";
import { useBillingView, useNow } from "../../billing-data/hooks";
import { annualSavings, cycleUnit, longDate, methodLabel, money, periodPrice, quoteChange, shortDate } from "../../billing-data/selectors";
import type { BillingCycle } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell } from "../flow-shell";
import { Button, EstimatedBadge, Notice, Segmented } from "../ui";

export function CycleFlow() {
  const { snapshot, plan, primary } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const { subscription } = snapshot;
  const [cycle, setCycle] = useState<BillingCycle>(subscription.cycle === "monthly" ? "annual" : "monthly");
  const [phase, setPhase] = useState<"choose" | "processing" | "done" | "failed">("choose");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const now = useNow();
  const quote = quoteChange(snapshot, plan.id, cycle, now);
  const savings = annualSavings(plan);
  const changed = cycle !== subscription.cycle;

  const confirm = async () => {
    setPhase("processing");
    setError(null);
    const result = await actions.changePlan({ planId: plan.id, cycle });
    if (result.ok) {
      setPhase("done");
      toast.success(`Switched to ${CYCLE_LABEL[cycle].toLowerCase()} billing`);
    } else {
      setPhase("failed");
      setError({ message: result.message, hint: result.hint });
    }
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={480}
      icon={RefreshCcw}
      title="Change billing cycle"
      description={`${plan.name} plan · currently ${CYCLE_LABEL[subscription.cycle].toLowerCase()}`}
      locked={phase === "processing"}
      footer={
        phase === "done" ? (
          <Button variant="primary" onClick={closeFlow}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={phase === "processing"}>Cancel</Button>
            <Button variant="primary" loading={phase === "processing"} disabled={!changed} disabledReason="Choose a different cycle to switch." onClick={confirm}>
              {phase === "failed" ? "Retry" : "Confirm change"}
            </Button>
          </>
        )
      }
    >
      {phase === "done" ? (
        <div className="flex items-start gap-3 py-2">
          <CheckCircle2 className="mt-0.5 size-5 text-[#067647]" />
          <p className="text-[12.5px] text-[#3C4A66]">
            Now billed <b className="text-[#0F1B3D]">{CYCLE_LABEL[cycle].toLowerCase()}</b>. Next charge {money(quote.next?.total ?? 0)} on {shortDate(quote.nextAt)}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message="Couldn't change your billing cycle" hint={error.hint} />}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12.5px] text-[#3C4A66]">
              Current: <b className="font-semibold text-[#0F1B3D]">{CYCLE_LABEL[subscription.cycle]}</b>
            </p>
            <Segmented
              label="New billing cycle"
              value={cycle}
              onChange={setCycle}
              items={[
                { value: "monthly", label: "Monthly" },
                { value: "annual", label: savings ? `Annual · save ${savings.percent}%` : "Annual" },
              ]}
            />
          </div>
          <dl className="rounded-[8px] border border-[#E4E9F0] p-3.5 text-[12.5px]">
            <div className="flex justify-between gap-3 border-b border-[#EEF1F5] pb-2">
              <dt className="text-[#6B7890]">New total</dt>
              <dd className="font-semibold tabular-nums text-[#0F1B3D]">{money(periodPrice(plan, cycle) ?? 0)} / {cycleUnit(cycle)} + GST</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#EEF1F5] py-2">
              <dt className="flex items-center gap-1.5 text-[#6B7890]">
                Effective date {quote.estimated && <EstimatedBadge />}
              </dt>
              <dd className="font-medium text-[#0F1B3D]">{changed ? (quote.immediate ? "Today" : longDate(quote.effectiveAt)) : "—"}</dd>
            </div>
            {savings && cycle === "annual" && (
              <div className="flex justify-between gap-3 border-b border-[#EEF1F5] py-2">
                <dt className="text-[#6B7890]">Savings</dt>
                <dd className="font-medium text-[#067647]">{money(savings.amount)} / year ({savings.percent}%)</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-2 text-[13.5px] font-semibold text-[#0F1B3D]">
              <dt>Next charge</dt>
              <dd className="tabular-nums">{money(quote.next?.total ?? 0)}</dd>
            </div>
          </dl>
          <p className="text-[12px] text-[#6B7890]">
            {quote.immediate
              ? `Charged today to ${methodLabel(primary)}. Unused time on your current cycle is credited toward it.`
              : `Takes effect at your next renewal on ${shortDate(subscription.currentPeriodEnd)}. Nothing is charged today.`}
          </p>
        </div>
      )}
    </FlowShell>
  );
}

export function WithdrawChangeFlow() {
  const { snapshot } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const pending = snapshot.subscription.pendingChange;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    const result = await actions.withdrawPendingChange();
    setBusy(false);
    if (result.ok) {
      toast.success("Scheduled change withdrawn");
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
      icon={RefreshCcw}
      title="Keep your current plan"
      locked={busy}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={busy}>Never mind</Button>
          <Button variant="primary" loading={busy} onClick={withdraw}>Withdraw scheduled change</Button>
        </>
      }
    >
      {!pending ? (
        <p className="text-[12.5px] text-[#6B7890]">There&apos;s nothing scheduled.</p>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message="Couldn't withdraw the change" hint={error.hint} />}
          <Notice tone="blue" title={pending.kind === "downgrade" ? "Scheduled downgrade" : "Scheduled billing cycle change"}>
            Takes effect {longDate(pending.effectiveAt)}. Withdrawing it keeps everything exactly as it is now.
          </Notice>
        </div>
      )}
    </FlowShell>
  );
}
