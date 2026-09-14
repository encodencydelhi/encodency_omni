"use client";
import { useState } from "react";
import { Clock3, Calendar, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField } from "./ui-fields";
import { PlatformBadge } from "./ui-platform";
import type { Platform, PlatformSchedule, ScheduleOption } from "../types/content.types";
import { PLATFORM_META } from "../config/platform-config";

type Props = {
  platforms: Platform[];
  schedules: PlatformSchedule[];
  onChange: (schedules: PlatformSchedule[]) => void;
};

export function ScheduleBuilder({ platforms, schedules, onChange }: Props) {
  const [expanded, setExpanded] = useState<Platform | null>(null);
  const [bulkSchedule, setBulkSchedule] = useState<ScheduleOption>("now");

  const getSchedule = (p: Platform): PlatformSchedule => {
    return schedules.find(s => s.platform === p) ?? { platform: p, schedule: "now" };
  };

  const updateSchedule = (p: Platform, fields: Partial<PlatformSchedule>) => {
    const updated = schedules.map(s => s.platform === p ? { ...s, ...fields } : s);
    if (!schedules.find(s => s.platform === p)) {
      updated.push({ platform: p, schedule: fields.schedule ?? "now", date: fields.date, time: fields.time });
    }
    onChange(updated);
  };

  const applyBulk = () => {
    onChange(platforms.map(p => ({
      platform: p,
      schedule: bulkSchedule,
      date: bulkSchedule === "later" ? "Sep 14, 2026" : undefined,
      time: bulkSchedule === "later" ? "10:00 AM" : undefined,
    })));
  };

  return (
    <Card
      title="Schedule"
      subtitle="Per-platform scheduling"
      action={
        <div className="flex gap-0.5">
          {(["now", "later", "draft"] as const).map((val) => (
            <button
              key={val}
              onClick={() => { setBulkSchedule(val); if (val !== "later") applyBulk(); }}
              className={cn(
                "rounded-sm px-2 py-1 text-[10px] font-semibold transition",
                bulkSchedule === val ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#7A87A0] hover:bg-slate-50"
              )}
            >
              {val === "now" ? "Now" : val === "later" ? "Schedule" : "Draft"}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-1">
        {platforms.map((p) => {
          const meta = PLATFORM_META[p];
          const sched = getSchedule(p);
          const isExpanded = expanded === p;

          return (
            <div key={p} className="rounded-lg border border-[#E2E8F0] overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : p)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-slate-50"
              >
                {isExpanded ? <ChevronDown className="size-3 text-[#7A87A0]" /> : <ChevronRight className="size-3 text-[#7A87A0]" />}
                <PlatformBadge platform={p} size="sm" />
                <span className="flex-1 text-[11px] font-semibold text-[#33445F]">{meta.label}</span>
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-semibold",
                  sched.schedule === "now" ? "bg-emerald-50 text-emerald-600" :
                    sched.schedule === "later" ? "bg-blue-50 text-[#1769DF]" :
                      "bg-slate-100 text-slate-600"
                )}>
                  {sched.schedule === "now" ? "Publish Now" : sched.schedule === "later" ? `${sched.date ?? "TBD"} ${sched.time ?? ""}` : "Draft"}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-[#EDF1F5] bg-[#F8FAFD] p-2.5">
                  <div className="grid grid-cols-3 gap-1">
                    {([["now", "Publish Now", Zap], ["later", "Schedule", Calendar], ["draft", "Save Draft", Clock3]] as const).map(([val, label, Icon]) => (
                      <button
                        key={val}
                        onClick={() => updateSchedule(p, {
                          schedule: val as ScheduleOption,
                          date: val === "later" ? sched.date ?? "Sep 14, 2026" : undefined,
                          time: val === "later" ? sched.time ?? "10:00 AM" : undefined,
                        })}
                        className={cn(
                          "flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[10.5px] font-semibold transition",
                          sched.schedule === val
                            ? "border-[color:var(--pc)] bg-[color:var(--pc-bg)] text-[color:var(--pc)]"
                            : "border-[#E2E8F0] text-[#687797] hover:bg-white"
                        )}
                        style={{ "--pc": meta.color, "--pc-bg": meta.bg } as React.CSSProperties}
                      >
                        <Icon className="size-3" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {sched.schedule === "later" && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <SelectField
                        label="Date"
                        value={sched.date ?? "Sep 14, 2026"}
                        options={["Sep 13, 2026", "Sep 14, 2026", "Sep 15, 2026", "Sep 16, 2026", "Sep 17, 2026"]}
                        onChange={(v) => updateSchedule(p, { date: v })}
                      />
                      <SelectField
                        label="Time"
                        value={sched.time ?? "10:00 AM"}
                        options={["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"]}
                        onChange={(v) => updateSchedule(p, { time: v })}
                      />
                    </div>
                  )}

                  {sched.schedule === "now" && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-100">
                      <Zap className="mt-px size-3 shrink-0 text-emerald-600" />
                      <p className="text-[10px] leading-4 text-emerald-800">Will publish immediately after approval</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Best time suggestion */}
      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 ring-1 ring-amber-100">
        <Clock3 className="mt-px size-3 shrink-0 text-amber-600" />
        <p className="text-[10.5px] leading-4 text-amber-900"><b>Best time:</b> Today 11 AM – 1 PM (based on audience analytics)</p>
      </div>
    </Card>
  );
}
