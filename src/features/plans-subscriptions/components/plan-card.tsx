"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionMenu } from "@/components/shared/action-menu";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { routes } from "../data/config";
import type { PlanSummary } from "../data/types";
import { money } from "../lib/money";
import { PlanStatusBadge, VersionStatusBadge } from "./badges";
import { usePlanActions } from "./use-plan-actions";

/**
 * A plan as an admin configuration card - not a marketing price card. Every card
 * has the same height and layout, so a more expensive plan is never visually louder.
 */
export function PlanCard({ summary, actions }: { summary: PlanSummary; actions: ReturnType<typeof usePlanActions> }) {
  const router = useRouter();
  const { plan, current, draft, subscribers } = summary;
  const version = current ?? draft;
  const price = version?.price;
  const edit = actions.editAction(summary);

  return (
    <article className={cn("flex min-w-0 flex-col rounded-sm border bg-card shadow-xs", summary.needsReview ? "border-warning/40" : "border-border")} aria-label={plan.name}>
      <div className="flex-1 space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-semibold tracking-tight text-foreground">
              <Link href={routes.plan(plan.id)} className="hover:text-primary hover:underline">{plan.name}</Link>
            </h3>
            <p className="font-mono text-[11px] text-muted-foreground">{plan.internalCode}</p>
          </div>
          <PlanStatusBadge status={plan.status} />
        </div>
        <p className="line-clamp-2 min-h-8 text-2xs text-muted-foreground">{plan.description || "No description"}</p>

        <div className="grid grid-cols-2 gap-2 border-y border-border py-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monthly</p>
            <p className="text-sm font-semibold tabular text-foreground">{price ? money(price.monthlyMinor, price.currency) : "-"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Annual</p>
            <p className="text-sm font-semibold tabular text-foreground">{price ? money(price.annualMinor, price.currency) : "-"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
          <Link href={routes.subscriptionsFor({ plan: plan.key })} className="font-medium text-foreground hover:underline">
            {subscribers.total} active {subscribers.total === 1 ? "company" : "companies"}
          </Link>
          {current ? <span>v{current.version}</span> : null}
          {draft ? <span className="inline-flex items-center gap-1">Draft v{draft.version} <VersionStatusBadge status="draft" /></span> : null}
          <span>Updated {relativeTime(plan.updatedAt)}</span>
        </div>
        {summary.needsReview ? <p className="text-2xs text-warning">Needs review: {summary.issues.some((issue) => issue.severity === "error") ? "incomplete configuration" : "unpublished changes"}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-1.5 border-t border-border px-3 py-2">
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => router.push(routes.plan(plan.id))}>View Plan</Button>
          {edit ? <Button variant="ghost" size="sm" onClick={edit.run}>{summary.draft ? "Edit" : "New Version"}</Button> : null}
        </div>
        <ActionMenu items={actions.menu(summary)} label={`More actions for ${plan.name}`} />
      </div>
    </article>
  );
}
