"use client";

import { RotateCcwIcon, SnowflakeIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { cn } from "@/lib/utils/cn";
import { STRATEGY } from "../../data/config";
import { useChangePreview, useFlagCapabilities } from "../../data/hooks";
import type { FlagDetail } from "../../data/repository";
import type { ConfigDiff, Environment, RolloutStrategy } from "../../data/types";
import { ago, plural, rolloutText } from "../../lib/format";
import { StateBadge } from "../badges";
import { ChangeReviewDrawer, type ChangeRequest } from "../change-review";
import { CompanyPicker } from "../company-picker";

const STRATEGIES: RolloutStrategy[] = ["disabled", "internal", "selected", "percentage", "all"];

/**
 * Edits who gets the feature. Choosing a strategy only edits a proposal; nothing is
 * recorded until the impact review is confirmed, so the current configuration and the
 * proposed one are always shown side by side.
 */
export function TargetingTab({ detail, environment }: { detail: FlagDetail; environment: Environment }) {
  const { flag, row } = detail;
  const config = row.config;
  const capabilities = useFlagCapabilities();
  const baseline = config.enabled ? config.strategy : "disabled";
  const [strategy, setStrategy] = useState<RolloutStrategy>(baseline);
  const [percentage, setPercentage] = useState(config.percentage > 0 ? config.percentage : 10);
  const [selected, setSelected] = useState<string[]>(config.selectedCompanyIds);
  const [request, setRequest] = useState<ChangeRequest | null>(null);

  const editable = flag.lifecycle !== "archived";
  const production = environment === "production";
  const canChange = production ? capabilities.canChangeProduction : capabilities.canChangeRollout;
  const dirty = strategy !== baseline || (strategy === "percentage" && percentage !== config.percentage) || (strategy === "selected" && [...selected].sort().join() !== [...config.selectedCompanyIds].sort().join());

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const proposed = useMemo<Partial<ConfigDiff>>(() => (strategy === "disabled" ? { enabled: false, strategy: "disabled" } : { enabled: true, strategy, percentage: strategy === "percentage" ? percentage : config.percentage, selectedCompanyIds: strategy === "selected" ? selected : config.selectedCompanyIds }), [strategy, percentage, selected, config.percentage, config.selectedCompanyIds]);
  const projection = useChangePreview(flag.key, environment, dirty ? proposed : null);
  const invalid = strategy === "selected" && selected.length === 0 ? "Select at least one company, or choose another strategy." : strategy === "percentage" && (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) ? "Use a whole percentage from 1 to 100." : null;

  const reset = () => { setStrategy(baseline); setPercentage(config.percentage > 0 ? config.percentage : 10); setSelected(config.selectedCompanyIds); };
  const base = { flagKey: flag.key, flagName: flag.name, environment } as const;

  return (
    <div className="space-y-1">
      {config.emergencyOff ? (
        <AlertBanner
          tone="danger"
          title="Emergency Disabled"
          action={editable ? <Button size="sm" variant="outline" disabled={!canChange} onClick={() => setRequest({ ...base, proposed: { emergencyOff: false }, title: "Restore From Emergency Off", kind: "restore", description: `${flag.name} returns to the rollout configuration that was preserved when it was disabled.` })}><RotateCcwIcon />Restore</Button> : undefined}
        >
          {config.emergencyReason ?? "No reason was recorded."} {config.emergencyBy ? `Disabled by ${config.emergencyBy}${config.emergencyAt ? `, ${ago(config.emergencyAt)}` : ""}.` : ""} The rollout configuration below is preserved and is restored as it was.
        </AlertBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-1 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Rollout Strategy" description={`Who receives ${flag.name} in this environment. Targeting never grants a plan entitlement.`}>
          <fieldset disabled={!editable || !canChange} className="space-y-2">
            <RadioGroup value={strategy} onValueChange={(value) => setStrategy(value as RolloutStrategy)} className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {STRATEGIES.map((item) => (
                <label key={item} className={cn("flex cursor-pointer items-start gap-2 rounded-sm border p-2.5 transition-colors hover:bg-accent/40", strategy === item ? "border-primary/50 bg-primary-subtle/40" : "border-border")}>
                  <RadioGroupItem value={item} className="mt-0.5" aria-label={STRATEGY[item].label} />
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] font-medium text-foreground">{STRATEGY[item].label}</span>
                    <span className="block text-2xs text-muted-foreground">{STRATEGY[item].description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            {strategy === "percentage" ? (
              <div className="space-y-1 rounded-sm border border-border p-3">
                <Label htmlFor="rollout-percentage" className="text-[0.8125rem]">Percentage Of Eligible Companies</Label>
                <div className="flex items-center gap-3">
                  <input id="rollout-percentage-range" aria-label="Percentage slider" type="range" min={1} max={100} value={Math.min(100, Math.max(1, percentage))} onChange={(event) => setPercentage(Number(event.target.value))} className="h-1.5 flex-1 accent-primary" />
                  <Input id="rollout-percentage" type="number" min={1} max={100} value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} className="w-20" />
                  <span className="text-[0.8125rem] text-muted-foreground">%</span>
                </div>
                <p className="text-2xs text-muted-foreground">Each company gets a fixed bucket from a stable hash of the feature key, environment, company ID and salt, so the same companies are matched every time. The matched count can differ from the percentage.</p>
              </div>
            ) : null}
            {strategy === "selected" ? (
              <div className="space-y-1 rounded-sm border border-border p-3">
                <p className="text-[0.8125rem] font-medium text-foreground">Selected Companies ({selected.length})</p>
                <CompanyPicker selected={selected} onChange={setSelected} disabled={!editable || !canChange} />
              </div>
            ) : null}
            {strategy === "internal" ? <AlertBanner tone="info" title="Internal Testing">No tenant company is matched. This does not open any company data to platform staff.</AlertBanner> : null}
          </fieldset>
          {!canChange && editable ? <p className="mt-2 text-2xs text-warning">{production ? "Changing production needs the flag-management and platform-write rights." : "You do not have the right to change flags."}</p> : null}
        </Panel>

        <Panel title="Current Vs Proposed" description={dirty ? "Unsaved edits. Nothing is recorded until you confirm the review." : "The proposal matches the current configuration."}>
          <dl className="divide-y divide-border">
            <KeyValue label="State Now"><StateBadge state={row.state} /></KeyValue>
            <KeyValue label="Strategy Now">{STRATEGY[config.strategy].short}</KeyValue>
            <KeyValue label="Size Now">{rolloutText(config)}</KeyValue>
            <KeyValue label="Effective Now">{row.stats.effective} of {row.stats.totalCompanies}</KeyValue>
            <KeyValue label="Proposed Strategy"><span className={cn(dirty && "font-semibold text-primary")}>{STRATEGY[strategy].short}</span></KeyValue>
            {dirty ? (
              <KeyValue label="Projected Effective">
                {projection.data ? `${projection.data.impact.projectedEnabled} of ${row.stats.totalCompanies}` : projection.error ? "Unavailable" : "Calculating..."}
              </KeyValue>
            ) : null}
          </dl>
          {dirty && projection.data ? (
            <p className="mt-1 text-2xs text-muted-foreground">
              {projection.data.impact.newlyEnabled.length > 0 ? `${plural(projection.data.impact.newlyEnabled.length, "company", "companies")} newly reached. ` : ""}
              {projection.data.impact.newlyDisabled.length > 0 ? `${plural(projection.data.impact.newlyDisabled.length, "company", "companies")} no longer reached. ` : ""}
              Only companies with the plan, an active subscription, the prerequisites and the integrations actually get the feature.
            </p>
          ) : null}
          {invalid ? <p role="alert" className="mt-1 text-2xs text-danger">{invalid}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button size="sm" disabled={!dirty || Boolean(invalid) || !editable || !canChange} onClick={() => setRequest({ ...base, proposed, title: `Review Rollout Change - ${flag.name}` })}>Review Rollout Change</Button>
            <Button size="sm" variant="ghost" disabled={!dirty} onClick={reset}>Discard Edits</Button>
          </div>
        </Panel>
      </div>

      {!config.emergencyOff && editable ? (
        <Panel title="Emergency Disable" description="Switches the feature off at once. The rollout configuration is preserved, so restoring returns it exactly as it was.">
          {flag.protection === "protected" ? (
            <p className="text-[0.8125rem] text-muted-foreground">Protected flags cannot be emergency-disabled from this screen. Use the incident process.</p>
          ) : (
            <Button variant="outline" size="sm" className="text-danger" disabled={production ? !capabilities.canEmergencyDisable : !capabilities.canChangeRollout} onClick={() => setRequest({ ...base, proposed: { emergencyOff: true }, title: `Emergency Disable ${flag.name}`, kind: "emergency" })}><SnowflakeIcon />Emergency Disable</Button>
          )}
        </Panel>
      ) : null}

      <ChangeReviewDrawer request={request} onClose={() => setRequest(null)} />
    </div>
  );
}
