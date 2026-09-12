"use client";

import Image from "next/image";
import mokshaLogo from "@/assets/moksha-sewa-logo.png";
import { Building2, CloudUpload, Globe, Layers, LineChart, Link2, MapPin, Timer, UserRound, Wallet, X, Zap } from "lucide-react";
import type { ClientDraft } from "../draft";
import {
  Field,
  NeedHelpCard,
  RailBullets,
  RailCard,
  SelectInput,
  StepHeader,
  TextInput,
} from "../ui";
import RichTextEditor from "@/components/layout/rich-text-editor";

const CLIENT_TYPES = ["NGO / Non-Profit", "Business / Corporate", "Startup", "Agency", "Government", "Education"] as const;
const INDUSTRIES = ["Social Impact / NGO", "Healthcare", "Education", "Retail / E-commerce", "Travel & Tourism", "Technology"] as const;
const COUNTRIES = ["India", "United States", "United Kingdom", "Singapore", "UAE"] as const;
const TIMEZONES = [
  "(GMT+05:30) India Standard Time (IST)",
  "(GMT+00:00) Coordinated Universal Time",
  "(GMT-05:00) Eastern Time (ET)",
  "(GMT+04:00) Gulf Standard Time",
] as const;
const CURRENCIES = ["INR – Indian Rupee (₹)", "USD – US Dollar ($)", "GBP – Pound Sterling (£)", "AED – UAE Dirham (د.إ)"] as const;

export function BasicStep({
  draft,
  set,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <>
      <StepHeader
        icon={UserRound}
        step={1}
        title="Basic Information"
        description="Let's start with the essential details about your client."
        tip="You can update these details anytime later from client settings."
      />
      <div className="grid gap-x-5 gap-y-3 p-5 md:grid-cols-2">
        <Field label="Client / Brand Name" required hint="Enter the name of the client or brand.">
          <TextInput value={draft.brandName} onChange={(v) => set("brandName", v)} placeholder="Moksha Sewa" />
        </Field>
        <Field label="Legal / Company Name" hint="Registered business name (if applicable).">
          <TextInput value={draft.legalName} onChange={(v) => set("legalName", v)} placeholder="Moksha Sewa Foundation" />
        </Field>

        <Field label="Client Type" required hint="Select the type of client.">
          <SelectInput icon={Building2} value={draft.clientType} onChange={(v) => set("clientType", v)} options={CLIENT_TYPES} />
        </Field>
        <Field label="Industry / Category" required hint="Choose the primary industry.">
          <SelectInput icon={Layers} value={draft.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} />
        </Field>

        <Field
          label="Short Description"
          required
          hint="Briefly describe your client's business or mission."
          className="md:col-span-2"
        >
          <RichTextEditor value={draft.shortDescription} onChange={(v) => set("shortDescription", v as any)} placeholder="Describe your client's business or mission..." minHeight="80px" />
        </Field>

        <Field label="Primary Website URL" required hint="Enter the main website URL (including https://)." className="md:col-span-2 lg:col-span-1">
          <TextInput icon={Link2} value={draft.websiteUrl} onChange={(v) => set("websiteUrl", v)} placeholder="https://example.org" />
        </Field>
        <div className="grid grid-cols-2 gap-x-5">
          <Field label="Country" required>
            <SelectInput icon={Globe} value={draft.country} onChange={(v) => set("country", v)} options={COUNTRIES} />
          </Field>
          <Field label="City / Service Area" required hint="Primary city or service area.">
            <TextInput icon={MapPin} value={draft.city} onChange={(v) => set("city", v)} placeholder="New Delhi" />
          </Field>
        </div>

        <Field label="Timezone" required hint="Used for scheduling and reports.">
          <SelectInput icon={Timer} value={draft.timezone} onChange={(v) => set("timezone", v)} options={TIMEZONES} />
        </Field>
        <Field label="Default Currency" required hint="Used for reporting and campaign budgets.">
          <SelectInput icon={Wallet} value={draft.currency} onChange={(v) => set("currency", v)} options={CURRENCIES} />
        </Field>

        <Field label="Client Logo" className="md:col-span-2">
          <div className="grid gap-2.5 md:grid-cols-[1fr_1fr_1fr]">
            <label className="flex h-[86px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#C7D2FE] bg-[#F8FAFF] px-3 text-center transition-colors hover:bg-[#EEF2FF]">
              <CloudUpload className="size-5 text-[#4F46E5]" />
              <span className="mt-1 text-[11px] font-semibold text-[#374151]">Drag &amp; drop your logo here</span>
              <span className="text-[10px] text-[#9CA3AF]">or click to browse</span>
              <span className="text-[9.5px] text-[#9CA3AF]">PNG, JPG or SVG (Max 2MB)</span>
              <input type="file" accept="image/*" className="hidden" />
            </label>

            <div className="relative flex h-[86px] items-center justify-center gap-2.5 rounded-xl border border-[#E6E8F0] bg-white px-3">
              {/* The supplied logo is a full lockup (mark + "MOKSHA SEWA"), so the
                  name is not repeated here — only the tagline sits beside it. */}
              <Image
                src={mokshaLogo}
                alt="Moksha Sewa logo"
                width={132}
                height={134}
                className="h-[62px] w-auto max-w-[118px] shrink-0 object-contain"
              />
              <small className="text-[9.5px] leading-3 text-[#9CA3AF]">Dignity for Every Life</small>
              <button
                aria-label="Remove logo"
                className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-colors hover:bg-[#E2E8F0]"
              >
                <X className="size-3" />
              </button>
            </div>

            <Field label="Brand Color" optional hint="Used for branding in reports and dashboards.">
              <div className="flex h-[42px] items-center gap-2 rounded-lg border border-[#E2E5EE] bg-white px-2">
                <input
                  type="color"
                  value={draft.brandColor}
                  onChange={(event) => set("brandColor", event.target.value)}
                  className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  aria-label="Brand colour"
                />
                <input
                  value={draft.brandColor}
                  onChange={(event) => set("brandColor", event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] uppercase outline-none"
                />
              </div>
            </Field>
          </div>
        </Field>
      </div>
    </>
  );
}

export function BasicRail() {
  return (
    <>
      <RailCard>
        <div className="mb-3 grid h-[108px] place-items-center rounded-xl bg-gradient-to-b from-[#EEF2FF] to-[#F8FAFF]">
          <div className="relative">
            <span className="grid h-[62px] w-[86px] place-items-center rounded-lg border border-[#C7D2FE] bg-white shadow-sm">
              <UserRound className="size-7 text-[#4F46E5]" />
            </span>
            <span className="absolute -bottom-2 -right-2 grid size-7 place-items-center rounded-lg bg-[#4F46E5] text-white shadow-sm">
              <Zap className="size-3.5" />
            </span>
          </div>
        </div>
        <b className="block text-center text-[15px] font-bold text-[#111827]">Start with the basics</b>
        <p className="mx-auto mb-4 mt-1 text-center text-[11.5px] leading-[17px] text-[#6B7280]">
          This information helps us personalize your client&apos;s workspace and provide better
          recommendations.
        </p>
        <RailBullets
          items={[
            { icon: Layers, label: "All-in-one marketing workspace" },
            { icon: Link2, label: "Connect multiple digital channels" },
            { icon: LineChart, label: "Track performance in one place" },
            { icon: Zap, label: "Save time and improve results" },
          ]}
        />
      </RailCard>
      <NeedHelpCard />
    </>
  );
}
