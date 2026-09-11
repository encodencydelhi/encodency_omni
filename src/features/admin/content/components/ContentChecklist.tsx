"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";

type CheckItem = { label: string; done: boolean };

export function ContentChecklist({ checks }: { checks: CheckItem[] }) {
  const done = checks.filter((c) => c.done).length;
  return (
    <Card>
      <div className="flex items-center gap-1.5 border-b border-[#EDF1F5] pb-2 mb-2">
        <span className="text-[11px] font-bold text-[#7A87A0]">Checklist</span>
        <span className="ml-auto rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">{done}/{checks.length}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[#EDF1F5]">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${(done / checks.length) * 100}%` }} />
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1">
            <span className={cn("grid size-3 shrink-0 place-items-center rounded-full", c.done ? "bg-emerald-100 text-emerald-700" : "border border-[#CBD5E1] text-transparent")}><Check className="size-2" /></span>
            <span className={cn("text-[10px] truncate", c.done ? "font-medium text-[#33445F]" : "text-[#94A3B8]")}>{c.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
