"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Pencil, Copy, MoreHorizontal, List, Grid2X2, Megaphone, FileText, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { StatusBadge } from "./ui-badge";
import { MOCK_DRAFTS } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";
import { draftsApi, type DraftSummaryRecord, isRevisionConflict } from "../live/drafts-api";
import { mediaApi } from "../live/media-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";

export function DraftsTab() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "campaign" | "standalone">("all");
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");

  const [liveDrafts, setLiveDrafts] = useState<DraftSummaryRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const fetchLiveDrafts = useCallback(async () => {
    if (!companyId || !clientId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setConflictNotice(null);
    try {
      const res = await draftsApi.list(companyId, clientId);
      setLiveDrafts(res.items);
      if (res.items.length > 0 && !selectedDraftId) {
        setSelectedDraftId(res.items[0]!.id);
      }
    } catch (err: unknown) {
      if (ApiError.isApiError(err)) {
        setErrorMessage(err.message || `Failed to fetch drafts (HTTP ${err.status})`);
      } else {
        setErrorMessage("Unable to connect to drafts API. Please verify backend service.");
      }
      setLiveDrafts(null);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, clientId, selectedDraftId]);

  useEffect(() => {
    if (isReady) {
      fetchLiveDrafts();
    }
  }, [isReady, fetchLiveDrafts]);

  // Map live draft items into the row shape expected by the UI
  const allDrafts = useMemo(() => {
    if (liveDrafts !== null) {
      return liveDrafts.map((d) => ({
        id: d.id,
        title: d.title || "Untitled Draft",
        content: d.content,
        channels: (d.channels?.length ? d.channels : ["instagram"]) as any[],
        approvalStatus: "draft" as const,
        campaign: d.campaignId ? { id: d.campaignId, name: `Campaign ${d.campaignId.slice(0, 8)}` } : undefined,
        client: { id: d.clientId, name: "Active Client" },
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        createdBy: "Operator",
        revision: d.revision,
        masterContent: {
          caption: d.content,
          headline: d.title || "",
          description: "",
          cta: "Learn More",
          ctaUrl: "",
          hashtags: [],
          mentions: [],
          media: [] as Array<{ id?: string; url: string }>,
          link: "",
          location: "",
          altText: "",
          firstComment: "",
          language: "English",
          tone: "Neutral",
        },
      }));
    }
    return [];
  }, [liveDrafts]);

  const campaignCount = allDrafts.filter((d) => !!d.campaign).length;
  const standaloneCount = allDrafts.filter((d) => !d.campaign).length;

  const rows = useMemo(() => {
    return allDrafts.filter((d) => {
      const matchesQuery = d.title.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filterType === "campaign") return !!d.campaign;
      if (filterType === "standalone") return !d.campaign;
      return true;
    });
  }, [allDrafts, query, filterType]);

  const activeDraft = allDrafts.find((d) => d.id === selectedDraftId) ?? rows[0];

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-2.5">
        {/* Revision Conflict Notice Banner (TASK-11A Concurrency) */}
        {conflictNotice && (
          <div className="flex items-center justify-between rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3.5 py-2 text-[11.5px] text-[#721c24]">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-[#721c24]" />
              <span>{conflictNotice}</span>
            </div>
            <button
              onClick={fetchLiveDrafts}
              className="flex items-center gap-1 rounded bg-[#721c24] px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-[#501319]"
            >
              <RefreshCw size={10} /> Reload Latest
            </button>
          </div>
        )}

        {/* Campaign vs Standalone filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "flex h-7 items-center gap-1 rounded-sm px-2.5 text-[11px] font-semibold transition",
              filterType === "all" ? "bg-[#172044] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50"
            )}
          >
            All Posts ({allDrafts.length})
          </button>
          <button
            onClick={() => setFilterType("campaign")}
            className={cn(
              "flex h-7 items-center gap-1 rounded-sm px-2.5 text-[11px] font-semibold transition",
              filterType === "campaign" ? "bg-[#1769DF] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50"
            )}
          >
            <Megaphone className="size-3" /> Campaign Posts ({campaignCount})
          </button>
          <button
            onClick={() => setFilterType("standalone")}
            className={cn(
              "flex h-7 items-center gap-1 rounded-sm px-2.5 text-[11px] font-semibold transition",
              filterType === "standalone" ? "bg-[#0AA673] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50"
            )}
          >
            <FileText className="size-3" /> Standalone Posts ({standaloneCount})
          </button>
        </div>

        <Card
          title={`Saved drafts · ${rows.length}`}
          subtitle="Campaign-linked and independent standalone posts"
          action={
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchLiveDrafts}
                title="Refresh drafts from live API"
                disabled={isLoading}
                className="flex h-8 items-center gap-1 rounded-sm border border-[#D9E1EC] px-2 text-[11.5px] text-[#7A87A0] hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              </button>
              <label className="hidden h-8 w-48 items-center gap-1.5 rounded-sm border border-[#D9E1EC] px-2.5 text-[11.5px] text-[#7A87A0] md:flex">
                <Search className="size-3.5" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search drafts..."
                  spellCheck={true}
                  className="w-full bg-transparent outline-none"
                />
              </label>
              <div className="flex rounded-sm border border-[#D9E1EC] p-0.5">
                <button onClick={() => setView("list")} className={cn("rounded p-1.5", view === "list" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#94A3B8]")}><List className="size-3.5" /></button>
                <button onClick={() => setView("grid")} className={cn("rounded p-1.5", view === "grid" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#94A3B8]")}><Grid2X2 className="size-3.5" /></button>
              </div>
            </div>
          }
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[12px] text-[#7A87A0]">
              <Loader2 className="size-5 animate-spin text-[#1769DF]" />
              <span className="mt-2">Loading live drafts...</span>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-[12px] text-red-600">
              <AlertCircle className="size-5" />
              <span className="mt-1 font-semibold">{errorMessage}</span>
              <p className="mt-1 text-[11px] text-[#7A87A0]">Unable to connect to live drafts API.</p>
              <button
                onClick={fetchLiveDrafts}
                className="mt-2.5 flex items-center gap-1.5 rounded-sm bg-[#1769DF] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1259bd]"
              >
                <RefreshCw size={11} /> Retry Connection
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-[#7A87A0]">
              No drafts found matching your criteria.
            </div>
          ) : view === "list" ? (
            <div className="divide-y divide-[#EDF1F5]">
              {rows.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDraftId(d.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2.5 transition hover:bg-slate-50",
                    activeDraft?.id === d.id ? "bg-[#F7FAFF]" : ""
                  )}
                >
                  <img src={d.masterContent.media[0]?.url ?? ""} alt="" className="h-10 w-14 shrink-0 rounded-sm object-cover bg-slate-100" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12.5px] font-semibold text-[#24365A]">{d.title}</p>
                      {(d as any).revision && (
                        <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-semibold text-slate-600">
                          Rev {(d as any).revision}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#7A87A0]">
                      <div className="flex items-center gap-1">
                        {d.channels.slice(0, 3).map((c) => <PlatformBadge key={c} platform={c} size="sm" />)}
                      </div>
                      <span>·</span>
                      {d.campaign ? (
                        <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9.5px] font-semibold text-[#1769DF]">
                          🎯 {d.campaign.name}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-semibold text-emerald-700">
                          ⚡ Standalone Post
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={d.approvalStatus} />
                  <div className="flex shrink-0 gap-0.5">
                    <button className="rounded p-1.5 text-[#1769DF] hover:bg-blue-50"><Pencil className="size-3.5" /></button>
                    <button className="rounded p-1.5 text-[#94A3B8] hover:bg-slate-100"><Copy className="size-3.5" /></button>
                    <button className="rounded p-1.5 text-[#94A3B8] hover:bg-slate-100"><MoreHorizontal className="size-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {rows.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDraftId(d.id)}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded-sm border transition hover:border-[#1769DF]",
                    activeDraft?.id === d.id ? "border-[#1769DF] ring-1 ring-[#1769DF]" : "border-[#E2E8F0]"
                  )}
                >
                  <div className="relative aspect-video w-full bg-slate-100">
                    <img src={d.masterContent.media[0]?.url ?? ""} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5">
                      {d.campaign ? (
                        <span className="rounded bg-[#172044]/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                          🎯 {d.campaign.name}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-700/85 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                          ⚡ Standalone
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-[12px] font-semibold text-[#24365A]">{d.title}</p>
                      {(d as any).revision && (
                        <span className="shrink-0 rounded bg-slate-100 px-1 py-0.2 text-[8.5px] font-semibold text-slate-600">
                          r{(d as any).revision}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-[#7A87A0]">{d.updatedAt.split("T")[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform="instagram" setPlatform={() => { }} channels={activeDraft?.channels ?? ["instagram"]} />
        <Card title="Draft details">
          <dl className="space-y-1.5 text-[11.5px]">
            {[
              ["Client", activeDraft?.client?.name ?? "—"],
              ["Post Type", activeDraft?.campaign ? "🎯 Campaign Post" : "⚡ Standalone / Direct Post"],
              ["Campaign", activeDraft?.campaign?.name ?? "None (Standalone)"],
              ["Revision", (activeDraft as any)?.revision ? `Rev ${(activeDraft as any).revision}` : "—"],
              ["Media", `${activeDraft?.masterContent.media.length ?? 0} files attached`],
              ["Last edited", activeDraft?.updatedAt.split("T")[0] ?? "—"],
              ["Owner", activeDraft?.createdBy ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-[#7A87A0]">{k}</dt>
                <dd className="font-semibold text-[#33445F]">{v}</dd>
              </div>
            ))}
          </dl>
          <button className="mt-2.5 h-8 w-full rounded-sm bg-[#172044] text-[11.5px] font-semibold text-white transition hover:bg-slate-800">
            Continue editing
          </button>
        </Card>
      </div>
    </div>
  );
}