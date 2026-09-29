"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlarmClock, Check, FileText, Loader2, AlertCircle, MessageCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { StatusBadge } from "./ui-badge";
import { PLATFORM_META } from "../config/platform-config";
import { ContentPreviewPanel } from "./ContentPreview";
import { draftsApi, type DraftChannel, type DraftSummaryRecord, type DraftReviewStatus } from "../live/drafts-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import type { Platform } from "../types/content.types";

const CHANNEL_TO_PLATFORM: Record<DraftChannel, Platform> = {
  FACEBOOK_PAGE: "facebook",
  INSTAGRAM_ACCOUNT: "instagram",
  LINKEDIN_ORGANIZATION: "linkedin",
};

const STATUS_MAP: Record<DraftReviewStatus, string> = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending",
  APPROVED: "approved",
  REJECTED: "changes-requested",
};

interface ApprovalRow {
  id: string;
  revision: number;
  reviewStatus: DraftReviewStatus;
  title: string;
  channel: Platform;
  client: string;
  campaign: string | null;
  owner: string;
  submittedBy: string;
  submittedAt: string;
  status: string;
}

export function ApprovalsTab() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"all" | "campaign" | "standalone">("all");
  const [selectedApprovalId, setSelectedApprovalId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [acting, setActing] = useState(false);

  const fetchRows = useCallback(async () => {
    if (!companyId || !clientId) return;
    try {
      const res = await draftsApi.list(companyId, clientId, { page: 1, limit: 100 });
      const mapped: ApprovalRow[] = (res.items ?? []).map((d: DraftSummaryRecord) => {
        const channel = (d.channels?.[0] ?? "INSTAGRAM_ACCOUNT") as DraftChannel;
        return {
          id: d.id,
          revision: d.revision,
          reviewStatus: d.reviewStatus,
          title: d.title || d.contentPreview || "Untitled draft",
          channel: CHANNEL_TO_PLATFORM[channel] ?? "instagram",
          client: "Active Client",
          campaign: d.campaignId ? `Campaign ${d.campaignId.slice(0, 8)}` : null,
          owner: "—",
          submittedBy: "Content team",
          submittedAt: (d.createdAt ?? d.updatedAt ?? "").split("T")[0] ?? "",
          status: STATUS_MAP[d.reviewStatus] ?? "pending",
        };
      });
      setRows(mapped);
      setErrorMessage(null);
      setSelectedApprovalId((prev) => (prev && mapped.some((r) => r.id === prev) ? prev : mapped[0]?.id ?? ""));
    } catch (err: unknown) {
      setErrorMessage(ApiError.isApiError(err) ? err.message || `Failed to fetch drafts (HTTP ${err.status})` : "Unable to connect to the approvals API.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, clientId]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (isReady) void fetchRows();
  }, [isReady, fetchRows]);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    changes: rows.filter((r) => r.status === "changes-requested").length,
    draft: rows.filter((r) => r.status === "draft").length,
  }), [rows]);

  const STATS = [
    { n: String(counts.pending), label: "Pending review", icon: <AlarmClock className="size-4" />, tone: "bg-amber-50 text-amber-600" },
    { n: String(counts.approved), label: "Approved", icon: <Check className="size-4" />, tone: "bg-emerald-50 text-emerald-600" },
    { n: String(counts.changes), label: "Changes requested", icon: <FileText className="size-4" />, tone: "bg-red-50 text-red-600" },
    { n: String(counts.draft), label: "Drafts", icon: <FileText className="size-4" />, tone: "bg-blue-50 text-[#1769DF]" },
  ];

  const visibleRows = rows.filter((a) => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (typeFilter === "campaign" && !a.campaign) return false;
    if (typeFilter === "standalone" && a.campaign) return false;
    return true;
  });

  const activeApproval = rows.find((a) => a.id === selectedApprovalId) ?? visibleRows[0];

  const runReview = async (action: "approve" | "reject") => {
    if (!activeApproval || !companyId || !clientId) return;
    if (action === "reject" && !reviewNote.trim()) {
      setErrorMessage("Add a comment before requesting changes.");
      return;
    }
    setActing(true);
    setErrorMessage(null);
    try {
      if (action === "approve") {
        await draftsApi.approveReview(companyId, clientId, activeApproval.id, activeApproval.revision, reviewNote);
      } else {
        await draftsApi.rejectReview(companyId, clientId, activeApproval.id, activeApproval.revision, reviewNote);
      }
      setReviewNote("");
      await fetchRows();
    } catch (err: unknown) {
      setErrorMessage(ApiError.isApiError(err) ? err.message || `Review action failed (HTTP ${err.status})` : "Unable to reach the approvals API.");
    } finally {
      setActing(false);
    }
  };

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[12px] text-[#7A87A0]">
        <Loader2 className="size-5 animate-spin text-[#1769DF]" />
        <span className="mt-2">Loading live approvals...</span>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-2.5">
        {errorMessage && (
          <div className="flex items-center justify-between rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3.5 py-2 text-[11.5px] text-[#721c24]">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={retry} className="flex items-center gap-1 rounded bg-[#721c24] px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-[#501319]">
              <RefreshCw size={10} /> Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 rounded-sm border border-[#E2E8F0] bg-white p-3 shadow-sm">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm", s.tone)}>{s.icon}</span>
              <div><p className="text-[17px] font-black leading-4 text-[#172044]">{s.n}</p><p className="mt-px text-[10.5px] font-medium text-[#7A87A0]">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-semibold text-[#7A87A0] mr-1">Type:</span>
            {([["all", "All"], ["campaign", "🎯 Campaign"], ["standalone", "⚡ Standalone"]] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "h-6 rounded-sm px-2 text-[10.5px] font-semibold transition",
                  typeFilter === value
                    ? value === "campaign" ? "bg-[#1769DF] text-white" : value === "standalone" ? "bg-[#0AA673] text-white" : "bg-[#172044] text-white"
                    : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {["All", "pending", "approved", "changes-requested"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn("h-6 rounded-sm px-2 text-[10.5px] font-semibold", statusFilter === f ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#7A87A0]")}
              >
                {f === "changes-requested" ? "Changes" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Card title={`Review queue · ${visibleRows.length}`}>
          <div className="divide-y divide-[#EDF1F5]">
            {visibleRows.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedApprovalId(a.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 py-2.5 px-2 rounded-sm transition hover:bg-slate-50 first:pt-2 last:pb-2",
                  activeApproval?.id === a.id ? "bg-[#F7FAFF]" : ""
                )}
              >
                <span className="grid h-9 w-13 shrink-0 place-items-center rounded-sm bg-slate-100 text-[15px]">{PLATFORM_META[a.channel].icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12px] font-semibold text-[#24365A]">{a.title}</p>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#7A87A0]">
                    <span>{PLATFORM_META[a.channel].label}</span>
                    <span>·</span>
                    <span>{a.submittedBy}</span>
                    <span>·</span>
                    {a.campaign ? (
                      <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-semibold text-[#1769DF]">🎯 {a.campaign}</span>
                    ) : (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700">⚡ Standalone</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={a.status} />
                <span className="rounded border border-[#E2E8F0] px-2 py-1 text-[10.5px] font-semibold text-[#1769DF]">Review</span>
              </div>
            ))}
            {!visibleRows.length && (
              <div className="grid min-h-40 place-items-center text-center text-[12px] text-[#7A87A0]">No drafts are waiting for review.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform={activeApproval?.channel ?? "instagram"} setPlatform={() => { }} channels={[activeApproval?.channel ?? "instagram"]} />
        <Card title="Approval details & workflow">
          <div className="mb-2 rounded-sm bg-[#F8FAFD] border border-[#E2E8F0] p-2 text-[11px]">
            <div className="flex justify-between py-0.5"><span className="text-[#7A87A0]">Client:</span><span className="font-semibold text-[#24365A]">{activeApproval?.client ?? "—"}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-[#7A87A0]">Post Type:</span><span className="font-semibold text-[#24365A]">{activeApproval?.campaign ? `🎯 ${activeApproval.campaign}` : "⚡ Standalone / Direct Post"}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-[#7A87A0]">Status:</span><span className="font-semibold text-[#24365A]">{activeApproval?.status ?? "—"}</span></div>
          </div>
          <div className="space-y-2 border-l-2 border-[#E2E8F0] pl-3.5">
            {[
              ["Draft created", `by ${activeApproval?.submittedBy ?? "Author"}`, true],
              ["Pending review", activeApproval?.reviewStatus === "PENDING_REVIEW" ? "In review now" : "Not submitted", activeApproval?.reviewStatus !== "DRAFT"],
              ["Decision", activeApproval?.reviewStatus === "APPROVED" ? "Approved" : activeApproval?.reviewStatus === "REJECTED" ? "Changes requested" : "Awaiting reviewer", activeApproval?.reviewStatus === "APPROVED" || activeApproval?.reviewStatus === "REJECTED"],
            ].map(([t, s, done], i) => (
              <div key={i} className="relative">
                <span className={cn("absolute -left-[23px] top-0.5 grid size-3.5 place-items-center rounded-sm", done ? "bg-emerald-500 text-white" : "bg-white ring-2 ring-[#CBD5E1]")}>{done ? <Check className="size-2" /> : null}</span>
                <p className="text-[12px] font-semibold text-[#33445F]">{t}</p>
                <p className="text-[10.5px] text-[#7A87A0]">{s}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => runReview("approve")}
              disabled={acting || !activeApproval}
              className="h-8 flex-1 rounded-sm bg-emerald-600 text-[11.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => runReview("reject")}
              disabled={acting || !activeApproval}
              className="h-8 flex-1 rounded-sm border border-red-200 text-[11.5px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Request changes
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <MessageCircle className="size-3.5 text-[#7A87A0]" />
            <input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add comment..."
              spellCheck={true}
              className="h-7 flex-1 rounded border border-[#E2E8F0] px-2 text-[10.5px] outline-none focus:border-[#1769DF]"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
