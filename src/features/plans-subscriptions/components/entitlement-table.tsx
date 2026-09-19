"use client";

import { ShieldPlusIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { ENTITLEMENT_CATEGORIES, formatRule } from "../data/catalogue";
import { effectiveLimitLabel, overrideLabel } from "../data/selectors";
import type { EntitlementRow, EntitlementStatus, ResourceKey } from "../data/types";

const STATUS: Record<EntitlementStatus, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = {
  within: { label: "Within limit", tone: "success" },
  high: { label: "High usage", tone: "info" },
  near_limit: { label: "Near limit", tone: "warning" },
  exceeded: { label: "Over limit", tone: "danger" },
  not_metered: { label: "Not metered", tone: "neutral" },
  enabled: { label: "Enabled", tone: "success" },
  disabled: { label: "Not included", tone: "neutral" },
  unavailable: { label: "Unavailable", tone: "neutral" },
};

export function EntitlementStatusBadge({ status }: { status: EntitlementStatus }) {
  const meta = STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/**
 * Plan allowance, company override and effective allowance are three separate
 * columns. The base plan limit is never shown as if it were the effective one, and
 * the rule that produced the effective value (added / replaced / plan) is named.
 */
export function EntitlementTable({ rows, canOverride, onOverride }: { rows: EntitlementRow[]; canOverride: boolean; onOverride: (resource: ResourceKey) => void }) {
  const [showFeatures, setShowFeatures] = useState(false);
  const visible = showFeatures ? rows : rows.filter((row) => row.kind === "resource");

  return (
    <div>
      <div className="flex items-center justify-end gap-2 px-3 pb-2">
        <Switch id="show-feature-rows" checked={showFeatures} onCheckedChange={setShowFeatures} />
        <Label htmlFor="show-feature-rows" className="text-2xs font-normal text-muted-foreground">Include features (on / off)</Label>
      </div>
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-[0.8125rem]">
          <caption className="sr-only">Entitlements: plan allowance, company override, effective allowance and current usage</caption>
          <thead>
            <tr>
              {["Resource / Feature", "Plan Allowance", "Override", "Effective Allowance", "Current Usage", "Status"].map((label, index) => (
                <th key={label} scope="col" className={cn("border-b border-border bg-surface-sunken px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground", index === 4 && "text-right")}>
                  {label}
                </th>
              ))}
              <th scope="col" className="border-b border-border bg-surface-sunken px-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {ENTITLEMENT_CATEGORIES.map((category) => {
              const group = visible.filter((row) => row.category === category);
              if (group.length === 0) return null;
              return (
                <GroupRows key={category} category={category}>
                  {group.map((row) => (
                    <tr key={`${row.kind}-${row.key}`} className="group">
                      <th scope="row" className="border-b border-border px-3 py-1.5 text-left font-normal group-hover:bg-accent/50">
                        <span className="block text-foreground">{row.name}</span>
                        {row.kind === "resource" ? <span className="block text-2xs text-muted-foreground">{row.resetPeriod === "none" ? "Capacity" : row.resetPeriod === "billing_cycle" ? "Per billing period" : "Per month"}</span> : null}
                      </th>
                      <td className="border-b border-border px-3 py-1.5 tabular group-hover:bg-accent/50">
                        {row.base ? formatRule(row.base, row.unit) : row.baseEnabled ? "Included" : "Not included"}
                      </td>
                      <td className="border-b border-border px-3 py-1.5 group-hover:bg-accent/50">
                        {row.override ? (
                          <span>
                            <span className="block font-medium text-primary tabular">{overrideLabel(row)}</span>
                            <span className="block text-2xs text-muted-foreground">until {formatDate(row.override.expiresAt)} · by {row.override.approvedBy}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="border-b border-border px-3 py-1.5 group-hover:bg-accent/50">
                        <span className="block font-medium tabular text-foreground">{effectiveLimitLabel(row)}</span>
                        {row.effective ? <span className="block text-2xs text-muted-foreground">{row.effective.ruleApplied === "base" ? "Plan allowance" : row.effective.ruleApplied}</span> : null}
                      </td>
                      <td className="border-b border-border px-3 py-1.5 text-right tabular group-hover:bg-accent/50">
                        {row.used === null ? <span className="text-muted-foreground">-</span> : formatNumber(row.used)}
                      </td>
                      <td className="border-b border-border px-3 py-1.5 group-hover:bg-accent/50"><EntitlementStatusBadge status={row.status} /></td>
                      <td className="border-b border-border px-2 py-1.5 text-right group-hover:bg-accent/50">
                        {row.kind === "resource" && row.usageResource && canOverride ? (
                          <Button variant="ghost" size="icon-sm" aria-label={`Apply override for ${row.name}`} onClick={() => onOverride(row.key as ResourceKey)}>
                            <ShieldPlusIcon />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </GroupRows>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({ category, children }: { category: string; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <th scope="colgroup" colSpan={7} className="border-b border-border bg-muted/60 px-3 py-1 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {category}
        </th>
      </tr>
      {children}
    </>
  );
}
