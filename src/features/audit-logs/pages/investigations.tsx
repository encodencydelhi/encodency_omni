"use client";

import { FolderSearchIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { CasePriorityBadge, DemoTag, StatusBadge } from "../components/badges";
import { CreateInvestigationDrawer } from "../components/create-investigation";
import { AuditError } from "../components/states";
import { AUDIT_MOCK_MODE, INVESTIGATION_PRIORITY, INVESTIGATION_SORTS, INVESTIGATION_STATUS, auditRoutes } from "../data/config";
import { useAuditCapabilities, useInvestigations } from "../data/hooks";
import { ago, scopeText } from "../lib/format";

const KEYS = ["q", "status", "priority", "owner", "company", "cfrom", "cto", "ufrom", "uto", "sort", "create"] as const;


/** The internal case workspace. An investigation groups audit events for review; it is not an incident and not a support ticket. */
export function InvestigationsPage() {
  const router = useRouter();
  const capabilities = useAuditCapabilities();
  const url = useUrlParams(KEYS);
  const v = url.values;
  const [search, setSearch] = useDebouncedText(v.q, (value) => url.set({ q: value }));
  const query = useInvestigations({ search: v.q || undefined, status: v.status || undefined, priority: v.priority || undefined, ownerId: v.owner || undefined, companyId: v.company || undefined, createdFrom: v.cfrom || undefined, createdTo: v.cto || undefined, updatedFrom: v.ufrom || undefined, updatedTo: v.uto || undefined, sort: v.sort || "updated" });
  const data = query.data;
  const narrowing = ["q", "status", "priority", "owner", "company", "cfrom", "cto", "ufrom", "uto"] as const;
  const active = narrowing.filter((key) => v[key]).length;
  const clear = () => { url.set(Object.fromEntries(narrowing.map((key) => [key, null])) as Record<(typeof narrowing)[number], null>); setSearch(""); };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Investigations"
        description="Group audit events into internal cases for organised review. A case is not a confirmed incident, not a finding about anyone and not a support ticket."
        meta={AUDIT_MOCK_MODE ? <DemoTag>Demo Investigations</DemoTag> : undefined}
        actions={capabilities.canManageInvestigations ? <Button size="sm" onClick={() => url.set({ create: "1" })}><PlusIcon />Create Investigation</Button> : undefined}
      />

      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-5">
          <StatCard compact label="Open Investigations" value={data.counts.open} hint="Newly opened" href="?status=open" />
          <StatCard compact label="In Review" value={data.counts.inReview} hint="Being examined" href="?status=in_review" />
          <StatCard compact label="Awaiting Information" value={data.counts.awaiting} hint="Waiting on someone" href="?status=awaiting_information" />
          <StatCard compact label="Closed Investigations" value={data.counts.closed} hint="Concluded" href="?status=closed" />
          <StatCard compact label="High-Priority Open Cases" value={data.counts.highOpen} hint="Not closed" tone={data.counts.highOpen > 0 ? "warning" : "neutral"} href="?priority=high" />
        </StatGrid>
      ) : query.error ? null : (
        <StatGridSkeleton count={5} className="grid-cols-2 sm:grid-cols-5" />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search case ID, title, company or owner..." aria-label="Search investigations" className="w-full sm:w-80" />
        <FilterSelect label="Status" value={v.status || undefined} options={Object.entries(INVESTIGATION_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ status: value })} />
        <FilterSelect label="Priority" value={v.priority || undefined} options={Object.entries(INVESTIGATION_PRIORITY).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ priority: value })} />
        <FilterSelect label="Owner" value={v.owner || undefined} options={(data?.owners ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ owner: value })} />
        <FilterSelect label="Company" value={v.company || undefined} options={(data?.companies ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ company: value })} />
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontalIcon />Dates</Button></PopoverTrigger>
          <PopoverContent className="w-72 space-y-2.5">
            <p className="text-[13px] font-semibold text-foreground">Filter By Date</p>
            {([["Created From", "cfrom"], ["Created To", "cto"], ["Updated From", "ufrom"], ["Updated To", "uto"]] as const).map(([label, key]) => (
              <div key={key} className="space-y-1"><Label htmlFor={`inv-${key}`} className="text-2xs">{label}</Label><Input id={`inv-${key}`} type="date" value={v[key]} onChange={(event) => url.set({ [key]: event.target.value || null })} className="h-8" /></div>
            ))}
          </PopoverContent>
        </Popover>
        <FilterSelect label="Sort" value={v.sort || undefined} options={INVESTIGATION_SORTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ sort: value })} />
        {active > 0 ? <Button variant="ghost" size="sm" onClick={clear}>Clear All ({active})</Button> : null}
      </div>

      {query.error && !data ? (
        <AuditError subject="Investigations" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} columns={8} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Investigations"
            rows={data.rows}
            getKey={(row) => row.investigation.id}
            onRowClick={(row) => router.push(auditRoutes.investigation(row.investigation.id))}
            empty={<EmptyState icon={FolderSearchIcon} title={active > 0 ? "No Matching Investigations" : "No Investigations Yet"} description={active > 0 ? "No case matches these filters." : "Open an investigation from any audit event, or create one here."} action={active > 0 ? <Button variant="outline" onClick={clear}>Clear All Filters</Button> : capabilities.canManageInvestigations ? <Button onClick={() => url.set({ create: "1" })}><PlusIcon />Create Investigation</Button> : undefined} />}
            columns={[
              { id: "id", header: "Case ID", cell: (row) => <Link href={auditRoutes.investigation(row.investigation.id)} onClick={(event) => event.stopPropagation()} className="font-mono text-2xs font-medium text-foreground hover:text-primary hover:underline">{row.investigation.id}</Link> },
              { id: "title", header: "Title", cell: (row) => <span className="block max-w-72 truncate font-medium text-foreground" title={row.investigation.title}>{row.investigation.title}</span> },
              { id: "scope", header: "Scope", hideBelow: "md", cell: (row) => <span className="block max-w-40 truncate">{scopeText(row.investigation.scope)}</span> },
              { id: "owner", header: "Internal Owner", hideBelow: "md", cell: (row) => row.investigation.ownerName },
              { id: "links", header: "Linked Events", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular">{row.linkedEvents}</span> },
              { id: "priority", header: "Priority", cell: (row) => <CasePriorityBadge priority={row.investigation.priority} /> },
              { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.investigation.status} /> },
              { id: "updated", header: "Last Updated", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{ago(row.investigation.updatedAt)}</span> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => <span onClick={(event) => event.stopPropagation()}><ActionMenu label={`Actions for ${row.investigation.id}`} items={[{ id: "open", label: "Open Investigation", onSelect: () => router.push(auditRoutes.investigation(row.investigation.id)) }, ...(row.investigation.scope.companyId ? [{ id: "company", label: "View Company Events", onSelect: () => router.push(auditRoutes.events({ company: row.investigation.scope.companyId as string, range: "custom", from: "2000-01-01", to: "2099-12-31" })) }] : [])]} /></span> },
            ]}
          />
        </Panel>
      )}
      <AlertBanner tone="info">Owning a case does not grant access to company data, and closing one never changes the audit events it links.</AlertBanner>

      {v.create === "1" ? <CreateInvestigationDrawer onClose={() => url.set({ create: null })} /> : null}
    </div>
  );
}
