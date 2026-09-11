"use client";

import { CircleCheck, ExternalLink, Link2, Send, Settings, Shield, RefreshCw } from "lucide-react";
import type { ClientDraft } from "../draft";
import { ChannelLogo } from "../../../../shared/channel-logo";
import { Field, NeedHelpCard, RailCard, SelectInput, StepHeader } from "../ui";
import { cn } from "@/lib/utils/cn";

const CHANNELS = [
  { name: "Meta & Instagram", channel: "Meta", caption: "Manage Facebook & Instagram content, ads and insights." },
  { name: "LinkedIn", channel: "LinkedIn", caption: "Schedule posts and track engagement for your page." },
  { name: "Google Business Profile", channel: "Google Business", caption: "Manage your Business Profile, reviews and local presence." },
  { name: "WhatsApp", channel: "WhatsApp", caption: "Integrate WhatsApp Business for customer communication." },
  { name: "YouTube", channel: "YouTube", caption: "Manage your channel, publish videos and track performance." },
  { name: "Website", channel: "Website", caption: "Track website performance and monitor uptime." },
  { name: "Search Console", channel: "Search Console", caption: "Track search performance, keywords and indexing." },
  { name: "Google Analytics 4", channel: "Google", caption: "Measure website traffic, conversions and user behavior." },
] as const;

const STATUS = {
  connected: { dot: "bg-[#10B981]", label: "Connected", action: "Reconnect" },
  ready: { dot: "bg-[#F59E0B]", label: "Ready to Connect", action: "Connect" },
  none: { dot: "bg-[#EF4444]", label: "Not Connected", action: "Connect" },
} as const;

export function ChannelsStep({
  draft,
  set,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  const toggle = (name: string) =>
    set("channels", {
      ...draft.channels,
      [name]: draft.channels[name] === "connected" ? "none" : "connected",
    });

  return (
    <>
      <StepHeader
        icon={Link2}
        step={4}
        title="Channels & Integrations"
        description="Connect your client's digital channels to centralize content, track performance, and automate workflows."
        tip="You can skip this step and connect channels later from client settings."
      />
      <div className="space-y-3 p-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-[#E0E7FF] bg-[#F8FAFF] px-3.5 py-3">
          <Shield className="mt-px size-4 shrink-0 text-[#4F46E5]" />
          <div className="min-w-0 flex-1">
            <b className="block text-[12px] font-bold text-[#111827]">Your data stays secure</b>
            <p className="text-[11px] leading-4 text-[#6B7280]">
              We never collect or store your passwords. All connections use official OAuth or authorized
              connectors from each platform.
            </p>
          </div>
          <button className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#4F46E5]">
            Learn more
            <ExternalLink className="size-3" />
          </button>
        </div>

        <div>
          <b className="block text-[14px] font-bold text-[#111827]">Connect Your Channels</b>
          <p className="mb-3 text-[11.5px] text-[#6B7280]">
            Link the platforms your client uses. You can connect now or skip and add them later.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {CHANNELS.map(({ name, channel, caption }) => {
              const state = draft.channels[name] ?? "none";
              const meta = STATUS[state];
              const isConnected = state === "connected";
              return (
                <div key={name} className="flex flex-col rounded-xl border border-[#E6E8F0] bg-white p-3">
                  <div className="flex items-start gap-2">
                    <ChannelLogo channel={channel} className="size-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[12px] font-bold text-[#111827]">{name}</b>
                      <p className="text-[10.5px] leading-[15px] text-[#6B7280]">{caption}</p>
                    </div>
                    {isConnected && (
                      <button aria-label={`${name} settings`} className="shrink-0 text-[#9CA3AF] hover:text-[#4F46E5]">
                        <Settings className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="mt-2 flex items-center gap-1.5 text-[10.5px] font-medium text-[#6B7280]">
                    <i className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  <button
                    onClick={() => toggle(name)}
                    className={cn(
                      "mt-2 h-8 w-full rounded-lg text-[11.5px] font-semibold transition-colors",
                      state === "none"
                        ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                        : "border border-[#E2E5EE] bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]",
                    )}
                  >
                    {isConnected && name === "Website" ? "Configure" : meta.action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2.5 lg:grid-cols-2">
          <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
            <div className="mb-2.5 flex items-start gap-2">
              <Send className="mt-px size-4 shrink-0 text-[#4F46E5]" />
              <div>
                <b className="block text-[12px] font-bold text-[#111827]">Default Publishing Preferences</b>
                <p className="text-[10.5px] text-[#6B7280]">
                  These settings will be used when publishing content across connected channels.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Default Channels">
                <SelectInput
                  value={draft.defaultChannels}
                  onChange={(v) => set("defaultChannels", v)}
                  options={["Auto-select connected channels", "Ask every time", "All channels"]}
                />
              </Field>
              <Field label="Default Content Type">
                <SelectInput
                  value={draft.defaultContentType}
                  onChange={(v) => set("defaultContentType", v)}
                  options={["General Update", "Impact Story", "Campaign", "Event"]}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
            <div className="mb-2.5 flex items-start gap-2">
              <RefreshCw className="mt-px size-4 shrink-0 text-[#4F46E5]" />
              <div>
                <b className="block text-[12px] font-bold text-[#111827]">Sync Preferences</b>
                <p className="text-[10.5px] text-[#6B7280]">
                  Control how often we sync data from your connected accounts.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sync Frequency">
                <SelectInput
                  value={draft.syncFrequency}
                  onChange={(v) => set("syncFrequency", v)}
                  options={["Daily (Recommended)", "Hourly", "Weekly"]}
                />
              </Field>
              <Field label="Sync Historical Data">
                <SelectInput
                  value={draft.syncHistory}
                  onChange={(v) => set("syncHistory", v)}
                  options={["Last 3 months", "Last 6 months", "Last 12 months", "All time"]}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function ChannelsRail({ step }: { step: number }) {
  const percent = Math.round((step / 7) * 100);
  return (
    <>
      <RailCard>
        <div className="mb-2 flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-[#EEF2FF]">
            <RefreshCw className="size-3.5 text-[#4F46E5]" />
          </span>
          <b className="text-[13px] font-bold text-[#111827]">Your Progress</b>
        </div>
        <p className="text-[11px] text-[#6B7280]">{step} of 7 completed</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EDF1F7]">
            <i className="block h-full rounded-full bg-[#4F46E5]" style={{ width: `${percent}%` }} />
          </span>
          <b className="shrink-0 text-[11px] text-[#4F46E5]">{percent}%</b>
        </div>
      </RailCard>

      <RailCard>
        <div className="mb-3 grid h-[108px] place-items-center rounded-xl bg-gradient-to-b from-[#EEF2FF] to-[#F8FAFF]">
          <span className="grid h-[62px] w-[86px] place-items-center rounded-lg border border-[#C7D2FE] bg-white shadow-sm">
            <Link2 className="size-7 text-[#4F46E5]" />
          </span>
        </div>
        <b className="block text-center text-[15px] font-bold text-[#111827]">
          Integrations Bring Everything Together
        </b>
        <p className="mx-auto mb-4 mt-1 text-center text-[11.5px] leading-[17px] text-[#6B7280]">
          Connect your client&apos;s channels to schedule content, track performance, and get meaningful
          insights — all in one place.
        </p>
        <ul className="space-y-2.5">
          {[
            "Secure and official connections (OAuth/authorized apps)",
            "You can skip and add later",
            "Helps with content publishing and performance tracking",
            "Integrations can be managed anytime from client settings",
          ].map((label) => (
            <li key={label} className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[#4F46E5]">
                <CircleCheck className="size-3.5 text-white" />
              </span>
              <span className="text-[11.5px] leading-[16px] text-[#374151]">{label}</span>
            </li>
          ))}
        </ul>
      </RailCard>
      <NeedHelpCard />
    </>
  );
}
