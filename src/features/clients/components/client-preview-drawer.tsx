"use client";

import { ArrowRightIcon, BuildingIcon, SquareArrowOutUpRightIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { relativeTime } from "@/features/companies/data/clock";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils/format";
import { PAUSE_REASON_LABEL, clientHref, clientSectionHref, resolveClientBasePath } from "../data/config";
import { useClient } from "../data/hooks";
import type { ClientSummary } from "../data/types";
import { ClientAvatar } from "./client-avatar";
import { ClientError } from "./states";
import { HealthBadge, OnboardingBadge, SeverityBadge, WorkspaceBadge } from "./status-badges";

/**
 * A quick look at one client without leaving the list. It reads the client by
 * id, so it reflects a pause or edit the moment the cache refreshes.
 */
export function ClientPreviewDrawer({ clientId, fallback, onClose }: { clientId: string | null; fallback: ClientSummary | undefined; onClose: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const query = useClient(clientId ?? "");
  const summary = query.data ?? (fallback?.client.id === clientId ? fallback : undefined);

  return (
    <Sheet open={clientId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={contentRef}
        className="sm:max-w-md"
        // Land focus on the drawer itself so the first Esc closes it instead of dismissing a tooltip.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        {query.error && !summary ? (
          <>
            <SheetHeader>
              <SheetTitle>Client preview</SheetTitle>
              <SheetDescription>This client could not be loaded.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <ClientError subject="Client" error={query.error} onRetry={() => void query.refetch()} />
            </SheetBody>
          </>
        ) : !summary ? (
          <>
            <SheetHeader>
              <SheetTitle>Client preview</SheetTitle>
              <SheetDescription>Loading...</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </SheetBody>
          </>
        ) : (
          <PreviewContent summary={summary} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PreviewContent({ summary }: { summary: ClientSummary }) {
  const pathname = usePathname();
  const basePath = resolveClientBasePath(pathname);
  const isAdmin = basePath.startsWith(ROUTES.admin.root);
  const { client, counts, operations, company } = summary;
  const companyHref = isAdmin ? ROUTES.admin.settings : (company ? ROUTES.superAdmin.company(company.id) : "#");
  const id = client.id;
  const attention = summary.attention.filter((item) => item.severity !== "info");

  return (
    <>
      <SheetHeader className="gap-2.5">
        <div className="flex items-center gap-3">
          <ClientAvatar name={client.name} logo={client.logo?.url ?? summary.profile.logo?.url ?? summary.profile.logoDataUrl} className="size-11" />
          <div className="min-w-0">
            <SheetTitle className="truncate">{client.name}</SheetTitle>
            <SheetDescription className="truncate">
              {summary.displayId} · {company.name}
            </SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <WorkspaceBadge status={summary.workspace} />
          <OnboardingBadge status={summary.onboarding.status} />
          <HealthBadge health={summary.health} />
        </div>
      </SheetHeader>

      <SheetBody className="space-y-3">
        <StatGrid className="grid-cols-2">
          <StatCard label="Scheduled posts" value={operations.scheduledPosts} hint="Upcoming" />
          <StatCard label="Failed posts" value={operations.failedPosts} tone={operations.failedPosts > 0 ? "danger" : "neutral"} hint={operations.failedPosts > 0 ? "Need review" : "None"} />
          <StatCard
            label="Connected accounts"
            value={counts.connections}
            hint={counts.connections === 0 ? "None connected" : counts.attentionConnections > 0 ? `${counts.attentionConnections} need attention` : "All healthy"}
            href={clientSectionHref(id, "channels", undefined, basePath)}
          />
          <StatCard label="Active members" value={counts.activeMembers} hint={summary.lead ? `Lead: ${summary.lead.name}` : "No lead"} href={clientSectionHref(id, "team", undefined, basePath)} />
        </StatGrid>

        <Panel title="Identity">
          <dl className="divide-y divide-border">
            <KeyValue label="Parent company">
              <Link href={companyHref} className="hover:underline">{company?.name}</Link>
              <span className="block text-2xs text-muted-foreground">{company?.planName}</span>
            </KeyValue>
            <KeyValue label="Primary website">
              {summary.primaryWebsite ? <Link href={clientSectionHref(id, "website-seo", undefined, basePath)} className="hover:underline">{summary.primaryWebsite.domain}</Link> : <span className="text-muted-foreground">Not configured</span>}
            </KeyValue>
            <KeyValue label="Industry">{summary.profile.industry}</KeyValue>
            <KeyValue label="Onboarding">{summary.onboarding.requiredDone} / {summary.onboarding.requiredTotal} required steps</KeyValue>
            <KeyValue label="Created">{formatDate(client.createdAt)}</KeyValue>
            <KeyValue label="Last active">{relativeTime(summary.lastActiveAt)}</KeyValue>
            {summary.pause ? <KeyValue label="Paused">{PAUSE_REASON_LABEL[summary.pause.reason]} · {formatDate(summary.pause.pausedAt)}</KeyValue> : null}
          </dl>
        </Panel>

        <Panel title="Needs attention" description={attention.length === 0 ? undefined : `${attention.length} open`}>
          {attention.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">
              {summary.workspace === "active" ? "No open issues." : `Issues are not tracked while the workspace is ${summary.workspace}.`}
            </p>
          ) : (
            <ul className="space-y-2">
              {attention.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={item.severity} />
                      <span className="truncate text-[0.8125rem] font-medium text-foreground">{item.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-2xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Button asChild variant="ghost" size="icon-sm" aria-label={item.actionLabel}>
                    <Link href={clientSectionHref(id, item.section, item.query, basePath)}>
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </SheetBody>

      <SheetFooter className="flex-wrap justify-between">
        <div className="flex flex-wrap gap-1.5">
          <Button asChild variant="outline" size="sm">
            <Link href={companyHref}>
              <BuildingIcon />
              Open Parent Company
            </Link>
          </Button>
          {attention.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`${clientHref(id, basePath)}#needs-attention`}>
                <TriangleAlertIcon />
                Review Issues
              </Link>
            </Button>
          ) : null}
        </div>
        <Button asChild size="sm">
          <Link href={clientHref(id, basePath)}>
            <SquareArrowOutUpRightIcon />
            Open Full Client
          </Link>
        </Button>
      </SheetFooter>
    </>
  );
}
