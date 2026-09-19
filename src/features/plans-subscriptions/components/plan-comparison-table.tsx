"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { ENTITLEMENT_CATEGORIES, featuresIn, formatRule, resourcesIn, rulesEqual } from "../data/catalogue";
import type { PlanVersion } from "../data/types";
import { money } from "../lib/money";

export interface ComparisonColumn {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  version: PlanVersion;
}

interface Row {
  key: string;
  label: string;
  hint?: string;
  category: string;
  values: Array<{ text: string; enabled?: boolean }>;
  differs: boolean;
}

function buildRows(columns: readonly ComparisonColumn[]): Row[] {
  const rows: Row[] = [];
  const same = (values: string[]) => values.every((value) => value === values[0]);

  const priceRows: Array<[string, string, (version: PlanVersion) => string]> = [
    ["price.monthly", "Monthly price", (v) => money(v.price.monthlyMinor, v.price.currency)],
    ["price.annual", "Annual price", (v) => money(v.price.annualMinor, v.price.currency)],
    ["price.trial", "Trial", (v) => (v.price.trialDays > 0 ? `${v.price.trialDays} days` : "None")],
  ];
  for (const [key, label, read] of priceRows) {
    const values = columns.map((column) => read(column.version));
    rows.push({ key, label, category: "Pricing", values: values.map((text) => ({ text })), differs: !same(values) });
  }

  for (const category of ENTITLEMENT_CATEGORIES) {
    for (const def of resourcesIn(category)) {
      const rules = columns.map((column) => column.version.limits[def.key] ?? { kind: "none" as const, value: null });
      rows.push({
        key: def.key,
        label: def.name,
        hint: def.resetPeriod === "none" ? "Capacity" : `Per ${def.resetPeriod === "billing_cycle" ? "billing period" : "month"}`,
        category,
        values: rules.map((rule) => ({ text: formatRule(rule, def.unit) })),
        differs: !rules.every((rule) => rulesEqual(rule, rules[0] ?? { kind: "none", value: null })),
      });
    }
    for (const feature of featuresIn(category)) {
      const enabled = columns.map((column) => Boolean(column.version.features[feature.key]));
      rows.push({
        key: feature.key,
        label: feature.name,
        category,
        values: enabled.map((on) => ({ text: on ? "Included" : "Not included", enabled: on })),
        differs: !enabled.every((on) => on === enabled[0]),
      });
    }
  }
  return rows;
}

/**
 * Plans (or versions of one plan) side by side, grouped by category. Values come
 * straight from the plan versions - nothing here is typed in by hand - and the
 * header and first column stay in view while scrolling.
 */
export function ComparisonTable({ columns, emptyMessage = "Nothing to compare." }: { columns: readonly ComparisonColumn[]; emptyMessage?: string }) {
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const rows = useMemo(() => buildRows(columns), [columns]);
  const visible = onlyDifferences ? rows.filter((row) => row.differs) : rows;
  const categories = ["Pricing", ...ENTITLEMENT_CATEGORIES].filter((category) => visible.some((row) => row.category === category));

  if (columns.length === 0) return <p className="px-3 py-6 text-center text-[0.8125rem] text-muted-foreground">{emptyMessage}</p>;

  return (
    <div>
      {columns.length > 1 ? (
        <div className="flex items-center justify-end gap-2 px-3 pb-2">
          <Switch id="only-differences" checked={onlyDifferences} onCheckedChange={setOnlyDifferences} />
          <Label htmlFor="only-differences" className="text-2xs font-normal text-muted-foreground">Show only differences</Label>
        </div>
      ) : null}
      <div className="relative max-h-[70vh] overflow-auto scrollbar-thin">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-[0.8125rem]">
          <caption className="sr-only">Plan comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-20 border-b border-border bg-surface-sunken px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Feature / Resource
              </th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className="sticky top-0 z-10 min-w-36 border-b border-border bg-surface-sunken px-3 py-2 text-left align-bottom">
                  <span className="block text-[0.8125rem] font-semibold text-foreground">{column.title}</span>
                  {column.subtitle ? <span className="mt-0.5 block text-2xs font-normal normal-case tracking-normal text-muted-foreground">{column.subtitle}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRows key={category} category={category} rows={visible.filter((row) => row.category === category)} columns={columns.length} />
            ))}
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted-foreground">These versions are identical.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRows({ category, rows, columns }: { category: string; rows: Row[]; columns: number }) {
  return (
    <>
      <tr>
        <th scope="colgroup" colSpan={columns + 1} className="sticky left-0 border-b border-border bg-muted/60 px-3 py-1 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {category}
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.key} className="group">
          <th scope="row" className="sticky left-0 z-[1] border-b border-border bg-card px-3 py-1.5 text-left font-normal group-hover:bg-accent">
            <span className="block text-foreground">{row.label}</span>
            {row.hint ? <span className="block text-2xs text-muted-foreground">{row.hint}</span> : null}
          </th>
          {row.values.map((value, index) => (
            <td key={index} className={cn("border-b border-border px-3 py-1.5 tabular group-hover:bg-accent", row.differs && "bg-primary-subtle/40")}>
              {value.enabled === undefined ? (
                value.text
              ) : value.enabled ? (
                <span className="inline-flex items-center gap-1 text-success"><CheckIcon className="size-3.5" strokeWidth={3} aria-hidden /><span className="sr-only">Included</span></span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground"><MinusIcon className="size-3.5" aria-hidden /><span className="sr-only">Not included</span></span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
