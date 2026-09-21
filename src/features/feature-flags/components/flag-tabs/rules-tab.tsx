"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FEATURES } from "@/features/plans-subscriptions/data/catalogue";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { USAGE_RESOURCES } from "@/features/companies/data/config";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { flagRoutes } from "../../data/config";
import { useFlagCapabilities, useFlagList } from "../../data/hooks";
import type { FlagDetail } from "../../data/repository";
import type { Environment } from "../../data/types";
import { LifecycleBadge, StateBadge } from "../badges";
import { ChangeReviewDrawer, type ChangeRequest } from "../change-review";

/**
 * Prerequisites and the other conditions a company must meet. Only prerequisites are
 * edited here. Plan entitlement, permission, integrations and usage belong to their own
 * modules and are shown so it is clear what a flag does not control.
 */
export function RulesTab({ detail, environment }: { detail: FlagDetail; environment: Environment }) {
  const { flag, dependencies, dependencyFlags } = detail;
  const capabilities = useFlagCapabilities();
  const all = useFlagList({ environment });
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [adding, setAdding] = useState<string>("");
  const canChange = environment === "production" ? capabilities.canChangeProduction : capabilities.canChangeRollout;
  const editable = flag.lifecycle !== "archived" && canChange;
  const base = { flagKey: flag.key, flagName: flag.name, environment } as const;
  const candidates = (all.data?.rows ?? []).filter((row) => row.flag.key !== flag.key && row.flag.lifecycle !== "archived" && !flag.prerequisites.includes(row.flag.key));
  const stateOf = new Map(dependencyFlags.map((item) => [item.key, item]));

  const propose = (prerequisites: string[], title: string) => setRequest({ ...base, proposed: { prerequisites }, title, description: "Prerequisites are checked for cycles before they are recorded. A failed prerequisite never changes the stored flag; it only makes the feature unavailable to that company." });

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Prerequisite Flags" description="This feature is available to a company only where every prerequisite is also available to it.">
          {flag.prerequisites.length === 0 ? <p className="text-[0.8125rem] text-muted-foreground">No prerequisites.</p> : null}
          <ul className="divide-y divide-border">
            {flag.prerequisites.map((key) => {
              const info = stateOf.get(key);
              return (
                <li key={key} className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <Link href={flagRoutes.flag(key, environment)} className="block truncate text-[0.8125rem] font-medium text-foreground hover:text-primary hover:underline">{info?.name ?? key}</Link>
                    <p className="truncate font-mono text-2xs text-muted-foreground">{key}</p>
                  </div>
                  {info && info.state !== "missing" ? <StateBadge state={info.state as "enabled" | "disabled" | "emergency_off"} /> : null}
                  {editable ? <Button variant="ghost" size="icon-sm" aria-label={`Remove prerequisite ${key}`} onClick={() => propose(flag.prerequisites.filter((item) => item !== key), `Remove Prerequisite - ${flag.name}`)}><Trash2Icon /></Button> : null}
                </li>
              );
            })}
          </ul>
          {editable ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Select value={adding || undefined} onValueChange={setAdding}>
                <SelectTrigger size="sm" aria-label="Add a prerequisite" className="w-64"><SelectValue placeholder="Add a prerequisite flag" /></SelectTrigger>
                <SelectContent>{candidates.map((row) => <SelectItem key={row.flag.key} value={row.flag.key}>{row.flag.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!adding} onClick={() => { propose([...flag.prerequisites, adding], `Add Prerequisite - ${flag.name}`); setAdding(""); }}><PlusIcon />Review Addition</Button>
            </div>
          ) : (
            <p className="mt-2 text-2xs text-muted-foreground">{flag.lifecycle === "archived" ? "An archived flag cannot be changed." : "You can view prerequisites but not change them."}</p>
          )}
          <p className="mt-2 text-2xs text-muted-foreground">A prerequisite that would create a loop is refused and the loop is shown in the review, for example a.one to b.two to a.one.</p>
        </Panel>

        <Panel title="Dependency Map" description="Direct and indirect prerequisites, and the flags that need this one.">
          <dl className="divide-y divide-border">
            <KeyValue label="Direct Prerequisites">{dependencies.direct.length || "None"}</KeyValue>
            <KeyValue label="Indirect Prerequisites">{dependencies.indirect.length || "None"}</KeyValue>
            <KeyValue label="Flags That Depend On This">{dependencies.dependents.length || "None"}</KeyValue>
          </dl>
          {dependencies.indirect.length > 0 ? <p className="mt-2 text-2xs text-muted-foreground">Indirect: <span className="font-mono">{dependencies.indirect.join(", ")}</span></p> : null}
          {dependencies.dependents.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-2xs font-medium text-foreground">Dependents</p>
              <ul className="flex flex-wrap gap-1">
                {dependencies.dependents.map((key) => <li key={key}><Link href={flagRoutes.flag(key, environment, "rules")} className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-2xs hover:border-primary/40">{key}</Link></li>)}
              </ul>
              <AlertBanner tone="warning">Turning this flag off makes every dependent unavailable to companies that lose it, without changing the dependents&rsquo; own configuration.</AlertBanner>
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel title="Availability Layers" description="A flag decides rollout availability only. These checks are separate, owned elsewhere, and a flag never grants any of them.">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <dl className="divide-y divide-border">
            <KeyValue label="Plan Entitlement">{flag.entitlement ? (FEATURES.find((item) => item.key === flag.entitlement)?.name ?? flag.entitlement) : "No Plan Requirement"}</KeyValue>
            <KeyValue label="Required Permission">{flag.requiredCapability ?? "No Extra Permission"}</KeyValue>
            <KeyValue label="Usage Resource">{flag.usageResource ? (USAGE_RESOURCES.find((item) => item.key === flag.usageResource)?.label ?? flag.usageResource) : "Not Metered"}</KeyValue>
          </dl>
          <dl className="divide-y divide-border">
            <KeyValue label="Integrations">{flag.integrations.length ? flag.integrations.map((item) => INTEGRATION_PROVIDER[item].label).join(", ") : "None Required"}</KeyValue>
            <KeyValue label="Lifecycle"><LifecycleBadge status={flag.lifecycle} /></KeyValue>
            <KeyValue label="Code References">{flag.codeReferences === "unverified" ? "Unverified" : flag.codeReferences === "none_found" ? "None Found" : "Referenced"}</KeyValue>
          </dl>
        </div>
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-2xs text-muted-foreground">
          <li>A company without the plan entitlement does not get the feature even when the flag targets it. Change plans in <Link href={flagRoutes.plans} className="text-primary hover:underline">Plans &amp; Subscriptions</Link>.</li>
          <li>A missing integration blocks the feature for that company. Integrations are managed in <Link href={flagRoutes.integrations} className="text-primary hover:underline">Integrations</Link>.</li>
          <li>An exhausted usage limit keeps the feature visible and limits only the metered action.</li>
        </ul>
      </Panel>

      <ChangeReviewDrawer request={request} onClose={() => setRequest(null)} />
    </div>
  );
}
