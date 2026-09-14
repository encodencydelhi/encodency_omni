"use client";
import { useState } from "react";
import { AlarmClock, Check, FileText, CalendarDays, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { StatusBadge } from "./ui-badge";
import { MOCK_APPROVALS } from "../mocks/content.mock";
import { PLATFORM_META } from "../config/platform-config";
import { ContentPreviewPanel } from "./ContentPreview";

const STATS = [
  { n: "12", label: "Pending review", icon: <AlarmClock className="size-4" />, tone: "bg-amber-50 text-amber-600" },
  { n: "8", label: "Approved", icon: <Check className="size-4" />, tone: "bg-emerald-50 text-emerald-600" },
  { n: "3", label: "Changes requested", icon: <FileText className="size-4" />, tone: "bg-red-50 text-red-600" },
  { n: "5", label: "Scheduled", icon: <CalendarDays className="size-4" />, tone: "bg-blue-50 text-[#1769DF]" },
];

export function ApprovalsTab() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"all" | "campaign" | "standalone">("all");
  const [selectedApprovalId, setSelectedApprovalId] = useState(MOCK_APPROVALS[0]?.id ?? "");

  const rows = MOCK_APPROVALS.filter((a) => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (typeFilter === "campaign" && !a.campaign) return false;
    if (typeFilter === "standalone" && a.campaign) return false;
    return true;
  });

  const activeApproval = MOCK_APPROVALS.find((a) => a.id === selectedApprovalId) ?? rows[0];

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.tone)}>{s.icon}</span>
              <div><p className="text-[17px] font-black leading-4 text-[#172044]">{s.n}</p><p className="mt-px text-[10.5px] font-medium text-[#7A87A0]">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-semibold text-[#7A87A0] mr-1">Type:</span>
            <button
              onClick={() => setTypeFilter("all")}
              className={cn("h-6 rounded-md px-2 text-[10.5px] font-semibold transition", typeFilter === "all" ? "bg-[#172044] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50")}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter("campaign")}
              className={cn("h-6 rounded-md px-2 text-[10.5px] font-semibold transition", typeFilter === "campaign" ? "bg-[#1769DF] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50")}
            >
              🎯 Campaign
            </button>
            <button
              onClick={() => setTypeFilter("standalone")}
              className={cn("h-6 rounded-md px-2 text-[10.5px] font-semibold transition", typeFilter === "standalone" ? "bg-[#0AA673] text-white" : "border border-[#D9E1EC] bg-white text-[#687797] hover:bg-slate-50")}
            >
              ⚡ Standalone
            </button>
          </div>

          <div className="flex gap-1">
            {["All", "pending", "approved", "changes-requested"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn("h-6 rounded-md px-2 text-[10.5px] font-semibold", statusFilter === f ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#7A87A0]")}
              >
                {f === "changes-requested" ? "Changes" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Card title={`Review queue · ${rows.length}`}>
          <div className="divide-y divide-[#EDF1F5]">
            {rows.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedApprovalId(a.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 py-2.5 px-2 rounded-lg transition hover:bg-slate-50 first:pt-2 last:pb-2",
                  activeApproval?.id === a.id ? "bg-[#F7FAFF]" : ""
                )}
              >
                <img src={a.image} alt="" className="h-9 w-13 shrink-0 rounded-lg object-cover" />
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
                      <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-semibold text-[#1769DF]">
                        🎯 {a.campaign}
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700">
                        ⚡ Standalone
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={a.status} />
                <button className="rounded border border-[#E2E8F0] px-2 py-1 text-[10.5px] font-semibold text-[#1769DF] hover:bg-blue-50">Review</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform={activeApproval?.channel ?? "instagram"} setPlatform={() => {}} channels={[activeApproval?.channel ?? "instagram"]} />
        <Card title="Approval details & workflow">
          <div className="mb-2 rounded-lg bg-[#F8FAFD] border border-[#E2E8F0] p-2 text-[11px]">
            <div className="flex justify-between py-0.5"><span className="text-[#7A87A0]">Client:</span><span className="font-semibold text-[#24365A]">{activeApproval?.client}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-[#7A87A0]">Post Type:</span><span className="font-semibold text-[#24365A]">{activeApproval?.campaign ? `🎯 ${activeApproval.campaign}` : "⚡ Standalone / Direct Post"}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-[#7A87A0]">Owner:</span><span className="font-semibold text-[#24365A]">{activeApproval?.owner}</span></div>
          </div>
          <div className="space-y-2 border-l-2 border-[#E2E8F0] pl-3.5">
            {[["Draft created", `by ${activeApproval?.submittedBy ?? "Author"}`, true], ["Pending review", "Content team · in progress", true], ["Approve & schedule", "Next step", false]].map(([t, s, done], i) => (
              <div key={i} className="relative">
                <span className={cn("absolute -left-[23px] top-0.5 grid size-3.5 place-items-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-white ring-2 ring-[#CBD5E1]")}>{done ? <Check className="size-2" /> : null}</span>
                <p className="text-[12px] font-semibold text-[#33445F]">{t}</p>
                <p className="text-[10.5px] text-[#7A87A0]">{s}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5">
            <button className="h-8 flex-1 rounded-lg bg-emerald-600 text-[11.5px] font-semibold text-white hover:bg-emerald-700">Approve</button>
            <button className="h-8 flex-1 rounded-lg border border-red-200 text-[11.5px] font-semibold text-red-600 hover:bg-red-50">Request changes</button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <MessageCircle className="size-3.5 text-[#7A87A0]" />
            <input
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