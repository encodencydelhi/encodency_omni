"use client";

import { ArrowDownRight, ArrowUpRight, Check, FlaskConical, History, ListChecks, Lock, RotateCcw, Settings2, Sparkles, TrendingDown, Undo2, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { CHANGE_LABEL, CYCLE_LABEL, FEATURE_META, FEATURE_ORDER, ROLE_LABEL, SCENARIO_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { longDate, planById, shortDate } from "../../billing-data/selectors";
import type { BillingRole, BillingScenario, SubscriptionChange } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { Badge, Button, Hint, Section, SectionHeader, SelectMenu, SettingRow, x } from "../ui";

export function PlanFeaturesCard() {
  const { snapshot, plan, flags } = useBillingView();
  const { openFlow, can, gates } = useBilling();
  const included = FEATURE_ORDER.filter((feature) => plan.features.includes(feature));
  const missing = FEATURE_ORDER.filter((feature) => !plan.features.includes(feature));
  const firstPlanWith = (feature: (typeof FEATURE_ORDER)[number]) =>
    [...snapshot.plans].sort((a, b) => a.rank - b.rank).find((item) => item.rank > plan.rank && item.features.includes(feature))?.name;

  return (
    <Section id="plan-features">
      <SectionHeader
        id="plan-features"
        icon={ListChecks}
        title="Plan features"
        description={`${included.length} of ${FEATURE_ORDER.length} features included on ${plan.name}`}
        actions={
          !flags.cancelled && missing.length > 0 && (
            <Button size="sm" variant="secondary" gate={flags.trial ? can.canManageSubscription : gates?.upgrade} onClick={() => openFlow({ kind: "upgrade" })}>
              Compare plans
            </Button>
          )
        }
      />
      <ul className="grid grid-cols-1 gap-x-4 border-t border-[#EEF1F5] px-4 py-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {included.map((feature) => (
          <li key={feature} className="flex items-start gap-2 py-1.5">
            <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-[#ECFAF3] text-[#067647]">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <Hint text={FEATURE_META[feature].description}>
              <span tabIndex={0} className={cn("cursor-default rounded text-[12.5px] text-[#24324F]", x.focus)}>
                {FEATURE_META[feature].label}
              </span>
            </Hint>
          </li>
        ))}
        {missing.map((feature) => (
          <li key={feature} className="flex items-start gap-2 py-1.5">
            <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-[#F1F4F8] text-[#98A2B3]">
              <Lock className="size-2.5" />
            </span>
            <span className="text-[12.5px] text-[#98A2B3]">
              {FEATURE_META[feature].label}
              {firstPlanWith(feature) && <span className="ml-1 text-[11px]">· {firstPlanWith(feature)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const CHANGE_ICON: Record<SubscriptionChange["kind"], typeof History> = {
  upgrade: ArrowUpRight,
  downgrade: ArrowDownRight,
  cycle_change: Settings2,
  cancellation: XCircle,
  reactivation: Sparkles,
  resume: RotateCcw,
  trial_conversion: Sparkles,
};

export function SubscriptionManagement() {
  const { snapshot, plan, flags } = useBillingView();
  const { gates, can, openFlow } = useBilling();
  const { subscription } = snapshot;
  const history = subscription.history.slice(0, 6);
  const pending = subscription.pendingChange;

  return (
    <Section id="subscription-management">
      <SectionHeader id="subscription-management" icon={Settings2} title="Subscription management" description="Plan changes, cancellation and history" />
      <div className="grid border-t border-[#EEF1F5] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="px-4 py-1 lg:border-r lg:border-[#EEF1F5]">
          {pending && (
            <SettingRow
              title={pending.kind === "downgrade" ? `Downgrade to ${planById(snapshot.plans, pending.toPlan).name} scheduled` : `Switch to ${CYCLE_LABEL[pending.toCycle].toLowerCase()} billing scheduled`}
              description={`Takes effect ${longDate(pending.effectiveAt)}. Until then nothing changes.`}
              control={
                <Button size="sm" variant="secondary" icon={Undo2} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "withdraw" })}>
                  {pending.kind === "downgrade" ? `Keep ${plan.name}` : "Keep current cycle"}
                </Button>
              }
            />
          )}
          {flags.cancelling ? (
            <SettingRow
              title="Resume subscription"
              description={`Your subscription is set to end on ${longDate(subscription.cancelAt ?? subscription.currentPeriodEnd)}. Resume to keep billing as before.`}
              control={
                <Button size="sm" variant="primary" icon={RotateCcw} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "resume" })}>
                  Resume subscription
                </Button>
              }
            />
          ) : flags.cancelled ? (
            <SettingRow
              title="Reactivate subscription"
              description="Pick a plan to restore access. Your data is still here."
              control={
                <Button size="sm" variant="primary" icon={Sparkles} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "upgrade", planId: plan.id })}>
                  Reactivate
                </Button>
              }
            />
          ) : null}
          {!flags.cancelled && !flags.trial && (
            <>
              <SettingRow
                title="Downgrade plan"
                description="Move to a smaller plan at the end of this period. We check your usage against the new limits first."
                control={
                  <Button size="sm" variant="danger" icon={TrendingDown} gate={gates?.downgrade} onClick={() => openFlow({ kind: "downgrade" })}>
                    Downgrade
                  </Button>
                }
              />
              {!flags.cancelling && (
                <SettingRow
                  title="Cancel subscription"
                  description={`You keep access until ${longDate(subscription.currentPeriodEnd)}. Nothing is deleted straight away.`}
                  control={
                    <Button size="sm" variant="danger" icon={XCircle} gate={gates?.cancel} onClick={() => openFlow({ kind: "cancel" })}>
                      Cancel subscription
                    </Button>
                  }
                />
              )}
            </>
          )}
          {flags.trial && (
            <SettingRow
              title="Your trial"
              description={`Nothing is charged. When the trial ends on ${subscription.trialEndsAt ? longDate(subscription.trialEndsAt) : "its end date"}, the workspace pauses unless you've chosen a plan.`}
              control={
                <Button size="sm" variant="primary" icon={Sparkles} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "upgrade" })}>
                  Choose plan
                </Button>
              }
            />
          )}
        </div>
        <div className="px-4 py-3 max-lg:border-t max-lg:border-[#EEF1F5]">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
            <History className="size-3.5" />
            Subscription history
          </p>
          {history.length === 0 ? (
            <p className="py-3 text-[12.5px] text-[#6B7890]">No changes yet. Upgrades, cycle changes and cancellations will be listed here.</p>
          ) : (
            <ol className="relative space-y-2.5 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-[#E4E9F0]">
              {history.map((change) => {
                const Icon = CHANGE_ICON[change.kind];
                const from = planById(snapshot.plans, change.fromPlan).name;
                const to = planById(snapshot.plans, change.toPlan).name;
                const detail =
                  change.kind === "upgrade" || change.kind === "downgrade" || change.kind === "trial_conversion" || change.kind === "reactivation"
                    ? `${from === to ? to : `${from} → ${to}`} · ${CYCLE_LABEL[change.toCycle]}`
                    : change.kind === "cycle_change"
                      ? `${CYCLE_LABEL[change.fromCycle]} → ${CYCLE_LABEL[change.toCycle]}`
                      : change.reason ?? "";
                return (
                  <li key={change.id} className="relative flex gap-2.5">
                    <span className={cn("relative z-[1] grid size-6 shrink-0 place-items-center rounded-full ring-2 ring-white", change.status === "withdrawn" ? "bg-[#F1F4F8] text-[#98A2B3]" : change.status === "scheduled" ? "bg-[#FFF7E8] text-[#B54708]" : "bg-[#EFF4FF] text-[#1D4ED8]")}>
                      <Icon className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
                        <span className={cn(change.status === "withdrawn" && "text-[#98A2B3] line-through")}>{CHANGE_LABEL[change.kind]}</span>
                        <Badge tone={change.status === "applied" ? "green" : change.status === "scheduled" ? "amber" : "neutral"}>
                          {change.status === "applied" ? "Applied" : change.status === "scheduled" ? `Scheduled · ${shortDate(change.effectiveAt)}` : "Withdrawn"}
                        </Badge>
                      </p>
                      <p className="truncate text-[12px] text-[#3C4A66]">{detail}</p>
                      <p className="text-[11.5px] text-[#98A2B3]">
                        {shortDate(change.requestedAt)} · {change.requestedBy}
                        {change.note ? ` · ${change.note}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </Section>
  );
}

export function PreviewPanel() {
  const { scenario, setScenario, role, setRole, simulation, simulate } = useBilling();
  return (
    <section className={cn(x.card, "border-dashed")} aria-labelledby="billing-preview-title">
      <SectionHeader
        id="billing-preview"
        icon={FlaskConical}
        title={<span id="billing-preview-title">Preview states</span>}
        badge={<Badge tone="violet">Mock mode only</Badge>}
        description="Try every subscription state, role and failure path before the billing service exists. Hidden when mock mode is off."
      />
      <div className="grid gap-x-6 border-t border-[#EEF1F5] px-4 lg:grid-cols-2">
        <SettingRow
          title="Subscription state"
          description={SCENARIO_LABEL[scenario].description}
          control={
            <SelectMenu<BillingScenario>
              label="Subscription state"
              value={scenario}
              onChange={setScenario}
              align="end"
              className="min-w-[190px]"
              options={(Object.keys(SCENARIO_LABEL) as BillingScenario[]).map((value) => ({ value, label: SCENARIO_LABEL[value].label }))}
            />
          }
        />
        <SettingRow
          title="View as role"
          description="Controls which actions are enabled and the explanations shown when they aren't."
          control={
            <SelectMenu<BillingRole>
              label="View as role"
              value={role}
              onChange={(value) => setRole(value)}
              align="end"
              className="min-w-[190px]"
              options={(Object.keys(ROLE_LABEL) as BillingRole[]).map((value) => ({ value, label: ROLE_LABEL[value] }))}
            />
          }
        />
        <SettingRow
          title="Fail the next payment"
          description="The next upgrade, credit purchase, card save or invoice payment is declined, so you can check recovery."
          control={<Switch checked={simulation.failNextPayment} onCheckedChange={(failNextPayment) => simulate({ failNextPayment })} aria-label="Fail the next payment" />}
        />
        <SettingRow
          title="Loading and unavailable states"
          description="Hold the page in its loading skeleton, or show the billing-unavailable state and its retry."
          control={
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[12px] text-[#3C4A66]">
                <Switch checked={simulation.loading} onCheckedChange={(loading) => simulate({ loading })} aria-label="Show loading skeletons" />
                Loading
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-[#3C4A66]">
                <Switch checked={simulation.loadError} onCheckedChange={(loadError) => simulate({ loadError })} aria-label="Simulate unavailable data" />
                Unavailable
              </label>
            </div>
          }
        />
      </div>
    </section>
  );
}
