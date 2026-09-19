"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { INVOICE_STATUS_META, PAYMENT_STATUS_META, SUBSCRIPTION_STATUS_META } from "../billing-data/config";
import { USAGE_STATE_META, type UsageState } from "../billing-data/selectors";
import type { InvoiceStatus, PaymentMethod, PaymentStatus, SubscriptionStatus } from "../billing-data/types";
import { useBilling } from "../store/billing-store";
import { Badge, Hint, x } from "@/features/admin/x/components/ui";

export {
  ActionMenu,
  Badge,
  Button,
  Card,
  CardHeader,
  ChoiceCard,
  ConfirmDialog,
  DefinitionRow,
  EmptyState,
  FormField,
  Hint,
  InfoTip,
  Notice,
  Pagination,
  SearchField,
  Segmented,
  SelectMenu,
  SettingRow,
  Skeleton,
  buttonClass,
  numClass,
  tdClass,
  thClass,
  useDebounced,
  x,
} from "@/features/admin/x/components/ui";
export type { MenuItem, SelectOption } from "@/features/admin/x/components/ui";

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

/** A page section card that can be scrolled to and briefly highlighted. */
export function Section({ id, className, children, ...props }: ComponentProps<"section"> & { id: string }) {
  const { highlighted } = useBilling();
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        x.card,
        "min-w-0 scroll-mt-20 transition-shadow duration-500",
        highlighted === id && "ring-2 ring-[#2563EB]/40 ring-offset-2 ring-offset-[#F6F8FB]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  id,
  title,
  description,
  icon: Icon,
  actions,
  badge,
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pb-2.5 pt-3.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-px grid size-7 shrink-0 place-items-center rounded-sm bg-[#F3F5F9] text-[#3C4A66]">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold leading-5 text-[#0F1B3D]">
            {title}
            {badge}
          </h2>
          {description && <p className="mt-0.5 text-[12px] leading-4 text-[#6B7890]">{description}</p>}
        </div>
      </div>
      {/* w-full at mobile lets a wide actions group (e.g. search + filters) wrap onto its own row instead of forcing overflow; shrink-0 from sm keeps a short action group inline with the title. */}
      {actions && <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Status chips                                                        */
/* ------------------------------------------------------------------ */

export function SubscriptionChip({ status }: { status: SubscriptionStatus }) {
  const meta = SUBSCRIPTION_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function InvoiceChip({ status }: { status: InvoiceStatus }) {
  const meta = INVOICE_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentChip({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function UsageChip({ state }: { state: UsageState }) {
  const meta = USAGE_STATE_META[state];
  const Icon = state === "healthy" ? CheckCircle2 : state === "unlimited" ? CheckCircle2 : AlertTriangle;
  return (
    <Badge tone={meta.tone} icon={Icon}>
      {meta.label}
    </Badge>
  );
}

export function EstimatedBadge({ text = "Estimated" }: { text?: string }) {
  return (
    <Hint text="Prorated from today's date. The final amount is calculated by the billing service when the change is applied and may differ by a few rupees.">
      <span tabIndex={0} className={cn("inline-flex cursor-help", x.focus)}>
        <Badge tone="amber" icon={Clock3}>
          {text}
        </Badge>
      </span>
    </Hint>
  );
}

/* ------------------------------------------------------------------ */
/* Usage meter                                                         */
/* ------------------------------------------------------------------ */

const METER_COLOR: Record<UsageState, string> = {
  healthy: "bg-[#12B76A]",
  near: "bg-[#F79009]",
  exhausted: "bg-[#E11D48]",
  unlimited: "bg-[#98A2B3]",
};

export function UsageMeter({ percent, state, className, label }: { percent: number; state: UsageState; className?: string; label: string }) {
  const width = state === "unlimited" ? 100 : Math.max(Math.min(percent, 100), percent > 0 ? 2 : 0);
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      className={cn("relative block h-1.5 overflow-hidden rounded-full bg-[#EEF1F5]", className)}
    >
      <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out", METER_COLOR[state], state === "unlimited" && "opacity-30")} style={{ width: `${width}%` }} />
      {/* The near-limit threshold, so the bar reads against it at a glance. */}
      {state !== "unlimited" && <span aria-hidden="true" className="absolute inset-y-0 left-[80%] w-px bg-white/90" />}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Payment method marks                                                */
/* ------------------------------------------------------------------ */

export function MethodMark({ method, className }: { method: Pick<PaymentMethod, "type" | "brand"> | null; className?: string }) {
  const base = cn("grid h-7 w-11 shrink-0 place-items-center rounded-[5px] border text-[9.5px] font-extrabold tracking-[0.02em]", className);
  if (!method) {
    return (
      <span className={cn(base, "border-dashed border-[#C9D1DC] bg-white text-[#98A2B3]")}>
        <CreditCard className="size-3.5" />
      </span>
    );
  }
  if (method.type === "upi") {
    return (
      <span className={cn(base, "border-[#E4E9F0] bg-white text-[#0F1B3D]")} aria-label="UPI">
        <span className="flex items-center gap-0.5">
          <Smartphone className="size-3 text-[#067647]" />
          UPI
        </span>
      </span>
    );
  }
  switch (method.brand) {
    case "visa":
      return (
        <span className={cn(base, "border-[#1A1F71] bg-[#1A1F71] italic text-white")} aria-label="Visa">
          VISA
        </span>
      );
    case "mastercard":
      return (
        <span className={cn(base, "border-[#E4E9F0] bg-white")} aria-label="Mastercard">
          <span className="flex">
            <span className="size-3.5 rounded-full bg-[#EB001B]" />
            <span className="-ml-1.5 size-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
          </span>
        </span>
      );
    case "rupay":
      return (
        <span className={cn(base, "border-[#E4E9F0] bg-white text-[#0B4EA2]")} aria-label="RuPay">
          <span>
            Ru<span className="text-[#F47920]">Pay</span>
          </span>
        </span>
      );
    case "amex":
      return (
        <span className={cn(base, "border-[#2E77BC] bg-[#2E77BC] text-white")} aria-label="American Express">
          AMEX
        </span>
      );
    default:
      return (
        <span className={cn(base, "border-[#E4E9F0] bg-[#F8FAFC] text-[#6B7890]")}>
          <CreditCard className="size-3.5" />
        </span>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Small layout helpers                                                */
/* ------------------------------------------------------------------ */

export function Stat({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">{label}</p>
      <div className="mt-0.5 text-[13px] font-semibold text-[#0F1B3D]">{children}</div>
      {hint && <p className="mt-0.5 text-[11.5px] leading-4 text-[#6B7890]">{hint}</p>}
    </div>
  );
}

export function Amount({ value, className, strong }: { value: string; className?: string; strong?: boolean }) {
  return <span className={cn("tabular-nums", strong && "font-semibold text-[#0F1B3D]", className)}>{value}</span>;
}
