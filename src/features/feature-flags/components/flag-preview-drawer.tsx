"use client";

import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue } from "@/features/companies/components/primitives";
import { FLAG_TYPE, IMPLEMENTATION, STRATEGY, flagRoutes } from "../data/config";
import { useFlag } from "../data/hooks";
import type { Environment } from "../data/types";
import { ago, rolloutText } from "../lib/format";
import { ImplementationBadge, LifecycleBadge, ProtectionBadge, StateBadge } from "./badges";
import { FlagsError } from "./states";

/** A read-only look at one flag: enough to decide whether to open it. */
export function FlagPreviewDrawer({ flagKey, environment, onClose }: { flagKey: string | null; environment: Environment; onClose: () => void }) {
  const query = useFlag(flagKey ?? "", environment);
  const detail = flagKey ? query.data : undefined;
  const flag = detail?.flag;
  const row = detail?.row;

  return (
    <Sheet open={Boolean(flagKey)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{flag?.name ?? "Feature Flag"}</SheetTitle>
          <SheetDescription>{flag ? <span className="font-mono">{flag.key}</span> : "Loading the flag..."}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {query.error && !flag ? (
            <FlagsError subject="Feature Flag" error={query.error} onRetry={() => void query.refetch()} back={{ href: flagRoutes.all(environment), label: "Back to All Flags" }} />
          ) : !flag || !row || !detail ? (
            <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Loading...</div>
          ) : (
            <>
              <p className="text-[0.8125rem] text-muted-foreground">{flag.description}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StateBadge state={row.state} />
                <LifecycleBadge status={flag.lifecycle} />
                <ProtectionBadge level={flag.protection} />
                <ImplementationBadge status={flag.implementation} />
              </div>
              <dl className="divide-y divide-border rounded-sm border border-border px-3">
                <KeyValue label="Environment">{environment[0]?.toUpperCase()}{environment.slice(1)}</KeyValue>
                <KeyValue label="Type">{FLAG_TYPE[flag.type].label}</KeyValue>
                <KeyValue label="Rollout">{STRATEGY[row.config.strategy].label}</KeyValue>
                <KeyValue label="Size">{rolloutText(row.config)}</KeyValue>
                <KeyValue label="Eligible Companies">{row.stats.eligible}</KeyValue>
                <KeyValue label="Targeting Matched">{row.stats.targetingMatched}</KeyValue>
                <KeyValue label="Effective Companies">{row.stats.effective} of {row.stats.totalCompanies}</KeyValue>
                <KeyValue label="Blocked">{row.stats.blocked}</KeyValue>
                <KeyValue label="Owner">{flag.ownerTeam}</KeyValue>
                <KeyValue label="Category">{flag.category}</KeyValue>
                <KeyValue label="Implementation">{IMPLEMENTATION[flag.implementation].label}</KeyValue>
                <KeyValue label="Last Changed">{ago(row.config.updatedAt)} by {row.config.updatedBy}</KeyValue>
              </dl>
              {detail.dependencies.direct.length > 0 ? <p className="text-2xs text-muted-foreground">Requires {detail.dependencies.direct.join(", ")}.</p> : null}
              {detail.changes.length > 0 ? <p className="text-2xs text-warning">{detail.changes.length} pending, scheduled or draft {detail.changes.length === 1 ? "change" : "changes"} in this environment.</p> : null}
              {flag.knownLimitations.length > 0 ? (
                <div>
                  <p className="text-2xs font-medium text-foreground">Known Limitations</p>
                  <ul className="list-disc pl-4 text-2xs text-muted-foreground">{flag.knownLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {flag ? <Button asChild><Link href={flagRoutes.flag(flag.key, environment)}><ExternalLinkIcon />Open Flag</Link></Button> : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
