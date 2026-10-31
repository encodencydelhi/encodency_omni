"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { PaginationMeta } from "@/types/api";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { draftsApi, type DraftRecord, type DraftReviewStatus } from "../live/drafts-api";
import { REVIEW_BADGE, REVIEW_LABEL as labels, REVIEW_STATUSES as statuses, REVIEW_TONE } from "../live/review-status";
import type { Platform } from "../types/content.types";
import { htmlToPlainText } from "../lib/rich-text";
import { ContentPreviewPanel } from "./ContentPreview";
import { ReviewStatRow } from "./ReviewStatRow";
import { Card } from "./ui-card";

const platforms: Record<string,Platform> = {FACEBOOK_PAGE:"facebook",INSTAGRAM_ACCOUNT:"instagram",LINKEDIN_ORGANIZATION:"linkedin"};
const PLATFORM_NAME: Record<Platform,string> = {facebook:"Facebook",instagram:"Instagram",linkedin:"LinkedIn"} as Record<Platform,string>;
const PAGE_SIZE = 20;

export function ApprovalsTab({onEdit}: {onEdit?: (draft: DraftRecord) => void} = {}) {
  const {companyId, clientId} = useTenancyContext();
  const {user} = useAuth();
  const {Clients} = useAdminContext();
  const membership = user?.memberships.find(item => item.companyId === companyId && item.companyStatus === "ACTIVE" && !item.suspended);
  const canReview = membership?.systemRole === "OWNER" || membership?.systemRole === "ADMIN";
  const clientName = Clients.find(client => client.id === clientId)?.name ?? "Selected client";
  const cache = useQueryClient();
  const [status,setStatus] = useState<DraftReviewStatus | "ALL">("PENDING_REVIEW");
  const [page,setPage] = useState(1);
  const [selected,setSelected] = useState("");
  const enabled = Boolean(companyId && clientId);
  const list = useQuery({queryKey:["content-approvals",companyId,clientId,status,page],enabled,
    queryFn:({signal}) => draftsApi.list(companyId,clientId,{page,limit:PAGE_SIZE,reviewStatus:status === "ALL" ? undefined : status},signal)});
  const activeId = list.data?.items.find(row => row.id === selected)?.id ?? list.data?.items[0]?.id;
  const pick = (value: DraftReviewStatus | "ALL") => {setStatus(value);setPage(1);setSelected("");};
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagination: PaginationMeta = {page, pageSize: PAGE_SIZE, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1};
  const refresh = () => {void list.refetch();void cache.invalidateQueries({queryKey:["content-approval-counts",companyId,clientId]});};

  if (!enabled) return <EmptyState icon={ShieldCheck} title="Select a client" description="Choose a client in the sidebar to see its review queue." />;
  return <div className="min-w-0 space-y-1">
    <ReviewStatRow active={status} onSelect={pick} />
    <FilterBar
      filters={<Select value={status} onValueChange={value => pick(value as DraftReviewStatus | "ALL")}>
        <SelectTrigger size="sm" aria-label="Review status" className="w-auto min-w-[9rem]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent><SelectItem value="ALL">All Statuses</SelectItem>{statuses.map(value => <SelectItem key={value} value={value}>{labels[value]}</SelectItem>)}</SelectContent>
      </Select>}
      actions={<Button size="icon-sm" variant="outline" aria-label="Refresh approvals" onClick={refresh}><RefreshCw className={cn("size-3.5", list.isFetching && "animate-spin")} /></Button>}
      activeFilterCount={status === "PENDING_REVIEW" ? 0 : 1}
      onClearFilters={() => pick("PENDING_REVIEW")}
    />
    <div className={cn("grid min-w-0 grid-cols-1 items-start gap-1", activeId && "xl:grid-cols-[minmax(0,1fr)_380px]")}>
      <Card title="Review queue" subtitle="Read the full post and media before making a decision.">
        {list.isPending ? <p role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin"/>Loading approvals...</p>
          : list.isError ? <p role="alert" className="py-10 text-center text-xs text-danger">Unable to load approvals. Refresh to try again.</p>
          : !list.data.items.length ? <EmptyState size="sm" icon={ShieldCheck} title={status === "PENDING_REVIEW" ? "Nothing is waiting for review" : "No posts match this review status"} description={status === "PENDING_REVIEW" ? "Posts sent for review from the composer appear here." : "Pick another status to see more posts."} />
          : <div className="space-y-1">{list.data.items.map(row => <button key={row.id} onClick={() => setSelected(row.id)} className={cn("w-full rounded-sm border p-2.5 text-left transition-colors", activeId === row.id ? "border-primary/40 bg-primary-subtle" : "border-[#E2E8F0] bg-white hover:bg-slate-50")}>
              <span className="flex items-start justify-between gap-2"><span className="block min-w-0 truncate text-[13px] font-semibold text-[#172044]">{row.title || "Untitled draft"}</span><Badge tone={REVIEW_TONE[row.reviewStatus]}>{REVIEW_BADGE[row.reviewStatus]}</Badge></span>
              <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{htmlToPlainText(row.contentPreview)}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                <span className="flex items-center gap-1.5">{row.channels.map(c => platforms[c]).filter((p): p is Platform => Boolean(p)).map(p => <span key={p} title={PLATFORM_NAME[p]} className="size-3.5 shrink-0"><ChannelLogo channel={PLATFORM_NAME[p]} className="size-3.5" /></span>)}</span>
                <span>{row.mediaCount} media</span><span>Revision {row.revision}</span>
              </span>
            </button>)}</div>}
        {list.data && list.data.total > 0 && <div className="-mx-3.5 -mb-3.5 mt-3"><DataTablePagination pagination={pagination} onPageChange={setPage} /></div>}
      </Card>
      {activeId && <ReviewDetail key={activeId} id={activeId} companyId={companyId} clientId={clientId} clientName={clientName} canReview={canReview} onEdit={onEdit}/>}
    </div>
  </div>;
}

function ReviewDetail({id,companyId,clientId,clientName,canReview,onEdit}: {id:string;companyId:string;clientId:string;clientName:string;canReview:boolean;onEdit?: (draft:DraftRecord)=>void}) {
  const cache = useQueryClient();
  const detail = useQuery({queryKey:["content-approval-detail",companyId,clientId,id],queryFn:({signal})=>draftsApi.get(companyId,clientId,id,signal)});
  const [note,setNote] = useState("");
  const [acting,setActing] = useState(false);
  const [platform,setPlatform] = useState<Platform | null>(null);
  const draft = detail.data;
  const channels = draft?.variants.map(v=>platforms[v.channel]).filter((p):p is Platform=>Boolean(p)) ?? [];
  const activePlatform = platform && channels.includes(platform) ? platform : channels[0] ?? "facebook";
  const variant = draft?.variants.find(v=>platforms[v.channel]===activePlatform);
  const media = draft?.media[0]?.asset;
  async function review(action:"approve"|"reject") {
    if (!draft || acting || !canReview || draft.reviewStatus !== "PENDING_REVIEW") return;
    if(action==="reject"&&!note.trim()) return toast.error("Explain what needs to change before requesting changes.");
    setActing(true);
    try {
      const updated = action === "approve" ? await draftsApi.approveReview(companyId,clientId,id,draft.revision,note) : await draftsApi.rejectReview(companyId,clientId,id,draft.revision,note);
      cache.setQueryData(["content-approval-detail",companyId,clientId,id],updated);
      setNote("");
      await Promise.all(["content-approvals","content-approval-counts","content-drafts"].map(key=>cache.invalidateQueries({queryKey:[key,companyId,clientId]})));
      toast.success(action === "approve" ? "Post approved" : "Changes requested",{description:"This review action does not publish or schedule the post."});
    } catch(error) {toast.error(error instanceof Error?error.message:"Review failed.");if(draftsApi.isRevisionConflict(error)){void detail.refetch();void cache.invalidateQueries({queryKey:["content-approvals",companyId,clientId]});}}
    finally {setActing(false);}
  }
  if(detail.isPending) return <Card title="Post details"><p role="status" className="flex items-center gap-2 py-6 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin"/>Loading full post...</p></Card>;
  if(detail.isError || !draft) return <Card title="Post details"><p role="alert" className="text-xs text-danger">Unable to load this post.</p><Button size="xs" variant="outline" className="mt-2" onClick={()=>void detail.refetch()}>Try again</Button></Card>;
  return <div className="min-w-0 space-y-1 xl:sticky xl:top-[108px]">
    <ContentPreviewPanel platform={activePlatform} setPlatform={setPlatform} channels={channels} caption={htmlToPlainText(variant?.content ?? draft.content)} image={media?.url} mediaType={media?.kind.toLowerCase()} accountName={clientName}/>
    <Card title="Full caption"><p className="whitespace-pre-wrap break-words text-[13px] text-slate-700">{htmlToPlainText(variant?.content ?? draft.content)}</p><p className="mt-2 text-xs text-muted-foreground">{draft.media.length} attached media - Revision {draft.revision}</p>{draft.media.length>1&&<ul className="mt-2 text-xs">{draft.media.map(({asset},i)=><li key={asset.id}><a href={asset.url} target="_blank" rel="noreferrer" className="text-primary underline">View {asset.kind.toLowerCase()} {i+1}</a></li>)}</ul>}</Card>
    <Card title="Review decision" subtitle={REVIEW_BADGE[draft.reviewStatus]}>
      {draft.reviewNote&&<p className="mb-2 whitespace-pre-wrap rounded-sm bg-slate-50 p-2.5 text-xs">{draft.reviewNote}</p>}
      {draft.reviewedBy&&<p className="mb-2 text-xs text-muted-foreground">Reviewed by {draft.reviewedBy.name || draft.reviewedBy.email}{draft.reviewedAt ? ` - ${new Date(draft.reviewedAt).toLocaleString()}` : ""}</p>}
      {!canReview&&<p className="mb-2 text-xs text-muted-foreground">An owner or admin can approve or request changes.</p>}
      {draft.reviewStatus==="PENDING_REVIEW"&&canReview&&<><label className="block text-[0.8125rem] font-medium">Review comment<Textarea value={note} maxLength={1000} disabled={acting} onChange={e=>setNote(e.target.value)} rows={3} className="mt-1" placeholder="Required when requesting changes"/></label><div className="mt-2 flex gap-1"><Button size="sm" className="flex-1 bg-success text-white hover:bg-success/90" disabled={acting} onClick={()=>void review("approve")}>Approve</Button><Button size="sm" variant="outline" className="flex-1 border-danger/30 text-danger hover:bg-danger-subtle" disabled={acting||!note.trim()} onClick={()=>void review("reject")}>Request Changes</Button></div></>}
      {onEdit&&<Button size="sm" variant="outline" className="mt-2 w-full" disabled={acting} onClick={()=>onEdit(draft)}>Open in composer</Button>}
    </Card>
  </div>;
}
