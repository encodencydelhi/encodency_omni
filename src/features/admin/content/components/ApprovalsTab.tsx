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
  const [filter, setFilter] = useState("All");
  const rows = MOCK_APPROVALS.filter((a) => filter === "All" || a.status === filter);
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
        <Card title="Review queue" action={<div className="flex gap-1">{["All", "pending", "approved", "changes-requested"].map((f) => <button key={f} onClick={() => setFilter(f)} className={cn("h-6 rounded-md px-2 text-[10.5px] font-bold", filter === f ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#7A87A0]")}>{f === "changes-requested" ? "Changes" : f.charAt(0).toUpperCase() + f.slice(1)}</button>)}</div>}>
          <div className="divide-y divide-[#EDF1F5]">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <img src={a.image} alt="" className="h-9 w-13 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-[#24365A]">{a.title}</p>
                  <p className="mt-px text-[10.5px] text-[#7A87A0]">{PLATFORM_META[a.channel].label} · {a.submittedBy} · {a.submittedAt}</p>
                </div>
                <StatusBadge status={a.status} />
                <button className="rounded border border-[#E2E8F0] px-2 py-1 text-[10.5px] font-bold text-[#1769DF] hover:bg-blue-50">Review</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform="instagram" setPlatform={() => {}} channels={["instagram", "facebook"]} />
        <Card title="Approval workflow">
          <div className="space-y-2 border-l-2 border-[#E2E8F0] pl-3.5">
            {[["Draft created", "by Manish Sirohi", true], ["Pending review", "Content team · waiting", true], ["Approve & schedule", "Next step", false]].map(([t, s, done], i) => (
              <div key={i} className="relative">
                <span className={cn("absolute -left-[23px] top-0.5 grid size-3.5 place-items-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-white ring-2 ring-[#CBD5E1]")}>{done ? <Check className="size-2" /> : null}</span>
                <p className="text-[12px] font-bold text-[#33445F]">{t}</p>
                <p className="text-[10.5px] text-[#7A87A0]">{s}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5">
            <button className="h-8 flex-1 rounded-lg bg-emerald-600 text-[11.5px] font-bold text-white hover:bg-emerald-700">Approve</button>
            <button className="h-8 flex-1 rounded-lg border border-red-200 text-[11.5px] font-bold text-red-600 hover:bg-red-50">Request changes</button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <MessageCircle className="size-3.5 text-[#7A87A0]" />
            <input placeholder="Add comment..." className="h-7 flex-1 rounded border border-[#E2E8F0] px-2 text-[10.5px] outline-none focus:border-[#1769DF]" />
          </div>
        </Card>
      </div>
    </div>
  );
}