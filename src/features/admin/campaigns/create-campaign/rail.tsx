"use client";

import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  Circle,
  CircleCheck,
  ExternalLink,
  Filter,
  Flag,
  Globe2,
  IndianRupee,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import type { CampaignDraft } from "./draft";
import { STEP_DONE, STEP_RAIL } from "./draft";
import mokshaLogo from "@/assets/moksha-sewa-logo.png";
import { RailCard } from "./ui";

export function CampaignRail({ draft, step }: { draft: CampaignDraft; step: number }) {
  const rail = STEP_RAIL[step] ?? STEP_RAIL[1]!;
  const done = STEP_DONE[step] ?? 1;
  const total = rail.checklist.length;

  return (
    <aside className="space-y-2.5">
      <SummaryCard draft={draft} step={step} />

      <RailCard>
        <div className="mb-2 flex items-start gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FFF6E5]">
            <Lightbulb className="size-3.5 text-[#E0930B]" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[12px] font-bold text-[#111827]">
              {step >= 3 ? "Quick Launch Tips" : "Quick Tips"}
            </b>
            <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{rail.tipsCaption}</small>
          </div>
          <button className="flex shrink-0 items-center gap-0.5 text-[9.5px] font-semibold text-[#E11D28]">
            View all
            <ExternalLink className="size-2.5" />
          </button>
        </div>
        <ul className="space-y-1.5">
          {rail.tips.map(({ label, done: tipDone }) => (
            <li key={label} className="flex items-start gap-1.5 text-[10px] leading-[14px] text-[#374151]">
              {tipDone ? (
                <CircleCheck className="mt-px size-3.5 shrink-0 text-[#0AA673]" />
              ) : (
                <Circle className="mt-px size-3.5 shrink-0 text-[#CBD5E1]" />
              )}
              {label}
            </li>
          ))}
        </ul>
      </RailCard>

      <RailCard>
        <div className="mb-2 flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FFEAEC]">
            <CircleCheck className="size-3.5 text-[#E11D28]" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[12px] font-bold text-[#111827]">Readiness Checklist</b>
            {step === 3 && (
              <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">
                Complete all steps to launch your campaign.
              </small>
            )}
          </div>
          <span className="relative size-9 shrink-0">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EDF1F7" strokeWidth="3.4" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#0AA673"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeDasharray={`${(done / total) * 100}, 100`}
              />
            </svg>
            {/* One figure only — the ring previously showed the count and the
                ratio sat beside it, which read as a duplicate. */}
            <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-[#27334E]">
              {done}/{total}
            </span>
          </span>
        </div>
        <ul className="space-y-1.5">
          {rail.checklist.map((label, index) => (
            <li key={label} className="flex items-center gap-1.5 text-[10px] text-[#374151]">
              {index < done ? (
                <CircleCheck className="size-3.5 shrink-0 text-[#0AA673]" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-[#CBD5E1]" />
              )}
              {label}
            </li>
          ))}
        </ul>
      </RailCard>

      <RailCard>
        <div className="mb-2.5 flex items-start gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#E8F2FF]">
            <BarChart3 className="size-3.5 text-[#1975E7]" />
          </span>
          <div>
            <b className="block text-[12px] font-bold text-[#111827]">Performance Estimate</b>
            <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">
              {step === 1
                ? "Based on similar campaigns in your workspace."
                : step === 2
                  ? "Based on your current goals and budget."
                  : step === 3
                    ? "Based on your current channel and placement selection."
                    : step === 4
                      ? "Based on your campaign and audience settings."
                      : step === 5
                        ? "Based on your content, channels and schedule."
                        : "Based on your campaign settings."}
            </small>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            { icon: Users, value: step === 4 ? "12.5M - 18.3M" : "50K - 120K", label: step === 4 ? "Estimated Reach" : "Estimated Reach" },
            { icon: MousePointerClick, value: step === 4 ? "250K - 520K" : "2K - 6K", label: "Estimated Clicks" },
            { icon: step === 2 ? Filter : BarChart3, value: step === 4 ? "15K - 42K" : step === 3 ? "500 - 1,500" : "500", label: "Estimated Leads" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="min-w-0">
              <Icon className="mx-auto size-4 text-[#155EEF]" />
              <b className="mt-1 block truncate text-[13px] font-black text-[#081438]">{value}</b>
              <small className="block text-[9px] leading-[11px] text-[#697794]">{label}</small>
            </div>
          ))}
        </div>
      </RailCard>
    </aside>
  );
}

function SummaryCard({ draft, step }: { draft: CampaignDraft; step: number }) {
  /* Budget, duration and channels are only committed on later steps, so the
     summary reports them as unset until the user has been there. */
  const rows = [
    { icon: Target, label: "Objective", value: draft.type, muted: false },
    { icon: Target, label: "Project", value: draft.client, muted: false },
    {
      icon: IndianRupee,
      label: "Budget",
      value: step > 1 ? `₹${draft.totalBudget} (₹${draft.dailyBudget}/day)` : "Not set",
      muted: step === 1,
    },
    {
      icon: CalendarDays,
      label: "Duration",
      value: step > 1 ? `${draft.startDate} - ${draft.endDate}` : "Not set",
      muted: step === 1,
    },
    {
      icon: Globe2,
      label: "Channels",
      value: step > 2 ? `${draft.channels.length} selected` : "Not set",
      muted: step <= 2,
    },
    { icon: UserRound, label: "Owner", value: draft.owner, muted: false },
  ];
  return (
    <RailCard>
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-[13px] font-bold text-[#111827]">Campaign Summary</b>
        <button className="text-[10px] font-semibold text-[#1975E7]">Edit</button>
      </div>
      <div className="flex gap-2.5">
        <span className="relative h-[118px] w-[82px] shrink-0 overflow-hidden rounded-lg">
          {/* Top-left of the square creative, where the "Save Rivers, Save
              Lives 2025 / CLEAN RIVERS, BRIGHTER TOMORROW" lockup sits. */}
          <Image
            src="/campaigns/save-rivers/square.png"
            alt=""
            fill
            sizes="110px"
            className="object-cover object-left-top"
          />
          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-white/95 px-1 py-0.5">
            <span className="relative size-2.5 overflow-hidden">
              <Image
                src={mokshaLogo}
                alt=""
                width={36}
                height={37}
                className="absolute left-1/2 top-[-1px] h-[14px] w-auto max-w-none -translate-x-1/2 object-contain"
              />
            </span>
            <small className="text-[7px] font-bold text-[#27334E]">Moksha Sewa</small>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] font-bold leading-4 text-[#111827]">{draft.name}</b>
          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#FFF0F1] px-1.5 py-0.5 text-[10px] font-semibold text-[#E11D28]">
            <Megaphone className="size-2.5" />
            {draft.type}
          </span>
          <dl className="mt-1.5 space-y-[3px]">
            {rows.map(({ icon: Icon, label, value, muted }) => (
              <div key={label} className="grid grid-cols-[14px_48px_1fr] items-center gap-1 text-[10px]">
                <Icon className="size-3 text-[#526385]" />
                <dt className="text-[#8791A4]">{label}</dt>
                <dd
                  className={
                    muted
                      ? "min-w-0 truncate font-medium text-[#9CA3AF]"
                      : "min-w-0 truncate font-semibold text-[#27334E]"
                  }
                >
                  {value}
                </dd>
              </div>
            ))}
            <div className="grid grid-cols-[14px_48px_1fr] items-center gap-1 text-[10px]">
              <Flag className="size-3 text-[#526385]" />
              <dt className="text-[#8791A4]">Priority</dt>
              <dd>
                <i className="flex w-fit items-center gap-0.5 rounded bg-[#FFEAEC] px-1 py-0.5 text-[8.5px] font-bold not-italic text-[#E11D28]">
                  <Flag className="size-2" />
                  {draft.priority}
                </i>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </RailCard>
  );
}
