"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock,
  HandHeart,
  Lightbulb,
  MousePointer2,
  MousePointerClick,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { Field, Segmented, SelectInput, Slider, TextInput } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const OBJECTIVES = [
  { id: "awareness", title: "Awareness", caption: "Increase visibility and reach", icon: Target, tone: "red" },
  { id: "traffic", title: "Traffic", caption: "Drive website visitors", icon: MousePointer2, tone: "blue" },
  { id: "engagement", title: "Engagement", caption: "Maximize interactions", icon: HandHeart, tone: "blue" },
  { id: "leads", title: "Leads", caption: "Collect qualified leads", icon: Users, tone: "blue" },
  { id: "sales", title: "Sales", caption: "Drive conversions and revenue", icon: TrendingUp, tone: "green" },
  { id: "app_growth", title: "App Growth", caption: "Promote app installs", icon: Zap, tone: "purple" },
  { id: "retention", title: "Retention", caption: "Keep existing customers", icon: ShieldCheck, tone: "green" },
  { id: "reengagement", title: "Re-engagement", caption: "Win back lapsed users", icon: MousePointerClick, tone: "amber" },
] as const;

const CHANNEL_KEY: Record<string, string> = {
  "Meta & Instagram": "Meta",
  LinkedIn: "LinkedIn",
  YouTube: "YouTube",
  Google: "Google Business",
  WhatsApp: "WhatsApp",
  Website: "Website",
  Email: "Email",
  X: "X",
};

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
      <StepSection letter="A" title="Primary Objective" caption="Choose the primary goal for this campaign. This determines optimization strategy.">
        <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {OBJECTIVES.map(({ id, title, caption, icon: Icon, tone }) => {
            const active = draft.primaryObjective === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => set("primaryObjective", id)}
                className={cn(
                  "relative min-h-[100px] rounded-lg border bg-white p-2.5 text-left transition-colors",
                  active ? "border-[#EB0711] bg-[#FFF7F8] shadow-[0_0_0_1px_#EB0711]" : "border-[#DDE6F1] hover:border-[#F5B5BA]",
                )}
              >
                <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full border border-[#A9B6CA] bg-white">
                  {active && <i className="block size-2 rounded-full bg-[#EB0711]" />}
                </span>
                <span className={cn("grid size-8 place-items-center rounded-lg", `bg-${tone === "red" ? "[#FFEAEC] text-[#E11D28]" : tone === "green" ? "[#E4F8F0] text-[#0AA673]" : tone === "purple" ? "[#F2EAFF] text-[#7C3AED]" : tone === "amber" ? "[#FFF3DC] text-[#D97706]" : "[#E8F2FF] text-[#1975E7]"}`)}>
                  <Icon className="size-4" />
                </span>
                <b className="mt-1.5 block text-[12px] font-semibold leading-4 text-[#081438]">{title}</b>
                <small className="mt-0.5 block text-[10px] leading-[12px] text-[#405277]">{caption}</small>
              </button>
            );
          })}
        </div>
      </StepSection>

      <StepSection letter="B" title="Campaign KPIs" caption="Set specific performance targets for your campaign.">
        <div className="grid gap-2 md:grid-cols-4">
          <Field label="Target Reach" required>
            <TextInput value={draft.targetReach} onChange={(v) => set("targetReach", v)} icon={Users} placeholder="e.g. 120,000" spellCheck={false} />
          </Field>
          <Field label="Target Impressions" required>
            <TextInput value={draft.targetImpressions} onChange={(v) => set("targetImpressions", v)} icon={BarChart3} placeholder="e.g. 350,000" spellCheck={false} />
          </Field>
          <Field label="Target Clicks" required>
            <TextInput value={draft.targetClicks} onChange={(v) => set("targetClicks", v)} icon={MousePointerClick} placeholder="e.g. 6,000" spellCheck={false} />
          </Field>
          <Field label="Target Engagements" required>
            <TextInput value={draft.targetEngagements} onChange={(v) => set("targetEngagements", v)} icon={HandHeart} placeholder="e.g. 25,000" spellCheck={false} />
          </Field>
          <Field label="Target Leads" required>
            <TextInput value={draft.targetLeads} onChange={(v) => set("targetLeads", v)} icon={Users} placeholder="e.g. 500" spellCheck={false} />
          </Field>
          <Field label="Target Conversions" required>
            <TextInput value={draft.targetConversions} onChange={(v) => set("targetConversions", v)} icon={Target} placeholder="e.g. 150" spellCheck={false} />
          </Field>
          <Field label="Target Revenue (INR)" optional>
            <TextInput value={draft.targetRevenue} onChange={(v) => set("targetRevenue", v)} prefix="₹" placeholder="e.g. 5,00,000" spellCheck={false} />
          </Field>
          <Field label="Target ROAS" optional>
            <TextInput value={draft.targetRoas} onChange={(v) => set("targetRoas", v)} icon={TrendingUp} placeholder="e.g. 2.5" spellCheck={false} />
          </Field>
        </div>
      </StepSection>

      <StepSection letter="C" title="Budget & Schedule" caption="Set your campaign budget, duration and scheduling preferences.">
        <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Budget Type" required>
            <Segmented
              value={draft.budgetType}
              onChange={(v) => set("budgetType", v)}
              options={[
                { id: "Lifetime", label: "Lifetime" },
                { id: "Daily", label: "Daily" },
                { id: "Monthly", label: "Monthly" },
              ]}
            />
          </Field>
        </div>
        <div
          className={cn(
            "mt-3 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3",
            draft.budgetType === "Monthly" ? "lg:grid-cols-6" : "lg:grid-cols-5"
          )}
        >
          <Field label="Total Budget (INR)" required>
            <TextInput value={draft.totalBudget} onChange={(v) => set("totalBudget", v)} prefix="₹" spellCheck={false} />
          </Field>
          <Field label="Daily Budget (INR)" required>
            <TextInput value={draft.dailyBudget} onChange={(v) => set("dailyBudget", v)} prefix="₹" spellCheck={false} />
          </Field>
          {draft.budgetType === "Monthly" && (
            <Field label="Monthly Budget (INR)">
              <TextInput value={draft.monthlyBudget} onChange={(v) => set("monthlyBudget", v)} prefix="₹" spellCheck={false} />
            </Field>
          )}
          <Field label="Start Date" required>
            <TextInput icon={CalendarDays} value={draft.startDate} onChange={(v) => set("startDate", v)} spellCheck={false} />
          </Field>
          <Field label="End Date" required>
            <TextInput icon={CalendarDays} value={draft.endDate} onChange={(v) => set("endDate", v)} spellCheck={false} />
          </Field>
          <Field label="Duration">
            <TextInput icon={Clock} value={draft.campaignDuration} disabled spellCheck={false} />
          </Field>
        </div>
      </StepSection>

      <StepSection letter="D" title="Bid Strategy & Optimization" caption="Configure bidding and optimization for paid campaigns.">
        <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
          <Field label="Bid Strategy" required>
            <SelectInput
              icon={TrendingUp}
              value={draft.bidStrategy}
              onChange={(v) => set("bidStrategy", v)}
              options={["Lowest Cost", "Cost Cap", "Bid Cap", "Target ROAS", "Minimum ROAS"]}
            />
          </Field>
          <Field label="Optimization Event" required>
            <SelectInput
              icon={Target}
              value={draft.optimizationEvent}
              onChange={(v) => set("optimizationEvent", v)}
              options={["Link Clicks", "Impressions", "Conversions", "Landing Page Views", "Lead Form Opens"]}
            />
          </Field>
          <Field label="Cost Cap (INR)" optional>
            <TextInput value={draft.costCap} onChange={(v) => set("costCap", v)} prefix="₹" placeholder="Max cost per result" spellCheck={false} />
          </Field>
          <Field label="Target CPA (INR)" required>
            <TextInput value={draft.targetCpa} onChange={(v) => set("targetCpa", v)} prefix="₹" spellCheck={false} />
          </Field>
          <Field label="Target CPL (INR)" required>
            <TextInput value={draft.targetCpl} onChange={(v) => set("targetCpl", v)} prefix="₹" spellCheck={false} />
          </Field>
          <Field label="Frequency Cap" required hint="Max impressions per user">
            <TextInput value={draft.frequencyCap} onChange={(v) => set("frequencyCap", v)} placeholder="e.g. 3 per day" spellCheck={false} />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-[#E0E9F6] bg-[#F3F8FF] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#1975E7]">
              <Clock className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <b className="text-[12px] font-semibold text-[#1350BF]">Ad Scheduling / Dayparting</b>
                <button
                  type="button"
                  onClick={() => set("dayparting", !draft.dayparting)}
                  className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", draft.dayparting ? "bg-[#0AA673]" : "bg-[#CBD5E1]")}
                >
                  <span className={cn("absolute top-0.5 block size-4 rounded-full bg-white shadow-sm transition-all", draft.dayparting ? "left-[18px]" : "left-0.5")} />
                </button>
              </div>
              <small className="block text-[10px] leading-[13px] text-[#405277]">
                Schedule ads to run at specific times for maximum engagement.
              </small>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[#E0E9F6] bg-[#F3F8FF] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#1975E7]">
              <Lightbulb className="size-5" />
            </span>
            <div className="min-w-0">
              <b className="block text-[12px] font-semibold text-[#1350BF]">AI Budget Recommendation</b>
              <small className="block text-[10px] leading-[14px] text-[#405277]">
                Based on similar campaigns, we recommend allocating 50-60% to social platforms, 15-20% to search, and 10-15% to website/email channels.
              </small>
            </div>
          </div>
        </div>
      </StepSection>

      <StepSection
        letter="E"
        title="Budget Distribution by Channel"
        caption="Allocate campaign budget across channels. Total must equal 100%."
        action={
          <div className="hidden items-center gap-5 text-[11px] text-[#34415F] sm:flex">
            <span>Total Allocation: <b className="text-[#081438]">100%</b></span>
            <span><b className="text-[#081438]">₹ {draft.totalBudget}</b></span>
          </div>
        }
      >
        <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
          {draft.distribution.map(({ channel, percent }) => (
            <div key={channel} className="grid grid-cols-[140px_minmax(80px,1fr)_38px_82px] items-center gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <ChannelLogo channel={CHANNEL_KEY[channel] ?? channel} className="size-5 shrink-0" />
                <b className="truncate text-[12px] font-semibold text-[#132044]">{channel}</b>
              </span>
              <Slider percent={percent} />
              <b className="text-right text-[11px] text-[#132044]">{percent}%</b>
              <b className="text-right text-[11px] text-[#132044]">₹ {format(Math.round((total * percent) / 100))}</b>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-[#E0E9F6] bg-[#F3F8FF] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#2563EB]">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[12px] font-semibold text-[#1350BF]">Contingency Reserve</b>
              <small className="block text-[10px] leading-[13px] text-[#405277]">
                Keep a reserve for mid-campaign adjustments and opportunities.
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
            <span className="grid h-9 w-[108px] place-items-center rounded-lg bg-[#EAF0F8] text-[12px] font-semibold text-[#132044]">
              ₹ {format(reserve)}
            </span>
          </div>
        </div>
      </StepSection>

      <StepSection letter="F" title="KPI Targets & Estimated Impact" caption="Expected outcomes based on your budget and channel mix.">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Users, title: "Estimated Reach", value: "50K - 120K", label: "People across platforms", tone: "text-[#155EEF]" },
            { icon: MousePointerClick, title: "Estimated Clicks", value: "2K - 6K", label: "Total campaign clicks", tone: "text-[#7C3AED]" },
            { icon: Users, title: "Expected Leads", value: "~500", label: `At target CPL of ₹${draft.targetCpl}`, tone: "text-[#0AA673]" },
            { icon: BarChart3, title: "Estimated Impressions", value: "150K - 350K", label: "Total impressions", tone: "text-[#1975E7]" },
          ].map(({ icon: Icon, title, value, label, tone }) => (
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
          <b className="block text-[16px] font-semibold leading-5 text-[#101A3D]">{title}</b>
          <small className="block text-[11px] leading-4 text-[#526385]">{caption}</small>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
