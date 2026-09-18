"use client";

import { addDays, parseISO } from "date-fns";
import { ArrowUpRight, CalendarClock, CreditCard, Download, FileText, MoreHorizontal, RefreshCcw, RotateCcw, Sparkles, TrendingDown, WalletCards, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CYCLE_LABEL } from "../../billing-data/config";
import { useBillingView, useHydrated } from "../../billing-data/hooks";
import { addOnsPerPeriod, annualSavings, cycleUnit, daysUntil, inDays, longDate, methodHealth, money, periodPrice, shortDate } from "../../billing-data/selectors";
import { useBilling } from "../../store/billing-store";
import { useBillingActions } from "../use-billing-actions";
import { ActionMenu, Button, Notice, Skeleton, SubscriptionChip, buttonClass, x, type MenuItem } from "../ui";

export function BillingHeader() {
  const { status, snapshot, gates, can, flow } = useBilling();
  const ready = status === "ready" && snapshot && gates;
  const { downloadSummary, openFlow, focusSection } = useBillingActions();
  const subscription = snapshot?.subscription;
  const trial = subscription?.status === "trialing";
  const cancelled = subscription?.status === "cancelled";
  const cancelling = subscription?.status === "scheduled_cancellation";
  const lowest = snapshot ? Math.min(...snapshot.plans.map((plan) => plan.rank)) : 0;
  const onLowest = snapshot && subscription ? snapshot.plans.find((plan) => plan.id === subscription.planId)?.rank === lowest : false;

  const primaryLabel = trial ? "Choose plan" : cancelled ? "Reactivate" : "Upgrade plan";
  const primaryGate = !ready ? undefined : trial || cancelled ? can.canManageSubscription : gates.upgrade;

  const more: (MenuItem | "separator")[] = ready
    ? [
        { label: "Change billing cycle", icon: RefreshCcw, onSelect: () => openFlow({ kind: "cycle" }), gate: gates.changeCycle, hidden: trial || cancelled },
        { label: "View invoices", icon: FileText, onSelect: () => focusSection("invoices") },
        { label: "Download billing summary", icon: Download, onSelect: downloadSummary, gate: gates.downloadInvoices },
        "separator",
        { label: "Resume subscription", icon: RotateCcw, onSelect: () => openFlow({ kind: "resume" }), gate: can.canManageSubscription, hidden: !cancelling },
        { label: "Downgrade plan", icon: TrendingDown, onSelect: () => openFlow({ kind: "downgrade" }), gate: gates.downgrade, hidden: trial || cancelled || onLowest, danger: true },
        { label: "Cancel subscription", icon: XCircle, onSelect: () => openFlow({ kind: "cancel" }), gate: gates.cancel, hidden: trial || cancelled || cancelling, danger: true },
      ]
    : [];

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[#0F1B3D] text-white shadow-[0_2px_8px_rgba(15,27,61,0.2)]">
          <WalletCards className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold leading-6 tracking-[-0.015em] text-[#0F1B3D]">Billing</h1>
          <p className="mt-0.5 text-[12.5px] leading-4 text-[#6B7890]">Manage your subscription, usage, payment method, invoices and billing details.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon={CreditCard} className="h-9" disabled={!ready} disabledReason="Still loading billing." onClick={() => focusSection("payment-methods")}>
          Manage payment
        </Button>
        <Button
          variant="primary"
          icon={trial || cancelled ? Sparkles : ArrowUpRight}
          className="h-9"
          disabled={!ready}
          disabledReason="Still loading billing."
          gate={primaryGate}
          onClick={() => openFlow({ kind: "upgrade", planId: cancelled ? subscription?.planId : undefined })}
          aria-expanded={flow?.kind === "upgrade"}
        >
          {primaryLabel}
        </Button>
        {ready ? (
          <ActionMenu
            label="More billing actions"
            width={236}
            trigger={
              <button type="button" className={buttonClass("secondary", "icon", "size-9")} aria-label="More billing actions">
                <MoreHorizontal className="size-4" />
              </button>
            }
            items={more}
          />
        ) : (
          <Button variant="secondary" size="icon" className="size-9" disabled disabledReason="Still loading billing." aria-label="More billing actions">
            <MoreHorizontal className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* State banner                                                        */
/* ------------------------------------------------------------------ */

/** Attention ids the banner already covers, so they aren't listed twice. */
export function useBannerCovers(): string[] {
  const { snapshot, primary, now } = useBillingView();
  const status = snapshot.subscription.status;
  const covers = ["payment-failed", "invoice-due", "trial"];
  if (status === "active" && primary && methodHealth(primary, now) !== "active") covers.push(`card-${primary.id}`);
  return covers;
}

export function StateBanner() {
  const { snapshot, plan, primary, outstanding, now } = useBillingView();
  const { can } = useBilling();
  const { openFlow } = useBillingActions();
  const hydrated = useHydrated();
  const { subscription } = snapshot;

  const updatePayment = (
    <Button variant="primary" size="sm" icon={CreditCard} gate={can.canManagePayment} onClick={() => openFlow({ kind: "payment", role: "primary" })}>
      Update payment method
    </Button>
  );
  const viewInvoice = outstanding && (
    <Button variant="secondary" size="sm" icon={FileText} onClick={() => openFlow({ kind: "invoice", invoiceId: outstanding.id })}>
      View invoice
    </Button>
  );

  switch (subscription.status) {
    case "past_due":
      return (
        <Notice tone="red" title="Payment failed." actions={<>{updatePayment}{viewInvoice}</>}>
          Update payment method to avoid service interruption.{" "}
          {outstanding && `${outstanding.number} for ${money(outstanding.total)} was declined on ${shortDate(outstanding.issuedAt)}; we're retrying daily.`}
        </Notice>
      );
    case "grace_period":
      return (
        <Notice tone="red" title={`Payment failed — grace period ends ${subscription.graceEndsAt ? shortDate(subscription.graceEndsAt) : "soon"}`} actions={<>{updatePayment}{viewInvoice}</>}>
          We couldn&apos;t collect {outstanding ? `${outstanding.number} (${money(outstanding.total)})` : "your renewal"} after several attempts. Your workspace keeps working until then; after that publishing and automations pause.
        </Notice>
      );
    case "payment_due":
      return (
        <Notice
          tone="amber"
          title={`Payment due${outstanding ? ` ${hydrated ? inDays(daysUntil(outstanding.dueAt, now)) : shortDate(outstanding.dueAt)}` : ""}`}
          actions={
            <>
              {outstanding && (
                <Button variant="primary" size="sm" icon={WalletCards} gate={can.canManagePayment} onClick={() => openFlow({ kind: "pay", invoiceId: outstanding.id })}>
                  Pay now
                </Button>
              )}
              {viewInvoice}
            </>
          }
        >
          {outstanding ? `${outstanding.number} for ${money(outstanding.total)} is waiting for approval. ${outstanding.note ?? ""}` : "An invoice is waiting for payment."}
        </Notice>
      );
    case "trialing": {
      const days = subscription.trialEndsAt ? daysUntil(subscription.trialEndsAt, now) : 0;
      return (
        <Notice
          tone="violet"
          icon={Sparkles}
          title={`Trial · ${days} day${days === 1 ? "" : "s"} remaining`}
          actions={
            <>
              <Button variant="primary" size="sm" icon={Sparkles} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "upgrade" })}>
                Choose plan
              </Button>
              {!primary && (
                <Button variant="secondary" size="sm" icon={CreditCard} gate={can.canManagePayment} onClick={() => openFlow({ kind: "payment", role: "primary" })}>
                  Add payment method
                </Button>
              )}
            </>
          }
        >
          You&apos;re trying the {plan.name} plan until {subscription.trialEndsAt ? longDate(subscription.trialEndsAt) : "the end of the trial"}. Nothing is charged before then.
        </Notice>
      );
    }
    case "scheduled_cancellation":
      return (
        <Notice
          tone="amber"
          icon={CalendarClock}
          title={`Scheduled cancellation · cancels on ${subscription.cancelAt ? longDate(subscription.cancelAt) : "the renewal date"}`}
          actions={
            <Button variant="primary" size="sm" icon={RotateCcw} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "resume" })}>
              Resume subscription
            </Button>
          }
        >
          You keep full access to {plan.name} until then. No further payments will be taken.
        </Notice>
      );
    case "cancelled": {
      const endedAt = subscription.cancelledAt ?? subscription.currentPeriodEnd;
      return (
        <Notice
          tone="neutral"
          icon={XCircle}
          title="Subscription cancelled"
          actions={
            <Button variant="primary" size="sm" icon={Sparkles} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "upgrade", planId: subscription.planId })}>
              Reactivate
            </Button>
          }
        >
          Access ended on {longDate(endedAt)}. Your clients, content and reports are kept until {longDate(addDays(parseISO(endedAt), 90).toISOString())}.
        </Notice>
      );
    }
    default:
      if (primary && methodHealth(primary, now) !== "active") {
        const expired = methodHealth(primary, now) === "expired";
        return (
          <Notice tone={expired ? "red" : "amber"} icon={CreditCard} title={`Card ending ${primary.last4} ${expired ? "has expired" : "expires soon"}.`} actions={updatePayment}>
            {expired ? "Your renewal will fail until you update it." : `It expires at the end of ${String(primary.expMonth).padStart(2, "0")}/${primary.expYear}. Update it before ${shortDate(subscription.currentPeriodEnd)} so the renewal goes through.`}
          </Notice>
        );
      }
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Summary strip                                                       */
/* ------------------------------------------------------------------ */

function Tile({ label, children, sub, className }: { label: string; children: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(x.card, "min-w-0 px-3.5 py-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">{label}</p>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#0F1B3D]">{children}</div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] leading-4 text-[#6B7890]">{sub}</div>}
    </div>
  );
}

export function SummaryStrip() {
  const { snapshot, plan, next, now } = useBillingView();
  const { gates } = useBilling();
  const { openFlow } = useBillingActions();
  const hydrated = useHydrated();
  const { subscription } = snapshot;
  const price = periodPrice(plan, subscription.cycle) ?? 0;
  const addOns = addOnsPerPeriod(snapshot, plan.id, subscription.cycle).reduce((sum, line) => sum + line.amount, 0);
  const savings = annualSavings(plan);
  const lastPayment = snapshot.payments.find((payment) => payment.status === "successful" && payment.amount > 0);

  const dateLabel =
    subscription.status === "trialing" ? "Trial ends" : subscription.status === "scheduled_cancellation" ? "Cancels on" : subscription.status === "cancelled" ? "Ended on" : "Renews on";
  const dateValue =
    subscription.status === "trialing"
      ? subscription.trialEndsAt
      : subscription.status === "scheduled_cancellation"
        ? subscription.cancelAt
        : subscription.status === "cancelled"
          ? subscription.cancelledAt
          : subscription.currentPeriodEnd;
  const days = dateValue ? daysUntil(dateValue, now) : null;

  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5" aria-label="Subscription summary">
      <Tile label="Current plan" className="max-sm:col-span-2" sub={plan.tagline}>
        {plan.name}
        <span className="rounded-sm bg-[#EFF4FF] px-1.5 text-[10.5px] font-bold uppercase leading-5 tracking-[0.04em] text-[#1D4ED8]">{subscription.status === "trialing" ? "Trial" : "Current"}</span>
      </Tile>
      <Tile label={subscription.cycle === "annual" ? "Annual cost" : "Monthly cost"} sub={addOns > 0 ? `${money(price)} plan + ${money(addOns)} add-ons · + GST` : "Before GST"}>
        <span className="tabular-nums">{money(price + addOns)}</span>
        <span className="text-[12px] font-medium text-[#6B7890]">/ {cycleUnit(subscription.cycle)}</span>
      </Tile>
      <Tile label={dateLabel} sub={days !== null && hydrated ? inDays(days) : " "}>
        {dateValue ? longDate(dateValue) : "—"}
      </Tile>
      <Tile
        label="Billing cycle"
        sub={
          subscription.cycle === "monthly" && savings && gates?.changeCycle.allowed ? (
            <button type="button" onClick={() => openFlow({ kind: "cycle" })} className={cn("rounded font-semibold text-[#2563EB] hover:underline", x.focus)}>
              Save {savings.percent}% with annual
            </button>
          ) : subscription.cycle === "annual" && savings ? (
            `Saving ${money(savings.amount)} a year`
          ) : subscription.pendingChange?.kind === "cycle_change" ? (
            `Switches to ${CYCLE_LABEL[subscription.pendingChange.toCycle].toLowerCase()} on ${shortDate(subscription.pendingChange.effectiveAt)}`
          ) : (
            " "
          )
        }
      >
        {CYCLE_LABEL[subscription.cycle]}
      </Tile>
      <Tile
        label="Payment status"
        sub={
          next.state === "failed"
            ? `Declined ${next.invoice ? shortDate(next.invoice.issuedAt) : ""}`
            : lastPayment
              ? `Last paid ${money(lastPayment.amount)} · ${shortDate(lastPayment.date)}`
              : "No payments yet"
        }
      >
        <SubscriptionChip status={subscription.status} />
      </Tile>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className={cn(x.card, "space-y-2 px-3.5 py-3", index === 0 && "max-sm:col-span-2")}>
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}
