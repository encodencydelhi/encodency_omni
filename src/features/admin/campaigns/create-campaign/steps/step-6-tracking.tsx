"use client";

import type { ReactNode } from "react";
import {
  Check,
  CircleCheck,
  CircleHelp,
  Code2,
  Globe,
  Link2,
  Mail,
  Phone,
  ShieldCheck,
  Tag,
  Target,
  UserPlus,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { Field, TextInput } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const TRACKING_INTEGRATIONS = [
  { key: "Meta Pixel", desc: "Track Facebook & Instagram conversions", icon: "📱", color: "bg-[#E8F2FF] text-[#1975E7]" },
  { key: "Google Tag", desc: "Google Analytics & Ads tracking", icon: "📊", color: "bg-[#E4F8F0] text-[#0AA673]" },
  { key: "LinkedIn Insight Tag", desc: "B2B conversion tracking", icon: "💼", color: "bg-[#E8F2FF] text-[#0A66C2]" },
  { key: "Website Events", desc: "Custom event tracking on website", icon: "🌐", color: "bg-[#FFF3DC] text-[#D97706]" },
  { key: "CRM Events", desc: "Track leads in CRM pipeline", icon: "🔗", color: "bg-[#E4F8F0] text-[#0AA673]" },
] as const;

const CONVERSION_EVENTS = [
  { key: "Lead", desc: "When a user submits a lead form", icon: UserPlus },
  { key: "Purchase", desc: "When a user completes a purchase", icon: Tag },
  { key: "Registration", desc: "When a user signs up / registers", icon: UserPlus },
  { key: "Donation", desc: "When a user makes a donation", icon: Tag },
  { key: "Contact Form", desc: "When a contact form is submitted", icon: Mail },
  { key: "WhatsApp Conversation", desc: "When a WhatsApp chat is initiated", icon: Phone },
  { key: "Phone Call", desc: "When a phone call is tracked", icon: Phone },
  { key: "Signup", desc: "When a user creates an account", icon: UserPlus },
  { key: "Custom Conversion", desc: "Define your own conversion event", icon: Target },
] as const;

const TRACKING_HEALTH = [
  { label: "Pixel connected", ok: true },
  { label: "Conversion events active", ok: true },
  { label: "UTM configured", ok: true },
  { label: "Landing page verified", ok: true },
  { label: "CRM connected", ok: true },
];

export function StepTracking({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE6F1] bg-white shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <StepSection letter="A" title="UTM Builder" caption="Configure UTM parameters for campaign tracking and attribution.">
        <div className="grid gap-2 md:grid-cols-5">
          <Field label="utm_source" required>
            <TextInput value={draft.utmSource} onChange={(v) => set("utmSource", v)} icon={Globe} placeholder="e.g. social" />
          </Field>
          <Field label="utm_medium" required>
            <TextInput value={draft.utmMedium} onChange={(v) => set("utmMedium", v)} icon={Link2} placeholder="e.g. cpc" />
          </Field>
          <Field label="utm_campaign" required>
            <TextInput value={draft.utmCampaign} onChange={(v) => set("utmCampaign", v)} icon={Tag} placeholder="e.g. save-rivers-2025" />
          </Field>
          <Field label="utm_content" optional>
            <TextInput value={draft.utmContent} onChange={(v) => set("utmContent", v)} icon={Code2} placeholder="e.g. awareness" />
          </Field>
          <Field label="utm_term" optional>
            <TextInput value={draft.utmTerm} onChange={(v) => set("utmTerm", v)} icon={Tag} placeholder="e.g. river-conservation" />
          </Field>
        </div>
        <div className="mt-2 rounded-lg bg-[#F8FAFC] p-2.5">
          <p className="text-[10px] font-semibold text-[#374151]">Generated Tracking URL</p>
          <p className="mt-1 truncate text-[10px] text-[#526385]">
            {draft.landingPageUrl}?utm_source={draft.utmSource || "social"}&utm_medium={draft.utmMedium || "cpc"}&utm_campaign={draft.utmCampaign || "campaign"}
          </p>
        </div>
      </StepSection>

      <StepSection letter="B" title="Tracking Integrations" caption="Connect tracking pixels and events for accurate measurement.">
        <div className="grid gap-2 md:grid-cols-3">
          {TRACKING_INTEGRATIONS.map(({ key, desc, color }) => {
            const active = draft.trackingIntegrations[key] ?? false;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  active ? "border-[#0AA673] bg-[#F7FDFA]" : "border-[#DDE6F1] bg-white",
                )}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-[18px]", color)}>
                  {key.includes("Pixel") ? "📱" : key.includes("Google") ? "📊" : key.includes("LinkedIn") ? "💼" : key.includes("Website") ? "🌐" : "🔗"}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[12.5px] font-bold text-[#111827]">{key}</b>
                  <small className="block text-[10.5px] leading-[14px] text-[#64748B]">{desc}</small>
                </div>
                <button
                  type="button"
                  onClick={() => set("trackingIntegrations", { ...draft.trackingIntegrations, [key]: !active })}
                  className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", active ? "bg-[#0AA673]" : "bg-[#CBD5E1]")}
                >
                  <span className={cn("absolute top-0.5 block size-4 rounded-full bg-white shadow-sm transition-all", active ? "left-[18px]" : "left-0.5")} />
                </button>
              </div>
            );
          })}
        </div>
      </StepSection>

      <StepSection letter="C" title="Conversion Events" caption="Select which events count as conversions for this campaign.">
        <div className="grid gap-2 md:grid-cols-3">
          {CONVERSION_EVENTS.map(({ key, desc, icon: Icon }) => {
            const active = draft.conversionEvents.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("conversionEvents", active ? draft.conversionEvents.filter((e) => e !== key) : [...draft.conversionEvents, key])}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                  active ? "border-[#155EEF] bg-[#EFF6FF]" : "border-[#DDE6F1] bg-white hover:border-[#CBD5E1]",
                )}
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", active ? "bg-[#155EEF] text-white" : "bg-[#F1F5F9] text-[#475569]")}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[12px] font-bold text-[#111827]">{key}</b>
                  <small className="block text-[10px] leading-[14px] text-[#64748B]">{desc}</small>
                </div>
                {active && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#155EEF]">
                    <Check className="size-3 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </StepSection>

      <StepSection letter="D" title="Landing Page & Verification" caption="Verify your landing page and tracking setup.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Landing Page URL" required>
            <TextInput value={draft.landingPageUrl} onChange={(v) => set("landingPageUrl", v)} icon={Globe} placeholder="https://example.com/landing" />
          </Field>
          <div className="flex items-start gap-3 rounded-lg border border-[#CDECE1] bg-[#F7FDFA] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0AA673] text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[12px] font-bold text-[#132044]">Tracking Health</b>
              <div className="mt-1 space-y-1">
                {TRACKING_HEALTH.map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[10px]">
                    {ok ? <CircleCheck className="size-3.5 shrink-0 text-[#0AA673]" /> : <CircleHelp className="size-3.5 shrink-0 text-[#F59E0B]" />}
                    <span className={ok ? "text-[#374151]" : "text-[#8791A4]"}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StepSection>
    </div>
  );
}

function StepSection({
  letter,
  title,
  caption,
  children,
}: {
  letter: string;
  title: string;
  caption: string;
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
      </div>
      {children}
    </section>
  );
}
