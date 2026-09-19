"use client";

import { ArrowUpRight, Check, Layers, Lock } from "lucide-react";
import { FEATURE_META, FEATURE_ORDER, LIMIT_META, LIMIT_ORDER, SUPPORT_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { cycleUnit, formatLimit, formatUsed, money, periodPrice } from "../../billing-data/selectors";
import { useBilling } from "../../store/billing-store";
import { FlowShell } from "../flow-shell";
import { Button } from "../ui";
import { LIMIT_ICON } from "../sections/plan-usage";

export function PlanDetailsFlow() {
  const { snapshot, plan, usage, flags } = useBillingView();
  const { closeFlow, gates, openFlow } = useBilling();
  const price = periodPrice(plan, snapshot.subscription.cycle);

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      variant="sheet"
      width={480}
      icon={Layers}
      title={`${plan.name} plan`}
      description={plan.tagline}
      footer={
        !flags.trial && !flags.cancelled && (
          <Button
            variant="primary"
            icon={ArrowUpRight}
            gate={gates?.upgrade}
            onClick={() => {
              closeFlow();
              openFlow({ kind: "upgrade" });
            }}
          >
            Upgrade plan
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="rounded-[8px] border border-[#E4E9F0] p-3.5">
          <p className="flex items-baseline gap-1">
            <span className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-[#0F1B3D]">{price === null ? "Custom pricing" : money(price)}</span>
            {price !== null && <span className="text-[12px] text-[#6B7890]">/ {cycleUnit(snapshot.subscription.cycle)} + GST</span>}
          </p>
          <p className="mt-0.5 text-[12px] text-[#6B7890]">{SUPPORT_LABEL[plan.support]}</p>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Included limits</p>
          <ul className="divide-y divide-[#EEF1F5] rounded-[8px] border border-[#E4E9F0]">
            {LIMIT_ORDER.map((key) => {
              const Icon = LIMIT_ICON[key];
              const row = usage.find((item) => item.key === key);
              return (
                <li key={key} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                  <span className="flex items-center gap-2 text-[#3C4A66]">
                    <Icon className="size-3.5 text-[#98A2B3]" />
                    {LIMIT_META[key].label}
                  </span>
                  <span className="tabular-nums">
                    <b className="font-semibold text-[#0F1B3D]">{formatLimit(key, plan.limits[key])}</b>
                    {row && <span className="ml-1.5 text-[11.5px] text-[#98A2B3]">· you use {formatUsed(key, row.used)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Features</p>
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {FEATURE_ORDER.map((feature) => {
              const included = plan.features.includes(feature);
              return (
                <li key={feature} className="flex items-start gap-2 py-1">
                  {included ? <Check className="mt-0.5 size-3.5 shrink-0 text-[#067647]" /> : <Lock className="mt-0.5 size-3 shrink-0 text-[#98A2B3]" />}
                  <span className={`text-[12.5px] ${included ? "text-[#24324F]" : "text-[#98A2B3]"}`}>{FEATURE_META[feature].label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </FlowShell>
  );
}
