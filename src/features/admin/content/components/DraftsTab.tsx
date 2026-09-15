"use client";
import { useState } from "react";
import { Search, Pencil, Copy, MoreHorizontal, List, Grid2X2, Megaphone, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { StatusBadge } from "./ui-badge";
import { MOCK_DRAFTS } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";

export function DraftsTab() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "campaign" | "standalone">("all");
  const [selectedDraftId, setSelectedDraftId] = useState<string>(MOCK_DRAFTS[0]?.id ?? "");

  const campaignCount = MOCK_DRAFTS.filter((d) => !!d.campaign).length;
  const standaloneCount = MOCK_DRAFTS.filter((d) => !d.campaign).length;

  const rows = MOCK_DRAFTS.filter((d) => {
    const matchesQuery = d.title.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filterType === "campaign") return !!d.campaign;
    if (filterType === "standalone") return !d.campaign;
    return true;
  });

  const activeDraft = MOCK_DRAFTS.find((d) => d.id === selectedDraftId) ?? rows[0];

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-2.5">
        {/* Campaign vs Standalone filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "flex h-7 items-center gap-1 rounded-sm px-2.5 text-[11px] font-semibold transition",
              filterType === "all" ? "bg-[#172044] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50"
            )}
          >
            All Posts ({MOCK_DRAFTS.length})
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
          {view === "list" ? (
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
                  <img src={d.masterContent.media[0]?.url ?? ""} alt="" className="h-10 w-14 shrink-0 rounded-sm object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12.5px] font-semibold text-[#24365A]">{d.title}</p>
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
                  <div className="relative aspect-video w-full">
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
                    <p className="truncate text-[12px] font-semibold text-[#24365A]">{d.title}</p>
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
              ["Media", `${activeDraft?.masterContent.media.length ?? 0} files`],
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