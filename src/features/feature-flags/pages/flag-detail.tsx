"use client";

import { ArrowLeftIcon, CopyIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PanelSkeleton, StatGridSkeleton } from "@/features/companies/components/states";
import { cn } from "@/lib/utils/cn";
import { ActivityTab } from "../components/flag-tabs/activity-tab";
import { ImpactTab } from "../components/flag-tabs/impact-tab";
import { OverviewTab } from "../components/flag-tabs/overview-tab";
import { RulesTab } from "../components/flag-tabs/rules-tab";
import { SettingsTab } from "../components/flag-tabs/settings-tab";
import { TargetingTab } from "../components/flag-tabs/targeting-tab";
import { DemoTag, ImplementationBadge, LifecycleBadge, ProtectionBadge, StateBadge } from "../components/badges";
import { EnvironmentSwitch, useEnvironment } from "../components/environment";
import { FlagsError } from "../components/states";
import { useFlagActions } from "../components/use-flag-actions";
import { FLAGS_MOCK_MODE, FLAG_TABS, flagRoutes, type FlagTab } from "../data/config";
import { useFlag, useFlagCapabilities } from "../data/hooks";

/**
 * One flag, in one environment. The environment and tab live in the URL, so a link to
 * "Company Impact in staging" opens exactly there and a bad flag key, tab or
 * environment lands on a clear message instead of a blank page.
 */
export function FlagDetailPage({ flagKey }: { flagKey: string }) {
  const params = useSearchParams();
  const capabilities = useFlagCapabilities();
  const { environment, set: setEnvironment } = useEnvironment();
  const query = useFlag(flagKey, environment);
  const actions = useFlagActions();
  const requested = params.get("tab");
  const tab: FlagTab = FLAG_TABS.find((item) => item.key === requested)?.key ?? "overview";
  const unknownTab = Boolean(requested) && !FLAG_TABS.some((item) => item.key === requested);
  const detail = query.data;

  if (query.error && !detail) {
    return <FlagsError subject="Feature Flag" error={query.error} onRetry={() => void query.refetch()} back={{ href: flagRoutes.all(environment), label: "Back to All Flags" }} />;
  }
  if (!detail) {
    return <div className="space-y-1"><StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" /><PanelSkeleton rows={6} /></div>;
  }

  const { flag, row } = detail;
  const menu = actions.menuFor(row).filter((item) => !["open", "targeting", "impact", "activity", "preview"].includes(item.id));

  return (
    <div className="space-y-3">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground"><Link href={flagRoutes.all(environment)}><ArrowLeftIcon />All Flags</Link></Button>
        <PageHeader
          title={flag.name}
          description={flag.description}
          meta={
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-2xs text-foreground">{flag.key}</span>
              <StateBadge state={row.state} />
              <LifecycleBadge status={flag.lifecycle} />
              <ProtectionBadge level={flag.protection} />
              <ImplementationBadge status={flag.implementation} />
              {FLAGS_MOCK_MODE ? <DemoTag>Demo</DemoTag> : null}
            </div>
          }
          actions={
            <>
              <EnvironmentSwitch environment={environment} onChange={setEnvironment} />
              <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(flag.key).then(() => toast.success("Key Copied", { description: flag.key })); }}><CopyIcon />Copy Key</Button>
              {flag.lifecycle !== "archived" && (environment === "production" ? capabilities.canChangeProduction : capabilities.canChangeRollout) ? <Button asChild size="sm"><Link href={flagRoutes.flag(flag.key, environment, "targeting")}>Edit Rollout</Link></Button> : null}
              <ActionMenu label="More Actions" items={menu} />
            </>
          }
        />
      </div>

      {unknownTab ? <AlertBanner tone="warning" title="Unknown Tab">&ldquo;{requested}&rdquo; is not a tab of this flag. Showing Overview.</AlertBanner> : null}
      {flag.lifecycle === "archived" ? <AlertBanner tone="info" title="Archived">This flag is read-only. Its history and configuration versions are kept.</AlertBanner> : null}
      {row.state === "emergency_off" && tab !== "targeting" ? <AlertBanner tone="danger" title="Emergency Disabled" action={<Button asChild size="sm" variant="outline"><Link href={flagRoutes.flag(flag.key, environment, "targeting")}>Review</Link></Button>}>The feature is switched off in this environment. Its rollout configuration is preserved.</AlertBanner> : null}

      <nav aria-label="Flag sections" className="overflow-x-auto border-b border-border scrollbar-thin">
        <ul className="flex min-w-max gap-0.5">
          {FLAG_TABS.map((item) => (
            <li key={item.key}>
              <Link href={flagRoutes.flag(flag.key, environment, item.key)} aria-current={item.key === tab ? "page" : undefined} className={cn("relative inline-flex items-center px-3 py-2 text-[0.8125rem] font-medium transition-colors", item.key === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {item.label}
                {item.key === tab ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" ? <OverviewTab detail={detail} environment={environment} /> : null}
      {tab === "targeting" ? <TargetingTab key={`${environment}-${row.config.version}-${row.config.emergencyOff}`} detail={detail} environment={environment} /> : null}
      {tab === "rules" ? <RulesTab detail={detail} environment={environment} /> : null}
      {tab === "impact" ? <ImpactTab detail={detail} environment={environment} /> : null}
      {tab === "activity" ? <ActivityTab detail={detail} environment={environment} /> : null}
      {tab === "settings" ? <SettingsTab detail={detail} environment={environment} /> : null}
      {actions.nodes}
    </div>
  );
}
