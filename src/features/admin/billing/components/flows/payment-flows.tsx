"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Lock, ReceiptText, Smartphone, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { BILLING_MOCK_MODE, CARD_BRAND_LABEL, CYCLE_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { UPI_RE, detectBrand, longDate, luhnValid, methodLabel, money, planById, type BreakdownLine } from "../../billing-data/selectors";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell } from "../flow-shell";
import { Button, FormField, MethodMark, Segmented, x } from "../ui";

interface CardDraft {
  holderName: string;
  number: string;
  expiry: string;
  cvv: string;
  upiId: string;
}

function validate(type: "card" | "upi", draft: CardDraft, now: Date) {
  const errors: Partial<Record<keyof CardDraft, string>> = {};
  if (draft.holderName.trim().length < 2) errors.holderName = type === "card" ? "Enter the name printed on the card." : "Enter the account holder's name.";
  if (type === "upi") {
    if (!UPI_RE.test(draft.upiId.trim())) errors.upiId = "Enter a UPI ID like name@bank.";
    return errors;
  }
  const digits = draft.number.replace(/\D/g, "");
  if (!digits) errors.number = "Enter the card number.";
  else if (!luhnValid(digits)) errors.number = "That card number isn't valid. Check for typos.";
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(draft.expiry.trim());
  if (!match) errors.expiry = "Use MM / YY.";
  else {
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) errors.expiry = "Month must be 01–12.";
    else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.expiry = "This card has expired.";
  }
  const cvvLength = detectBrand(digits) === "amex" ? 4 : 3;
  if (!new RegExp(`^\\d{${cvvLength}}$`).test(draft.cvv)) errors.cvv = `Enter the ${cvvLength}-digit security code.`;
  return errors;
}

const formatNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
};

export function PaymentMethodFlow({ role, onClose }: { role: "primary" | "backup"; onClose?: () => void }) {
  const { snapshot, primary, backup, outstanding } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const close = onClose ?? closeFlow;
  const [type, setType] = useState<"card" | "upi">("card");
  const [draft, setDraft] = useState<CardDraft>({ holderName: snapshot.profile.legalName, number: "", expiry: "", cvv: "", upiId: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof CardDraft, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [settledInvoice, setSettledInvoice] = useState<string | null>(null);

  const errors = validate(type, draft, new Date());
  const show = (key: keyof CardDraft) => (submitted || touched[key] ? errors[key] : undefined);
  const digits = draft.number.replace(/\D/g, "");
  const brand = detectBrand(digits);
  const replacing = role === "primary" ? primary : backup;
  const dirty = !savedLabel && Boolean(digits || draft.cvv || draft.expiry || draft.upiId);

  const set = (key: keyof CardDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return false;
    setBusy(true);
    setError(null);
    const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(draft.expiry.trim());
    const outstandingBefore = outstanding?.number ?? null;
    const result = await actions.savePaymentMethod(
      type === "card"
        ? { type, holderName: draft.holderName.trim(), cardNumber: digits, expMonth: Number(match?.[1]), expYear: 2000 + Number(match?.[2]) }
        : { type, holderName: draft.holderName.trim(), upiId: draft.upiId.trim() },
      role,
    );
    setBusy(false);
    if (!result.ok) {
      setError({ message: `Payment update failed. ${result.message}`, hint: result.hint });
      return false;
    }
    const label = type === "card" ? `${brand ? CARD_BRAND_LABEL[brand] : "Card"} •••• ${digits.slice(-4)}` : "UPI AutoPay";
    setSavedLabel(label);
    if (role === "primary" && outstandingBefore) setSettledInvoice(outstandingBefore);
    setDraft((current) => ({ ...current, number: "", cvv: "" }));
    toast.success(`${label} saved as your ${role} method`);
    return true;
  };

  const title = role === "primary" ? (primary ? "Change payment method" : "Add payment method") : "Add backup method";

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && close()}
      width={520}
      icon={CreditCard}
      title={title}
      description={
        replacing
          ? `Replaces ${methodLabel(replacing)} as your ${role} method.`
          : role === "primary"
            ? "Used for renewals, upgrades and credit packs."
            : "Tried automatically if the primary method is declined."
      }
      locked={busy}
      dirty={dirty}
      guard={{ label: "this payment method", onSave: save, saveLabel: "Save & leave" }}
      footer={
        savedLabel ? (
          <Button variant="primary" onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon={Lock} loading={busy} onClick={save}>
              {busy ? "Verifying…" : "Save payment method"}
            </Button>
          </>
        )
      }
    >
      {savedLabel ? (
        <div className="flex items-start gap-3 py-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ECFAF3] text-[#067647]">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="text-[12.5px] text-[#3C4A66]">
            <p className="text-[15px] font-semibold text-[#0F1B3D]">{savedLabel} is your {role} method</p>
            <p>{role === "primary" ? "Your next payment and any new purchases will use it." : "It's tried automatically if the primary is declined."}</p>
            {settledInvoice && <p className="mt-2 rounded-sm bg-[#ECFAF3] px-2.5 py-1.5 font-medium text-[#067647]">{settledInvoice} was paid with it straight away. Your subscription is active again.</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <FlowError
              message={error.message}
              hint={error.hint}
              actions={
                <>
                  <Button size="sm" variant="primary" onClick={save}>Retry</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setError(null); setDraft((current) => ({ ...current, number: "", expiry: "", cvv: "" })); setSubmitted(false); setTouched({}); }}>
                    Use another card
                  </Button>
                </>
              }
            />
          )}
          <Segmented
            label="Payment method type"
            value={type}
            onChange={(next) => { setType(next); setSubmitted(false); setError(null); }}
            items={[
              { value: "card", label: "Card", icon: CreditCard },
              { value: "upi", label: "UPI AutoPay", icon: Smartphone },
            ]}
          />
          <FormField label={type === "card" ? "Cardholder name" : "Account holder name"} htmlFor="pm-name" error={show("holderName")} required>
            <input id="pm-name" autoComplete="cc-name" className={x.input} value={draft.holderName} onChange={(event) => set("holderName", event.target.value)} onBlur={() => setTouched((t) => ({ ...t, holderName: true }))} />
          </FormField>
          {type === "card" ? (
            <>
              <FormField label="Card number" htmlFor="pm-number" error={show("number")} required>
                <div className="relative">
                  <input
                    id="pm-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    className={cn(x.input, "pr-14 font-mono tracking-[0.04em]")}
                    value={draft.number}
                    onChange={(event) => set("number", formatNumber(event.target.value))}
                    onBlur={() => setTouched((t) => ({ ...t, number: true }))}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    <MethodMark method={digits.length >= 2 ? { type: "card", brand } : null} className="h-5 w-8 text-[7.5px]" />
                  </span>
                </div>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Expiry" htmlFor="pm-expiry" error={show("expiry")} required>
                  <input id="pm-expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" className={cn(x.input, "tabular-nums")} value={draft.expiry} onChange={(event) => set("expiry", formatExpiry(event.target.value))} onBlur={() => setTouched((t) => ({ ...t, expiry: true }))} />
                </FormField>
                <FormField label="CVV" htmlFor="pm-cvv" error={show("cvv")} required>
                  <input id="pm-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder={brand === "amex" ? "4 digits" : "3 digits"} className={cn(x.input, "tabular-nums")} value={draft.cvv} onChange={(event) => set("cvv", event.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={() => setTouched((t) => ({ ...t, cvv: true }))} />
                </FormField>
              </div>
            </>
          ) : (
            <FormField label="UPI ID" htmlFor="pm-upi" error={show("upiId")} hint="You'll approve a recurring AutoPay mandate in your UPI app." required>
              <input id="pm-upi" placeholder="namogange@okicici" className={x.input} value={draft.upiId} onChange={(event) => set("upiId", event.target.value.trim())} onBlur={() => setTouched((t) => ({ ...t, upiId: true }))} />
            </FormField>
          )}
          {role === "primary" && outstanding && (
            <p className="rounded-sm bg-[#EFF4FF] px-2.5 py-1.5 text-[12px] text-[#1D4ED8]">
              {outstanding.number} ({money(outstanding.total)}) will be retried with this method as soon as it&apos;s saved.
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[11.5px] leading-4 text-[#6B7890]">
            <Lock className="mt-px size-3 shrink-0" />
            {type === "card"
              ? "Card details go straight to our payment partner and are never stored by OmniPlatform. A ₹2 verification charge may appear and is reversed immediately."
              : "The mandate lets us collect renewals automatically. You can revoke it from your UPI app at any time."}
          </p>
          {BILLING_MOCK_MODE && type === "card" && (
            <p className="rounded-sm border border-dashed border-[#E2D8FD] bg-[#F9F7FF] px-2.5 py-1.5 text-[11.5px] text-[#6D28D9]">
              Mock mode: 4242 4242 4242 4242 saves; 4000 0000 0000 0002 is declined.
            </p>
          )}
        </div>
      )}
    </FlowShell>
  );
}

/* ------------------------------------------------------------------ */

const CATEGORY: { key: BreakdownLine["kind"] | "tax"; label: string }[] = [
  { key: "plan", label: "Plan charge" },
  { key: "addon", label: "Add-ons" },
  { key: "credits", label: "Credits" },
  { key: "discount", label: "Discounts" },
];

export function BreakdownSheet() {
  const { snapshot, next } = useBillingView();
  const { closeFlow, openFlow } = useBilling();
  const breakdown = next.breakdown;
  const plan = planById(snapshot.plans, next.planId);

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      variant="sheet"
      width={460}
      icon={ReceiptText}
      title="Next payment breakdown"
      description={next.date ? `${next.state === "failed" ? "Was due" : "Due"} ${longDate(next.date)} · ${methodLabel(next.method)}` : next.note}
      footer={
        <>
          {next.invoice && (
            <Button variant="secondary" onClick={() => next.invoice && openFlow({ kind: "invoice", invoiceId: next.invoice.id })}>
              View invoice
            </Button>
          )}
          <Button variant="primary" onClick={closeFlow}>Close</Button>
        </>
      }
    >
      {!breakdown ? (
        <p className="text-[12.5px] text-[#6B7890]">{next.note}</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[8px] border border-[#E4E9F0]">
            {CATEGORY.map((category) => {
              const lines = breakdown.lines.filter((line) => line.kind === category.key || (category.key === "plan" && line.kind === "proration"));
              const total = lines.reduce((sum, line) => sum + line.amount, 0);
              return (
                <div key={category.key} className="border-b border-[#EEF1F5] px-3.5 py-2.5">
                  <div className="flex justify-between gap-3 text-[12.5px]">
                    <span className="font-semibold text-[#24324F]">{category.label}</span>
                    <span className={cn("tabular-nums", lines.length ? "font-semibold text-[#0F1B3D]" : "text-[#98A2B3]", total < 0 && "text-[#067647]")}>{lines.length ? money(total) : "—"}</span>
                  </div>
                  {lines.map((line, index) => (
                    <div key={`${line.label}-${index}`} className="mt-0.5 flex justify-between gap-3 text-[11.5px] text-[#6B7890]">
                      <span className="min-w-0 truncate">
                        {line.label}
                        {line.detail ? ` · ${line.detail}` : ""}
                      </span>
                      <span className="shrink-0 tabular-nums">{money(line.amount)}</span>
                    </div>
                  ))}
                  {!lines.length && <p className="text-[11.5px] text-[#98A2B3]">None this period</p>}
                </div>
              );
            })}
            <div className="flex justify-between gap-3 border-b border-[#EEF1F5] px-3.5 py-2.5 text-[12.5px]">
              <span className="font-semibold text-[#24324F]">Taxes</span>
              <span className="tabular-nums text-[#0F1B3D]">
                <span className="mr-1.5 text-[11.5px] text-[#6B7890]">GST {Math.round(breakdown.taxRate * 100)}% on {money(breakdown.subtotal)}</span>
                {money(breakdown.tax)}
              </span>
            </div>
            <div className="flex justify-between gap-3 bg-[#F8FAFC] px-3.5 py-3 text-[15px] font-semibold text-[#0F1B3D]">
              <span>Total</span>
              <span className="tabular-nums">{money(breakdown.total)}</span>
            </div>
          </div>
          <p className="text-[12px] leading-[18px] text-[#6B7890]">
            {next.invoice ? `Amounts from ${next.invoice.number}.` : `Based on ${plan.name}, ${CYCLE_LABEL[next.cycle].toLowerCase()} billing${snapshot.addOns.length ? " and your active add-ons" : ""}.`} {next.note}
          </p>
        </div>
      )}
    </FlowShell>
  );
}

/* ------------------------------------------------------------------ */

export function PayInvoiceFlow({ invoiceId }: { invoiceId: string }) {
  const { snapshot, primary } = useBillingView();
  const { closeFlow, openFlow, actions } = useBilling();
  const invoice = snapshot.invoices.find((item) => item.id === invoiceId);
  const [phase, setPhase] = useState<"confirm" | "processing" | "done" | "failed">(invoice && (invoice.status === "failed" || invoice.status === "pending") ? "confirm" : "done");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [paid] = useState(() => invoice ?? null);

  const pay = async () => {
    setPhase("processing");
    const result = await actions.payInvoice(invoiceId);
    if (result.ok) {
      setPhase("done");
      toast.success(`${paid?.number} paid`);
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
      icon={WalletCards}
      title={phase === "done" ? "Payment complete" : `Pay ${paid?.number ?? "invoice"}`}
      locked={phase === "processing"}
      footer={
        phase === "done" ? (
          <>
            {paid && <Button variant="secondary" onClick={() => openFlow({ kind: "invoice", invoiceId: paid.id })}>View invoice</Button>}
            <Button variant="primary" onClick={closeFlow}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={phase === "processing"}>Cancel</Button>
            {phase === "failed" && <Button variant="secondary" icon={CreditCard} onClick={() => openFlow({ kind: "payment", role: "primary" })}>Update payment method</Button>}
            <Button variant="primary" loading={phase === "processing"} disabled={!primary} disabledReason="Add a payment method first." onClick={pay}>
              {phase === "failed" ? "Retry payment" : `Pay ${paid ? money(paid.total) : ""}`}
            </Button>
          </>
        )
      }
    >
      {!paid ? (
        <p className="text-[12.5px] text-[#6B7890]">This invoice is no longer available.</p>
      ) : phase === "done" ? (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-[#067647]" />
          <p className="text-[12.5px] text-[#3C4A66]">
            <b className="text-[#0F1B3D]">{money(paid.total)}</b> was collected from {methodLabel(primary)}. {paid.number} is marked paid and your subscription is active.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <FlowError message={error.message} hint={error.hint} />}
          <dl className="rounded-[8px] border border-[#E4E9F0] text-[12.5px]">
            {[
              ["Invoice", paid.number],
              ["Amount", money(paid.total)],
              ["Method", methodLabel(primary)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-[#EEF1F5] px-3 py-2 last:border-0">
                <dt className="text-[#6B7890]">{label}</dt>
                <dd className="font-semibold tabular-nums text-[#0F1B3D]">{value}</dd>
              </div>
            ))}
          </dl>
          {paid.note && <p className="text-[12px] text-[#6B7890]">{paid.note}</p>}
        </div>
      )}
    </FlowShell>
  );
}
