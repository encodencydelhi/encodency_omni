"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  FileText,
  Flag,
  Image as ImageIcon,
  Key,
  MapPin,
  Megaphone,
  PlayCircle,
  Rocket,
  Share2,
  Target,
  TriangleAlert,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { Checkbox } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

function Card({
  icon: Icon,
  title,
  onEdit,
  children,
  className,
}: {
  icon: typeof Flag;
  title: string;
  onEdit?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-sm border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_3px_rgb(15_23_42/0.04)]", className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#FFEAEC]">
          <Icon className="size-3.5 text-[#E11D28]" />
        </span>
        <b className="flex-1 text-[12.5px] font-semibold text-[#101A3D]">{title}</b>
        {onEdit && (
          <button onClick={onEdit} className="text-[10px] font-semibold text-[#1975E7]">Edit</button>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon?: typeof Flag; label: string; value: ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <small className="flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        {label}
      </small>
      <div className="text-[12.5px] font-semibold leading-[17px] text-[#111827]">{value}</div>
    </div>
  );
}

const RISKS = [
  { tone: "warn", text: "Creative missing for LinkedIn. Upload a 1:1 or 16:9 creative." },
  { tone: "ok", text: "All selected channels are active and connected." },
  { tone: "ok", text: "Audience size looks good for your objectives." },
  { tone: "ok", text: "Budget is well-distributed across channels." },
  { tone: "ok", text: "No critical issues found." },
] as const;

const READINESS = [
  "Campaign details reviewed",
  "Goals confirmed",
  "Budget confirmed",
  "Accounts connected",
  "Audience configured",
  "Creatives approved",
  "Tracking configured",
  "UTM configured",
  "Schedule configured",
  "Automation configured",
  "No critical issues",
];

const PREVIEW_PLATFORMS = [
  { id: "instagram", label: "Instagram", channel: "Instagram" },
  { id: "facebook", label: "Facebook", channel: "Facebook" },
  { id: "linkedin", label: "LinkedIn", channel: "LinkedIn" },
  { id: "youtube", label: "YouTube", channel: "YouTube" },
  { id: "whatsapp", label: "WhatsApp", channel: "WhatsApp" },
  { id: "website", label: "Website", channel: "Website" },
];

export function StepReview({
  draft,
  set,
  goTo,
}: {
  draft: CampaignDraft;
  set: Setter;
  goTo: (step: number) => void;
}) {
  const readinessCount = READINESS.length;

  return (
    <div className="space-y-2.5">
      <div className="rounded-sm border border-[#DDE6F1] bg-white p-3.5 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#FFE6EA]">
            <Rocket className="size-4 text-[#EB0711]" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-semibold leading-5 text-[#111827]">Review &amp; Launch</b>
            <small className="block text-[10.5px] text-[#8791A4]">
              Review your campaign details, confirm settings and launch when ready.
            </small>
          </div>
        </div>

        <div className="grid gap-2.5 xl:grid-cols-4">
          <Card icon={FileText} title="Basic Details" onEdit={() => goTo(1)}>
            <Row icon={Megaphone} label="Campaign Name" value={draft.name} />
            <Row icon={Target} label="Mode" value={draft.campaignMode} />
            <Row icon={Target} label="Objective" value={draft.objective} />
            <Row icon={UserRound} label="Project / Client" value={draft.client} />
            <Row icon={UserRound} label="Campaign Owner" value={draft.owner} />
            <Row icon={Flag} label="Priority" value={<span className="text-[#E11D28]">{draft.priority}</span>} />
          </Card>

          <Card icon={Target} title="Goals & Budget" onEdit={() => goTo(2)}>
            <Row icon={Target} label="Primary Goal" value={draft.primaryObjective} />
            <div className="grid grid-cols-2 gap-2 border-t border-[#EEF1F5] pt-2">
              <Row label="Total Budget" value={`₹ ${draft.totalBudget}`} />
              <Row label="Daily Budget" value={`₹ ${draft.dailyBudget}`} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[#EEF1F5] pt-2">
              <Row label="Target Leads" value={draft.targetLeads} />
              <Row label="Target CPL" value={`₹ ${draft.targetCpl}`} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[#EEF1F5] pt-2">
              <Row label="Duration" value={draft.campaignDuration} />
              <Row label="Bid Strategy" value={draft.bidStrategy} />
            </div>
          </Card>

          <Card icon={Share2} title="Channels & Accounts" onEdit={() => goTo(3)}>
            <ul className="space-y-1.5">
              {draft.channels.slice(0, 6).map((channel) => (
                <li key={channel} className="flex items-center gap-2">
                  <ChannelLogo channel={channel} className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-[#374151]">{channel}</span>
                  <i className="shrink-0 rounded-sm bg-[#DDF8EA] px-2 py-1 text-[9.5px] font-semibold not-italic text-[#078359]">Ready</i>
                </li>
              ))}
              {draft.channels.length > 6 && (
                <li className="text-[10px] text-[#8791A4]">+{draft.channels.length - 6} more channels</li>
              )}
            </ul>
          </Card>

          <Card icon={Users} title="Audience Targeting" onEdit={() => goTo(4)}>
            <Row icon={Users} label="Audience Type" value={draft.audienceType} />
            <Row icon={MapPin} label="Location" value={draft.regions.join(", ")} />
            <Row icon={UserRound} label="Age Range" value={`${draft.ageMin} - ${draft.ageMax} years`} />
            <Row icon={Target} label="Interests" value={draft.interests.slice(0, 3).join(", ")} />
            <Row icon={Users} label="Segments" value={draft.segments.slice(0, 3).join(", ")} />
          </Card>
        </div>

        <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[.85fr_1.45fr_.85fr]">
          <Card icon={ImageIcon} title="Content & Schedule" onEdit={() => goTo(5)}>
            <Row icon={ImageIcon} label="Assets" value={`${draft.mediaAssets.length} creatives`} />
            <Row icon={Key} label="Headline" value={draft.headline} />
            <Row icon={CalendarDays} label="Schedule" value={`${draft.startDate} - ${draft.endDate}`} />
            <Row icon={FileText} label="Hashtags" value={`${draft.hashtags.length} hashtags`} />
          </Card>

          <div className="rounded-sm border border-[#E6E8F0] bg-white p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-[#E8F2FF]">
                <ImageIcon className="size-3.5 text-[#1975E7]" />
              </span>
              <b className="flex-1 text-[11.5px] font-semibold text-[#111827]">Campaign Preview</b>
              <button className="text-[10px] font-semibold text-[#1975E7]">View All Creatives</button>
            </div>
            <span className="relative block h-[150px] overflow-hidden rounded-sm">
              <Image src="/campaigns/save-rivers/banner.png" alt="Campaign creative" fill sizes="520px" className="object-cover" />
            </span>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[
                { src: "/campaigns/save-rivers/square.png", ratio: "4:5", label: "Instagram" },
                { src: "/campaigns/save-rivers/wide-2.png", ratio: "9:16", label: "Reel" },
                { src: "/campaigns/save-rivers/wide.png", ratio: "1.91:1", label: "Facebook" },
                { src: "/campaigns/save-rivers/standard.png", ratio: "1:1", label: "LinkedIn" },
                { src: "/campaigns/save-rivers/banner.png", ratio: "16:9", label: "Website" },
              ].map(({ src, ratio, label }) => (
                <div key={label} className="min-w-0 rounded-sm border border-[#DDE6F1] bg-white p-1 text-center">
                  <span className="relative block h-12 overflow-hidden rounded-sm">
                    <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                    {ratio === "9:16" && <PlayCircle className="absolute inset-0 m-auto size-5 rounded-sm bg-black/45 text-white" />}
                  </span>
                  <b className="mt-1 block text-[9px] leading-3 text-[#155EEF]">{ratio}</b>
                  <small className="block truncate text-[8px] text-[#526385]">{label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Card icon={TriangleAlert} title="Risks & Warnings">
              <ul className="space-y-2">
                {RISKS.map(({ tone, text }) => (
                  <li key={text} className="flex items-start gap-1.5 text-[10px] leading-[14px] text-[#374151]">
                    {tone === "warn" ? (
                      <CircleAlert className="mt-px size-3.5 shrink-0 text-[#F59E0B]" />
                    ) : (
                      <CircleCheck className="mt-px size-3.5 shrink-0 text-[#0AA673]" />
                    )}
                    {text}
                  </li>
                ))}
              </ul>
            </Card>

            <Card icon={Zap} title="Automation & Experiments" onEdit={() => goTo(7)}>
              <Row icon={Zap} label="Automation Rules" value={`${draft.automationRules.length} rules configured`} />
              <Row icon={Zap} label="A/B Tests" value={`${draft.abTests.length} experiments`} />
              {draft.automationRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-1.5 text-[9.5px] text-[#374151]">
                  <i className={cn("size-1.5 rounded-sm", rule.enabled ? "bg-[#0AA673]" : "bg-[#CBD5E1]")} />
                  {rule.name}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-[#E6E8F0] bg-white p-3 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-[#E8F2FF]">
            <ImageIcon className="size-3.5 text-[#1975E7]" />
          </span>
          <b className="flex-1 text-[11.5px] font-semibold text-[#111827]">Platform Previews</b>
        </div>
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {PREVIEW_PLATFORMS.map((platform) => (
            <div key={platform.id} className="min-w-[200px] shrink-0 rounded-sm border border-[#E7EDF5] bg-[#F8FAFC] p-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <ChannelLogo channel={platform.channel} className="size-4" />
                <span className="text-[10px] font-semibold text-[#374151]">{platform.label}</span>
              </div>
              <span className="relative block aspect-square overflow-hidden rounded-sm">
                <Image src="/campaigns/save-rivers/square.png" alt="" fill sizes="200px" className="object-cover" />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[1.25fr_.9fr_.9fr]">
        <div className="rounded-sm border border-[#CDECE1] bg-[#F7FDFA] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-[#0AA673]">
              <Check className="size-4 text-white" />
            </span>
            <div>
              <b className="block text-[11.5px] font-semibold text-[#111827]">Readiness Checklist</b>
              <small className="block text-[9.5px] text-[#8791A4]">All items must be complete before launch.</small>
            </div>
            <span className="relative size-9 shrink-0 ml-auto">
              <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EDF1F7" strokeWidth="3.4" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0AA673" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${(readinessCount / readinessCount) * 100}, 100`} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[9px] font-semibold text-[#27334E]">{readinessCount}/{readinessCount}</span>
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {READINESS.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-[10px] text-[#374151]">
                <CircleCheck className="size-3.5 shrink-0 text-[#0AA673]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card icon={CalendarDays} title="Launch Settings">
          {[
            { id: "now", title: "Publish Now", caption: "Launch immediately after approval." },
            { id: "later", title: "Schedule for Later", caption: "Set a specific date and time to launch." },
          ].map(({ id, title, caption }) => (
            <button
              key={id}
              onClick={() => set("launchMode", id)}
              className="mb-1.5 flex w-full items-start gap-2 text-left last:mb-0"
            >
              <span className={cn("mt-px grid size-3.5 shrink-0 place-items-center rounded-sm border-[1.5px]", draft.launchMode === id ? "border-[#E11D28]" : "border-[#CBD5E1]")}>
                {draft.launchMode === id && <i className="block size-1.5 rounded-sm bg-[#E11D28]" />}
              </span>
              <span className="min-w-0">
                <b className="block text-[10.5px] font-semibold text-[#111827]">{title}</b>
                <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{caption}</small>
              </span>
            </button>
          ))}
        </Card>

        <Card icon={Bell} title="Notifications">
          <small className="mb-1.5 block text-[9.5px] text-[#8791A4]">Notify team members about launch.</small>
          <div className="space-y-1.5">
            {[
              { key: "notifyOwner" as const, label: `${draft.owner} (Campaign Owner)` },
              { key: "notifyClientTeam" as const, label: `${draft.client} Team` },
              { key: "notifyMarketing" as const, label: "Marketing Team" },
              { key: "notifyEmail" as const, label: "Send launch confirmation email" },
            ].map(({ key, label }) => (
              <Checkbox key={key} checked={draft[key]} onToggle={() => set(key, !draft[key])} label={label} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
