"use client";

import { CheckCircle2Icon, CircleDashedIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue } from "@/features/companies/components/primitives";
import { cn } from "@/lib/utils/cn";
import { AVAILABILITY, flagRoutes } from "../data/config";
import { useEvaluation } from "../data/hooks";
import type { ConditionState, Environment } from "../data/types";
import { AvailabilityBadge } from "./badges";
import { FlagsError } from "./states";

const CONDITIONS: Array<{ key: "implementation" | "flag" | "emergency" | "targeting" | "plan" | "subscription" | "dependencies" | "integration"; label: string; layer: string }> = [
  { key: "implementation", label: "Feature Implemented For This Environment", layer: "Implementation" },
  { key: "flag", label: "Flag Enabled", layer: "Rollout Availability" },
  { key: "emergency", label: "No Emergency Disable", layer: "Rollout Availability" },
  { key: "targeting", label: "Matched By Targeting", layer: "Rollout Availability" },
  { key: "plan", label: "Plan Includes The Feature", layer: "Plan Entitlement" },
  { key: "subscription", label: "Active Subscription And Account", layer: "Plan Entitlement" },
  { key: "dependencies", label: "Prerequisite Features Available", layer: "Dependencies" },
  { key: "integration", label: "Required Integrations Ready", layer: "Integration Readiness" },
];

function Mark({ state }: { state: ConditionState }) {
  if (state === "pass") return <CheckCircle2Icon className="size-4 shrink-0 text-success" aria-label="Passes" />;
  if (state === "fail") return <XCircleIcon className="size-4 shrink-0 text-danger" aria-label="Fails" />;
  return <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" aria-label="Not applicable" />;
}

/**
 * Explains, condition by condition, why one company does or does not get a feature.
 * Each layer is separate on purpose: a flag never grants an entitlement or a
 * permission, and a failing prerequisite never rewrites the stored flag.
 */
export function EvaluationDrawer({ flagKey, companyId, environment, onClose }: { flagKey: string | null; companyId: string | null; environment: Environment; onClose: () => void }) {
  const query = useEvaluation(flagKey, environment, companyId);
  const detail = query.data;
  const evaluation = detail?.evaluation;

  return (
    <Sheet open={Boolean(flagKey && companyId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{evaluation ? `${evaluation.companyName}` : "Availability Evaluation"}</SheetTitle>
          <SheetDescription>{detail ? `${detail.flag.name} - ${environment[0]?.toUpperCase()}${environment.slice(1)}` : "Loading the evaluation..."}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {query.error && !evaluation ? (
            <FlagsError subject="Evaluation" error={query.error} onRetry={() => void query.refetch()} back={{ href: flagKey ? flagRoutes.flag(flagKey, environment, "impact") : flagRoutes.root, label: "Back to Company Impact" }} />
          ) : !evaluation || !detail ? (
            <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Evaluating...</div>
          ) : (
            <>
              <div className="rounded-sm border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <AvailabilityBadge availability={evaluation.availability} />
                  <span className="text-2xs text-muted-foreground">Bucket {evaluation.bucket.toFixed(2)}</span>
                </div>
                <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{AVAILABILITY[evaluation.availability].explanation}</p>
                {evaluation.reasons.length > 1 ? <p className="mt-1 text-2xs text-muted-foreground">Also failing: {evaluation.reasons.slice(1).map((reason) => AVAILABILITY[reason].label).join(", ")}.</p> : null}
              </div>

              <section aria-label="Conditions">
                <h4 className="mb-1 text-[13px] font-semibold text-foreground">Conditions</h4>
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {CONDITIONS.map((item) => (
                    <li key={item.key} className="flex items-center gap-2 px-3 py-1.5">
                      <Mark state={evaluation.conditions[item.key]} />
                      <span className="min-w-0 flex-1 text-[0.8125rem] text-foreground">{item.label}</span>
                      <span className="shrink-0 text-2xs text-muted-foreground">{item.layer}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-2xs text-muted-foreground">The bucket is a stable hash of the feature key, environment, company ID and salt. It is the same every time; nothing is random.</p>
              </section>

              {detail.prerequisites.length > 0 ? (
                <section aria-label="Prerequisites">
                  <h4 className="mb-1 text-[13px] font-semibold text-foreground">Prerequisite Features</h4>
                  <ul className="divide-y divide-border rounded-sm border border-border">
                    {detail.prerequisites.map((item) => (
                      <li key={item.key} className="flex items-center gap-2 px-3 py-1.5 text-[0.8125rem]">
                        <Mark state={item.ok ? "pass" : "fail"} />
                        <Link href={flagRoutes.flag(item.key, environment)} className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary hover:underline">{item.name}</Link>
                        <span className={cn("text-2xs", item.ok ? "text-muted-foreground" : "text-warning")}>{item.ok ? "Available" : (AVAILABILITY[item.availability as keyof typeof AVAILABILITY]?.label ?? "Missing")}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {evaluation.integrationDetail.length > 0 ? (
                <section aria-label="Integrations">
                  <h4 className="mb-1 text-[13px] font-semibold text-foreground">Integrations</h4>
                  <ul className="divide-y divide-border rounded-sm border border-border">
                    {evaluation.integrationDetail.map((item) => (
                      <li key={item.provider} className="flex items-center gap-2 px-3 py-1.5 text-[0.8125rem]">
                        <Mark state={item.state === "ready" ? "pass" : "fail"} />
                        <span className="flex-1 capitalize">{item.provider.replace(/_/g, " ")}</span>
                        <span className="text-2xs text-muted-foreground">{item.state === "ready" ? "Ready" : item.state === "not_connected" ? "Not Connected" : "Needs Attention"}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <dl className="divide-y divide-border rounded-sm border border-border px-3">
                <KeyValue label="Plan">{evaluation.planName}</KeyValue>
                <KeyValue label="Subscription">{evaluation.subscriptionStatus.replace(/_/g, " ")}</KeyValue>
                <KeyValue label="Plan Entitlement Key">{detail.flag.entitlement ?? "None Required"}</KeyValue>
                <KeyValue label="Action Limits">{evaluation.action.state === "not_applicable" ? "Not Metered" : evaluation.action.state === "limited" ? "Limited" : "Within Limits"}</KeyValue>
              </dl>
              {evaluation.action.state === "limited" ? <p className="text-2xs text-warning">{evaluation.action.detail} The feature stays visible; only the metered action is limited.</p> : null}
              <p className="text-2xs text-muted-foreground">Availability, plan entitlement, user permission, integration readiness and usage limits are separate checks. A feature flag never grants an entitlement or a permission, and a failed prerequisite never changes what is stored in the flag.</p>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {evaluation ? <Button asChild variant="outline"><Link href={flagRoutes.company(evaluation.companyId)}>Open Company</Link></Button> : null}
          {evaluation ? <Button asChild variant="outline"><Link href={flagRoutes.subscription(evaluation.subscriptionId)}>Open Subscription</Link></Button> : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
