"use client";

import { HistoryIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton } from "@/features/companies/components/states";
import { routes } from "../data/config";
import { relativeLabel } from "../data/formatting";
import { useConfiguration, useGlobalSettingsCapabilities, useSecurityReview } from "../data/hooks";
import { DemoTag } from "./badges";
import { SettingsGuardProvider } from "./settings-guard";
import { SettingsNav } from "./settings-nav";
import { SettingsSearch } from "./settings-search";
import { SettingsError } from "./states";
import { SETTINGS_MOCK_MODE } from "../data/config";

function SummaryStrip() {
  const config = useConfiguration();
  const security = useSecurityReview();
  if (!config.data) return config.error ? null : <StatGridSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />;
  const { data } = config;
  const status = security.data?.status;

  return (
    <StatGrid className="grid-cols-2 lg:grid-cols-4" aria-label="Configuration summary">
      <StatCard compact label="Configuration Version" value={data.version.label} hint="Current" />
      <StatCard compact label="Last Updated" value={relativeLabel(data.updatedAt)} hint={`By ${data.updatedBy}`} />
      <StatCard
        compact
        label="Pending Changes"
        value={data.pendingCount}
        hint={data.pendingCount > 0 ? "Not Yet Effective" : "None Waiting"}
        tone={data.pendingCount > 0 ? "warning" : "neutral"}
        href={routes.history("pending")}
      />
      <StatCard
        compact
        label="Security Policy Status"
        value={status === undefined ? "..." : status === "configured" ? "Configured" : "Needs Review"}
        hint="A configuration state, not a security score"
        href={routes.section("security", { tab: "review" })}
      />
    </StatGrid>
  );
}

function FrameBody({ children }: { children: ReactNode }) {
  const config = useConfiguration();
  const capabilities = useGlobalSettingsCapabilities();

  return (
    <div className="space-y-3">
      <PageHeader
        title="Global Settings"
        description="Configure OmniPlatform identity, defaults, security and governance policies."
        meta={SETTINGS_MOCK_MODE ? <DemoTag>Demo configuration - nothing here is enforced on real accounts</DemoTag> : undefined}
        actions={
          <>
            <SettingsSearch className="w-full sm:w-72" />
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={routes.history()}>
                <HistoryIcon />
                <span className="hidden sm:inline">View Change History</span>
                <span className="sm:hidden">History</span>
              </Link>
            </Button>
          </>
        }
        className="sm:items-center"
      />
      <SummaryStrip />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[14.5rem_minmax(0,1fr)]">
        <SettingsNav pendingCount={config.data?.pendingCount ?? 0} />
        <div className="min-w-0">
          {config.error && !config.data ? (
            <SettingsError subject="Configuration" error={config.error} onRetry={() => void config.refetch()} />
          ) : !capabilities.canViewGlobalSettings ? (
            <SettingsError subject="Global Settings" error={new Error("You do not have access to Global Settings.")} />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

/** The chrome shared by every Global Settings route: header, summary, section navigation. */
export function SettingsFrame({ children }: { children: ReactNode }) {
  return (
    <SettingsGuardProvider>
      <FrameBody>{children}</FrameBody>
    </SettingsGuardProvider>
  );
}
