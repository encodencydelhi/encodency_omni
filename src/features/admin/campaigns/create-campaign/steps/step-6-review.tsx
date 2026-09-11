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
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { Checkbox, GreenToggle, Section } from "../ui";
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
    <div className={cn("rounded-xl border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_3px_rgb(15_23_42/0.04)]", className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFEAEC]">
          <Icon className="size-3.5 text-[#E11D28]" />
        </span>
        <b className="flex-1 text-[12.5px] font-bold text-[#101A3D]">{title}</b>
        {onEdit && (
          <button onClick={onEdit} className="text-[10px] font-semibold text-[#1975E7]">
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon?: typeof Flag; label: string; value: ReactNode }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <small className="flex items-center gap-1 text-[9.5px] text-[#8791A4]">
        {Icon && <Icon className="size-3 shrink-0" />}
        {label}
      </small>
      <div className="text-[11.5px] font-semibold leading-[15px] text-[#27334E]">{value}</div>
    </div>
  );
}

const RISKS = [
  { tone: "warn", text: "Budget is relatively low for broad reach. Consider increasing for better results." },
  { tone: "ok", text: "All selected channels are active and connected." },
  { tone: "ok", text: "Audience size looks good for your objectives." },
  { tone: "ok", text: "No critical issues found." },
] as const;

export function StepReview({
  draft,
  set,
  goTo,
}: {
  draft: CampaignDraft;
  set: Setter;
  goTo: (step: number) => void;
}) {
  return (
    <Section
      icon={Rocket}
      title="Review & Launch"
      caption="Review your campaign details, confirm settings and launch when you're ready."
    >
      <div className="grid gap-2.5 xl:grid-cols-4">
        <Card icon={FileText} title="Basic Details" onEdit={() => goTo(1)}>
          <Row icon={Megaphone} label="Campaign Name" value={draft.name} />
          <Row icon={Target} label="Campaign Type" value={draft.type} />
          <Row icon={UserRound} label="Project / Client" value={draft.client} />
          <Row icon={UserRound} label="Campaign Owner" value={draft.owner} />
          <Row
            icon={Flag}
            label="Priority"
            value={
              <span className="flex items-center gap-1 text-[#E11D28]">
                <Flag className="size-3" />
                {draft.priority}
              </span>
            }
          />
        </Card>

        <Card icon={Target} title="Goals & Budget" onEdit={() => goTo(2)}>
          <Row icon={Target} label="Primary Goal" value="Increase brand awareness and reach more people" />
          <div className="grid grid-cols-2 gap-2 border-t border-[#EEF1F5] pt-2">
            <Row label="Total Budget (INR)" value={`₹ ${draft.totalBudget}`} />
            <Row label="Daily Budget (INR)" value={`₹ ${draft.dailyBudget}`} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-[#EEF1F5] pt-2">
            <Row label="Expected Leads" value={draft.expectedLeads} />
            <Row label="Target CPL (INR)" value={`₹ ${draft.targetCpl}`} />
          </div>
        </Card>

        <Card icon={Share2} title="Selected Channels & Placements" onEdit={() => goTo(3)}>
          <ul className="space-y-1.5">
            {[
              ["Instagram Feed (4:5)", "Instagram"],
              ["Instagram Reel (9:16)", "Instagram"],
              ["Facebook Feed (1.91:1)", "Facebook"],
              ["LinkedIn Post (1:1)", "LinkedIn"],
              ["Google Business (Landscape)", "Google Business"],
              ["Website Banner (16:9)", "Website"],
            ].map(([name, channel]) => {
              return (
                <li key={name} className="flex items-center gap-2">
                  <ChannelLogo channel={channel} className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-[#374151]">{name}</span>
                  <i className="shrink-0 rounded-full bg-[#DDF8EA] px-2 py-1 text-[9.5px] font-semibold not-italic text-[#078359]">
                    Ready
                  </i>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card icon={Users} title="Audience Targeting" onEdit={() => goTo(4)}>
          <Row icon={Users} label="Target Audience" value="Environment enthusiasts, Students, Urban families" />
          <Row icon={MapPin} label="Location" value="India (All major cities)" />
          <Row icon={UserRound} label="Age Range" value="18 - 45 years" />
          <Row icon={Target} label="Interests" value="Environment, Sustainability, Clean Water, Social Cause" />
          <Row icon={Users} label="Audience Size (Estimated)" value="50,000 - 120,000 people" />
        </Card>
      </div>

      <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[.85fr_1.45fr_.85fr]">
        <Card icon={PlayCircle} title="Content & Schedule" onEdit={() => goTo(5)}>
          <Row icon={ImageIcon} label="Content Assets" value="4 creatives (images/videos)" />
          <Row icon={Key} label="Key Message" value="Clean Rivers. Brighter Tomorrow." />
          <Row icon={CalendarDays} label="Schedule" value={`${draft.startDate} - ${draft.endDate} (46 days)`} />
          <Row
            icon={FileText}
            label="Content Themes"
            value="River conservation, community action, real stories, call to action"
          />
        </Card>

        <div className="rounded-xl border border-[#E6E8F0] bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#E8F2FF]">
              <ImageIcon className="size-3.5 text-[#1975E7]" />
            </span>
            <b className="flex-1 text-[11.5px] font-bold text-[#111827]">Campaign Preview</b>
            <button className="text-[10px] font-semibold text-[#1975E7]">View All Creatives</button>
          </div>
          <span className="relative block h-[150px] overflow-hidden rounded-lg">
            <Image
              src="/campaigns/save-rivers/banner.png"
              alt="Save Rivers, Save Lives 2025 campaign creative"
              fill
              sizes="520px"
              className="object-cover"
            />
          </span>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[
              { src: "/campaigns/save-rivers/square.png", ratio: "4:5", label: "Instagram Feed" },
              { src: "/campaigns/save-rivers/wide-2.png", ratio: "9:16", label: "Instagram Reel" },
              { src: "/campaigns/save-rivers/wide.png", ratio: "1.91:1", label: "Facebook Feed" },
              { src: "/campaigns/save-rivers/standard.png", ratio: "1:1", label: "LinkedIn Post" },
              { src: "/campaigns/save-rivers/banner.png", ratio: "16:9", label: "Website Banner" },
            ].map(({ src, ratio, label }) => (
              <div key={label} className="min-w-0 rounded-lg border border-[#DDE6F1] bg-white p-1 text-center">
                <span className="relative block h-12 overflow-hidden rounded-md">
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                  {ratio === "9:16" && <PlayCircle className="absolute inset-0 m-auto size-5 rounded-full bg-black/45 text-white" />}
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
          <div className="rounded-xl border border-[#CDECE1] bg-[#F1FCF7] p-3">
            <div className="flex items-start gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-[#0AA673] text-white">
                <Check className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[12px] text-[#132044]">Approval State</b>
                <small className="block text-[10px] text-[#526385]">Campaign is approved and ready to launch.</small>
              </div>
              <span className="rounded-full bg-[#DDF8EA] px-2 py-1 text-[9px] font-bold text-[#078359]">Approved</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[9.5px] text-[#526385]">
              <span>Approved by</span>
              <span className="grid size-5 place-items-center rounded-full bg-[#111827] text-[8px] font-bold text-white">MS</span>
              <b>Manish Sirohi</b>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[1.25fr_.9fr_.9fr]">
        <div className="rounded-xl border border-[#CDECE1] bg-[#F7FDFA] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#0AA673]">
              <Check className="size-4 text-white" />
            </span>
            <div>
              <b className="block text-[11.5px] font-bold text-[#111827]">Launch Confirmation</b>
              <small className="block text-[9.5px] text-[#8791A4]">
                Confirm the following items before launching your campaign.
              </small>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: "reviewedContent" as const, label: "I have reviewed all content and creatives" },
              { key: "budgetApproved" as const, label: "Budget is approved" },
              { key: "readyToPublish" as const, label: "Campaign is ready to publish" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#CDECE1] bg-white px-2.5 py-2"
              >
                <span className="min-w-0 text-[10px] leading-[13px] text-[#374151]">{label}</span>
                <GreenToggle on={draft[key]} onToggle={() => set(key, !draft[key])} />
              </div>
            ))}
          </div>
        </div>

        <Card icon={CalendarDays} title="Launch Settings">
          {[
            { id: "now", title: "Publish now", caption: "Launch the campaign immediately after approval." },
            { id: "later", title: "Schedule for later", caption: "Set a specific date and time to launch." },
          ].map(({ id, title, caption }) => (
            <button
              key={id}
              onClick={() => set("launchMode", id)}
              className="mb-1.5 flex w-full items-start gap-2 text-left last:mb-0"
            >
              <span
                className={cn(
                  "mt-px grid size-3.5 shrink-0 place-items-center rounded-full border-[1.5px]",
                  draft.launchMode === id ? "border-[#E11D28]" : "border-[#CBD5E1]",
                )}
              >
                {draft.launchMode === id && <i className="block size-1.5 rounded-full bg-[#E11D28]" />}
              </span>
              <span className="min-w-0">
                <b className="block text-[10.5px] font-semibold text-[#111827]">{title}</b>
                <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{caption}</small>
              </span>
            </button>
          ))}
        </Card>

        <Card icon={Bell} title="Notifications">
          <small className="mb-1.5 block text-[9.5px] text-[#8791A4]">
            Notify team members about the campaign launch.
          </small>
          <div className="space-y-1.5">
            {[
              { key: "notifyOwner" as const, label: "Manish Sirohi (Campaign Owner)" },
              { key: "notifyClientTeam" as const, label: "Moksha Sewa Team" },
              { key: "notifyMarketing" as const, label: "Marketing Team" },
              { key: "notifyEmail" as const, label: "Send me a launch confirmation email" },
            ].map(({ key, label }) => (
              <Checkbox key={key} checked={draft[key]} onToggle={() => set(key, !draft[key])} label={label} />
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}
