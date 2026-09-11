"use client";

import Image from "next/image";
import mokshaLogo from "@/assets/moksha-sewa-logo.png";
import { BadgeCheck, Check, Globe, Megaphone, Target, TrendingUp, UserRound, Users, Sparkles, MapPin, IndianRupee } from "lucide-react";
import type { ClientDraft } from "../draft";
import {
  Checkbox,
  Field,
  NeedHelpCard,
  RailCard,
  SelectInput,
  StepHeader,
  TagField,
  TextareaField,
} from "../ui";

const FOCUS_AREAS = ["Awareness", "Donations", "Volunteers", "Website Traffic", "Local Visibility", "Fundraising"] as const;

export function MarketingStep({
  draft,
  set,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  const toggleFocus = (area: string) =>
    set(
      "focusAreas",
      draft.focusAreas.includes(area)
        ? draft.focusAreas.filter((item) => item !== area)
        : [...draft.focusAreas, area],
    );

  return (
    <>
      <StepHeader
        icon={Megaphone}
        step={5}
        title="Marketing Setup"
        description="Define marketing preferences and help us create a winning strategy for your client."
        tip="These preferences help us personalize content, campaigns and recommendations."
      />
      <div className="grid gap-x-5 gap-y-3 p-5 lg:grid-cols-3">
        <Field label="Primary Marketing Goals" required hint="Select the main goals for marketing.">
          <TagField tags={draft.primaryGoals} onChange={(v) => set("primaryGoals", v)} placeholder="Add goal..." />
        </Field>
        <Field label="Campaign Objective Priorities" required hint="Set the priority order for campaign objectives.">
          <SelectInput
            value={draft.objectivePriority}
            onChange={(v) => set("objectivePriority", v)}
            options={["Awareness > Donations > Volunteers", "Donations > Awareness > Volunteers", "Volunteers > Awareness > Donations"]}
          />
        </Field>
        <Field label="Default CTA" required hint="Primary call-to-action for your campaigns.">
          <SelectInput
            value={draft.defaultCta}
            onChange={(v) => set("defaultCta", v)}
            options={["Donate Now", "Volunteer Now", "Learn More", "Contact Us"]}
          />
        </Field>

        <Field label="Target Audience Segments" required hint="Select key audience segments.">
          <TagField tags={draft.audienceSegments} onChange={(v) => set("audienceSegments", v)} placeholder="Add segment..." />
        </Field>
        <Field label="Preferred Content Categories" required hint="Topics to focus on in your content.">
          <TagField tags={draft.contentCategories} onChange={(v) => set("contentCategories", v)} placeholder="Add category..." />
        </Field>
        <Field label="Publishing Frequency" required hint="How often should we publish content?">
          <SelectInput
            value={draft.publishingFrequency}
            onChange={(v) => set("publishingFrequency", v)}
            options={["1–2 posts per week", "3–4 posts per week", "5–6 posts per week", "Daily"]}
          />
        </Field>

        <Field label="Preferred Marketing Channels" required hint="Select the channels to use for marketing.">
          <TagField tags={draft.marketingChannels} onChange={(v) => set("marketingChannels", v)} placeholder="Add channel..." />
        </Field>
        <Field label="Monthly Marketing Budget Range" required hint="Estimated monthly budget for paid campaigns.">
          <SelectInput
            icon={IndianRupee}
            value={draft.budgetRange}
            onChange={(v) => set("budgetRange", v)}
            options={["10,000 – 25,000", "25,000 – 50,000", "50,000 – 1,00,000", "1,00,000+"]}
          />
        </Field>
        <Field label="Lead Goal (Monthly)" required hint="Target number of leads per month.">
          <SelectInput
            icon={Target}
            value={draft.leadGoal}
            onChange={(v) => set("leadGoal", v)}
            options={["50 – 100", "100 – 250", "250 – 500", "500+"]}
          />
        </Field>

        <Field label="Conversion Goal" required hint="Target conversion rate (e.g., donations, signups).">
          <SelectInput
            icon={TrendingUp}
            value={draft.conversionGoal}
            onChange={(v) => set("conversionGoal", v)}
            options={["1% – 3%", "3% – 5%", "5% – 10%", "10%+"]}
          />
        </Field>
        <Field label="Approval Flow" required hint="How content and campaigns will be approved.">
          <SelectInput
            icon={Users}
            value={draft.approvalFlow}
            onChange={(v) => set("approvalFlow", v)}
            options={["Client Review → Final Approval", "Internal Review only", "No approval needed"]}
          />
        </Field>
        <Field label="Content Approval Contact" required hint="Primary contact for content approvals.">
          <SelectInput
            icon={UserRound}
            value={draft.approvalContact}
            onChange={(v) => set("approvalContact", v)}
            options={["Ravi Sharma (ravi@mokshasewa.org)", "Manish Sirohi (manish@encodency.com)"]}
          />
        </Field>

        <Field label="Campaign Focus Areas" hint="Select specific areas to focus on.">
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_AREAS.map((area) => (
              <Checkbox
                key={area}
                label={area}
                checked={draft.focusAreas.includes(area)}
                onToggle={() => toggleFocus(area)}
              />
            ))}
          </div>
        </Field>
        <Field label="Brand Communication Notes" hint="Any specific tone, style or messaging guidelines.">
          <TextareaField value={draft.toneNotes} onChange={(v) => set("toneNotes", v)} rows={3} />
        </Field>
        <Field label="Prohibited Content Notes" hint="List any content types to avoid.">
          <TextareaField value={draft.prohibitedNotes} onChange={(v) => set("prohibitedNotes", v)} rows={3} />
        </Field>
      </div>
    </>
  );
}

export function MarketingRail({ draft }: { draft: ClientDraft }) {
  return (
    <>
      <RailCard>
        <div className="mb-3 flex items-center justify-between">
          <b className="text-[13px] font-bold text-[#111827]">Client Onboarding Summary</b>
          <button className="text-[11px] font-semibold text-[#4F46E5]">View All</button>
        </div>
        <div className="flex items-start gap-2.5">
          {/* The lockup's wordmark is unreadable at 44px, so the tile shows just
              the lotus + waves: render the art ~34% taller than the tile and clip
              the bottom third, which is where the "MOKSHA SEWA" text sits. */}
          <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-[#E6E8F0] bg-white">
            <Image
              src={mokshaLogo}
              alt=""
              width={118}
              height={120}
              className="absolute left-1/2 top-[-2px] h-[56px] w-auto max-w-none -translate-x-1/2 object-contain"
            />
          </span>
          <div className="min-w-0">
            <b className="block truncate text-[13px] font-bold text-[#111827]">{draft.legalName}</b>
            <p className="text-[11px] text-[#6B7280]">Dignity for Every Life</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              <MapPin className="size-3 shrink-0 text-[#9CA3AF]" />
              {draft.city}, {draft.country}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              <Target className="size-3 shrink-0 text-[#9CA3AF]" />
              {draft.industry}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#4F46E5]">
              <Globe className="size-3 shrink-0" />
              {draft.websiteUrl}
            </p>
          </div>
        </div>
      </RailCard>

      <RailCard>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-[#7C3AED]" />
          <b className="text-[13px] font-bold text-[#111827]">Smart Recommendations</b>
        </div>
        <ul className="space-y-2.5">
          {[
            { icon: Target, title: "Focus on impact stories", text: "They drive higher engagement for NGOs." },
            { icon: Users, title: "Leverage volunteer campaigns", text: "Great way to build community and reach." },
            { icon: TrendingUp, title: "Use local targeting", text: "Helps increase visibility in your city." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF2FF]">
                <Icon className="size-3.5 text-[#4F46E5]" />
              </span>
              <span className="min-w-0">
                <b className="block text-[11.5px] font-bold text-[#111827]">{title}</b>
                <small className="block text-[10.5px] leading-[15px] text-[#6B7280]">{text}</small>
              </span>
            </li>
          ))}
        </ul>
      </RailCard>

      <RailCard>
        <div className="mb-2.5 flex items-center gap-2">
          <BadgeCheck className="size-4 text-[#4F46E5]" />
          <b className="text-[13px] font-bold text-[#111827]">Best Practices</b>
        </div>
        <ul className="space-y-1.5">
          {[
            "Use authentic photos and real stories",
            "Show clear call-to-actions (e.g., Donate)",
            "Maintain a consistent posting schedule",
            "Highlight community impact and testimonials",
            "Use local language where relevant",
            "Track and measure campaign performance",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-[11px] leading-4 text-[#374151]">
              <Check className="mt-0.5 size-3 shrink-0 text-[#4F46E5]" />
              {item}
            </li>
          ))}
        </ul>
      </RailCard>
      <NeedHelpCard />
    </>
  );
}
