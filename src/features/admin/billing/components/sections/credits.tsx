"use client";

import { ArrowUpRight, PackagePlus, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LIMIT_META } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { addOnAvailable, count, creditsRemaining, effectiveLimits, formatLimit, money, shortDate, usageState } from "../../billing-data/selectors";
import { useBilling } from "../../store/billing-store";
import { Badge, Button, Section, SectionHeader, UsageMeter } from "../ui";
import { LIMIT_ICON } from "./plan-usage";

export function CreditsCard() {
  const { snapshot, flags } = useBillingView();
  const { gates, can, openFlow } = useBilling();
  const { credits, creditPacks } = snapshot;
  const total = credits.included + credits.purchased;
  const percent = total ? Math.round((credits.used / total) * 100) : 0;
  const state = usageState(credits.used, total);
  const cheapest = [...creditPacks].sort((a, b) => a.price / a.credits - b.price / b.credits)[0];

  return (
    <Section id="ai-credits" className="flex h-full flex-col">
      <SectionHeader
        id="ai-credits"
        icon={Sparkles}
        title="AI credits"
        description="Used by captions, replies, reports and SEO suggestions"
        badge={state !== "healthy" ? <Badge tone={state === "exhausted" ? "red" : "amber"}>{state === "exhausted" ? "Used up" : "Running low"}</Badge> : undefined}
      />
      <div className="flex flex-1 flex-col px-4 pb-4">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[22px] font-semibold leading-7 tracking-[-0.02em] tabular-nums text-[#0F1B3D]">{count(credits.used)}</span>
          <span className="text-[13px] tabular-nums text-[#6B7890]">/ {count(total)} used</span>
          <span className="ml-auto text-[12px] font-semibold tabular-nums text-[#3C4A66]">{percent}%</span>
        </p>
        <UsageMeter percent={percent} state={state} className="mt-1.5" label={`AI credits: ${percent}% used`} />
        <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
          <div>
            <dt className="text-[#6B7890]">Remaining</dt>
            <dd className="font-semibold tabular-nums text-[#0F1B3D]">{count(creditsRemaining(snapshot))}</dd>
          </div>
          <div>
            <dt className="text-[#6B7890]">Plan credits</dt>
            <dd className="font-semibold tabular-nums text-[#0F1B3D]">{count(credits.included)} / mo</dd>
          </div>
          <div>
            <dt className="text-[#6B7890]">{flags.cancelled ? "Status" : "Resets"}</dt>
            <dd className="font-semibold text-[#0F1B3D]">{flags.cancelled ? "Paused" : shortDate(credits.resetsAt)}</dd>
          </div>
        </dl>
        {credits.purchased > 0 && (
          <p className="mt-2 rounded-sm bg-[#ECFAF3] px-2.5 py-1.5 text-[12px] text-[#067647]">
            Includes {count(credits.purchased)} purchased credits{credits.purchasedExpireAt ? `, valid until ${shortDate(credits.purchasedExpireAt)}` : ""}. Plan credits are used first.
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3.5">
          <Button size="sm" variant="primary" icon={Plus} gate={gates?.buyCredits} onClick={() => openFlow({ kind: "credits" })}>
            Buy more credits
          </Button>
          {!flags.cancelled && (
            <Button size="sm" variant="secondary" icon={ArrowUpRight} gate={flags.trial ? can.canManageSubscription : gates?.upgrade} onClick={() => openFlow({ kind: "upgrade" })}>
              {flags.trial ? "Choose plan" : "Upgrade plan"}
            </Button>
          )}
          {cheapest && <span className="text-[11.5px] text-[#6B7890] sm:ml-auto">Packs from {money(cheapest.price)} + GST</span>}
        </div>
      </div>
    </Section>
  );
}

export function AddOnsCard() {
  const { snapshot, plan } = useBillingView();
  const { gates, openFlow } = useBilling();
  const limits = effectiveLimits(plan, snapshot.addOns, snapshot.addOnCatalog);
  const catalog = snapshot.addOnCatalog.filter((definition) => addOnAvailable(definition, plan.id));
  const active = snapshot.addOns.filter((addOn) => addOn.quantity > 0);
  const monthly = active.reduce((sum, addOn) => sum + addOn.quantity * (snapshot.addOnCatalog.find((item) => item.key === addOn.key)?.monthlyPrice ?? 0), 0);

  return (
    <Section id="add-ons" className="flex h-full flex-col">
      <SectionHeader
        id="add-ons"
        icon={PackagePlus}
        title="Add-ons"
        description="Extend a limit without changing plan"
        badge={active.length ? <Badge tone="green">{active.length} active · {money(monthly)} / mo</Badge> : <Badge>None active</Badge>}
      />
      {catalog.length === 0 ? (
        <p className="border-t border-[#EEF1F5] px-4 py-5 text-[12.5px] text-[#6B7890]">{plan.contactSales ? "Your contract includes custom limits. Contact your account manager to change them." : "No add-ons are offered on this plan."}</p>
      ) : (
        <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
          {catalog.map((definition) => {
            const addOn = active.find((item) => item.key === definition.key);
            const Icon = LIMIT_ICON[definition.limit];
            return (
              <li key={definition.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", addOn ? "bg-[#ECFAF3] text-[#067647]" : "bg-[#F3F5F9] text-[#475467]")}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-[160px] flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
                    {definition.name}
                    {addOn && <Badge tone="green">× {addOn.quantity} active</Badge>}
                  </p>
                  <p className="text-[12px] text-[#6B7890]">
                    {money(definition.monthlyPrice)} per {definition.unitLabel} / month · {LIMIT_META[definition.limit].label.toLowerCase()} now {formatLimit(definition.limit, limits[definition.limit])}
                  </p>
                </div>
                <Button size="xs" variant={addOn ? "secondary" : "ghost"} icon={addOn ? undefined : Plus} gate={gates?.addOns} onClick={() => openFlow({ kind: "addon", limit: definition.limit })}>
                  {addOn ? "Change" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {active.length === 0 && catalog.length > 0 && (
        <p className="mt-auto border-t border-[#EEF1F5] px-4 py-2.5 text-[11.5px] text-[#6B7890]">No add-ons yet. Added units are prorated for the rest of this period and renew with your plan.</p>
      )}
    </Section>
  );
}
