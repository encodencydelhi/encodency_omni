"use client";

import {
  CircleCheck,
  Clock,
  FileText,
  Globe,
  Languages,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import type { ClientDraft } from "../draft";
import { ChannelLogo } from "../../../../shared/channel-logo";
import {
  Field,
  NeedHelpCard,
  RailBullets,
  RailCard,
  SelectInput,
  StepHeader,
  TextInput,
  TextareaField,
  Toggle,
} from "../ui";
import { cn } from "@/lib/utils/cn";

const COUNTRIES = ["India", "United States", "United Kingdom", "Singapore", "UAE"] as const;
const LANGUAGES = ["English", "Hindi", "Tamil", "Bengali", "Marathi"] as const;
const SEO_CATEGORIES = ["Non-Profit / NGO", "Healthcare", "Education", "Retail", "Travel"] as const;
const CRAWL = ["Daily", "Weekly", "Fortnightly", "Monthly"] as const;

const IMPORT_METHODS = [
  { id: "manual", icon: Pencil, title: "Manual Entry", caption: "Add keywords manually" },
  { id: "csv", icon: Upload, title: "Import from CSV", caption: "Upload a CSV file" },
  { id: "console", icon: Search, title: "Import from Search Console", caption: "Last existing keywords" },
] as const;

function ConnectedIntegration({ channel, name, account, synced }: { channel: string; name: string; account: string; synced: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#E6E8F0] bg-white p-3">
      <ChannelLogo channel={channel} className="size-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[12px] font-bold text-[#111827]">{name}</b>
        <p className="truncate text-[10.5px] text-[#6B7280]">{account}</p>
        <p className="text-[10px] text-[#9CA3AF]">Last synced: {synced}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="flex items-center gap-1 rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-semibold text-[#059669]">
          <CircleCheck className="size-3" />
          Connected
        </span>
        <button className="rounded-md border border-[#E2E5EE] px-2 py-1 text-[10px] font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]">
          Disconnect
        </button>
      </div>
    </div>
  );
}

export function WebsiteStep({
  draft,
  set,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <>
      <StepHeader
        icon={Globe}
        step={3}
        title="Website & SEO"
        description="Set up the website details and SEO configuration for your client."
        tip="We'll automatically discover your website pages using a crawl or sitemap. You don't need to add pages manually."
      />
      <div className="grid gap-x-5 gap-y-3 p-5 md:grid-cols-2">
        <Field label="Primary Website URL" required hint="Enter the main website URL (including https://).">
          <TextInput icon={Link2} value={draft.websiteUrl} onChange={(v) => set("websiteUrl", v)} />
        </Field>
        <Field label="Additional Website / Landing Page URLs" optional hint="Add any additional websites, subdomains or landing pages.">
          <div className="flex gap-2">
            <span className="min-w-0 flex-1">
              <TextInput icon={Link2} value="" onChange={() => {}} placeholder="https://www.example.com" />
            </span>
            <button className="flex h-[42px] shrink-0 items-center gap-1 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 text-[11px] font-semibold text-[#4F46E5] transition-colors hover:bg-[#E0E7FF]">
              <Plus className="size-3.5" />
              Add Another
            </button>
          </div>
        </Field>

        <div className="grid gap-x-5 gap-y-3 md:col-span-2 md:grid-cols-4">
          <Field label="Sitemap URL" optional hint="If available, enter your sitemap URL.">
            <TextInput icon={Link2} value={draft.sitemapUrl} onChange={(v) => set("sitemapUrl", v)} placeholder="https://site.org/sitemap.xml" />
          </Field>
          <Field label="Target Country" required hint="Primary target country for SEO.">
            <SelectInput icon={Globe} value={draft.targetCountry} onChange={(v) => set("targetCountry", v)} options={COUNTRIES} />
          </Field>
          <Field label="Target Language" required hint="Primary target language.">
            <SelectInput icon={Languages} value={draft.targetLanguage} onChange={(v) => set("targetLanguage", v)} options={LANGUAGES} />
          </Field>
          <Field label="Business Category for SEO" required hint="Helps us set relevant keywords and audits.">
            <SelectInput value={draft.seoCategory} onChange={(v) => set("seoCategory", v)} options={SEO_CATEGORIES} />
          </Field>
        </div>

        <div className="grid gap-2.5 md:col-span-2 md:grid-cols-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E6E8F0] bg-white p-3">
            <div className="min-w-0">
              <b className="block text-[12px] font-bold text-[#111827]">SEO Tracking Enabled</b>
              <p className="mt-0.5 text-[10.5px] leading-[15px] text-[#6B7280]">
                Track keyword rankings, organic traffic and SEO performance for this client.
              </p>
            </div>
            <Toggle on={draft.seoTracking} onToggle={() => set("seoTracking", !draft.seoTracking)} />
          </div>
          <ConnectedIntegration channel="Search Console" name="Google Search Console" account="mokshasewa.org" synced="Today, 10:24 AM" />
          <ConnectedIntegration channel="Google" name="Google Analytics 4" account="Moksha Sewa (GA4)" synced="Today, 10:18 AM" />
        </div>

        <div className="grid gap-x-5 gap-y-3 md:col-span-2 md:grid-cols-3">
          <Field label="robots.txt URL" optional hint="Enter your robots.txt URL if available.">
            <TextInput icon={Link2} value={draft.robotsUrl} onChange={(v) => set("robotsUrl", v)} placeholder="https://site.org/robots.txt" />
          </Field>
          <Field label="Preferred Crawl Frequency" hint="How often we should crawl your website.">
            <SelectInput icon={Clock} value={draft.crawlFrequency} onChange={(v) => set("crawlFrequency", v)} options={CRAWL} />
          </Field>
          <Field label="Important Priority Pages" optional hint="Add key pages to prioritize (comma separated).">
            <TextInput icon={ListChecks} value={draft.priorityPages} onChange={(v) => set("priorityPages", v)} />
          </Field>
        </div>

        <Field label="Keyword Import Method" required>
          <div className="grid gap-2 sm:grid-cols-3">
            {IMPORT_METHODS.map(({ id, icon: Icon, title, caption }) => {
              const active = draft.keywordImport === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("keywordImport", id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors",
                    active ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#E2E5EE] bg-white hover:border-[#C7D2FE]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]",
                      active ? "border-[#4F46E5]" : "border-[#CBD5E1]",
                    )}
                  >
                    {active && <i className="block size-2 rounded-full bg-[#4F46E5]" />}
                  </span>
                  <Icon className={cn("size-4 shrink-0", active ? "text-[#4F46E5]" : "text-[#9CA3AF]")} />
                  <span className="min-w-0">
                    <b className="block truncate text-[11.5px] font-semibold text-[#111827]">{title}</b>
                    <small className="block truncate text-[10px] text-[#9CA3AF]">{caption}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Competitor Websites" optional hint="Add competitor websites for better keyword research and insights.">
          <div className="flex gap-2">
            <span className="min-w-0 flex-1">
              <TextInput icon={Link2} value={draft.competitorSites} onChange={(v) => set("competitorSites", v)} placeholder="https://www.competitor1.org" />
            </span>
            <button className="flex h-[42px] shrink-0 items-center gap-1 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 text-[11px] font-semibold text-[#4F46E5] transition-colors hover:bg-[#E0E7FF]">
              <Plus className="size-3.5" />
              Add Another
            </button>
          </div>
        </Field>

        <Field
          label="Technical SEO Notes"
          optional
          hint="Share any specific technical details, CMS information or special requirements."
          className="md:col-span-2"
        >
          <TextareaField
            value={draft.technicalNotes}
            onChange={(v) => set("technicalNotes", v)}
            rows={2}
            max={1000}
            placeholder="Add any additional information about your website, technical setup, or SEO requirements..."
          />
        </Field>
      </div>
    </>
  );
}

export function WebsiteRail() {
  return (
    <>
      <RailCard>
        <div className="mb-3 grid h-[108px] place-items-center rounded-xl bg-gradient-to-b from-[#EEF2FF] to-[#F8FAFF]">
          <span className="grid h-[62px] w-[86px] place-items-center rounded-lg border border-[#C7D2FE] bg-white shadow-sm">
            <Search className="size-7 text-[#4F46E5]" />
          </span>
        </div>
        <b className="block text-center text-[15px] font-bold text-[#111827]">
          What will happen after this step?
        </b>
        <p className="mx-auto mb-4 mt-1 text-center text-[11.5px] leading-[17px] text-[#6B7280]">
          We&apos;ll take care of the technical setup and discover your website pages automatically.
          Here&apos;s what happens next:
        </p>
        <RailBullets
          items={[
            { icon: Globe, label: "Set up website crawl and sitemap" },
            { icon: FileText, label: "Automatically discover all pages" },
            { icon: ListChecks, label: "Run a comprehensive SEO audit" },
            { icon: Link2, label: "Set up keyword tracking" },
            { icon: Clock, label: "Enable automated reporting" },
          ]}
        />
      </RailCard>
      <NeedHelpCard />
    </>
  );
}
