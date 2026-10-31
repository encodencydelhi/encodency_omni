"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, FileText, Megaphone, Pause, Pencil, Play, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { SearchInput } from "@/components/shared/search-input";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { PaginationMeta } from "@/types/api";
import type { Tone } from "@/types/common";
import { Stat } from "@/features/admin/dashboard/components/dashboard-parts";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { ChannelTag, humanize } from "./campaign-ui";
import { campaignsApi, type CampaignRecord, type CampaignStatus } from "./live/campaigns-api";

const STATUSES: CampaignStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"];
const STATUS_TONE: Record<CampaignStatus, Tone> = { DRAFT: "neutral", ACTIVE: "success", PAUSED: "warning", COMPLETED: "info" };
const MAX_LOGOS = 4;

const statusLabel = (status: string) => status.charAt(0) + status.slice(1).toLowerCase();
const shortDate = (value: string | null) => value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

function dateRange(campaign: CampaignRecord): string {
  const start = shortDate(campaign.startDate);
  const end = shortDate(campaign.endDate);
  if (start && end) return `${start} - ${end}`;
  if (start) return `From ${start}`;
  return end ? `Until ${end}` : "Not set";
}

function Channels({ channels }: { channels: string[] | undefined }) {
  if (!channels?.length) return <span className="text-muted-foreground">Not set</span>;
  const shown = channels.slice(0, MAX_LOGOS);
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((channel) => <ChannelTag key={channel} channel={channel} compact />)}
      {channels.length > MAX_LOGOS ? <span className="text-2xs font-medium text-muted-foreground">+{channels.length - MAX_LOGOS}</span> : null}
    </div>
  );
}

export function CampaignsPage() {
  const router = useRouter();
  const { companyId, clientId, isReady } = useTenancyContext();
  const { Clients } = useAdminContext();
  const cache = useQueryClient();
  const [status, setStatus] = useState<CampaignStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const enabled = isReady && Boolean(companyId && clientId);

  const query = useQuery({
    queryKey: ["workspace-campaigns", companyId, clientId, status, search, page, pageSize],
    enabled,
    queryFn: ({ signal }) => campaignsApi.list(companyId, clientId, { page, limit: pageSize, status: status === "ALL" ? undefined : status, search: search.trim() || undefined }, signal),
  });
  const summary = useQuery({
    queryKey: ["workspace-campaign-counts", companyId, clientId],
    enabled,
    staleTime: 60000,
    queryFn: async ({ signal }) => {
      const rows = await Promise.all(STATUSES.map(async (value) => [value, (await campaignsApi.list(companyId, clientId, { status: value, limit: 1 }, signal)).total] as const));
      return Object.fromEntries(rows) as Record<CampaignStatus, number>;
    },
  });
  const counts = summary.data;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const figure = (value: number | null | undefined) => value != null ? value.toLocaleString("en-IN") : summary.isError ? "-" : "...";
  const clientName = Clients.find((client) => client.id === clientId)?.name ?? "the selected client";
  const filtered = Boolean(search.trim()) || status !== "ALL";

  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["workspace-campaigns"] });
    void cache.invalidateQueries({ queryKey: ["workspace-campaign-counts"] });
  };
  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!editing || !name.trim() || saving) return;
    if (editing.clientId !== clientId) { setEditing(null); return; }
    setSaving(true);
    try {
      await campaignsApi.update(companyId, clientId, editing.id, { expectedRevision: editing.revision, name: name.trim() });
      refresh();
      setEditing(null);
      toast.success("Campaign updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update campaign");
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<Array<DataTableColumn<CampaignRecord>>>(() => [
    {
      id: "campaign",
      header: "Campaign",
      cell: (row) => (
        <div className="min-w-0 max-w-[22rem]">
          <Link href={`/admin/campaigns/${row.id}`} onClick={(event) => event.stopPropagation()} className="block truncate font-medium text-foreground hover:text-primary">{row.name}</Link>
          <p className="truncate text-2xs text-muted-foreground">{row.objective ? humanize(row.objective) : "No objective set"}</p>
        </div>
      ),
    },
    { id: "channels", header: "Channels", hideBelow: "md", cell: (row) => <Channels channels={row.channels} /> },
    { id: "status", header: "Status", cell: (row) => <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{statusLabel(row.status)}</Badge> },
    {
      id: "budget",
      header: "Planned budget",
      hideBelow: "sm",
      cell: (row) => row.budget ? <span className="tabular-nums">{row.budget.currency} {Number(row.budget.amount).toLocaleString("en-IN")}</span> : <span className="text-muted-foreground">Not set</span>,
    },
    { id: "dates", header: "Dates", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{dateRange(row)}</span> },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "w-20",
      hideable: false,
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button size="icon-sm" variant="ghost" aria-label={`Rename ${row.name}`} onClick={(event) => { event.stopPropagation(); setEditing(row); setName(row.name); }}><Pencil className="size-3.5" /></Button>
          <Button asChild size="icon-sm" variant="ghost"><Link href={`/admin/campaigns/${row.id}`} aria-label={`Open ${row.name}`} onClick={(event) => event.stopPropagation()}><ArrowRight className="size-3.5" /></Link></Button>
        </div>
      ),
    },
  ], []);

  if (!isReady) return <div className="grid h-80 place-items-center text-[12px] text-[#71809D]">Loading workspace...</div>;
  if (!companyId || !clientId) {
    return <EmptyState icon={Megaphone} title="Select a client" description="Choose a client in the sidebar to manage its campaigns." />;
  }

  const items = query.data?.items ?? [];
  const totalRows = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pagination: PaginationMeta = { page, pageSize, total: totalRows, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };

  return (
    <div className="space-y-1">
      <AdminPageTitle
        eyebrow="Marketing / Campaigns"
        title="Campaigns"
        description={`Plan campaigns, organise channels and keep every brief for ${clientName} in one place.`}
        action={<Button asChild size="sm"><Link href="/admin/campaigns/new"><Plus className="size-3.5" /> New Campaign</Link></Button>}
      />

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="All Campaigns" value={figure(total)} trend="" note="For this client" icon={Megaphone} color="blue" />
        <Stat label="Drafts" value={figure(counts?.DRAFT)} trend="" note="Not launched yet" icon={FileText} color="grey" />
        <Stat label="Active" value={figure(counts?.ACTIVE)} trend="" note="Currently running" icon={Play} color="green" />
        <Stat label="Paused" value={figure(counts?.PAUSED)} trend="" note="On hold" icon={Pause} color="amber" />
        <Stat label="Completed" value={figure(counts?.COMPLETED)} trend="" note="Finished" icon={CheckCircle2} color="purple" />
      </div>

      <FilterBar
        search={<SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search campaigns..." aria-label="Search campaigns" className="w-64" />}
        filters={(
          <Select value={status} onValueChange={(value) => { setStatus(value as CampaignStatus | "ALL"); setPage(1); }}>
            <SelectTrigger size="sm" aria-label="Campaign status" className="w-auto min-w-[8rem]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUSES.map((value) => <SelectItem key={value} value={value}>{statusLabel(value)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        actions={<Button size="icon-sm" variant="outline" aria-label="Refresh campaigns" onClick={refresh}><RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} /></Button>}
        activeFilterCount={status !== "ALL" ? 1 : 0}
        onClearFilters={() => { setStatus("ALL"); setSearch(""); setPage(1); }}
      />

      <DataTable
        columns={columns}
        rows={items}
        getRowId={(row) => row.id}
        isLoading={query.isPending}
        isFetching={query.isFetching && !query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRowClick={(row) => router.push(`/admin/campaigns/${row.id}`)}
        emptyState={(
          <EmptyState
            icon={Megaphone}
            title={filtered ? "No matching campaigns" : "Your next campaign starts here"}
            description={filtered ? "Change your search or status filter." : "Create a brief with goals, dates and channels for this client."}
            action={filtered ? undefined : <Button asChild size="sm"><Link href="/admin/campaigns/new"><Plus className="size-3.5" /> New Campaign</Link></Button>}
          />
        )}
      />

      <p className="pt-1 text-xs text-muted-foreground">Budgets are planning amounts. Publishing and ad delivery are managed separately in Content and Meta Ads; delivery metrics appear only where an integration supplies them.</p>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(event) => void save(event)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename campaign</DialogTitle>
              <DialogDescription>Update the saved campaign name for this client.</DialogDescription>
            </DialogHeader>
            <Input aria-label="Campaign name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !name.trim()}>{saving ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
