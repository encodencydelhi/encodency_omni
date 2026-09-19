"use client";

import { useState } from "react";
import { CheckCircle2, Minus, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { LIMIT_META } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { count, creditsRemaining, formatLimit, money } from "../../billing-data/selectors";
import type { LimitKey } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell } from "../flow-shell";
import { Button, Notice } from "../ui";
import { LIMIT_ICON } from "../sections/plan-usage";

export function CreditsFlow() {
  const { snapshot, primary } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const [packId, setPackId] = useState(snapshot.creditPacks[1]?.id ?? snapshot.creditPacks[0]?.id ?? "");
  const [phase, setPhase] = useState<"choose" | "processing" | "done" | "failed">("choose");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const pack = snapshot.creditPacks.find((item) => item.id === packId);
  const before = creditsRemaining(snapshot);

  const buy = async () => {
    if (!pack) return;
    setPhase("processing");
    setError(null);
    const result = await actions.buyCredits(pack.id);
    if (result.ok) {
      setPhase("done");
      toast.success(`${count(pack.credits)} credits added`);
    } else {
      setPhase("failed");
      setError({ message: `Credit purchase failed. ${result.message}`, hint: result.hint });
    }
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={480}
      icon={Sparkles}
      title="Buy AI credits"
      description={phase === "done" ? undefined : "Charged immediately and added on top of your plan's monthly credits."}
      locked={phase === "processing"}
      footer={
        phase === "done" ? (
          <Button variant="primary" onClick={closeFlow}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={phase === "processing"}>Cancel</Button>
            <Button variant="primary" loading={phase === "processing"} disabled={!pack} onClick={buy}>
              {phase === "failed" ? "Retry purchase" : `Confirm purchase${pack ? ` · ${money(pack.price)}` : ""}`}
            </Button>
          </>
        )
      }
    >
      {phase === "done" && pack ? (
        <div className="flex items-start gap-3 py-2">
          <CheckCircle2 className="mt-0.5 size-5 text-[#067647]" />
          <p className="text-[12.5px] text-[#3C4A66]">
            <b className="text-[#0F1B3D]">{count(pack.credits)} credits</b> were added to your balance. New total: <b className="font-semibold tabular-nums text-[#0F1B3D]">{count(before + pack.credits)}</b> available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message={error.message} hint={error.hint} actions={<Button size="sm" variant="primary" onClick={buy}>Retry</Button>} />}
          <div className="grid grid-cols-3 gap-1.5">
            {snapshot.creditPacks.map((item) => {
              const perCredit = item.price / item.credits;
              const best = perCredit === Math.min(...snapshot.creditPacks.map((p) => p.price / p.credits));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPackId(item.id)}
                  aria-pressed={packId === item.id}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-[8px] border p-3 text-center transition",
                    packId === item.id ? "border-[#2563EB] bg-[#F5F8FF] ring-[3px] ring-[#2563EB]/10" : "border-[#DCE2EA] hover:border-[#C9D1DC]",
                  )}
                >
                  {best && <span className="absolute -top-2 rounded-sm bg-[#067647] px-1.5 py-px text-[9.5px] font-bold uppercase text-white">Best value</span>}
                  <span className="mt-1.5 text-[15px] font-semibold tabular-nums text-[#0F1B3D]">{count(item.credits)}</span>
                  <span className="text-[10.5px] text-[#6B7890]">credits</span>
                  <span className="mt-1 text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{money(item.price)}</span>
                </button>
              );
            })}
          </div>
          <dl className="rounded-[8px] border border-[#E4E9F0] p-3 text-[12.5px]">
            <div className="flex justify-between gap-3 border-b border-[#EEF1F5] pb-2">
              <dt className="text-[#6B7890]">Current balance</dt>
              <dd className="font-medium tabular-nums text-[#0F1B3D]">{count(before)} credits</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#EEF1F5] py-2">
              <dt className="text-[#6B7890]">Price {pack && `(+ GST: ${money(pack.price * (1 + snapshot.taxRate))})`}</dt>
              <dd className="font-medium tabular-nums text-[#0F1B3D]">{pack ? money(pack.price) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2 text-[13px] font-semibold text-[#0F1B3D]">
              <dt>New balance</dt>
              <dd className="tabular-nums">{pack ? count(before + pack.credits) : "—"} credits</dd>
            </div>
          </dl>
          {!primary && <Notice tone="amber" title="No payment method">Add one before buying credits.</Notice>}
        </div>
      )}
    </FlowShell>
  );
}

export function AddOnFlow({ limit }: { limit: LimitKey }) {
  const { snapshot, plan } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const definition = snapshot.addOnCatalog.find((item) => item.limit === limit && item.availableOn.includes(plan.id));
  const active = snapshot.addOns.find((item) => item.key === definition?.key);
  const [quantity, setQuantity] = useState(active?.quantity ?? 0);
  const [phase, setPhase] = useState<"edit" | "processing" | "done" | "failed">("edit");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const meta = LIMIT_META[limit];
  const Icon = LIMIT_ICON[limit];
  const currentLimit = plan.limits[limit];

  if (!definition) {
    return (
      <FlowShell open onOpenChange={(open) => !open && closeFlow()} width={440} icon={Icon} title="Add-on unavailable" footer={<Button variant="primary" onClick={closeFlow}>Close</Button>}>
        <p className="text-[12.5px] text-[#6B7890]">No add-on extends {meta.label.toLowerCase()} on your current plan.</p>
      </FlowShell>
    );
  }

  const delta = quantity - (active?.quantity ?? 0);
  const monthlyTotal = quantity * definition.monthlyPrice;

  const save = async () => {
    setPhase("processing");
    setError(null);
    const result = await actions.setAddOn(definition.key, quantity);
    if (result.ok) {
      setPhase("done");
      toast.success(quantity === 0 ? `${definition.name} removed` : `${definition.name} set to ${quantity}`);
    } else {
      setPhase("failed");
      setError({ message: result.message, hint: result.hint });
    }
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      width={460}
      icon={Icon}
      title={definition.name}
      description={definition.description}
      locked={phase === "processing"}
      footer={
        phase === "done" ? (
          <Button variant="primary" onClick={closeFlow}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={phase === "processing"}>Cancel</Button>
            <Button variant="primary" loading={phase === "processing"} disabled={delta === 0} disabledReason="Change the quantity first." onClick={save}>
              {phase === "failed" ? "Retry" : quantity === 0 ? "Remove add-on" : active ? "Update add-on" : "Add add-on"}
            </Button>
          </>
        )
      }
    >
      {phase === "done" ? (
        <div className="flex items-start gap-3 py-2">
          <CheckCircle2 className="mt-0.5 size-5 text-[#067647]" />
          <p className="text-[12.5px] text-[#3C4A66]">
            {meta.label} limit is now <b className="font-semibold tabular-nums text-[#0F1B3D]">{formatLimit(limit, currentLimit === null ? null : currentLimit + quantity * definition.unitSize)}</b>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message="Couldn't update this add-on" hint={error.hint === undefined ? error.message : `${error.message} ${error.hint}`} />}
          <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#E4E9F0] p-3.5">
            <div>
              <p className="text-[12.5px] font-semibold text-[#0F1B3D]">Quantity</p>
              <p className="text-[11.5px] text-[#6B7890]">
                {money(definition.monthlyPrice)} per {definition.unitLabel} / month
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="iconSm" variant="secondary" aria-label="Decrease quantity" disabled={quantity <= 0} onClick={() => setQuantity((value) => Math.max(0, value - 1))}>
                <Minus className="size-3.5" />
              </Button>
              <span className="w-8 text-center text-[15px] font-semibold tabular-nums text-[#0F1B3D]">{quantity}</span>
              <Button size="iconSm" variant="secondary" aria-label="Increase quantity" disabled={quantity >= definition.maxQuantity} onClick={() => setQuantity((value) => Math.min(definition.maxQuantity, value + 1))}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
          <dl className="rounded-[8px] border border-[#E4E9F0] p-3 text-[12.5px]">
            <div className="flex justify-between gap-3 border-b border-[#EEF1F5] pb-2">
              <dt className="text-[#6B7890]">
                {meta.label} limit {currentLimit !== null && `(base ${formatLimit(limit, currentLimit)})`}
              </dt>
              <dd className="font-medium tabular-nums text-[#0F1B3D]">{formatLimit(limit, currentLimit === null ? null : currentLimit + quantity * definition.unitSize)}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2 text-[13px] font-semibold text-[#0F1B3D]">
              <dt>New monthly cost</dt>
              <dd className="tabular-nums">{money(monthlyTotal)} / month</dd>
            </div>
          </dl>
          {delta > 0 && <p className="text-[11.5px] text-[#6B7890]">The added units are charged now, prorated for the rest of this billing period.</p>}
        </div>
      )}
    </FlowShell>
  );
}
