"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  HandHeart,
  Lightbulb,
  MousePointer2,
  MousePointerClick,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { Field, TextInput, tint } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const OBJECTIVES = [
  {
    id: "awareness",
    title: "Awareness",
    caption: "Increase visibility and create awareness about river conservation",
    icon: Target,
    tone: "red",
  },
  { id: "traffic", title: "Website Traffic", caption: "Drive more visitors to your website", icon: MousePointer2, tone: "blue" },
  { id: "leads", title: "Lead Generation", caption: "Collect leads from interested individuals", icon: Users, tone: "blue" },
  { id: "donations", title: "Donations", caption: "Encourage donations for river conservation initiatives", icon: HandHeart, tone: "blue" },
  { id: "events", title: "Event Promotion", caption: "Promote clean-up drives, awareness events and community activities", icon: CalendarDays, tone: "blue" },
  { id: "community", title: "Community Engagement", caption: "Build and grow an active community of supporters", icon: Users, tone: "blue" },
] as const;

const CHANNEL_KEY: Record<string, string> = {
  "Meta & Instagram": "Meta",
  LinkedIn: "LinkedIn",
  "Google Business": "Google Business",
  Website: "Website",
  WhatsApp: "WhatsApp",
  YouTube: "YouTube",
};

const CHANNEL_COLORS: Record<string, string> = {
  "Meta & Instagram": "#2563EB",
  LinkedIn: "#0A66C2",
  "Google Business": "#7C3AED",
  Website: "#0AA673",
  WhatsApp: "#22B573",
  YouTube: "#FF001E",
};

const IMPACT = [
  { icon: Users, value: "50K - 120K", label: "People across platforms", title: "Estimated Reach", tone: "text-[#155EEF]" },
  { icon: MousePointerClick, value: "2K - 6K", label: "Total campaign clicks", title: "Estimated Clicks", tone: "text-[#7C3AED]" },
  { icon: Users, value: "~ 500", label: "At target CPL of Rs 100", title: "Expected Leads", tone: "text-[#7C3AED]" },
  { icon: BarChart3, value: "150K - 350K", label: "Total impressions", title: "Estimated Impressions", tone: "text-[#1975E7]" },
];

function toNumber(value: string) {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

function format(value: number) {
  return value.toLocaleString("en-IN");
}

export function StepGoals({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  const total = toNumber(draft.totalBudget);
  const reserve = toNumber(draft.contingency);

  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE6F1] bg-white shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <StepSection letter="A" title="Campaign Objective" caption="Choose the primary goal for this campaign. You can select one main objective and we'll optimize the setup for it.">
        <div className="grid gap-2 lg:grid-cols-3 2xl:grid-cols-6">
          {OBJECTIVES.map(({ id, title, caption, icon: Icon, tone }) => {
            const active = draft.objective === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => set("objective", id)}
                className={cn(
                  "relative min-h-[128px] rounded-lg border bg-white p-3 text-left transition-colors",
                  active ? "border-[#EB0711] bg-[#FFF7F8] shadow-[0_0_0_1px_#EB0711]" : "border-[#DDE6F1] hover:border-[#F5B5BA]",
                )}
              >
                <span className="absolute right-3 top-3 grid size-4 place-items-center rounded-full border border-[#A9B6CA] bg-white">
                  {active && <i className="block size-2 rounded-full bg-[#EB0711]" />}
                </span>
                <span className={cn("grid size-8 place-items-center rounded-lg", tint[tone])}>
                  <Icon className="size-5" />
                </span>
                <b className="mt-2 block text-[12.5px] font-bold leading-4 text-[#081438]">{title}</b>
                <small className="mt-1 block text-[10.5px] leading-[14px] text-[#405277]">{caption}</small>
              </button>
            );
          })}
        </div>
      </StepSection>

      <StepSection letter="B" title="Budget & Schedule" caption="Set your campaign budget, schedule and key targets. We'll help you optimize the allocation across channels.">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Field label="Total Budget (INR)" required>
            <TextInput value={draft.totalBudget} onChange={(v) => set("totalBudget", v)} prefix="₹" />
          </Field>
          <Field label="Daily Budget (INR)" required>
            <TextInput value={draft.dailyBudget} onChange={(v) => set("dailyBudget", v)} prefix="₹" />
          </Field>
          <Field label="Expected Leads" required>
            <TextInput value={draft.expectedLeads} onChange={(v) => set("expectedLeads", v)} icon={Users} />
          </Field>
          <Field label="Target CPL (INR)" required>
            <TextInput value={draft.targetCpl} onChange={(v) => set("targetCpl", v)} prefix="₹" />
          </Field>
          <Field label="Start Date" required>
            <TextInput icon={CalendarDays} value={draft.startDate} onChange={(v) => set("startDate", v)} />
          </Field>
          <Field label="End Date" required>
            <TextInput icon={CalendarDays} value={draft.endDate} onChange={(v) => set("endDate", v)} />
          </Field>
          <Field label="Campaign Duration">
            <TextInput icon={CalendarDays} value="46 days" disabled />
          </Field>
        </div>
      </StepSection>

      <StepSection
        letter="C"
        title="Budget Distribution by Channel"
        caption="Allocate campaign budget, different channels based on your campaign goals. Total must equal 100%."
        action={
          <div className="hidden items-center gap-5 text-[11px] text-[#34415F] sm:flex">
            <span>Total Allocation: <b className="text-[#081438]">100%</b></span>
            <span><b className="text-[#081438]">₹ {draft.totalBudget}</b></span>
          </div>
        }
      >
        <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
          {draft.distribution.map(({ channel, percent }) => (
            <div key={channel} className="grid grid-cols-[150px_minmax(80px,1fr)_38px_82px] items-center gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <ChannelLogo channel={CHANNEL_KEY[channel] ?? channel} className="size-6 shrink-0" />
                <b className="truncate text-[11.5px] text-[#132044]">{channel}</b>
              </span>
              <span className="relative h-2 rounded-full bg-[#E7EDF5]">
                <i
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: CHANNEL_COLORS[channel] ?? "#EB0711" }}
                />
              </span>
              <b className="text-right text-[11.5px] text-[#132044]">{percent}%</b>
              <b className="text-right text-[11.5px] text-[#132044]">₹ {format(Math.round((total * percent) / 100))}</b>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-[#E0E9F6] bg-[#F3F8FF] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#2563EB]">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[12px] font-bold text-[#1350BF]">Contingency Reserve</b>
              <small className="block text-[10px] leading-[13px] text-[#405277]">
                Keep a reserve for mid-campaign adjustments, opportunities or unexpected costs.
              </small>
            </div>
            <span className="flex h-9 w-[84px] items-center overflow-hidden rounded-lg border border-[#D7E2F1] bg-white text-[12px] font-semibold">
              <input
                value={reserve ? Math.round((reserve / total) * 100) : 10}
                onChange={(event) => set("contingency", format(Math.round((total * Number(event.target.value || 0)) / 100)))}
                className="min-w-0 flex-1 bg-transparent px-3 text-center outline-none"
              />
              <i className="pr-3 not-italic text-[#34415F]">%</i>
            </span>
            <span className="grid h-9 w-[108px] place-items-center rounded-lg bg-[#EAF0F8] text-[12px] font-bold text-[#132044]">
              ₹ {format(reserve)}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[#E0E9F6] bg-[#F3F8FF] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#1975E7]">
              <Lightbulb className="size-5" />
            </span>
            <div className="min-w-0">
              <b className="block text-[12px] font-bold text-[#1350BF]">Budget Recommendation</b>
              <small className="block text-[10px] leading-[14px] text-[#405277]">
                Based on similar awareness campaigns, we recommend allocating 50-60% to social platforms and 10-20% for search and website channels.
              </small>
            </div>
          </div>
        </div>
      </StepSection>

      <StepSection letter="D" title="KPI Targets & Estimated Impact" caption="Based on your budget and channel mix, here are the expected outcomes for this campaign.">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {IMPACT.map(({ icon: Icon, title, value, label, tone }) => (
            <div key={title} className="flex min-h-[64px] items-center gap-3 rounded-lg border border-[#DDE6F1] bg-white px-3 py-2">
              <Icon className={cn("size-6 shrink-0", tone)} />
              <div className="min-w-0">
                <small className="block text-[10px] font-semibold text-[#405277]">{title}</small>
                <b className="block text-[16px] font-black leading-5 text-[#081438]">{value}</b>
                <small className="block truncate text-[10px] text-[#6B7894]">{label}</small>
              </div>
            </div>
          ))}
        </div>
      </StepSection>
    </div>
  );
}

function StepSection({
  letter,
  title,
  caption,
  action,
  children,
}: {
  letter: string;
  title: string;
  caption: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#E7EDF5] p-3.5 last:border-b-0">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFE6EA] text-[16px] font-black text-[#EB0711]">
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[16px] font-bold leading-5 text-[#101A3D]">{title}</b>
          <small className="block text-[11px] leading-4 text-[#526385]">{caption}</small>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
