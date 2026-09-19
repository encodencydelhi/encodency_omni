"use client";

import { ChevronDownIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, KeyValue, Panel } from "@/features/companies/components/primitives";
import { cn } from "@/lib/utils/cn";
import { ENTITLEMENT_CATEGORIES, FEATURE_BY_KEY, featuresIn, resourcesIn } from "../data/catalogue";
import { CURRENCIES, LIMIT_KIND, TARGET_SEGMENTS } from "../data/config";
import type { LimitKind, LimitRule, PlanDraftInput, ResourceDef } from "../data/types";
import { annualSavings, fromMinor, money, toMinor } from "../lib/money";

export interface SectionProps {
  value: PlanDraftInput;
  onChange: (patch: Partial<PlanDraftInput>) => void;
  errors: Record<string, string>;
  /** Fields that cannot be changed once the plan is live (its internal code). */
  codeLocked?: boolean;
  idPrefix?: string;
}

/** A money input in major units. It keeps what the person typed while they type and reports minor units. */
function MoneyInput({ id, value, onChange, invalid, currency }: { id: string; value: number; onChange: (minor: number) => void; invalid?: boolean; currency: string }) {
  // What the person is typing is kept as typed ("1490." stays "1490.") until they leave the field.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-2xs font-medium text-muted-foreground">{currency}</span>
      <Input
        id={id}
        inputMode="decimal"
        value={draft ?? fromMinor(value)}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(toMinor(event.target.value));
        }}
        onBlur={() => setDraft(null)}
        aria-invalid={invalid}
        className="pl-11 tabular"
        placeholder="0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Basic details                                                       */
/* ------------------------------------------------------------------ */

export function BasicsSection({ value, onChange, errors, codeLocked, idPrefix = "plan" }: SectionProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Plan name" htmlFor={`${idPrefix}-name`} required error={errors.name} hint="Shown to companies and in reports.">
        <Input id={`${idPrefix}-name`} value={value.name} onChange={(event) => onChange({ name: event.target.value })} aria-invalid={Boolean(errors.name)} autoFocus />
      </Field>
      <Field
        label="Internal code"
        htmlFor={`${idPrefix}-code`}
        required
        error={errors.internalCode}
        hint={codeLocked ? "The code cannot change once the plan is live." : "Capitals, digits and underscores, e.g. GROWTH_2026. Never shown as a marketing title."}
      >
        <Input
          id={`${idPrefix}-code`}
          value={value.internalCode}
          onChange={(event) => onChange({ internalCode: event.target.value.toUpperCase().replace(/\s+/g, "_") })}
          disabled={codeLocked}
          aria-invalid={Boolean(errors.internalCode)}
          className="font-mono text-[0.8125rem]"
        />
      </Field>
      <Field label="Description" htmlFor={`${idPrefix}-description`} className="sm:col-span-2">
        <Textarea id={`${idPrefix}-description`} rows={2} maxLength={200} value={value.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="One sentence on who the plan is for" />
      </Field>
      <Field label="Target segment" htmlFor={`${idPrefix}-segment`}>
        <Select value={value.targetSegment} onValueChange={(targetSegment) => onChange({ targetSegment })}>
          <SelectTrigger id={`${idPrefix}-segment`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {[...new Set([value.targetSegment, ...TARGET_SEGMENTS])].filter(Boolean).map((segment) => (
              <SelectItem key={segment} value={segment}>{segment}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="space-y-1">
        <Label className="text-[0.8125rem]">Plan visibility</Label>
        <RadioGroup value={value.availability.visibility} onValueChange={(visibility) => onChange({ availability: { ...value.availability, visibility: visibility as "public" | "invite_only" } })} className="flex gap-4 pt-1.5">
          {(["public", "invite_only"] as const).map((option) => (
            <div key={option} className="flex items-center gap-1.5">
              <RadioGroupItem value={option} id={`${idPrefix}-vis-${option}`} />
              <Label htmlFor={`${idPrefix}-vis-${option}`} className="font-normal">{option === "public" ? "Public" : "Invite only"}</Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-2xs text-muted-foreground">An invite-only plan can still be published; it is offered by the sales team.</p>
      </div>
      <Field label="Internal notes" htmlFor={`${idPrefix}-notes`} className="sm:col-span-2" hint="Visible to platform staff only.">
        <Textarea id={`${idPrefix}-notes`} rows={2} maxLength={400} value={value.internalNotes} onChange={(event) => onChange({ internalNotes: event.target.value })} />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export function PricingSection({ value, onChange, errors, idPrefix = "plan" }: SectionProps) {
  const { price } = value;
  const set = (patch: Partial<typeof price>) => onChange({ price: { ...price, ...patch } });
  const savings = annualSavings(price.monthlyMinor, price.annualMinor);
  const comparable = price.monthlyMinor > 0 && price.annualMinor > 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Currency" htmlFor={`${idPrefix}-currency`} required error={errors.currency}>
          <Select value={price.currency} onValueChange={(currency) => set({ currency })}>
            <SelectTrigger id={`${idPrefix}-currency`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>{currency}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Monthly recurring price" htmlFor={`${idPrefix}-monthly`} required error={errors.monthlyMinor}>
          <MoneyInput id={`${idPrefix}-monthly`} value={price.monthlyMinor} onChange={(monthlyMinor) => set({ monthlyMinor })} invalid={Boolean(errors.monthlyMinor)} currency={price.currency} />
        </Field>
        <Field label="Annual recurring price" htmlFor={`${idPrefix}-annual`} required error={errors.annualMinor}>
          <MoneyInput id={`${idPrefix}-annual`} value={price.annualMinor} onChange={(annualMinor) => set({ annualMinor })} invalid={Boolean(errors.annualMinor)} currency={price.currency} />
        </Field>
        <Field label="Trial duration (days)" htmlFor={`${idPrefix}-trial`} error={errors.trialDays} hint="0 means no trial.">
          <Input id={`${idPrefix}-trial`} inputMode="numeric" value={String(price.trialDays)} onChange={(event) => set({ trialDays: Number(event.target.value.replace(/\D/g, "")) || 0 })} aria-invalid={Boolean(errors.trialDays)} className="tabular" />
        </Field>
        <Field label="One-time setup fee" htmlFor={`${idPrefix}-setup`} error={errors.setupFeeMinor} hint="Optional. Never counted in MRR.">
          <MoneyInput id={`${idPrefix}-setup`} value={price.setupFeeMinor} onChange={(setupFeeMinor) => set({ setupFeeMinor })} invalid={Boolean(errors.setupFeeMinor)} currency={price.currency} />
        </Field>
      </div>
      <Field label="Commercial notes" htmlFor={`${idPrefix}-pricenotes`} hint="Internal. Explains how this price was decided.">
        <Textarea id={`${idPrefix}-pricenotes`} rows={2} maxLength={300} value={price.notes} onChange={(event) => set({ notes: event.target.value })} />
      </Field>
      <div className="grid gap-1 sm:grid-cols-3">
        <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monthly equivalent (annual)</p>
          <p className="text-[0.8125rem] font-medium tabular text-foreground">{comparable ? money(Math.round(price.annualMinor / 12), price.currency) : "Enter both prices"}</p>
        </div>
        <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Annual savings</p>
          <p className="text-[0.8125rem] font-medium tabular text-foreground">
            {savings ? (savings.amountMinor >= 0 ? `${money(savings.amountMinor, price.currency)} (${savings.percent}%)` : "Annual costs more than 12 months") : "Enter both prices"}
          </p>
        </div>
        <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trial</p>
          <p className="text-[0.8125rem] font-medium text-foreground">{price.trialDays > 0 ? `${price.trialDays} days, not counted as paid` : "No trial"}</p>
        </div>
      </div>
      <p className="text-2xs text-muted-foreground">Prices are entered in major units and stored in minor units. Payment processing and tax are not modelled here.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

export function FeaturesSection({ value, onChange, errors, idPrefix = "plan" }: SectionProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({ [ENTITLEMENT_CATEGORIES[0] as string]: true, Marketing: true });
  const set = (key: string, on: boolean) => onChange({ features: { ...value.features, [key]: on } });

  return (
    <div className="space-y-1">
      {ENTITLEMENT_CATEGORIES.map((category) => {
        const features = featuresIn(category);
        if (features.length === 0) return null;
        const enabled = features.filter((feature) => value.features[feature.key]).length;
        const expanded = open[category] ?? false;
        return (
          <Collapsible key={category} open={expanded} onOpenChange={(next) => setOpen((current) => ({ ...current, [category]: next }))} className="rounded-sm border border-border">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent/50">
              <span className="text-[0.8125rem] font-semibold text-foreground">{category}</span>
              <span className="flex items-center gap-2 text-2xs text-muted-foreground">
                {enabled} of {features.length} enabled
                <ChevronDownIcon className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="divide-y divide-border border-t border-border">
                {features.map((feature) => {
                  const on = Boolean(value.features[feature.key]);
                  const missing = on ? feature.dependencies.filter((dependency) => !value.features[dependency]) : [];
                  const id = `${idPrefix}-feature-${feature.key}`;
                  return (
                    <li key={feature.key} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <Label htmlFor={id} className="text-[0.8125rem] font-medium text-foreground">{feature.name}</Label>
                        <p className="text-2xs text-muted-foreground">{feature.description}</p>
                        {feature.dependencies.length > 0 ? (
                          <p className="text-2xs text-muted-foreground">Requires {feature.dependencies.map((dependency) => FEATURE_BY_KEY[dependency]?.name ?? dependency).join(", ")}</p>
                        ) : null}
                        {missing.length > 0 || errors[`feature.${feature.key}`] ? (
                          <p role="alert" className="mt-0.5 flex items-center gap-1 text-2xs text-danger">
                            <TriangleAlertIcon className="size-3" aria-hidden />
                            {errors[`feature.${feature.key}`] ?? `Requires ${missing.map((dependency) => FEATURE_BY_KEY[dependency]?.name ?? dependency).join(", ")}.`}
                          </p>
                        ) : null}
                      </div>
                      <Switch id={id} checked={on} onCheckedChange={(next) => set(feature.key, next)} aria-label={feature.name} />
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

function LimitRow({ def, rule, error, onChange, idPrefix }: { def: ResourceDef; rule: LimitRule; error?: string; onChange: (rule: LimitRule) => void; idPrefix: string }) {
  const id = `${idPrefix}-limit-${def.key}`;
  const numeric = rule.kind === "fixed" || rule.kind === "custom";
  return (
    <li className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_11rem_9rem] sm:items-start">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[0.8125rem] font-medium text-foreground">{def.name}</Label>
        <p className="text-2xs text-muted-foreground">
          {def.description} {def.kind === "metered" ? `Resets ${def.resetPeriod === "billing_cycle" ? "each billing period" : "monthly"}.` : "A capacity, not reset."}
        </p>
        {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
      </div>
      <Select
        value={rule.kind}
        onValueChange={(kind) => onChange({ kind: kind as LimitKind, value: kind === "fixed" || kind === "custom" ? (rule.value ?? null) : null })}
      >
        <SelectTrigger id={id} aria-label={`${def.name} limit type`} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {def.supportedKinds.map((kind) => (
            <SelectItem key={kind} value={kind}>{LIMIT_KIND[kind].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative">
        <Input
          aria-label={`${def.name} value`}
          inputMode="numeric"
          disabled={!numeric}
          value={numeric ? (rule.value === null ? "" : String(rule.value)) : ""}
          placeholder={numeric ? "Value" : "-"}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            onChange({ ...rule, value: digits === "" ? null : Number(digits) });
          }}
          aria-invalid={Boolean(error)}
          className="h-8 pr-14 tabular"
        />
        {numeric ? <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-2xs text-muted-foreground">{def.unit}</span> : null}
      </div>
    </li>
  );
}

export function LimitsSection({ value, onChange, errors, idPrefix = "plan" }: SectionProps) {
  return (
    <div className="space-y-1">
      <p className="text-2xs text-muted-foreground">
        Not available, a fixed number, unlimited and a contract-specific value are different statements. Zero is never used to mean unlimited.
      </p>
      {ENTITLEMENT_CATEGORIES.map((category) => {
        const resources = resourcesIn(category);
        if (resources.length === 0) return null;
        return (
          <section key={category} className="rounded-sm border border-border" aria-label={category}>
            <h4 className="border-b border-border bg-surface-sunken px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h4>
            <ul className="divide-y divide-border">
              {resources.map((def) => (
                <LimitRow
                  key={def.key}
                  def={def}
                  rule={value.limits[def.key] ?? { kind: "none", value: null }}
                  error={errors[`limit.${def.key}`]}
                  idPrefix={idPrefix}
                  onChange={(rule) => onChange({ limits: { ...value.limits, [def.key]: rule } })}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

export function AvailabilitySection({ value, onChange, errors, idPrefix = "plan" }: SectionProps) {
  const availability = value.availability;
  const set = (patch: Partial<typeof availability>) => onChange({ availability: { ...availability, ...patch } });
  const rows: Array<[keyof Pick<typeof availability, "newPurchase" | "upgrade" | "downgrade">, string, string]> = [
    ["newPurchase", "Available for new purchase", "Companies can subscribe to this plan when they sign up."],
    ["upgrade", "Available for upgrade", "Existing companies can move up to this plan."],
    ["downgrade", "Available for downgrade", "Existing companies can move down to this plan."],
  ];

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-sm border border-border">
        {rows.map(([key, label, hint]) => (
          <li key={key} className="flex items-start justify-between gap-3 px-3 py-2">
            <div>
              <Label htmlFor={`${idPrefix}-${key}`} className="text-[0.8125rem] font-medium text-foreground">{label}</Label>
              <p className="text-2xs text-muted-foreground">{hint}</p>
            </div>
            <Switch id={`${idPrefix}-${key}`} checked={availability[key]} onCheckedChange={(next) => set({ [key]: next })} aria-label={label} />
          </li>
        ))}
      </ul>
      {errors.availability ? <p role="alert" className="text-2xs text-warning">{errors.availability}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[0.8125rem]">Visibility</Label>
          <RadioGroup value={availability.visibility} onValueChange={(visibility) => set({ visibility: visibility as "public" | "invite_only" })} className="gap-1.5">
            {(["public", "invite_only"] as const).map((option) => (
              <div key={option} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2">
                <RadioGroupItem value={option} id={`${idPrefix}-avail-vis-${option}`} />
                <Label htmlFor={`${idPrefix}-avail-vis-${option}`} className="flex-1 font-normal">
                  <span className="block text-[0.8125rem] font-medium text-foreground">{option === "public" ? "Public" : "Invite only"}</span>
                  <span className="block text-2xs text-muted-foreground">{option === "public" ? "Listed wherever plans are offered." : "Offered only by the sales team."}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-1">
          <Label className="text-[0.8125rem]">Available in currencies</Label>
          <div className="space-y-1.5 rounded-sm border border-border px-3 py-2">
            {CURRENCIES.map((currency) => (
              <div key={currency} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-cur-${currency}`}
                  checked={availability.currencies.includes(currency)}
                  onCheckedChange={(checked) => set({ currencies: checked === true ? [...availability.currencies, currency] : availability.currencies.filter((item) => item !== currency) })}
                />
                <Label htmlFor={`${idPrefix}-cur-${currency}`} className="font-normal">{currency}</Label>
              </div>
            ))}
            {errors.currencies ? <p role="alert" className="text-2xs text-danger">{errors.currencies}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

export function ReviewSummary({ value }: { value: PlanDraftInput }) {
  const enabled = ENTITLEMENT_CATEGORIES.flatMap((category) => featuresIn(category)).filter((feature) => value.features[feature.key]);
  const limits = ENTITLEMENT_CATEGORIES.flatMap((category) => resourcesIn(category));

  return (
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
      <Panel title="Identity">
        <dl className="divide-y divide-border">
          <KeyValue label="Name">{value.name || <span className="text-danger">Missing</span>}</KeyValue>
          <KeyValue label="Internal code"><span className="font-mono text-2xs">{value.internalCode || "Missing"}</span></KeyValue>
          <KeyValue label="Segment">{value.targetSegment}</KeyValue>
          <KeyValue label="Visibility">{value.availability.visibility === "public" ? "Public" : "Invite only"}</KeyValue>
        </dl>
      </Panel>
      <Panel title="Pricing">
        <dl className="divide-y divide-border">
          <KeyValue label="Monthly">{money(value.price.monthlyMinor, value.price.currency)}</KeyValue>
          <KeyValue label="Annual">{money(value.price.annualMinor, value.price.currency)}</KeyValue>
          <KeyValue label="Setup fee">{value.price.setupFeeMinor > 0 ? money(value.price.setupFeeMinor, value.price.currency) : "None"}</KeyValue>
          <KeyValue label="Trial">{value.price.trialDays > 0 ? `${value.price.trialDays} days` : "None"}</KeyValue>
        </dl>
      </Panel>
      <Panel title="Features" description={`${enabled.length} enabled`}>
        {enabled.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">No features enabled.</p>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {enabled.map((feature) => (
              <li key={feature.key} className="rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] text-neutral">{feature.name}</li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Limits">
        <dl className="divide-y divide-border">
          {limits.map((def) => {
            const rule = value.limits[def.key] ?? { kind: "none" as const, value: null };
            return (
              <KeyValue key={def.key} label={def.name}>
                {rule.kind === "none" ? "Not available" : rule.kind === "unlimited" ? "Unlimited" : `${new Intl.NumberFormat("en-IN").format(rule.value ?? 0)} ${def.unit}${rule.kind === "custom" ? " (custom)" : ""}`}
              </KeyValue>
            );
          })}
        </dl>
      </Panel>
      <Panel title="Availability" className="lg:col-span-2">
        <p className="text-[0.8125rem] text-foreground">
          {[value.availability.newPurchase && "new purchase", value.availability.upgrade && "upgrade", value.availability.downgrade && "downgrade"].filter(Boolean).join(", ") || "Not available anywhere"} · {value.availability.currencies.join(", ") || "no currency"}
        </p>
      </Panel>
    </div>
  );
}
