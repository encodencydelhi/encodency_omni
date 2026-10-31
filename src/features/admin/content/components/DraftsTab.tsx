"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Files, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { SearchInput } from "@/components/shared/search-input";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { PaginationMeta } from "@/types/api";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { draftsApi, type DraftChannel, type DraftRecord, type DraftReviewStatus, type DraftSummaryRecord } from "../live/drafts-api";
import { REVIEW_BADGE, REVIEW_LABEL, REVIEW_STATUSES, REVIEW_TONE } from "../live/review-status";
import { htmlToPlainText } from "../lib/rich-text";
import { ReviewStatRow } from "./ReviewStatRow";

const CHANNEL_NAME: Record<DraftChannel, string> = { FACEBOOK_PAGE: "Facebook", INSTAGRAM_ACCOUNT: "Instagram", LINKEDIN_ORGANIZATION: "LinkedIn" };
const shortDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function DraftsTab({ onEdit, onCreate }: { onEdit?: (draft: DraftRecord) => void; onCreate?: () => void }) {
  const { companyId, clientId } = useTenancyContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DraftReviewStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [opening, setOpening] = useState<string | null>(null);
  const enabled = Boolean(companyId && clientId);
  const query = useQuery({
    queryKey: ["content-drafts", companyId, clientId, search, page, pageSize, status],
    enabled,
    queryFn: ({ signal }) => draftsApi.list(companyId!, clientId!, { search, page, limit: pageSize, reviewStatus: status === "ALL" ? undefined : status }, signal),
  });
  async function edit(id: string) {
    if (!companyId || !clientId || !onEdit) return;
    const scopeCompany = companyId, scopeClient = clientId;
    setOpening(id);
    try { onEdit(await draftsApi.get(scopeCompany, scopeClient, id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to open this draft."); }
    finally { setOpening(null); }
  }

  const columns: Array<DataTableColumn<DraftSummaryRecord>> = [
    {
      id: "draft",
      header: "Draft",
      cell: (row) => (
        <div className="min-w-0 max-w-[26rem]">
          <p className="truncate font-medium text-foreground">{row.title || "Untitled draft"}</p>
          <p className="truncate text-2xs text-muted-foreground">{htmlToPlainText(row.contentPreview) || "No caption"}</p>
        </div>
      ),
    },
    {
      id: "channels",
      header: "Channels",
      hideBelow: "md",
      cell: (row) => row.channels.length ? (
        <div className="flex items-center gap-1.5">{row.channels.map((channel) => <span key={channel} title={CHANNEL_NAME[channel]} className="size-4 shrink-0"><ChannelLogo channel={CHANNEL_NAME[channel]} className="size-4" /></span>)}</div>
      ) : <span className="text-muted-foreground">None selected</span>,
    },
    { id: "status", header: "Status", cell: (row) => <Badge tone={REVIEW_TONE[row.reviewStatus]}>{REVIEW_BADGE[row.reviewStatus]}</Badge> },
    { id: "media", header: "Media", hideBelow: "sm", cell: (row) => <span className="tabular-nums">{row.mediaCount}</span> },
    { id: "updated", header: "Updated", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{shortDate(row.updatedAt)} - rev {row.revision}</span> },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "w-36",
      hideable: false,
      cell: (row) => (
        <Button size="xs" variant="outline" disabled={Boolean(opening) || !onEdit} onClick={(event) => { event.stopPropagation(); void edit(row.id); }}>
          <Pencil className="size-3" />{opening === row.id ? "Opening..." : "Open in composer"}
        </Button>
      ),
    },
  ];

  if (!enabled) return <EmptyState icon={Files} title="Select a client" description="Choose a client in the sidebar to see its saved drafts." />;

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagination: PaginationMeta = { page, pageSize, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
  const filtered = Boolean(search.trim()) || status !== "ALL";

  return (
    <div className="space-y-1">
      <ReviewStatRow active={status} onSelect={(value) => { setStatus(value); setPage(1); }} />
      <FilterBar
        search={<SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search drafts..." aria-label="Search drafts" className="w-64" />}
        filters={(
          <Select value={status} onValueChange={(value) => { setStatus(value as DraftReviewStatus | "ALL"); setPage(1); }}>
            <SelectTrigger size="sm" aria-label="Review status" className="w-auto min-w-[9rem]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {REVIEW_STATUSES.map((value) => <SelectItem key={value} value={value}>{REVIEW_LABEL[value]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        actions={<Button size="icon-sm" variant="outline" aria-label="Refresh drafts" onClick={() => void query.refetch()}><RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} /></Button>}
        activeFilterCount={status !== "ALL" ? 1 : 0}
        onClearFilters={() => { setStatus("ALL"); setSearch(""); setPage(1); }}
      />
      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isPending}
        isFetching={query.isFetching && !query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRowClick={onEdit ? (row) => void edit(row.id) : undefined}
        emptyState={(
          <EmptyState
            icon={Files}
            title={filtered ? "No matching drafts" : "No saved drafts yet"}
            description={filtered ? "Change your search or status filter." : "Save a post from the composer and it will show up here."}
            action={filtered || !onCreate ? undefined : <Button size="sm" onClick={onCreate}><Plus className="size-3.5" /> Create Post</Button>}
          />
        )}
      />
    </div>
  );
}
