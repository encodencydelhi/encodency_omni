"use client";

import { CalendarClockIcon, DownloadIcon, MoreHorizontalIcon, PlusIcon, TimerIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/utils/format";
import { ActivityPanel, AdoptionPanel, AttentionPanel, EndingTrialsPanel, OverviewKpis, TrendsPanel, UpcomingPanel } from "../components/overview-panels";
import { DemoTag } from "../components/badges";
import { PlansError } from "../components/states";
import { PLANS_MOCK_MODE, routes } from "../data/config";
import { describeError, useOverview, useSubscriptionCapabilities } from "../data/hooks";
import { plansRepository } from "../data/repository";
import { exportSubscriptionRows } from "../lib/csv-export";

/** The commercial operations overview: what is running, what is ending, and what needs a person. */
export function OverviewPage() {
  const router = useRouter();
  const capabilities = useSubscriptionCapabilities();
  const overview = useOverview();
  const data = overview.data;

  const exportAll = async () => {
    try {
      const rows = await plansRepository.exportSubscriptions({});
      exportSubscriptionRows(rows, "subscriptions.csv");
      toast.success(`Exported ${formatNumber(rows.length)} subscriptions`);
    } catch (failure) {
      toast.error(describeError(failure, "The export could not be created.").message);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Plans & Subscriptions"
        description="Manage platform plans, feature entitlements, company subscriptions and subscription lifecycle."
        meta={PLANS_MOCK_MODE ? <DemoTag>Demo data</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canCreatePlan ? (
              <Button size="sm" onClick={() => router.push(routes.createPlan)}>
                <PlusIcon />
                Create Plan
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={routes.subscriptions}>View Subscriptions</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {capabilities.canExportSubscriptions ? (
                  <DropdownMenuItem onSelect={() => void exportAll()}>
                    <DownloadIcon />
                    Export Subscriptions
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={routes.subscriptionsFor({ trialEnding: "1" })}>
                    <TimerIcon />
                    Review Expiring Trials
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={routes.changes("scheduled")}>
                    <CalendarClockIcon />
                    View Scheduled Changes
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {overview.error && !data ? (
        <PlansError subject="Overview" error={overview.error} onRetry={() => void overview.refetch()} back={{ href: routes.plans, label: "Open Plans" }} />
      ) : (
        <>
          <OverviewKpis portfolio={data?.portfolio} />
          <div className="grid grid-cols-1 gap-1 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <TrendsPanel />
            </div>
            <div className="lg:col-span-2">
              <AdoptionPanel rows={data?.adoption} />
            </div>
          </div>
          <AttentionPanel items={data?.attention} />
          <div className="grid grid-cols-1 gap-1 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <UpcomingPanel items={data?.upcoming} />
            </div>
            <div className="lg:col-span-2">
              <EndingTrialsPanel trials={data?.endingTrials} />
            </div>
          </div>
          <ActivityPanel events={data?.activity} canViewAll={capabilities.canViewSubscriptionActivity} />
        </>
      )}
    </div>
  );
}
