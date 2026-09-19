"use client";

import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, CreditCard, FileText, Headset, Lock, Minus, Sparkles, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { COMPARED_FEATURES, CYCLE_LABEL, FEATURE_META, LIMIT_META, SUPPORT_LABEL } from "../../billing-data/config";
import { useBillingView, useNow } from "../../billing-data/hooks";
import {
  EMAIL_RE,
  annualSavings,
  bestAnnualSavingsPercent,
  changeDirection,
  cycleUnit,
  featuresGained,
  formatLimit,
  formatUsed,
  longDate,
  methodLabel,
  money,
  monthlyEquivalent,
  periodPrice,
  planById,
  quoteChange,
  shortDate,
  type ChargeBreakdown,
} from "../../billing-data/selectors";
import type { BillingCycle, LimitKey, Plan, PlanId } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell, useFlowClose } from "../flow-shell";
import { Badge, Button, EstimatedBadge, FormField, MethodMark, Notice, Segmented, x } from "../ui";
import { PaymentMethodFlow } from "./payment-flows";

const STEPS = ["Choose plan", "Compare", "Review", "Confirm"];
const CARD_LIMITS: LimitKey[] = ["clients", "teamMembers", "channels", "aiCredits", "automations", "reports"];
const COMPARE_LIMITS: LimitKey[] = ["clients", "teamMembers", "channels", "aiCredits", "automationRuns", "reports", "storageGb"];

type Phase = "edit" | "processing" | "done" | "failed";

export function UpgradeFlow({ initialPlan, initialCycle }: { initialPlan?: PlanId; initialCycle?: BillingCycle }) {
  const { snapshot, plan: current, recommended, flags, primary } = useBillingView();
  const { closeFlow, openFlow, actions, upgradeDraft, setUpgradeDraft } = useBilling();
  const { subscription, plans } = snapshot;

  const resumed = !initialPlan && upgradeDraft !== null;
  const firstUp = [...plans].sort((a, b) => a.rank - b.rank).find((plan) => plan.rank > current.rank && !plan.contactSales);
  const [planId, setPlanId] = useState<PlanId>(initialPlan ?? upgradeDraft?.planId ?? (flags.trial || flags.cancelled ? current.id : (recommended ?? firstUp?.id ?? current.id)));
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle ?? upgradeDraft?.cycle ?? subscription.cycle);
  const [step, setStep] = useState(resumed ? 1 : initialPlan && !flags.cancelled ? 1 : 0);
  const [phase, setPhase] = useState<Phase>("edit");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [before] = useState(() => ({ plan: current, invoices: snapshot.invoices.length }));

  const now = useNow();
  const target = planById(plans, planId);
  const direction = changeDirection(snapshot, target, cycle);
  const quote = quoteChange(snapshot, planId, cycle, now);
  const chargeToday = quote.today && quote.today.total > 0 ? quote.today.total : 0;
  const actionable = direction === "upgrade" || direction === "trial_conversion" || direction === "reactivation";
  const needsMethod = !primary;
  const verb = direction === "trial_conversion" ? "Choose" : direction === "reactivation" ? "Reactivate" : "Upgrade";

  const title = flags.trial ? "Choose your plan" : flags.cancelled ? "Reactivate your subscription" : "Upgrade plan";
  const busy = phase === "processing";
  const dirty = phase === "edit" && (step > 0 || planId !== (recommended ?? firstUp?.id));

  const confirm = async () => {
    setPhase("processing");
    setError(null);
    const result = await actions.changePlan({ planId, cycle });
    if (result.ok) {
      setPhase("done");
      setUpgradeDraft(null);
      toast.success(direction === "trial_conversion" ? `${target.name} plan chosen` : direction === "reactivation" ? "Subscription reactivated" : `Upgraded to ${target.name}`);
    } else {
      setPhase("failed");
      setError({ message: direction === "upgrade" ? `Upgrade failed. ${result.message}` : result.message, hint: result.hint });
    }
  };

  const footer =
    phase === "done" ? (
      <DoneFooter hasInvoice={snapshot.invoices.length > before.invoices} />
    ) : (
      <>
        <CancelButton disabled={busy} />
        {step > 0 && (
          <Button variant="secondary" disabled={busy} onClick={() => { setStep(step - 1); setPhase("edit"); setError(null); }}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            variant="primary"
            iconRight={ArrowRight}
            disabled={!actionable || (step === 2 && needsMethod && direction !== "reactivation" && direction !== "upgrade")}
            disabledReason={
              direction === "downgrade"
                ? "That's a smaller plan. Use Downgrade on its card to check the impact first."
                : direction === "contact_sales"
                  ? "Enterprise is arranged with our sales team."
                  : direction === "same"
                    ? "You're already on this plan and cycle."
                    : direction === "cycle_change"
                      ? "Only the billing cycle changes. Use Change billing cycle."
                      : "Add a payment method to continue."
            }
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={busy}
            disabled={(chargeToday > 0 && !agreed) || needsMethod}
            disabledReason={needsMethod ? "Add a payment method first." : "Confirm the charge to continue."}
            onClick={confirm}
          >
            {direction === "trial_conversion" ? `Choose ${target.name}` : direction === "reactivation" ? "Confirm reactivation" : "Confirm Upgrade"}
          </Button>
        )}
      </>
    );

  return (
    <>
      <FlowShell
        open
        onOpenChange={(open) => !open && closeFlow()}
        width={step === 0 && phase === "edit" ? 1080 : 760}
        icon={Sparkles}
        title={title}
        description={phase === "done" ? undefined : `You're on ${current.name}${flags.trial ? " (trial)" : ""} · ${CYCLE_LABEL[subscription.cycle].toLowerCase()} billing`}
        steps={phase === "done" ? undefined : STEPS}
        step={step}
        locked={busy}
        dirty={dirty}
        guard={{ label: "your plan selection", saveLabel: "Save & leave", onSave: async () => { setUpgradeDraft({ planId, cycle }); toast("Selection saved", { description: "Open Upgrade plan again to pick up where you left off." }); return true; }, onDiscard: () => setUpgradeDraft(null) }}
        footer={footer}
      >
        {phase === "done" ? (
          <Success before={before.plan} targetId={planId} direction={direction} />
        ) : (
          <div className="space-y-3">
            {resumed && step === 1 && <Notice tone="blue" title="Resumed your saved selection">{target.name} · {CYCLE_LABEL[cycle]} billing. Change anything below.</Notice>}
            {step === 0 && (
              <ChoosePlan
                planId={planId}
                cycle={cycle}
                onCycle={setCycle}
                onSelect={setPlanId}
                onDowngrade={(id) => openFlow({ kind: "downgrade", planId: id })}
                onContactSales={() => openFlow({ kind: "sales" })}
              />
            )}
            {step === 1 && <Compare target={target} cycle={cycle} onCycle={setCycle} />}
            {step === 2 && <Review target={target} cycle={cycle} direction={direction} onAddMethod={() => setAddingMethod(true)} />}
            {step === 3 && (
              <ConfirmStep
                target={target}
                cycle={cycle}
                verb={verb}
                agreed={agreed}
                onAgree={setAgreed}
                chargeToday={chargeToday}
                error={error}
                onRetry={confirm}
                onChangeMethod={() => setAddingMethod(true)}
              />
            )}
          </div>
        )}
      </FlowShell>
      {addingMethod && <PaymentMethodFlow role="primary" onClose={() => setAddingMethod(false)} />}
    </>
  );
}

function CancelButton({ disabled }: { disabled?: boolean }) {
  const close = useFlowClose();
  return (
    <Button variant="ghost" onClick={close} disabled={disabled} className="mr-auto">
      Cancel
    </Button>
  );
}

function DoneFooter({ hasInvoice }: { hasInvoice: boolean }) {
  const { snapshot } = useBillingView();
  const { openFlow, closeFlow } = useBilling();
  const latest = snapshot.invoices[0];
  return (
    <>
      {hasInvoice && latest && (
        <Button variant="secondary" icon={FileText} onClick={() => openFlow({ kind: "invoice", invoiceId: latest.id })}>
          View invoice
        </Button>
      )}
      <Button variant="primary" onClick={closeFlow}>
        Done
      </Button>
    </>
  );
}

/* Step 1 ------------------------------------------------------------ */

function CycleToggle({ cycle, onCycle }: { cycle: BillingCycle; onCycle: (cycle: BillingCycle) => void }) {
  const { snapshot } = useBillingView();
  const best = bestAnnualSavingsPercent(snapshot.plans);
  return (
    <Segmented
      label="Billing cycle"
      value={cycle}
      onChange={onCycle}
      items={[
        { value: "monthly", label: "Monthly" },
        {
          value: "annual",
          label: (
            <span className="flex items-center gap-1.5">
              Annual
              {best !== null && <span className="rounded-sm bg-[#ECFAF3] px-1 text-[10.5px] font-bold text-[#067647]">Save {best}%</span>}
            </span>
          ),
        },
      ]}
    />
  );
}

function ChoosePlan({
  planId,
  cycle,
  onCycle,
  onSelect,
  onDowngrade,
  onContactSales,
}: {
  planId: PlanId;
  cycle: BillingCycle;
  onCycle: (cycle: BillingCycle) => void;
  onSelect: (id: PlanId) => void;
  onDowngrade: (id: PlanId) => void;
  onContactSales: () => void;
}) {
  const { snapshot, plan: current, recommended, flags, usage } = useBillingView();
  const { gates } = useBilling();
  const plans = [...snapshot.plans].sort((a, b) => a.rank - b.rank);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-[#3C4A66]">Prices exclude GST. {cycle === "annual" ? "Annual plans are billed once a year." : "Switch to annual to pay less per month."}</p>
        <CycleToggle cycle={cycle} onCycle={onCycle} />
      </div>
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === current.id && !flags.trial && !flags.cancelled;
          const isCurrentCycle = isCurrent && cycle === snapshot.subscription.cycle;
          const lower = plan.rank < current.rank && !flags.trial && !flags.cancelled;
          const selected = plan.id === planId;
          const price = monthlyEquivalent(plan, cycle);
          const savings = annualSavings(plan);
          const tooSmall = flags.trial || flags.cancelled ? usage.find((row) => row.key !== "aiCredits" && plan.limits[row.key] !== null && row.used > (plan.limits[row.key] ?? 0)) : undefined;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[10px] border bg-white p-3.5 transition",
                selected && !lower && !plan.contactSales ? "border-[#2563EB] ring-[3px] ring-[#2563EB]/12" : "border-[#E4E9F0]",
                isCurrentCycle && "bg-[#FAFBFD]",
              )}
            >
              <div className="flex min-h-[22px] flex-wrap items-center gap-1">
                <p className="mr-auto text-[14px] font-semibold text-[#0F1B3D]">{plan.name}</p>
                {isCurrent && <Badge tone="neutral">Current</Badge>}
                {(flags.trial || flags.cancelled) && plan.id === current.id && <Badge tone="violet">{flags.trial ? "Trialing" : "Previous"}</Badge>}
                {plan.id === recommended && <Badge tone="blue" icon={Sparkles}>Recommended</Badge>}
              </div>
              <p className="mt-0.5 min-h-8 text-[11.5px] leading-4 text-[#6B7890]">{plan.tagline}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-[#0F1B3D]">{price === null ? "Custom" : money(price)}</span>
                {price !== null && <span className="text-[12px] text-[#6B7890]">/ month</span>}
              </p>
              <p className="min-h-4 text-[11.5px] text-[#6B7890]">
                {plan.contactSales
                  ? "Annual contract"
                  : cycle === "annual"
                    ? `${money(periodPrice(plan, "annual") ?? 0)} billed yearly${savings ? ` · save ${money(savings.amount)}` : ""}`
                    : "Billed monthly"}
              </p>
              <ul className="mt-3 space-y-1 border-t border-[#EEF1F5] pt-2.5 text-[12px] text-[#3C4A66]">
                {CARD_LIMITS.map((key) => (
                  <li key={key} className="flex items-center justify-between gap-2">
                    <span>{LIMIT_META[key].label}</span>
                    <b className="font-semibold tabular-nums text-[#0F1B3D]">{formatLimit(key, plan.limits[key])}</b>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-2">
                  <span>Support</span>
                  <b className="text-right font-semibold text-[#0F1B3D]">{SUPPORT_LABEL[plan.support].replace(" support", "")}</b>
                </li>
              </ul>
              <div className="mt-auto pt-3">
                {plan.contactSales ? (
                  snapshot.salesRequest ? (
                    <p className="flex items-center gap-1.5 rounded-sm bg-[#ECFAF3] px-2 py-1.5 text-[12px] font-medium text-[#067647]">
                      <Check className="size-3.5" /> Request sent {shortDate(snapshot.salesRequest.requestedAt)}
                    </p>
                  ) : (
                    <Button variant="dark" size="sm" className="w-full" icon={Headset} onClick={onContactSales}>
                      Contact sales
                    </Button>
                  )
                ) : lower ? (
                  <Button variant="danger" size="sm" className="w-full" icon={TrendingDown} gate={gates?.downgrade} onClick={() => onDowngrade(plan.id)}>
                    Downgrade
                  </Button>
                ) : isCurrentCycle ? (
                  <Button variant="secondary" size="sm" className="w-full" disabled disabledReason="This is your current plan and billing cycle.">
                    Current plan
                  </Button>
                ) : tooSmall ? (
                  <Button variant="secondary" size="sm" className="w-full" disabled disabledReason={`Your ${LIMIT_META[tooSmall.key].label.toLowerCase()} (${formatUsed(tooSmall.key, tooSmall.used)}) is over this plan's limit.`}>
                    Too small for your usage
                  </Button>
                ) : (
                  <Button variant={selected ? "primary" : "secondary"} size="sm" className="w-full" icon={selected ? Check : undefined} onClick={() => onSelect(plan.id)} aria-pressed={selected}>
                    {selected ? "Selected" : isCurrent ? `Switch to ${cycle}` : "Select"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* Step 2 ------------------------------------------------------------ */

function Compare({ target, cycle, onCycle }: { target: Plan; cycle: BillingCycle; onCycle: (cycle: BillingCycle) => void }) {
  const { snapshot, plan: current, usage } = useBillingView();
  const [onlyDifferences, setOnlyDifferences] = useState(true);
  const rows: { label: string; current: string; next: string; usage?: string; better: boolean; same: boolean; warn?: boolean }[] = [
    ...COMPARE_LIMITS.map((key) => {
      const a = current.limits[key];
      const b = target.limits[key];
      const used = usage.find((row) => row.key === key)?.used ?? 0;
      const better = b === null ? a !== null : a !== null && b > a;
      return {
        label: LIMIT_META[key].label + (LIMIT_META[key].perPeriod && key !== "aiCredits" ? " / month" : ""),
        current: formatLimit(key, a),
        next: formatLimit(key, b),
        usage: formatUsed(key, used),
        better,
        same: a === b,
        warn: b !== null && used > b,
      };
    }),
    ...COMPARED_FEATURES.map((feature) => {
      const a = current.features.includes(feature);
      const b = target.features.includes(feature);
      return { label: FEATURE_META[feature].label, current: a ? "Included" : "—", next: b ? "Included" : "—", better: b && !a, same: a === b };
    }),
    { label: "Support", current: SUPPORT_LABEL[current.support], next: SUPPORT_LABEL[target.support], better: current.support !== target.support, same: current.support === target.support },
  ];
  const shown = onlyDifferences ? rows.filter((row) => !row.same) : rows;
  const gained = featuresGained(current, target).filter((feature) => !COMPARED_FEATURES.includes(feature));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[#0F1B3D]">
            {current.name} <span className="text-[#98A2B3]">→</span> {target.name}
          </p>
          <p className="text-[12px] text-[#6B7890]">{onlyDifferences ? `${shown.length} differences` : `${rows.length} rows`} · your usage shown for reference</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#3C4A66]">
            <input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} className="size-3.5 accent-[#2563EB]" />
            Only differences
          </label>
          <CycleToggle cycle={cycle} onCycle={onCycle} />
        </div>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-[#E4E9F0]">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-[#F8FAFC] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
              <th scope="col" className="px-3 py-2">Limit / feature</th>
              <th scope="col" className="px-3 py-2 text-right max-sm:hidden">Your usage</th>
              <th scope="col" className="px-3 py-2 text-right">{current.name}</th>
              <th scope="col" className="bg-[#EFF4FF] px-3 py-2 text-right text-[#1D4ED8]">{target.name}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.label} className="border-t border-[#EEF1F5]">
                <th scope="row" className="px-3 py-2 text-left font-medium text-[#24324F]">{row.label}</th>
                <td className="px-3 py-2 text-right tabular-nums text-[#6B7890] max-sm:hidden">{row.usage ?? ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[#3C4A66]">{row.current}</td>
                <td className={cn("bg-[#FAFCFF] px-3 py-2 text-right font-semibold tabular-nums", row.warn ? "text-[#C81E2B]" : row.better ? "text-[#067647]" : "text-[#0F1B3D]")}>
                  {row.better && <span aria-hidden="true">▲ </span>}
                  {row.next}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[#E4E9F0] bg-[#F8FAFC]">
              <th scope="row" className="px-3 py-2 text-left font-semibold text-[#0F1B3D]">Price</th>
              <td className="max-sm:hidden" />
              <td className="px-3 py-2 text-right tabular-nums text-[#3C4A66]">
                {money(periodPrice(current, snapshot.subscription.cycle) ?? 0)} / {cycleUnit(snapshot.subscription.cycle)}
              </td>
              <td className="bg-[#EFF4FF] px-3 py-2 text-right font-semibold tabular-nums text-[#0F1B3D]">
                {money(periodPrice(target, cycle) ?? 0)} / {cycleUnit(cycle)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {gained.length > 0 && (
        <p className="text-[12px] text-[#3C4A66]">
          Also unlocks: <b className="font-semibold text-[#0F1B3D]">{gained.map((feature) => FEATURE_META[feature].label).join(", ")}</b>
        </p>
      )}
    </>
  );
}

/* Step 3 ------------------------------------------------------------ */

function BreakdownRows({ breakdown }: { breakdown: ChargeBreakdown }) {
  return (
    <dl className="text-[12.5px]">
      {breakdown.lines.map((line, index) => (
        <div key={`${line.label}-${index}`} className="flex items-start justify-between gap-3 py-1">
          <dt className="min-w-0 text-[#3C4A66]">
            {line.label}
            {line.detail && <span className="block text-[11.5px] text-[#98A2B3]">{line.detail}</span>}
          </dt>
          <dd className={cn("shrink-0 tabular-nums", line.amount < 0 ? "text-[#067647]" : "text-[#0F1B3D]")}>{money(line.amount)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-[#EEF1F5] py-1 pt-1.5">
        <dt className="text-[#6B7890]">GST ({Math.round(breakdown.taxRate * 100)}%)</dt>
        <dd className="tabular-nums text-[#0F1B3D]">{money(breakdown.tax)}</dd>
      </div>
      <div className="flex justify-between gap-3 border-t border-[#EEF1F5] pt-1.5 text-[13.5px] font-semibold text-[#0F1B3D]">
        <dt>Total</dt>
        <dd className="tabular-nums">{money(breakdown.total)}</dd>
      </div>
    </dl>
  );
}

function Review({ target, cycle, direction, onAddMethod }: { target: Plan; cycle: BillingCycle; direction: ReturnType<typeof changeDirection>; onAddMethod: () => void }) {
  const { snapshot, plan: current, primary, flags } = useBillingView();
  const now = useNow();
  const quote = quoteChange(snapshot, target.id, cycle, now);
  const { subscription } = snapshot;

  const rows: [string, React.ReactNode][] = [
    ["Current plan", `${current.name}${flags.trial ? " (trial)" : flags.cancelled ? " (cancelled)" : ""}`],
    ["New plan", <b key="n" className="font-semibold text-[#0F1B3D]">{target.name}</b>],
    ["Current price", quote.currentPrice === null ? "Custom" : `${money(quote.currentPrice)} / ${cycleUnit(subscription.cycle)}`],
    ["New price", quote.newPrice === null ? "Custom" : `${money(quote.newPrice)} / ${cycleUnit(cycle)} + GST`],
    ["Billing cycle", cycle === subscription.cycle ? CYCLE_LABEL[cycle] : `${CYCLE_LABEL[subscription.cycle]} → ${CYCLE_LABEL[cycle]}`],
    ["Effective date", quote.immediate ? "Immediately, today" : longDate(quote.effectiveAt)],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-[8px] border border-[#E4E9F0] p-3.5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Change</p>
        <dl className="text-[12.5px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-[#F1F4F8] py-1.5 last:border-0">
              <dt className="text-[#6B7890]">{label}</dt>
              <dd className="text-right tabular-nums text-[#24324F]">{value}</dd>
            </div>
          ))}
        </dl>
        {subscription.status === "scheduled_cancellation" && (
          <p className="mt-2 rounded-sm bg-[#EFF4FF] px-2.5 py-1.5 text-[12px] text-[#1D4ED8]">Upgrading also withdraws your scheduled cancellation.</p>
        )}
        {subscription.pendingChange && (
          <p className="mt-2 rounded-sm bg-[#FFF7E8] px-2.5 py-1.5 text-[12px] text-[#B54708]">This replaces your scheduled {subscription.pendingChange.kind === "downgrade" ? "downgrade" : "billing cycle change"}.</p>
        )}
      </div>
      <div className="space-y-1">
        <div className="rounded-[8px] border border-[#E4E9F0] p-3.5">
          <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
            {direction === "upgrade" ? "Prorated amount due today" : direction === "reactivation" ? "Due today" : "Due today"}
            {quote.estimated && <EstimatedBadge />}
          </p>
          {quote.today ? (
            <>
              <BreakdownRows breakdown={quote.today} />
              {direction === "upgrade" && cycle === subscription.cycle && (
                <p className="mt-1.5 text-[11.5px] text-[#6B7890]">
                  Covers the {quote.remainingDays} days left until {shortDate(subscription.currentPeriodEnd)}.
                </p>
              )}
            </>
          ) : (
            <p className="text-[12.5px] text-[#3C4A66]">
              <b className="text-[15px] font-semibold text-[#0F1B3D]">₹0</b> — {direction === "trial_conversion" ? "your trial continues; nothing is charged until it ends." : "nothing is charged today."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#E4E9F0] p-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Next billing amount</p>
            <p className="text-[15px] font-semibold tabular-nums text-[#0F1B3D]">{money(quote.next?.total ?? 0)}</p>
            <p className="text-[11.5px] text-[#6B7890]">on {longDate(quote.nextAt)} · incl. GST</p>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#3C4A66]">
            <MethodMark method={primary} className="h-6 w-9 text-[8px]" />
            <span className="truncate">{methodLabel(primary)}</span>
          </div>
        </div>
        {!primary && (
          <Notice tone="amber" title="Add a payment method" actions={<Button size="sm" variant="primary" icon={CreditCard} onClick={onAddMethod}>Add payment method</Button>}>
            It&apos;s needed to {direction === "trial_conversion" ? "continue after the trial" : "take this payment"}.
          </Notice>
        )}
      </div>
    </div>
  );
}

/* Step 4 ------------------------------------------------------------ */

function ConfirmStep({
  target,
  cycle,
  verb,
  agreed,
  onAgree,
  chargeToday,
  error,
  onRetry,
  onChangeMethod,
}: {
  target: Plan;
  cycle: BillingCycle;
  verb: string;
  agreed: boolean;
  onAgree: (value: boolean) => void;
  chargeToday: number;
  error: { message: string; hint: string } | null;
  onRetry: () => void;
  onChangeMethod: () => void;
}) {
  const { snapshot, plan: current, primary } = useBillingView();
  const { closeFlow } = useBilling();
  const now = useNow();
  const quote = quoteChange(snapshot, target.id, cycle, now);
  const increases = CARD_LIMITS.filter((key) => target.limits[key] !== current.limits[key]);

  return (
    <div className="space-y-3">
      {error && (
        <FlowError
          message={error.message}
          hint={`${error.hint} You're still on ${current.name}.`}
          actions={
            <>
              <Button size="sm" variant="primary" onClick={onRetry}>Retry</Button>
              <Button size="sm" variant="secondary" icon={CreditCard} onClick={onChangeMethod}>Change payment method</Button>
              <Button size="sm" variant="ghost" onClick={closeFlow}>Cancel</Button>
            </>
          }
        />
      )}
      <div className="rounded-[10px] border border-[#D5E1FD] bg-[#F7F9FF] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#1D4ED8]">{verb === "Choose" ? "Your plan" : verb === "Reactivate" ? "Reactivating on" : "Upgrading to"}</p>
        <p className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em] text-[#0F1B3D]">
          {target.name} · {CYCLE_LABEL[cycle]}
        </p>
        <p className="text-[12.5px] text-[#3C4A66]">
          {money(periodPrice(target, cycle) ?? 0)} / {cycleUnit(cycle)} + GST · next billing {money(quote.next?.total ?? 0)} on {shortDate(quote.nextAt)}
        </p>
        {increases.length > 0 && (
          <ul className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {increases.map((key) => (
              <li key={key} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-[#3C4A66]">{LIMIT_META[key].label}</span>
                <span className="tabular-nums">
                  <span className="text-[#98A2B3]">{formatLimit(key, current.limits[key])}</span>
                  <ArrowRight className="mx-1 inline size-3 text-[#98A2B3]" />
                  <b className="font-semibold text-[#067647]">{formatLimit(key, target.limits[key])}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {chargeToday > 0 ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] border border-[#E4E9F0] p-3 text-[12.5px] text-[#24324F]">
          <input type="checkbox" checked={agreed} onChange={(event) => onAgree(event.target.checked)} className="mt-0.5 size-4 accent-[#2563EB]" />
          <span>
            Charge <b className="font-semibold tabular-nums">{money(chargeToday)}</b> {quote.estimated ? "(estimated) " : ""}today to <b className="font-semibold">{methodLabel(primary)}</b>, then{" "}
            <b className="font-semibold tabular-nums">{money(quote.next?.total ?? 0)}</b> every {cycleUnit(cycle)} from {shortDate(quote.nextAt)} until I change or cancel.
          </span>
        </label>
      ) : (
        <p className="flex items-start gap-2 rounded-[8px] border border-[#E4E9F0] p-3 text-[12.5px] text-[#3C4A66]">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-[#98A2B3]" />
          Nothing is charged today. {primary ? `${methodLabel(primary)} will be charged ${money(quote.next?.total ?? 0)} on ${longDate(quote.nextAt)}.` : "Add a payment method before then."}
        </p>
      )}
    </div>
  );
}

function Success({ before, targetId, direction }: { before: Plan; targetId: PlanId; direction: ReturnType<typeof changeDirection> }) {
  const { snapshot, next, plan } = useBillingView();
  const target = planById(snapshot.plans, targetId);
  const increases = CARD_LIMITS.filter((key) => target.limits[key] !== before.limits[key]);
  const gained = featuresGained(before, target);
  return (
    <div className="py-2">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ECFAF3] text-[#067647]">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-[16px] font-semibold text-[#0F1B3D]">
            {direction === "trial_conversion" ? `${plan.name} plan chosen` : direction === "reactivation" ? `Welcome back — you're on ${plan.name}` : `You're now on ${plan.name}`}
          </p>
          <p className="text-[12.5px] text-[#3C4A66]">
            {direction === "trial_conversion"
              ? `Your trial continues. First charge ${money(next.breakdown?.total ?? 0)} on ${next.date ? longDate(next.date) : "trial end"}.`
              : `New limits apply now. Next payment ${money(next.breakdown?.total ?? 0)} on ${next.date ? longDate(next.date) : "renewal"}.`}
          </p>
        </div>
      </div>
      {(increases.length > 0 || gained.length > 0) && (
        <div className="mt-4 grid gap-3 rounded-[8px] border border-[#E4E9F0] p-3.5 sm:grid-cols-2">
          {increases.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Limits increased</p>
              <ul className="space-y-0.5 text-[12.5px]">
                {increases.map((key) => (
                  <li key={key} className="flex justify-between gap-2">
                    <span className="text-[#3C4A66]">{LIMIT_META[key].label}</span>
                    <b className="font-semibold tabular-nums text-[#067647]">{formatLimit(key, target.limits[key])}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gained.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Features unlocked</p>
              <ul className="space-y-0.5 text-[12.5px] text-[#0F1B3D]">
                {gained.map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-[#067647]" />
                    {FEATURE_META[feature].label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {increases.length === 0 && gained.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#6B7890]">
          <Minus className="size-3.5" /> Same limits and features; only billing changed.
        </p>
      )}
    </div>
  );
}

/* Contact sales ----------------------------------------------------- */

export function SalesFlow() {
  const { snapshot } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(snapshot.profile.billingEmail);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const emailError = touched && !EMAIL_RE.test(email) ? "Enter a valid email address." : undefined;
  const messageError = touched && message.trim().length < 10 ? "Tell us a little about what you need (at least 10 characters)." : undefined;

  const submit = async () => {
    setTouched(true);
    if (!EMAIL_RE.test(email) || message.trim().length < 10) return false;
    setBusy(true);
    setError(null);
    const result = await actions.requestSales(message.trim(), email.trim());
    setBusy(false);
    if (!result.ok) {
      setError(`${result.message} ${result.hint}`);
      return false;
    }
    setDone(true);
    toast.success("Request sent to our sales team");
    return true;
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={520}
      icon={Headset}
      title="Talk to sales about Enterprise"
      description="Custom limits, SSO, a dedicated success manager and annual invoicing."
      locked={busy}
      dirty={!done && message.trim().length > 0}
      guard={{ label: "your message", onSave: submit, saveLabel: "Send & leave" }}
      footer={
        done ? (
          <Button variant="primary" onClick={closeFlow}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={closeFlow} disabled={busy}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={submit}>Send request</Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex items-start gap-3 py-2">
          <CheckCircle2 className="mt-0.5 size-5 text-[#067647]" />
          <div>
            <p className="text-[14px] font-semibold text-[#0F1B3D]">Request received</p>
            <p className="text-[12.5px] text-[#3C4A66]">Our team will reply to {email} within one business day. Your current plan doesn&apos;t change until you sign a new agreement.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message="Couldn't send your request" hint={error} />}
          <FormField label="Reply to" htmlFor="sales-email" error={emailError} required>
            <input id="sales-email" className={x.input} value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched(true)} />
          </FormField>
          <FormField label="What do you need?" htmlFor="sales-message" error={messageError} hint="E.g. number of clients, seats, SSO or procurement requirements." required>
            <textarea id="sales-message" rows={5} className={x.textarea} value={message} onChange={(event) => setMessage(event.target.value)} />
          </FormField>
        </div>
      )}
    </FlowShell>
  );
}
