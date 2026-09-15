"use client";

import { ArrowRight, Check, CircleCheck, CircleHelp, Crop, Info, LayoutGrid, Scan, Settings, X } from "lucide-react";
import type { CampaignDraft } from "../draft";
import { PLACEMENT_CHANNELS, PLACEMENT_INDEX } from "../placements";
import { PLATFORM_ACCOUNTS } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const AUTO_RESIZE = [
  { icon: Crop, title: "Smart Auto-Crop", text: "Images and videos automatically cropped to fit each channel's aspect ratio." },
  { icon: Scan, title: "Safe Area Protection", text: "Keep important elements within safe zones to prevent cutting on different devices." },
  { icon: Settings, title: "Channel-Specific Adaptation", text: "Each platform gets optimized versions with the right format and quality." },
] as const;

export function StepChannels({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  const togglePlacement = (id: string) =>
    set("placements", draft.placements.includes(id) ? draft.placements.filter((item) => item !== id) : [...draft.placements, id]);

  const toggleChannel = (name: string) =>
    set("channels", draft.channels.includes(name) ? draft.channels.filter((item) => item !== name) : [...draft.channels, name]);

  const toggleAccount = (platform: string, account: string) => {
    const current = draft.connectedAccounts[platform] ?? [];
    const next = current.includes(account) ? current.filter((a) => a !== account) : [...current, account];
    set("connectedAccounts", { ...draft.connectedAccounts, [platform]: next });
  };

  return (
    <section className="rounded-sm border border-[#E6E8F0] bg-white p-3.5 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#EEF2FF]">
          <LayoutGrid className="size-[18px] text-[#4F46E5]" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[14px] font-semibold leading-5 text-[#111827]">Channels, Accounts &amp; Placements</b>
          <small className="block text-[10.5px] text-[#8791A4]">
            Select channels, connect accounts and choose specific placements for your campaign.
          </small>
        </div>
        <button className="flex h-7 shrink-0 items-center gap-1.5 rounded-sm bg-[#EEF2FF] px-2.5 text-[10.5px] font-semibold text-[#4F46E5]">
          <CircleHelp className="size-3.5" />
          Need Help?
        </button>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[12px] font-semibold text-[#111827]">Select Channels</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEMENT_CHANNELS.map((ch) => {
            const active = draft.channels.includes(ch.name);
            return (
              <button
                key={ch.name}
                type="button"
                onClick={() => toggleChannel(ch.name)}
                className={cn(
                  "flex h-8.5 items-center gap-1.5 rounded-sm border px-3 text-[11.5px] font-semibold transition-colors",
                  active ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-[#DDE6F1] bg-white text-[#526385] hover:border-[#CBD5E1]",
                )}
              >
                <ChannelLogo channel={ch.logos[0]} className="size-4" />
                {ch.name}
                {ch.connected && <i className="size-1.5 rounded-sm bg-[#0AA673]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
        {PLACEMENT_CHANNELS.filter((ch) => draft.channels.includes(ch.name)).map((channel) => (
          <div key={channel.name} className="flex flex-col rounded-sm border border-[#E6E8F0] bg-white p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex shrink-0 -space-x-1.5">
                {channel.logos.map((logo) => (
                  <ChannelLogo key={logo} channel={logo} className="size-7 rounded-sm" />
                ))}
              </span>
              <b className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#111827]">{channel.name}</b>
              {channel.connected && (
                <i className="shrink-0 rounded-sm bg-[#E4F8F0] px-1.5 py-0.5 text-[10px] font-semibold not-italic text-[#0AA673]">
                  Connected
                </i>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-[15px] text-[#64748B]">{channel.caption}</p>

            <div className="mt-2.5 rounded-sm bg-[#F8FAFC] p-2.5">
              <p className="mb-1.5 text-[11.5px] font-semibold text-[#1F2937]">Connected Accounts</p>
              <div className="space-y-1">
                {(PLATFORM_ACCOUNTS[channel.name] ?? []).map((account) => {
                  const selected = (draft.connectedAccounts[channel.name] ?? []).includes(account.handle);
                  return (
                    <button
                      key={account.handle}
                      type="button"
                      onClick={() => toggleAccount(channel.name, account.handle)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-white"
                    >
                      <span className={cn("grid size-4 shrink-0 place-items-center rounded border transition-colors", selected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#CBD5E1] bg-white")}>
                        {selected && <Check className="size-2.5 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[#1F2937]">{account.name}</span>
                      <span className="text-[10px] text-[#64748B]">{account.handle}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-2.5 rounded-sm bg-[#F8FAFC] p-2.5">
              <p className="mb-1.5 text-[11.5px] font-semibold text-[#1F2937]">Placements</p>
              <div className="space-y-1">
                {channel.placements.map((placement) => {
                  const active = draft.placements.includes(placement.id);
                  return (
                    <button
                      key={placement.id}
                      type="button"
                      onClick={() => togglePlacement(placement.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-white"
                    >
                      <span className={cn("grid size-4 shrink-0 place-items-center rounded border transition-colors", active ? "border-[#2563EB] bg-[#2563EB]" : "border-[#CBD5E1] bg-white")}>
                        {active && <Check className="size-2.5 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[#1F2937]">{placement.label}</span>
                      <span className="flex shrink-0 gap-1">
                        {placement.ratios.map((ratio) => (
                          <i key={ratio} className="rounded bg-white px-1.5 py-0.5 text-[9.5px] font-semibold not-italic text-[#475569] shadow-xs">
                            {ratio}
                          </i>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              {channel.note && (
                <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-[#EFF6FF] px-2 py-1.5 text-[9.5px] leading-[13px] text-[#33507A]">
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

      <div className="mt-2.5 rounded-sm border border-[#E6E8F0] bg-white p-3">
        <div className="mb-2.5 flex items-start gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-[#EEF2FF]">
            <Settings className="size-3.5 text-[#4F46E5]" />
          </span>
          <div>
            <b className="block text-[12px] font-semibold text-[#111827]">Placement Compatibility &amp; Auto-Resize</b>
            <small className="block text-[10px] text-[#8791A4]">We&apos;ll automatically optimize your media for each selected placement.</small>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {AUTO_RESIZE.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#F1F5F9]">
                <Icon className="size-4 text-[#475569]" />
              </span>
              <div className="min-w-0">
                <b className="block text-[10.5px] font-semibold text-[#111827]">{title}</b>
                <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{text}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 rounded-sm border border-[#CDECE1] bg-[#F7FDFA] p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CircleCheck className="size-4 shrink-0 text-[#0AA673]" />
          <b className="text-[12px] font-semibold text-[#111827]">Selected Placements ({draft.placements.length})</b>
          <small className="min-w-0 flex-1 text-[10px] text-[#8791A4]">These placements will be used for your campaign.</small>
          <button onClick={() => set("placements", [])} className="shrink-0 text-[10.5px] font-semibold text-[#2563EB]">Clear All</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {draft.placements.map((id) => {
            const meta = PLACEMENT_INDEX.get(id);
            if (!meta) return null;
            return (
              <span key={id} className="flex items-center gap-1.5 rounded-sm border border-[#E6E8F0] bg-white px-2 py-1 text-[10px] font-medium text-[#374151]">
                <ChannelLogo channel={meta.logo} className="size-3.5 shrink-0" />
                {meta.chip}
                <button type="button" onClick={() => togglePlacement(id)} className="text-[#9CA3AF] transition-colors hover:text-[#E11D28]">
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
