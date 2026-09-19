"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { LIMIT_META } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { count, downgradeImpact, longDate, money, periodPrice, planById, shortDate } from "../../billing-data/selectors";
import type { DowngradeResolution, LimitKey, PlanId } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell } from "../flow-shell";
import { Badge, Button, Notice } from "../ui";
import { LIMIT_ICON } from "../sections/plan-usage";

export function DowngradeFlow({ initialPlan }: { initialPlan?: PlanId }) {
  const { snapshot, plan: current } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const lower = [...snapshot.plans].filter((plan) => plan.rank < current.rank && !plan.contactSales).sort((a, b) => b.rank - a.rank);
  const [planId, setPlanId] = useState<PlanId>(initialPlan ?? lower[0]?.id ?? current.id);
  const target = planById(snapshot.plans, planId);
  const { conflicts, impacts } = useMemo(() => downgradeImpact(snapshot, planId), [snapshot, planId]);
  const [keep, setKeep] = useState<Partial<Record<LimitKey, Set<string>>>>({});
  const [phase, setPhase] = useState<"edit" | "processing" | "done" | "failed">("edit");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);

  // Nothing is archived by default — everything currently in use starts kept, so a real conflict shows as over the limit until the admin deliberately chooses what to drop.
  const keptFor = (key: LimitKey) => keep[key] ?? new Set(snapshot.entities[key]?.map((entity) => entity.id));
  const unresolved = conflicts.filter((conflict) => keptFor(conflict.key).size > conflict.newLimit);

  const toggle = (key: LimitKey, id: string, locked?: boolean) => {
    if (locked) return;
    setKeep((current) => {
      const next = new Set(keptFor(key));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...current, [key]: next };
    });
  };

  const confirm = async () => {
    setPhase("processing");
    setError(null);
    const resolution: DowngradeResolution = { keep: Object.fromEntries(conflicts.map((conflict) => [conflict.key, [...keptFor(conflict.key)]])) };
    const result = await actions.changePlan({ planId, cycle: snapshot.subscription.cycle, resolution });
    if (result.ok) {
      setPhase("done");
      toast.success(`Downgrade to ${target.name} scheduled`);
    } else {
      setPhase("failed");
      setError({ message: result.message, hint: result.hint });
    }
  };

  if (lower.length === 0) {
    return (
      <FlowShell open onOpenChange={(open) => !open && closeFlow()} width={440} icon={TrendingDown} title="No smaller plan available" footer={<Button variant="primary" onClick={closeFlow}>Close</Button>}>
        <p className="text-[12.5px] text-[#6B7890]">{current.name} is already the lowest plan.</p>
      </FlowShell>
    );
  }

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={640}
      icon={TrendingDown}
      title="Downgrade plan"
      description={phase === "done" ? undefined : `${current.name} → ${target.name}, effective at your next renewal`}
      locked={phase === "processing"}
      footer={
        phase === "done" ? (
          <Button variant="primary" onClick={closeFlow}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={phase === "processing"}>Cancel</Button>
            <Button
              variant="danger"
              loading={phase === "processing"}
              disabled={unresolved.length > 0}
              disabledReason={unresolved.length > 0 ? `Resolve ${unresolved.length} limit conflict${unresolved.length === 1 ? "" : "s"} first.` : undefined}
              onClick={confirm}
            >
              {phase === "failed" ? "Retry" : `Schedule downgrade to ${target.name}`}
            </Button>
          </>
        )
      }
    >
      {phase === "done" ? (
        <div className="flex items-start gap-3 py-2">
          <CheckCircle2 className="mt-0.5 size-5 text-[#067647]" />
          <div className="text-[12.5px] text-[#3C4A66]">
            <p className="text-[15px] font-semibold text-[#0F1B3D]">Downgrade to {target.name} scheduled</p>
            <p>
              Takes effect {longDate(snapshot.subscription.currentPeriodEnd)}. You keep {current.name}&apos;s limits and price until then. You can withdraw it any time before that from Subscription management.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message="Downgrade failed" hint={error.hint} />}
          {lower.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {lower.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setPlanId(plan.id)}
                  aria-pressed={planId === plan.id}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-[12.5px] font-semibold transition",
                    planId === plan.id ? "border-[#2563EB] bg-[#F5F8FF] text-[#0F1B3D]" : "border-[#DCE2EA] text-[#3C4A66] hover:border-[#C9D1DC]",
                  )}
                >
                  {plan.name} · {money(periodPrice(plan, snapshot.subscription.cycle) ?? 0)}/{snapshot.subscription.cycle === "annual" ? "yr" : "mo"}
                </button>
              ))}
            </div>
          )}

          {conflicts.length === 0 && impacts.length === 0 ? (
            <Notice tone="green" title="No conflicts">Your current usage fits within {target.name}&apos;s limits.</Notice>
          ) : (
            <Notice tone="red" icon={AlertTriangle} title={`${conflicts.reduce((sum, c) => sum + c.over, 0) + impacts.length} thing${conflicts.length + impacts.length === 1 ? "" : "s"} need attention`}>
              Choose what to keep for each limit below. Anything not kept is archived — not deleted — when the downgrade takes effect, and can be restored by upgrading again.
            </Notice>
          )}

          {conflicts.map((conflict) => {
            const meta = LIMIT_META[conflict.key];
            const Icon = LIMIT_ICON[conflict.key];
            const selected = keptFor(conflict.key);
            const over = selected.size > conflict.newLimit;
            return (
              <div key={conflict.key} className={cn("rounded-[8px] border p-3", over ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#C6EFD9] bg-[#F4FCF8]")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
                    <Icon className="size-4 text-[#6B7890]" />
                    {count(conflict.used)} {meta.label.toLowerCase()} <span className="font-normal text-[#6B7890]">→ {target.name} allows {conflict.newLimit}</span>
                  </p>
                  <Badge tone={over ? "red" : "green"}>
                    {selected.size} of {conflict.newLimit} kept{over ? ` · ${selected.size - conflict.newLimit} over` : ""}
                  </Badge>
                </div>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {conflict.entities.map((entity) => {
                    const checked = selected.has(entity.id);
                    return (
                      <li key={entity.id}>
                        <label className={cn("flex cursor-pointer items-center gap-2 rounded-sm border px-2 py-1.5 text-[12px]", checked ? "border-[#DCE2EA] bg-white" : "border-dashed border-[#E4E9F0] bg-white/60 text-[#98A2B3]", entity.locked && "cursor-not-allowed")}>
                          <input type="checkbox" checked={checked} disabled={entity.locked} onChange={() => toggle(conflict.key, entity.id, entity.locked)} className="size-3.5 accent-[#2563EB]" />
                          <span className="min-w-0 flex-1 truncate">
                            <span className={cn("font-medium", checked ? "text-[#24324F]" : "text-[#98A2B3] line-through")}>{entity.name}</span>
                            {entity.locked && <Lock className="ml-1 inline size-3 text-[#98A2B3]" />}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {impacts.length > 0 && (
            <div className="rounded-[8px] border border-[#FBE3B6] bg-[#FFFAF0] p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#B54708]">Other changes</p>
              <ul className="space-y-1 text-[12.5px] text-[#3C4A66]">
                {impacts.map((impact) => (
                  <li key={impact.key} className="flex items-start gap-1.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#B54708]" />
                    {impact.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[12px] text-[#6B7890]">
            You keep {current.name} and its price until {shortDate(snapshot.subscription.currentPeriodEnd)}. The downgrade — and any conflicts left unresolved — only applies then.
          </p>
        </div>
      )}
    </FlowShell>
  );
}
