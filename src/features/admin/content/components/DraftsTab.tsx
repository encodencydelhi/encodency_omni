"use client";
import { useState } from "react";
import { Search, Pencil, Copy, MoreHorizontal, List, Grid2X2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { StatusBadge } from "./ui-badge";
import { MOCK_DRAFTS } from "../mocks/content.mock";

import { ContentPreviewPanel } from "./ContentPreview";

export function DraftsTab() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const rows = MOCK_DRAFTS.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card
        title={`Saved drafts · ${rows.length}`}
        subtitle="Continue where you left off"
        action={
          <div className="flex items-center gap-1.5">
            <label className="hidden h-8 w-48 items-center gap-1.5 rounded-lg border border-[#D9E1EC] px-2.5 text-[11.5px] text-[#7A87A0] md:flex"><Search className="size-3.5" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full bg-transparent outline-none" /></label>
            <div className="flex rounded-lg border border-[#D9E1EC] p-0.5">
              <button onClick={() => setView("list")} className={cn("rounded p-1.5", view === "list" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#94A3B8]")}><List className="size-3.5" /></button>
              <button onClick={() => setView("grid")} className={cn("rounded p-1.5", view === "grid" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#94A3B8]")}><Grid2X2 className="size-3.5" /></button>
            </div>
          </div>
        }
      >
        {view === "list" ? (
          <div className="divide-y divide-[#EDF1F5]">
            {rows.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <img src={d.media[0]?.url} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-[#24365A]">{d.title}</p>
                  <p className="mt-px flex flex-wrap items-center gap-x-1 text-[10.5px] text-[#7A87A0]">
                    {d.channels.slice(0, 3).map((c) => <PlatformBadge key={c} platform={c} size="sm" />)}
                    <span>· {d.campaign.name}</span>
                  </p>
                </div>
                <StatusBadge status={d.status} />
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
              <div key={d.id} className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                <img src={d.media[0]?.url} alt="" className="aspect-video w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-[12px] font-bold text-[#24365A]">{d.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-[#7A87A0]">{d.updatedAt.split("T")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform="instagram" setPlatform={() => {}} channels={rows[0]?.channels ?? ["instagram"]} />
        <Card title="Draft details">
          <dl className="space-y-1.5 text-[11.5px]">
            {[["Client", rows[0]?.client.name ?? "—"], ["Campaign", rows[0]?.campaign.name ?? "—"], ["Media", `${rows[0]?.media.length ?? 0} files`], ["Last edited", rows[0]?.updatedAt.split("T")[0] ?? "—"], ["Owner", rows[0]?.createdBy ?? "—"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="text-[#7A87A0]">{k}</dt><dd className="font-semibold text-[#33445F]">{v}</dd></div>
            ))}
          </dl>
          <button className="mt-2.5 h-8 w-full rounded-lg bg-[#172044] text-[11.5px] font-bold text-white">Continue editing</button>
        </Card>
      </div>
    </div>
  );
}