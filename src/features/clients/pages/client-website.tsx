"use client";

import { ExternalLinkIcon, GlobeIcon, PlusIcon, SearchCheckIcon, StarIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner, FlowDialog, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field, KeyValue, Panel } from "@/features/companies/components/primitives";
import { companySectionHref } from "@/features/companies/data/config";
import { relativeTime } from "@/features/companies/data/clock";
import { isValidWebsite } from "@/features/companies/lib/validation";
import { formatNumber } from "@/lib/utils/format";
import { ClientError, PanelSkeleton, TableSkeleton } from "../components/states";
import { DemoTag } from "../components/status-badges";
import { ANALYTICS_LINK_META, AVAILABILITY_META, MONITORING_META } from "../data/config";
import { describeError, useClientCapabilities, useClientMutations, useClientWebsiteSeo } from "../data/hooks";
import type { ClientSearchAnalytics, ClientSummary, ClientWebsite, ClientWebsiteData } from "../data/types";
import { useClientId } from "./client-shell";

interface TechnicalIssue {
  severity: "critical" | "warning";
  text: string;
}

function technicalIssues(site: ClientWebsite): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  if (site.availability === "down") issues.push({ severity: "critical", text: "The website did not respond at the last check." });
  if (site.criticalIssues > 0) issues.push({ severity: "critical", text: `${site.criticalIssues} critical technical ${site.criticalIssues === 1 ? "issue" : "issues"} found in the last crawl.` });
  if (site.monitoring === "stopped") issues.push({ severity: "warning", text: "Monitoring has stopped, so status is out of date." });
  if (site.warnings > 0) issues.push({ severity: "warning", text: `${site.warnings} crawl ${site.warnings === 1 ? "warning" : "warnings"} found.` });
  if (site.sitemap === "missing") issues.push({ severity: "warning", text: "No sitemap was found." });
  if (site.robots === "missing") issues.push({ severity: "warning", text: "No robots.txt was found." });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Add website                                                         */
/* ------------------------------------------------------------------ */

function AddWebsiteDialog({ summary, hasWebsites, onClose }: { summary: ClientSummary; hasWebsites: boolean; onClose: () => void }) {
  const mutations = useClientMutations();
  const [url, setUrl] = useState("");
  const [makePrimary, setMakePrimary] = useState(!hasWebsites);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const localError = !url.trim() ? "Enter a website address." : !isValidWebsite(url) ? "Enter a valid website, e.g. example.com." : null;

  const submit = async () => {
    setAttempted(true);
    if (localError) return;
    setPending(true);
    setError(null);
    setServerError(null);
    try {
      await mutations.addWebsite(summary.client.id, { url: url.trim(), makePrimary: makePrimary || !hasWebsites });
      toast.success(`${url.trim()} added`);
      onClose();
    } catch (failure) {
      const described = describeError(failure);
      setServerError(described.fieldErrors.url ?? null);
      setError(described.fieldErrors.url ? null : described.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Add website"
      description={`Add a website to ${summary.client.name}. It is monitored once a backend is connected; this demo records the address only.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton pending={pending} onClick={() => void submit()}>Add website</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <Field label="Website address" htmlFor="website-url" required error={serverError ?? (attempted ? localError : null)}>
        <Input
          id="website-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="example.com"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          aria-invalid={Boolean(serverError ?? (attempted ? localError : null))}
        />
      </Field>
      {hasWebsites ? (
        <div className="flex items-center gap-2">
          <Checkbox id="website-primary" checked={makePrimary} onCheckedChange={(value) => setMakePrimary(value === true)} />
          <Label htmlFor="website-primary" className="font-normal">Make this the primary website</Label>
        </div>
      ) : (
        <p className="text-2xs text-muted-foreground">It will become the client&apos;s primary website.</p>
      )}
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Search and analytics                                                */
/* ------------------------------------------------------------------ */

function AnalyticsRow({ label, configured, state }: { label: string; configured: string | null; state: ClientSearchAnalytics["gscState"] }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3 sm:items-center">
      <p className="text-[0.8125rem] font-medium text-foreground">{label}</p>
      <div>
        <p className="text-2xs text-muted-foreground">Configuration</p>
        <p className="truncate text-[0.8125rem] text-foreground">{configured ?? <span className="text-muted-foreground">Not configured</span>}</p>
      </div>
      <div>
        <p className="text-2xs text-muted-foreground">Authorised connection</p>
        <StatusBadge registry={ANALYTICS_LINK_META} status={state} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function WebsiteBody({ data }: { data: ClientWebsiteData }) {
  const capabilities = useClientCapabilities();
  const mutations = useClientMutations();
  const { summary, websites, primaryWebsiteId, search } = data;
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ClientWebsite | null>(null);
  const crawlRef = useRef<HTMLDivElement>(null);
  const issuesRef = useRef<HTMLDivElement>(null);
  const primary = websites.find((site) => site.id === primaryWebsiteId) ?? null;
  const canEdit = capabilities.canEditClient && summary.workspace !== "archived";
  const integrationsHref = companySectionHref(summary.company.id, "integrations", { client: summary.client.name });
  const issues = primary ? technicalIssues(primary) : [];

  const run = async (work: Promise<unknown>, success: string) => {
    try {
      await work;
      toast.success(success);
    } catch (failure) {
      toast.error(describeError(failure).message);
    }
  };

  const menu = (site: ClientWebsite): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [{ id: "open", label: "Open website", icon: ExternalLinkIcon, onSelect: () => window.open(site.url, "_blank", "noopener,noreferrer") }];
    if (canEdit && site.id !== primaryWebsiteId) {
      items.push({ id: "primary", label: "Set as primary", icon: StarIcon, onSelect: () => void run(mutations.setPrimaryWebsite(summary.client.id, site.id), `${site.domain} is now the primary website`) });
    }
    if (canEdit) items.push({ id: "remove", label: "Remove website", icon: Trash2Icon, variant: "destructive", separatorBefore: true, onSelect: () => setRemoving(site) });
    return items;
  };

  const columns: Array<DataTableColumn<ClientWebsite>> = [
    {
      id: "website",
      header: "Website",
      hideable: false,
      cell: (site) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-foreground">
            <span className="truncate">{site.domain}</span>
            {site.id === primaryWebsiteId ? <span className="shrink-0 rounded-sm border border-primary/30 bg-primary-subtle px-1 text-[10px] font-medium leading-4 text-primary">Primary</span> : null}
          </p>
          <p className="truncate text-2xs text-muted-foreground">{site.url}</p>
        </div>
      ),
    },
    { id: "monitoring", header: "Monitoring", cell: (site) => <StatusBadge registry={MONITORING_META} status={site.monitoring} withDot /> },
    { id: "availability", header: "Availability", hideBelow: "md", cell: (site) => <StatusBadge registry={AVAILABILITY_META} status={site.availability} /> },
    { id: "checked", header: "Last checked", hideBelow: "md", cell: (site) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{site.lastCheckedAt ? relativeTime(site.lastCheckedAt) : "Never"}</span> },
    { id: "issues", header: "Issues", align: "right", hideBelow: "lg", cell: (site) => <span className="whitespace-nowrap text-2xs tabular text-muted-foreground">{site.criticalIssues} critical · {site.warnings} warnings</span> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (site) => <ActionMenu items={menu(site)} label={`Actions for ${site.domain}`} /> },
  ];

  const scrollTo = (ref: RefObject<HTMLDivElement | null>) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <DemoTag>Demo data</DemoTag>
          <p className="text-2xs text-muted-foreground">Technical results are simulated. Nothing is crawled or synced in this build.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => scrollTo(crawlRef)} disabled={!primary}>
            <SearchCheckIcon />
            View Crawl Summary
          </Button>
          <Button variant="outline" size="sm" onClick={() => scrollTo(issuesRef)} disabled={!primary}>
            View Technical Issues
          </Button>
          {canEdit ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <PlusIcon />
              Add Website
            </Button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={websites}
        getRowId={(site) => site.id}
        isLoading={false}
        isFetching={false}
        caption={`Websites of ${summary.client.name}`}
        emptyState={
          <EmptyState
            icon={GlobeIcon}
            title="No website configured"
            description="Some clients do not have a website. Add one to enable monitoring and technical checks."
            action={canEdit ? <Button onClick={() => setAdding(true)}><PlusIcon />Add Website</Button> : undefined}
          />
        }
      />

      {primary ? (
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          <div ref={crawlRef} className="scroll-mt-28">
            <Panel title="Crawl summary" description={`${primary.domain} · primary website`} action={<DemoTag>Demo data</DemoTag>}>
              <dl className="divide-y divide-border">
                <KeyValue label="Last checked">{primary.lastCheckedAt ? relativeTime(primary.lastCheckedAt) : "Never"}</KeyValue>
                <KeyValue label="Last crawl">{primary.lastCrawlAt ? relativeTime(primary.lastCrawlAt) : "Not crawled"}</KeyValue>
                <KeyValue label="Pages discovered">{primary.pagesDiscovered === null ? "-" : formatNumber(primary.pagesDiscovered)}</KeyValue>
                <KeyValue label="Sitemap">{primary.sitemap === "found" ? "Found" : primary.sitemap === "missing" ? "Missing" : "Unknown"}</KeyValue>
                <KeyValue label="robots.txt">{primary.robots === "found" ? "Found" : primary.robots === "missing" ? "Missing" : "Unknown"}</KeyValue>
                <KeyValue label="Redirects">{primary.redirect ?? "None detected"}</KeyValue>
              </dl>
            </Panel>
          </div>
          <div ref={issuesRef} className="scroll-mt-28">
            <Panel title="Technical issues" description={issues.length === 0 ? undefined : `${issues.length} found`} action={<DemoTag>Demo data</DemoTag>}>
              {issues.length === 0 ? (
                <p className="text-[0.8125rem] text-muted-foreground">No technical issues in the latest demo crawl.</p>
              ) : (
                <ul className="space-y-1.5">
                  {issues.map((issue) => (
                    <li key={issue.text} className="flex items-start gap-2 text-[0.8125rem]">
                      <span className={issue.severity === "critical" ? "mt-1.5 size-1.5 shrink-0 rounded-sm bg-danger" : "mt-1.5 size-1.5 shrink-0 rounded-sm bg-warning"} aria-hidden />
                      <span className="text-foreground"><span className="sr-only">{issue.severity === "critical" ? "Critical: " : "Warning: "}</span>{issue.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      <Panel
        title="Search & analytics"
        description="Configuration says what should be tracked. An authorised connection says whether reporting access exists. They are shown separately."
        action={
          <div className="flex flex-wrap gap-1.5">
            <Button asChild variant="outline" size="sm"><Link href={integrationsHref}>Review GSC Connection</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={integrationsHref}>Review GA4 Connection</Link></Button>
          </div>
        }
      >
        {primary ? (
          <div className="divide-y divide-border">
            <AnalyticsRow label="Google Search Console" configured={search.gscProperty} state={search.gscState} />
            <AnalyticsRow label="Google Analytics 4" configured={search.ga4Stream} state={search.ga4State} />
          </div>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">Add a website first; search and analytics are configured per website.</p>
        )}
        {primary && !search.reportingAvailable ? (
          <div className="mt-2">
            <AlertBanner tone="info" title="No reporting data">
              No authorised search or analytics connection exists, so no traffic or search data is available for this client.
            </AlertBanner>
          </div>
        ) : null}
        <p className="mt-2 text-2xs text-muted-foreground">
          The client&apos;s full Website/SEO workspace belongs to the Company Admin area and is not part of Super Admin.
        </p>
      </Panel>

      {adding ? <AddWebsiteDialog summary={summary} hasWebsites={websites.length > 0} onClose={() => setAdding(false)} /> : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.domain ?? "website"}?`}
        description={
          removing?.id === primaryWebsiteId && websites.length > 1
            ? "This is the primary website. The next website will become primary. Its monitoring history is removed from this client; nothing else is deleted."
            : "Monitoring for this website stops and its stored check results are removed from this client. Nothing else is deleted."
        }
        confirmLabel="Remove website"
        variant="destructive"
        onConfirm={() => {
          const site = removing;
          setRemoving(null);
          if (site) void run(mutations.removeWebsite(summary.client.id, site.id), `${site.domain} removed`);
        }}
      />
    </div>
  );
}

export function ClientWebsitePage() {
  const clientId = useClientId();
  const query = useClientWebsiteSeo(clientId);

  if (query.error) return <ClientError subject="Website & SEO" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="space-y-2">
        <TableSkeleton rows={3} columns={5} />
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          <PanelSkeleton rows={5} />
          <PanelSkeleton rows={5} />
        </div>
      </div>
    );
  }
  return <WebsiteBody data={query.data} />;
}
