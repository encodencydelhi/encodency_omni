"use client";

import { ArrowRight, Check, ChevronUp, CircleCheck, CircleHelp, Crop, Info, LayoutGrid, Scan, Settings, X } from "lucide-react";
import type { CampaignDraft } from "../draft";
import { PLACEMENT_CHANNELS, PLACEMENT_INDEX } from "../placements";
import { ChannelLogo } from "../../../shared/channel-logo";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const AUTO_RESIZE = [
  {
    icon: Crop,
    title: "Smart Auto-Crop",
    text: "Images and videos are automatically cropped to fit each channel's aspect ratio while keeping the key subject in focus.",
  },
  {
    icon: Scan,
    title: "Safe Area Protection",
    text: "We keep important elements (text, logos, faces) within safe zones to prevent cutting on different devices.",
  },
  {
    icon: Settings,
    title: "Channel-Specific Adaptation",
    text: "Each platform gets optimized versions with the right format, file size and quality for best performance.",
  },
] as const;

export function StepChannels({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  const toggle = (id: string) =>
    set(
      "placements",
      draft.placements.includes(id)
        ? draft.placements.filter((item) => item !== id)
        : [...draft.placements, id],
    );

  return (
    <section className="rounded-xl border border-[#E6E8F0] bg-white p-3.5 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF2FF]">
          <LayoutGrid className="size-[18px] text-[#4F46E5]" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[14px] font-bold leading-5 text-[#111827]">Channels &amp; Placements</b>
          <small className="block text-[10.5px] text-[#8791A4]">
            Select the channels you want to use and choose specific placements, media formats and aspect ratios for
            your campaign.
          </small>
        </div>
        <button className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-[#EEF2FF] px-2.5 text-[10.5px] font-semibold text-[#4F46E5]">
          <CircleHelp className="size-3.5" />
          Need Help?
        </button>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        {PLACEMENT_CHANNELS.map((channel) => (
          <div key={channel.name} className="flex flex-col rounded-xl border border-[#E6E8F0] bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="flex shrink-0 -space-x-1.5">
                {channel.logos.map((logo) => (
                  <ChannelLogo key={logo} channel={logo} className="size-7 rounded-lg" />
                ))}
              </span>
              <b className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#111827]">{channel.name}</b>
              {channel.connected && (
                <i className="shrink-0 rounded-md bg-[#E4F8F0] px-1.5 py-0.5 text-[9.5px] font-semibold not-italic text-[#0AA673]">
                  Connected
                </i>
              )}
              <ChevronUp className="size-3.5 shrink-0 text-[#9CA3AF]" />
            </div>
            <p className="mt-1 text-[10.5px] leading-[14px] text-[#8791A4]">{channel.caption}</p>

            <div className="mt-2 rounded-lg bg-[#F8FAFC] p-2">
              <p className="mb-1.5 text-[10.5px] font-semibold text-[#374151]">Select Placements</p>
              <div className="space-y-1">
                {channel.placements.map((placement) => {
                  const active = draft.placements.includes(placement.id);
                  return (
                    <button
                      key={placement.id}
                      type="button"
                      onClick={() => toggle(placement.id)}
                      aria-pressed={active}
                      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-white"
                    >
                      <span
                        className={cn(
                          "grid size-3.5 shrink-0 place-items-center rounded border transition-colors",
                          active ? "border-[#2563EB] bg-[#2563EB]" : "border-[#CBD5E1] bg-white",
                        )}
                      >
                        {active && <Check className="size-2.5 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#374151]">{placement.label}</span>
                      <span className="flex shrink-0 gap-1">
                        {placement.ratios.map((ratio) => (
                          <i
                            key={ratio}
                            className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold not-italic text-[#52617D] shadow-[0_1px_2px_rgb(15_23_42/0.06)]"
                          >
                            {ratio}
                          </i>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              {channel.note && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md bg-[#EFF6FF] px-2 py-1.5 text-[9.5px] leading-[13px] text-[#33507A]">
                  <Info className="mt-px size-3 shrink-0 text-[#1975E7]" />
                  {channel.note}
                </p>
              )}
            </div>

            <button className="mt-auto flex items-center gap-1 pt-2 text-[10.5px] font-semibold text-[#2563EB]">
              View creative guidelines
              <ArrowRight className="size-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2.5 rounded-xl border border-[#E6E8F0] bg-white p-3">
        <div className="mb-2.5 flex items-start gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF2FF]">
            <Settings className="size-3.5 text-[#4F46E5]" />
          </span>
          <div>
            <b className="block text-[12px] font-bold text-[#111827]">Placement Compatibility &amp; Auto-Resize</b>
            <small className="block text-[10px] text-[#8791A4]">
              We&apos;ll automatically optimize your media for each selected placement.
            </small>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {AUTO_RESIZE.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F1F5F9]">
                <Icon className="size-4 text-[#475569]" />
              </span>
              <div className="min-w-0">
                <b className="block text-[10.5px] font-bold text-[#111827]">{title}</b>
                <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{text}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-[#CDECE1] bg-[#F7FDFA] p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CircleCheck className="size-4 shrink-0 text-[#0AA673]" />
          <b className="text-[12px] font-bold text-[#111827]">
            Selected Placements ({draft.placements.length})
          </b>
          <small className="min-w-0 flex-1 text-[10px] text-[#8791A4]">
            These placements will be used for your campaign. You can modify them anytime.
          </small>
          <button
            onClick={() => set("placements", [])}
            className="shrink-0 text-[10.5px] font-semibold text-[#2563EB]"
          >
            Clear All
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {draft.placements.map((id) => {
            const meta = PLACEMENT_INDEX.get(id);
            if (!meta) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-lg border border-[#E6E8F0] bg-white px-2 py-1 text-[10px] font-medium text-[#374151]"
              >
                <ChannelLogo channel={meta.logo} className="size-3.5 shrink-0" />
                {meta.chip}
                <button
                  type="button"
                  aria-label={`Remove ${meta.chip}`}
                  onClick={() => toggle(id)}
                  className="text-[#9CA3AF] transition-colors hover:text-[#E11D28]"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
