"use client";

import { useState } from "react";
import { CalendarClock, CreditCard, Lock, MoreHorizontal, Plus, ReceiptText, RotateCw, ShieldCheck, Star, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { removeMethodGate } from "../../billing-data/capability-provider";
import { useBillingView, useHydrated } from "../../billing-data/hooks";
import { daysUntil, inDays, longDate, methodExpiry, methodHealth, methodLabel, money, shortDate, type NextPaymentState } from "../../billing-data/selectors";
import type { PaymentMethod } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { ActionMenu, Badge, Button, ConfirmDialog, MethodMark, Section, SectionHeader, Skeleton, buttonClass, x } from "../ui";

export function PaymentMethodCard() {
  const { primary, backup } = useBillingView();
  const { gates, openFlow } = useBilling();

  return (
    <Section id="payment-methods" className="flex h-full flex-col">
      <SectionHeader
        id="payment-methods"
        icon={CreditCard}
        title="Payment method"
        description="Charged automatically for renewals, upgrades and credit packs"
      />
      <div className="flex flex-1 flex-col gap-1 px-4 pb-3">
        {primary ? (
          <MethodRow method={primary} />
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-dashed border-[#C9D1DC] bg-[#FAFBFD] px-3.5 py-3">
            <MethodMark method={null} />
            <div className="min-w-[180px] flex-1">
              <p className="text-[12.5px] font-semibold text-[#0F1B3D]">No payment method</p>
              <p className="text-[12px] leading-4 text-[#6B7890]">Add a card or UPI AutoPay so renewals and purchases can be collected.</p>
            </div>
            <Button size="sm" variant="primary" icon={Plus} gate={gates?.managePayment} onClick={() => openFlow({ kind: "payment", role: "primary" })}>
              Add payment method
            </Button>
          </div>
        )}

        {primary &&
          (backup ? (
            <MethodRow method={backup} />
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-dashed border-[#DCE2EA] px-3.5 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-[#F3F5F9] text-[#6B7890]">
                <ShieldCheck className="size-3.5" />
              </span>
              <div className="min-w-[180px] flex-1">
                <p className="text-[12.5px] font-semibold text-[#0F1B3D]">No backup payment method</p>
                <p className="text-[12px] leading-4 text-[#6B7890]">If the primary is declined, a backup is tried before anything pauses.</p>
              </div>
              <Button size="sm" variant="secondary" icon={Plus} gate={gates?.managePayment} onClick={() => openFlow({ kind: "payment", role: "backup" })}>
                Add backup method
              </Button>
            </div>
          ))}

        <p className="mt-auto flex items-center gap-1.5 pt-2 text-[11.5px] text-[#6B7890]">
          <Lock className="size-3 shrink-0" />
          Card details are held by our payment partner. OmniPlatform only stores the brand, last four digits and expiry.
        </p>
      </div>
    </Section>
  );
}

function MethodRow({ method }: { method: PaymentMethod }) {
  const { snapshot, now } = useBillingView();
  const { gates, can, openFlow, actions } = useBilling();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const health = methodHealth(method, now);
  const primary = method.role === "primary";
  const removeGate = removeMethodGate(method, snapshot, can);
  const other = snapshot.paymentMethods.find((item) => item.id !== method.id);

  const makePrimary = async () => {
    setPromoting(true);
    const result = await actions.setPrimaryMethod(method.id);
    setPromoting(false);
    if (result.ok) toast.success(`${methodLabel(method)} is now your primary method`);
    else toast.error(result.message, { description: result.hint });
  };

  return (
    <div className={cn("rounded-[8px] border px-3.5 py-3", primary ? "border-[#D5E1FD] bg-[#FAFCFF]" : "border-[#E4E9F0] bg-white")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <MethodMark method={method} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[#0F1B3D]">
            {method.type === "upi" ? `UPI AutoPay` : methodLabel(method)}
            <Badge tone={primary ? "blue" : "neutral"}>{primary ? "Primary" : "Backup"}</Badge>
            <Badge tone={health === "active" ? "green" : health === "expiring" ? "amber" : "red"} dot>
              {health === "active" ? "Active" : health === "expiring" ? "Expires soon" : "Expired"}
            </Badge>
          </p>
          <p className="mt-0.5 truncate text-[12px] text-[#6B7890]">{method.type === "upi" ? method.upiId : `Billing name: ${method.holderName}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {primary ? (
            <Button size="sm" variant="primary" icon={CreditCard} gate={gates?.managePayment} onClick={() => openFlow({ kind: "payment", role: "primary" })}>
              Change payment method
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" icon={Star} loading={promoting} gate={gates?.managePayment} onClick={makePrimary}>
                Make primary
              </Button>
              <Button size="sm" variant="danger" icon={Trash2} gate={removeGate} onClick={() => setConfirmRemove(true)}>
                Remove backup
              </Button>
            </>
          )}
          {primary && (
            <ActionMenu
              label={`More actions for ${methodLabel(method)}`}
              width={220}
              trigger={
                <button type="button" className={buttonClass("ghost", "iconSm")} aria-label={`More actions for ${methodLabel(method)}`}>
                  <MoreHorizontal className="size-4" />
                </button>
              }
              items={[
                { label: "Replace with a new method", icon: CreditCard, onSelect: () => openFlow({ kind: "payment", role: "primary" }), gate: gates?.managePayment },
                { label: "Remove payment method", icon: Trash2, onSelect: () => setConfirmRemove(true), gate: removeGate, danger: true },
              ]}
            />
          )}
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-[#EEF1F5] pt-2.5 sm:grid-cols-4">
        <Fact label={method.type === "upi" ? "Type" : "Expiry"}>{method.type === "upi" ? "UPI AutoPay mandate" : methodExpiry(method)}</Fact>
        <Fact label="Billing name">{method.holderName}</Fact>
        <Fact label="Status">{health === "active" ? "Active" : health === "expiring" ? "Expires soon" : "Expired"}</Fact>
        <Fact label="Added">{shortDate(method.addedAt)}</Fact>
      </dl>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${methodLabel(method)}?`}
        description={
          primary
            ? other
              ? `${methodLabel(other)} becomes your primary method and will be charged ${snapshot.subscription.status === "scheduled_cancellation" ? "if anything is owed" : "for the next renewal"}.`
              : "You'll have no payment method on file. Add one before your next payment is due."
            : "Your primary method stays in place. If it's declined, there'll be no backup to fall back on."
        }
        confirmLabel="Remove payment method"
        onConfirm={async () => {
          const result = await actions.removePaymentMethod(method.id);
          if (!result.ok) {
            toast.error(result.message, { description: result.hint });
            return false;
          }
          toast.success(`${methodLabel(method)} removed`);
        }}
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[#6B7890]">{label}</dt>
      <dd className="truncate text-[12.5px] font-medium tabular-nums text-[#0F1B3D]">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Next payment                                                        */
/* ------------------------------------------------------------------ */

const NEXT_STATE: Record<NextPaymentState, { label: string; tone: "blue" | "amber" | "red" | "neutral" }> = {
  scheduled: { label: "Scheduled", tone: "blue" },
  due: { label: "Awaiting approval", tone: "amber" },
  failed: { label: "Failed", tone: "red" },
  none: { label: "None scheduled", tone: "neutral" },
  needs_method: { label: "Needs payment method", tone: "amber" },
};

export function NextPaymentCard() {
  const { next, now } = useBillingView();
  const { gates, openFlow } = useBilling();
  const hydrated = useHydrated();
  const state = NEXT_STATE[next.state];
  const total = next.breakdown?.total ?? 0;

  return (
    <Section id="next-payment" className="flex h-full flex-col">
      <SectionHeader id="next-payment" icon={CalendarClock} title="Next payment" badge={<Badge tone={state.tone}>{state.label}</Badge>} />
      <div className="flex flex-1 flex-col px-4 pb-4">
        {next.state === "none" ? (
          <div className="rounded-[8px] border border-dashed border-[#DCE2EA] px-3.5 py-4">
            <p className="text-[15px] font-semibold text-[#0F1B3D]">{next.headline}</p>
            <p className="mt-1 text-[12px] leading-[18px] text-[#6B7890]">{next.note}</p>
          </div>
        ) : (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className={cn("text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums", next.state === "failed" ? "text-[#C81E2B]" : "text-[#0F1B3D]")}>{money(total)}</span>
              <span className="text-[12px] text-[#6B7890]">incl. {money(next.breakdown?.tax ?? 0)} GST</span>
            </p>
            <dl className="mt-2.5 divide-y divide-[#EEF1F5] rounded-[8px] border border-[#EEF1F5] text-[12.5px]">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-[#6B7890]">{next.state === "failed" ? "Was due" : "Date"}</dt>
                <dd className="text-right font-semibold text-[#0F1B3D]">
                  {next.date ? longDate(next.date) : "—"}
                  {next.date && hydrated && <span className="ml-1.5 font-normal text-[#6B7890]">({inDays(daysUntil(next.date, now))})</span>}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-[#6B7890]">Method</dt>
                <dd className="flex min-w-0 items-center gap-2 font-semibold text-[#0F1B3D]">
                  <MethodMark method={next.method} className="h-5 w-8 text-[7.5px]" />
                  <span className="truncate">{next.method ? methodLabel(next.method) : "Not set"}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-[#6B7890]">Status</dt>
                <dd>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] leading-[18px] text-[#6B7890]">{next.note}</p>
          </>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {next.state === "failed" && (
            <>
              <Button size="sm" variant="primary" icon={CreditCard} gate={gates?.managePayment} onClick={() => openFlow({ kind: "payment", role: "primary" })}>
                Update payment
              </Button>
              {next.invoice && (
                <Button size="sm" variant="secondary" icon={RotateCw} gate={gates?.managePayment} onClick={() => next.invoice && openFlow({ kind: "pay", invoiceId: next.invoice.id })}>
                  Retry payment
                </Button>
              )}
            </>
          )}
          {next.state === "due" && next.invoice && (
            <Button size="sm" variant="primary" icon={WalletCards} gate={gates?.managePayment} onClick={() => next.invoice && openFlow({ kind: "pay", invoiceId: next.invoice.id })}>
              Pay now
            </Button>
          )}
          {next.state === "needs_method" && (
            <Button size="sm" variant="primary" icon={Plus} gate={gates?.managePayment} onClick={() => openFlow({ kind: "payment", role: "primary" })}>
              Add payment method
            </Button>
          )}
          {next.breakdown && next.state !== "none" && (
            <Button size="sm" variant="secondary" icon={ReceiptText} onClick={() => openFlow({ kind: "breakdown" })}>
              View breakdown
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}

export function TwoCardSkeleton({ left = 7 }: { left?: 7 | 5 }) {
  return (
    <div className="grid gap-1 xl:grid-cols-12" aria-hidden="true">
      {[left, 12 - left].map((span, index) => (
        <div key={index} className={cn(x.card, "space-y-2.5 p-4", span === 7 ? "xl:col-span-7" : "xl:col-span-5")}>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
