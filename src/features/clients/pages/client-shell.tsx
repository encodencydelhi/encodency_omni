"use client";

import { ArrowLeftIcon, BuildingIcon, CirclePlayIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/features/companies/components/primitives";
import { relativeTime } from "@/features/companies/data/clock";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { ClientAvatar } from "../components/client-avatar";
import { ClientError } from "../components/states";
import { HealthInline, OnboardingBadge, WorkspaceBadge, HealthBadge } from "../components/status-badges";
import { useClientActions } from "../components/use-client-actions";
import { CLIENTS_LIST_ROUTE, CLIENT_SECTIONS, MONITORING_META, PAUSE_REASON_LABEL, clientHref, clientSectionHref } from "../data/config";
import { useClient } from "../data/hooks";
import type { ClientSection, ClientSummary } from "../data/types";
import { recallListQuery } from "../lib/list-query";

/** The client id from the route. Pages read it here instead of parsing the URL themselves. */
export function useClientId(): string {
  const params = useParams<{ clientId: string }>();
  return decodeURIComponent(params.clientId ?? "");
}

function activeSection(pathname: string, clientId: string): ClientSection {
  const base = clientHref(clientId);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, "").split("/")[0] : "";
  return CLIENT_SECTIONS.find((section) => section.slug === rest)?.key ?? "overview";
}

function HeaderSkeleton() {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3 rounded-sm border border-border bg-card p-4">
        <Skeleton className="size-12 rounded-sm" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-sm border border-border bg-card px-3 py-2.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-2.5 h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BackToClients() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 text-muted-foreground"
      onClick={() => {
        // Return to the list exactly as it was left: same filters, sort and page.
        const saved = recallListQuery();
        router.push(saved ? `${CLIENTS_LIST_ROUTE}?${saved}` : CLIENTS_LIST_ROUTE);
      }}
    >
      <ArrowLeftIcon />
      Back to Clients
    </Button>
  );
}

function ClientHeader({ summary }: { summary: ClientSummary }) {
  const { client, company } = summary;
  const { capabilities, openFlow, detailMenu, dialogs } = useClientActions();
  const archived = summary.workspace === "archived";
  const menu = detailMenu(summary);
  const website = summary.primaryWebsite;

  return (
    <header className="space-y-1">
      <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3.5 shadow-xs sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ClientAvatar name={client.name} logo={summary.profile.logoDataUrl} className="size-12 text-sm" />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{client.name}</h1>
              <WorkspaceBadge status={summary.workspace} />
              <OnboardingBadge status={summary.onboarding.status} />
              <HealthBadge health={summary.health} />
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
              <Link href={ROUTES.superAdmin.company(company.id)} className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                <BuildingIcon className="size-3" aria-hidden />
                {company.name}
              </Link>
              {website ? (
                <a href={website.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                  {website.domain}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </a>
              ) : (
                <span>No website configured</span>
              )}
              <span>{summary.displayId}</span>
              <span>Created {formatDate(client.createdAt)}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {capabilities.canEditClient && !archived ? (
            <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "edit", summary })}>
              <PencilIcon />
              Edit Client
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.superAdmin.company(company.id)}>
              <BuildingIcon />
              Open Parent Company
            </Link>
          </Button>
          <ActionMenu items={menu} label={`More actions for ${client.name}`} />
        </div>
      </div>

      {summary.workspace === "paused" ? (
        <AlertBanner
          tone="warning"
          title="This client is paused"
          action={
            capabilities.canResumeClient ? (
              <Button size="sm" variant="outline" onClick={() => openFlow({ kind: "resume", targets: [summary] })}>
                <CirclePlayIcon />
                Resume
              </Button>
            ) : undefined
          }
        >
          {summary.pause
            ? `${PAUSE_REASON_LABEL[summary.pause.reason]} · ${formatDate(summary.pause.pausedAt)} by ${summary.pause.pausedBy}${summary.pause.note ? ` - ${summary.pause.note}` : ""}`
            : "The workspace is held. Nothing has been deleted."}
        </AlertBanner>
      ) : null}
      {archived ? (
        <AlertBanner tone="info" title="This client is archived">
          Archived clients are kept for the record and are read-only. Nothing has been deleted.
        </AlertBanner>
      ) : null}
      {dialogs}
    </header>
  );
}

/** The at-a-glance strip under the header. Every card opens the section that explains it. */
function ClientSummaryStrip({ summary }: { summary: ClientSummary }) {
  const { company, counts, operations, primaryWebsite } = summary;
  const id = summary.client.id;
  const monitoring = primaryWebsite ? MONITORING_META[primaryWebsite.monitoring].label : null;

  return (
    <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
      <StatCard compact label="Parent company" value={<span className="text-[0.8125rem]">{company.name}</span>} hint={company.planName} href={ROUTES.superAdmin.company(company.id)} />
      <StatCard compact label="Assigned members" value={counts.activeMembers} hint={summary.lead ? `Lead: ${summary.lead.name}` : "No lead"} href={clientSectionHref(id, "team")} />
      <StatCard
        compact
        label="Channel connections"
        value={counts.connections}
        hint={counts.connections === 0 ? "None connected" : counts.attentionConnections > 0 ? `${counts.attentionConnections} need attention` : "All healthy"}
        href={clientSectionHref(id, "channels")}
      />
      <StatCard
        compact
        label="Website status"
        value={<span className="text-[0.8125rem]">{primaryWebsite ? (primaryWebsite.availability === "down" ? "Down" : primaryWebsite.availability === "up" ? "Up" : "Unknown") : "Not configured"}</span>}
        hint={monitoring ?? "Add a website"}
        href={clientSectionHref(id, "website-seo")}
      />
      <StatCard compact label="Scheduled posts" value={operations.scheduledPosts} hint="Upcoming" href={`${clientHref(id)}#publishing`} />
      <StatCard compact label="Failed operations" value={operations.failedPosts} hint={operations.failedPosts > 0 ? "Need review" : "None"} href={`${clientHref(id)}#publishing`} />
      <StatCard compact label="Health" value={<HealthInline health={summary.health} />} href={`${clientHref(id)}#needs-attention`} />
      <StatCard compact label="Last active" value={<span className="text-[0.8125rem]">{relativeTime(summary.lastActiveAt)}</span>} href={clientSectionHref(id, "activity")} />
    </StatGrid>
  );
}

function SectionNav({ summary }: { summary: ClientSummary }) {
  const pathname = usePathname();
  const current = activeSection(pathname, summary.client.id);
  const counts: Partial<Record<ClientSection, number>> = { team: summary.counts.assigned, channels: summary.counts.connections };

  return (
    <nav aria-label="Client sections" className="overflow-x-auto border-b border-border scrollbar-thin">
      <ul className="flex min-w-max gap-0.5">
        {CLIENT_SECTIONS.map((section) => {
          const active = section.key === current;
          const count = counts[section.key];
          return (
            <li key={section.key}>
              <Link
                href={clientSectionHref(summary.client.id, section.key)}
                aria-current={active ? "page" : undefined}
                className={cn("relative inline-flex items-center gap-1.5 px-3 py-2 text-[0.8125rem] font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {section.label}
                {count !== undefined ? <span className="rounded-sm bg-muted px-1 text-[11px] font-medium tabular text-muted-foreground">{count}</span> : null}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Frame shared by every client section: identity header, summary strip and the
 * six section tabs. It loads the client once; each section loads its own data,
 * keyed by client id, so nothing from another client can leak in.
 */
export function ClientShell({ children }: { children: ReactNode }) {
  const clientId = useClientId();
  const query = useClient(clientId);

  if (query.error && !query.data) {
    return (
      <div className="space-y-2">
        <BackToClients />
        <ClientError subject="Client" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  if (!query.data) return <HeaderSkeleton />;

  return (
    <div className="space-y-2">
      <BackToClients />
      <ClientHeader summary={query.data} />
      <ClientSummaryStrip summary={query.data} />
      <SectionNav summary={query.data} />
      <div className="pt-1">{children}</div>
    </div>
  );
}
