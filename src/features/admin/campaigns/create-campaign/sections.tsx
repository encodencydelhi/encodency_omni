"use client";

import Image from "next/image";
import {
  CalendarDays,
  CalendarClock,
  Check,
  Clock,
  Globe2,
  Image as ImageIcon,
  Info,
  Languages,
  Link2,
  Megaphone,
  Monitor,
  Pencil,
  Rocket,
  Smartphone,
  Sparkles,
  Tablet,
  Target,
  UploadCloud,
  UserPlus,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import type { CampaignDraft } from "./draft";
import {
  Checkbox,
  Field,
  OptionCard,
  Section,
  SelectInput,
  TagField,
  Textarea,
  TextInput,
  tint,
} from "./ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

/* -------------------------------------------------- D · Audience Targeting */

const AUDIENCE_TYPES = [
  { id: "new", title: "New Audience", caption: "Reach people who don't follow you yet", icon: UserPlus, tone: "red" },
  { id: "followers", title: "Existing Followers", caption: "Re-engage your current community", icon: Users, tone: "blue" },
  { id: "lookalike", title: "Lookalike", caption: "People similar to your supporters", icon: Sparkles, tone: "purple" },
  { id: "custom", title: "Custom Audience", caption: "Upload your own contact list", icon: Target, tone: "green" },
] as const;

const DEVICES = [
  { id: "Mobile", icon: Smartphone },
  { id: "Desktop", icon: Monitor },
  { id: "Tablet", icon: Tablet },
] as const;

export function AudienceSection({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  const toggleDevice = (device: string) =>
    set(
      "devices",
      draft.devices.includes(device)
        ? draft.devices.filter((item) => item !== device)
        : [...draft.devices, device],
    );

  return (
    <Section letter="D" title="Audience Targeting" caption="Define who should see this campaign.">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {AUDIENCE_TYPES.map(({ id, title, caption, icon, tone }) => (
          <OptionCard
            key={id}
            active={draft.audienceType === id}
            onSelect={() => set("audienceType", id)}
            icon={icon}
            tint={tint[tone] ?? ""}
            title={title}
            caption={caption}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-4">
        <Field label="Age Range" required>
          <SelectInput
            icon={UserRound}
            value={draft.ageRange}
            onChange={(v) => set("ageRange", v)}
            options={["18 – 24", "18 – 34", "25 – 44", "18 – 65+", "All ages"]}
          />
        </Field>
        <Field label="Gender">
          <SelectInput
            value={draft.gender}
            onChange={(v) => set("gender", v)}
            options={["All", "Male", "Female", "Other"]}
          />
        </Field>
        <Field label="Languages">
          <SelectInput
            icon={Languages}
            value={draft.language}
            onChange={(v) => set("language", v)}
            options={["Hindi + English", "Hindi", "English", "Regional"]}
          />
        </Field>
        <Field label="Audience Size">
          <SelectInput
            icon={Users}
            value={draft.audienceSize}
            onChange={(v) => set("audienceSize", v)}
            options={["Broad", "Balanced", "Narrow"]}
          />
        </Field>

        <Field label="Target Locations" required className="md:col-span-2" hint="Cities, states or regions to target.">
          <TagField
            tags={draft.locations}
            onChange={(v) => set("locations", v)}
            placeholder="Add location..."
          />
        </Field>
        <Field label="Interests & Behaviours" className="md:col-span-2" hint="Helps platforms find the right people.">
          <TagField
            tags={draft.interests}
            onChange={(v) => set("interests", v)}
            placeholder="Add interest..."
          />
        </Field>

        <Field label="Devices" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {DEVICES.map(({ id }) => (
              <Checkbox
                key={id}
                checked={draft.devices.includes(id)}
                onToggle={() => toggleDevice(id)}
                label={id}
              />
            ))}
            <span className="flex items-center gap-1 text-[9.5px] text-[#9CA3AF]">
              <Info className="size-3" />
              Selecting all gives the widest reach
            </span>
          </div>
        </Field>
        <div className="flex items-center gap-2 rounded-xl border border-[#CDECE1] bg-[#F2FBF7] px-3 py-2 md:col-span-2">
          <Users className="size-4 shrink-0 text-[#0AA673]" />
          <p className="text-[10px] leading-[14px] text-[#2F6B57]">
            <b className="block text-[10.5px] text-[#0B6B4F]">Estimated Audience</b>
            Around <b>1.8M – 2.4M</b> people match these targeting rules across your selected channels.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------ E · Content & Schedule */

const PUBLISH_MODES = [
  { id: "now", title: "Publish Immediately", caption: "Go live as soon as it is approved", icon: Zap, tone: "amber" },
  { id: "scheduled", title: "Schedule for Later", caption: "Pick an exact date and time", icon: CalendarClock, tone: "blue" },
  { id: "recurring", title: "Recurring", caption: "Repeat on a set frequency", icon: Clock, tone: "purple" },
] as const;

const CREATIVES = [
  "/campaigns/river-cleanup.jpg",
  "/campaigns/clean-river.jpg",
  "/campaigns/water-conservation.jpg",
];

export function ContentSection({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  return (
    <Section
      letter="E"
      title="Content & Schedule"
      caption="Create your campaign content and set when it goes live."
    >
      <div className="grid gap-x-4 gap-y-3 md:grid-cols-4">
        <Field label="Ad Headline" required className="md:col-span-2">
          <TextInput
            value={draft.headline}
            onChange={(v) => set("headline", v)}
            placeholder="Save Rivers, Save Lives"
          />
        </Field>
        <Field label="Call to Action" required>
          <SelectInput
            icon={Megaphone}
            value={draft.cta}
            onChange={(v) => set("cta", v)}
            options={["Donate Now", "Learn More", "Sign Up", "Volunteer", "Contact Us"]}
          />
        </Field>
        <Field label="Landing Page URL" required>
          <TextInput
            icon={Link2}
            value={draft.landingUrl}
            onChange={(v) => set("landingUrl", v)}
          />
        </Field>

        <Field label="Primary Text" required className="md:col-span-2">
          <Textarea value={draft.primaryText} onChange={(v) => set("primaryText", v)} rows={4} max={300} />
        </Field>

        <Field label="Creative Assets" className="md:col-span-2" hint="PNG, JPG or MP4 up to 20MB each.">
          <div className="grid grid-cols-4 gap-2">
            <label className="flex h-[76px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#F5B5BA] bg-[#FFF7F8] text-center transition-colors hover:bg-[#FFEAEC]">
              <UploadCloud className="size-4 text-[#E11D28]" />
              <span className="mt-0.5 text-[9px] font-semibold text-[#374151]">Upload</span>
              <span className="text-[8px] text-[#9CA3AF]">or drag here</span>
              <input type="file" accept="image/*,video/*" className="hidden" multiple />
            </label>
            {CREATIVES.map((src, index) => (
              <span key={src} className="relative h-[76px] overflow-hidden rounded-lg border border-[#E6E8F0]">
                <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                {index === 0 && (
                  <i className="absolute left-1 top-1 rounded bg-[#E11D28] px-1 py-0.5 text-[7.5px] font-bold not-italic text-white">
                    Primary
                  </i>
                )}
              </span>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[10.5px] font-semibold text-[#374151]">Publishing Schedule</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PUBLISH_MODES.map(({ id, title, caption, icon, tone }) => (
            <OptionCard
              key={id}
              active={draft.publishMode === id}
              onSelect={() => set("publishMode", id)}
              icon={icon}
              tint={tint[tone] ?? ""}
              title={title}
              caption={caption}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-4">
        <Field label="Publish Date" required>
          <TextInput icon={CalendarDays} value={draft.publishDate} onChange={(v) => set("publishDate", v)} />
        </Field>
        <Field label="Publish Time" required>
          <TextInput icon={Clock} value={draft.publishTime} onChange={(v) => set("publishTime", v)} />
        </Field>
        <Field label="Frequency">
          <SelectInput
            value={draft.frequency}
            onChange={(v) => set("frequency", v)}
            options={["Once", "Daily", "3× per week", "Weekly"]}
          />
        </Field>
        <Field label="Time Zone">
          <SelectInput
            icon={Globe2}
            value={draft.timezone}
            onChange={(v) => set("timezone", v)}
            options={["(GMT+05:30) IST", "(GMT+00:00) UTC", "(GMT-05:00) ET"]}
          />
        </Field>
      </div>
    </Section>
  );
}

/* -------------------------------------------------- F · Review & Launch */

function ReviewCard({
  icon: Icon,
  title,
  rows,
  onEdit,
}: {
  icon: typeof Target;
  title: string;
  rows: { label: string; value: string }[];
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E6E8F0] bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#FFEAEC]">
          <Icon className="size-3.5 text-[#E11D28]" />
        </span>
        <b className="flex-1 text-[11.5px] font-bold text-[#111827]">{title}</b>
        <button
          onClick={onEdit}
          className="flex items-center gap-0.5 text-[10px] font-semibold text-[#E11D28] transition-opacity hover:opacity-75"
        >
          <Pencil className="size-2.5" />
          Edit
        </button>
      </div>
      <dl className="space-y-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[96px_1fr] items-start gap-2 text-[10px]">
            <dt className="text-[#8791A4]">{label}</dt>
            <dd className="min-w-0 truncate font-medium text-[#374151]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReviewSection({
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
      letter="F"
      title="Review & Launch"
      caption="Check everything below, then launch your campaign."
    >
      <div className="grid gap-2 lg:grid-cols-2">
        <ReviewCard
          icon={Megaphone}
          title="Campaign Basics"
          onEdit={() => goTo(1)}
          rows={[
            { label: "Name", value: draft.name },
            { label: "Type", value: draft.type },
            { label: "Client", value: draft.client },
            { label: "Owner", value: draft.owner },
            { label: "Priority", value: draft.priority },
          ]}
        />
        <ReviewCard
          icon={Target}
          title="Goals & Budget"
          onEdit={() => goTo(2)}
          rows={[
            { label: "Objective", value: draft.objective },
            { label: "Total Budget", value: `₹${draft.totalBudget}` },
            { label: "Daily Budget", value: `₹${draft.dailyBudget}/day` },
            { label: "Duration", value: `${draft.startDate} – ${draft.endDate}` },
            { label: "Target CPL", value: `₹${draft.targetCpl}` },
          ]}
        />
        <ReviewCard
          icon={Globe2}
          title="Channels"
          onEdit={() => goTo(3)}
          rows={[
            { label: "Selected", value: `${draft.channels.length} channels` },
            { label: "Platforms", value: draft.channels.join(", ") || "None selected" },
          ]}
        />
        <ReviewCard
          icon={Users}
          title="Audience"
          onEdit={() => goTo(4)}
          rows={[
            { label: "Type", value: draft.audienceType },
            { label: "Age / Gender", value: `${draft.ageRange} · ${draft.gender}` },
            { label: "Locations", value: draft.locations.join(", ") },
            { label: "Interests", value: draft.interests.join(", ") },
            { label: "Devices", value: draft.devices.join(", ") },
          ]}
        />
        <ReviewCard
          icon={ImageIcon}
          title="Content"
          onEdit={() => goTo(5)}
          rows={[
            { label: "Headline", value: draft.headline },
            { label: "Primary Text", value: draft.primaryText },
            { label: "Call to Action", value: draft.cta },
            { label: "Landing Page", value: draft.landingUrl },
          ]}
        />
        <ReviewCard
          icon={CalendarClock}
          title="Schedule"
          onEdit={() => goTo(5)}
          rows={[
            { label: "Mode", value: draft.publishMode },
            { label: "Date", value: draft.publishDate },
            { label: "Time", value: draft.publishTime },
            { label: "Frequency", value: draft.frequency },
            { label: "Time Zone", value: draft.timezone },
          ]}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#CDECE1] bg-[#F2FBF7] px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Rocket className="mt-px size-4 shrink-0 text-[#0AA673]" />
          <p className="text-[10px] leading-[14px] text-[#2F6B57]">
            <b className="block text-[10.5px] text-[#0B6B4F]">Ready to launch</b>
            The campaign will start on {draft.startDate} and run until {draft.endDate}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("confirmed", !draft.confirmed)}
          className="flex items-center gap-1.5 text-[10.5px] font-medium text-[#374151]"
        >
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded border transition-colors",
              draft.confirmed ? "border-[#0AA673] bg-[#0AA673]" : "border-[#CBD5E1] bg-white",
            )}
          >
            {draft.confirmed && <Check className="size-2.5 text-white" />}
          </span>
          I confirm the campaign details are correct.
        </button>
      </div>
    </Section>
  );
}

