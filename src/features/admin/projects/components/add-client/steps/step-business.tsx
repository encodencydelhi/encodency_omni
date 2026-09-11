"use client";

import { Building2, Sparkles, Target, TrendingUp } from "lucide-react";
import type { ClientDraft } from "../draft";
import { ChannelLogo } from "../../../../shared/channel-logo";
import {
  Field,
  NeedHelpCard,
  RailBullets,
  RailCard,
  SelectInput,
  StepHeader,
  TagField,
  TextareaField,
} from "../ui";

const CTA_OPTIONS = ["Make a Donation", "Contact Us", "Volunteer Now", "Subscribe", "Book a Call"] as const;

const SOCIALS = [
  { key: "instagram", channel: "Instagram", placeholder: "@handle" },
  { key: "linkedin", channel: "LinkedIn", placeholder: "/company" },
  { key: "youtube", channel: "YouTube", placeholder: "@channel" },
  { key: "facebook", channel: "Facebook", placeholder: "/page" },
] as const;

export function BusinessStep({
  draft,
  set,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <>
      <StepHeader
        icon={Building2}
        step={2}
        title="Business Profile"
        description="Tell us more about your client's business, services, audience and goals."
        tip="A detailed business profile helps us create more relevant and effective marketing recommendations."
      />
      <div className="grid gap-x-5 gap-y-3 p-5 md:grid-cols-2">
        <Field label="Main Services / Offerings" required hint="Add the main services or offerings provided by the business.">
          <TagField tags={draft.services} onChange={(v) => set("services", v)} placeholder="Add a service..." />
        </Field>
        <Field label="Target Audience" required hint="Who is your primary audience?">
          <TagField tags={draft.targetAudience} onChange={(v) => set("targetAudience", v)} placeholder="Add audience..." />
        </Field>

        <Field label="Target Locations" required hint="Where does the business operate? (cities, regions, etc.)">
          <TagField tags={draft.targetLocations} onChange={(v) => set("targetLocations", v)} placeholder="Add location..." />
        </Field>
        <Field label="Marketing Goals" required hint="What do you want to achieve through digital marketing?">
          <TagField tags={draft.marketingGoals} onChange={(v) => set("marketingGoals", v)} placeholder="Add goal..." />
        </Field>

        <Field label="Unique Value Proposition / USP" required hint="What makes this organization unique?">
          <TextareaField value={draft.usp} onChange={(v) => set("usp", v)} rows={3} />
        </Field>
        <Field label="Competitors / Similar Organizations" hint="List similar organizations or competitors (if any).">
          <TagField tags={draft.competitors} onChange={(v) => set("competitors", v)} placeholder="Add competitor..." />
        </Field>

        <Field label="Brand Tone" required hint="How should your brand communicate?">
          <TagField tags={draft.brandTone} onChange={(v) => set("brandTone", v)} placeholder="Add tone..." />
        </Field>
        <Field label="Primary Call to Action" required hint="What is the main action you want people to take?">
          <SelectInput value={draft.primaryCta} onChange={(v) => set("primaryCta", v)} options={CTA_OPTIONS} />
        </Field>

        <Field label="Social Media Handles" hint="Add social media profile links (if available).">
          <div className="grid grid-cols-2 gap-2">
            {SOCIALS.map(({ key, channel, placeholder }) => (
              <span
                key={key}
                className="flex h-[42px] items-center gap-2 rounded-lg border border-[#E2E5EE] bg-white px-2.5 transition-colors focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/12"
              >
                <ChannelLogo channel={channel} className="size-[18px] shrink-0" />
                <input
                  value={draft.socials[key]}
                  onChange={(event) => set("socials", { ...draft.socials, [key]: event.target.value })}
                  placeholder={placeholder}
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9CA3AF]"
                />
              </span>
            ))}
          </div>
        </Field>
        <Field label="Business Keywords / Topics" required hint="Important keywords related to this business.">
          <TagField tags={draft.keywords} onChange={(v) => set("keywords", v)} placeholder="Add keyword..." />
        </Field>
      </div>
    </>
  );
}

export function BusinessRail() {
  return (
    <>
      <RailCard>
        <div className="mb-3 grid h-[108px] place-items-center rounded-xl bg-gradient-to-b from-[#EEF2FF] to-[#F8FAFF]">
          <span className="grid h-[62px] w-[86px] place-items-center rounded-lg border border-[#C7D2FE] bg-white shadow-sm">
            <Building2 className="size-7 text-[#4F46E5]" />
          </span>
        </div>
        <b className="block text-center text-[15px] font-bold text-[#111827]">Why this step matters?</b>
        <p className="mx-auto mb-4 mt-1 text-center text-[11.5px] leading-[17px] text-[#6B7280]">
          A clear business profile helps us understand your client&apos;s purpose, audience and unique
          strengths. This information is used to create tailored marketing strategies, relevant content
          and growth opportunities.
        </p>
        <RailBullets
          items={[
            { icon: Building2, label: "Helps us understand the business" },
            { icon: Sparkles, label: "Improves content and campaign ideas" },
            { icon: Target, label: "Enables better audience targeting" },
            { icon: TrendingUp, label: "Sets the foundation for success" },
          ]}
        />
      </RailCard>
      <NeedHelpCard />
    </>
  );
}

