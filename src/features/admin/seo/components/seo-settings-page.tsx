"use client";

import type { ReactNode } from "react";
import {
  Bell,
  Bot,
  CheckCircle2,
  Globe,
  Languages,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  Target,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { Box, Pill, SeoShell, Toggle } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const integrations = [
  { name: "Google Search Console", detail: "namogangetrust.org · synced 2h ago", connected: true, icon: Search, color: "blue" },
  { name: "Google Analytics 4", detail: "Property G-8KD2N4LQ1P · synced 1h ago", connected: true, icon: Globe, color: "orange" },
  { name: "Google Business Profile", detail: "4 locations linked", connected: true, icon: MapPin, color: "green" },
  { name: "Bing Webmaster Tools", detail: "Not connected", connected: false, icon: Bot, color: "teal" },
  { name: "PageSpeed Insights API", detail: "Key configured · 12k calls left", connected: true, icon: Zap, color: "purple" },
];

const crawlSettings = [
  { label: "Crawl frequency", value: "Daily at 03:00 IST", type: "select" },
  { label: "Max pages per crawl", value: "500", type: "input" },
  { label: "Crawl depth limit", value: "5 levels", type: "select" },
  { label: "User agent", value: "EnCodency SEO Bot", type: "select" },
];

const crawlToggles = [
  { label: "Respect robots.txt", detail: "Skip URLs disallowed by your robots file.", on: true },
  { label: "Render JavaScript", detail: "Crawl with a headless browser for SPA routes.", on: true },
  { label: "Follow external links", detail: "Check outbound links for 404s.", on: false },
  { label: "Crawl subdomains", detail: "Include blog.namogangetrust.org and others.", on: false },
];

const trackingSettings = [
  { label: "Target country", value: "India", icon: MapPin },
  { label: "Search engine", value: "Google", icon: Search },
  { label: "Language", value: "English (en-IN)", icon: Languages },
  { label: "Device", value: "Mobile + Desktop", icon: Smartphone },
  { label: "Update frequency", value: "Daily", icon: RefreshCw },
  { label: "Keyword limit", value: "1,245 / 2,000 used", icon: Target },
];

const alerts = [
  { label: "Ranking drops", detail: "A tracked keyword falls 5+ positions.", on: true, channel: "Email + In-app" },
  { label: "New critical issues", detail: "The crawler finds a new critical error.", on: true, channel: "Email + In-app" },
  { label: "Lost backlinks", detail: "A referring domain with DR 40+ drops a link.", on: true, channel: "Email" },
  { label: "Traffic anomaly", detail: "Organic clicks move more than 25% week on week.", on: true, channel: "In-app" },
  { label: "Competitor overtakes you", detail: "A rival passes you on a top-10 keyword.", on: false, channel: "Email" },
  { label: "Weekly digest", detail: "Monday summary of the week's SEO movement.", on: true, channel: "Email" },
];

const competitors = [
  { name: "Ganga Action Parivar", domain: "gangaaction.org", dr: 64 },
  { name: "Clean Ganga Mission", domain: "nmcg.nic.in", dr: 72 },
  { name: "River Care India", domain: "rivercare.in", dr: 41 },
  { name: "Ganga Sewa Trust", domain: "gangasewa.org", dr: 34 },
];

const excluded = ["/admin/*", "/preview/*", "?utm_*", "/tag/*", "/search?*"];

const tint: Record<string, string> = {
  blue: "bg-[#EAF2FF] text-[#3186F3]",
  purple: "bg-[#F2EAFF] text-[#805AD5]",
  green: "bg-[#EAF5EF] text-[#0FA968]",
  orange: "bg-[#FFF0DC] text-[#F28C28]",
  teal: "bg-[#E2F6F5] text-[#0E9C92]",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[8.5px] font-bold text-[#52617D]">{label}</span>
      {children}
    </label>
  );
}

function ReadonlyInput({ value }: { value: string }) {
  return (
    <span className="flex h-7 items-center rounded border border-[#DDE4ED] bg-white px-2 text-[9px] text-[#172044]">
      {value}
    </span>
  );
}

export function SeoSettingsPage() {
  return (
    <SeoShell
      view="settings"
      title="SEO Settings"
      description="Configure crawling, keyword tracking, integrations and who gets alerted."
      action={
        <button className="flex h-8 items-center gap-1.5 rounded bg-[#EB0711] px-3 text-[9.5px] font-semibold text-white shadow-sm hover:bg-[#C90610]">
          <Save className="size-3.5" />
          Save Changes
        </button>
      }
    >
      <div className="grid items-start gap-2 xl:grid-cols-[1.1fr_1fr]">
        <Box title="Site & Domain" className="h-[278px]">
          <div className="space-y-2.5 p-3">
            <Field label="Primary domain">
              <ReadonlyInput value="https://namogangetrust.org" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Preferred protocol">
                <ReadonlyInput value="HTTPS" />
              </Field>
              <Field label="WWW handling">
                <ReadonlyInput value="Redirect to non-www" />
              </Field>
            </div>
            <Field label="XML sitemap URL">
              <ReadonlyInput value="/sitemap.xml" />
            </Field>
            <div className="flex items-center gap-2 rounded border border-[#D8F2E7] bg-[#F2FBF7] px-2 py-1.5">
              <CheckCircle2 className="size-3.5 shrink-0 text-[#0FA968]" />
              <span className="min-w-0 flex-1 text-[8.5px] text-[#0B7A50]">
                Domain verified via DNS TXT record on Feb 8, 2025.
              </span>
              <Pill tone="good">Verified</Pill>
            </div>
          </div>
        </Box>

        <Box title="Connected Integrations" className="h-[278px]" action={<span className="text-[#10B981]">4 of 5 active</span>}>
          <div className="px-3">
            {integrations.map(({ name, detail, connected, icon: Icon, color }) => (
              <div
                key={name}
                className="flex items-center gap-2 border-b border-[#EDF1F5] py-[9px] last:border-b-0"
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", tint[color])}>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9.5px] font-semibold text-[#172044]">{name}</b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">{detail}</small>
                </span>
                {connected ? (
                  <>
                    <Pill tone="good">Connected</Pill>
                    <button className="shrink-0 rounded border border-[#DDE4ED] px-1.5 py-0.5 text-[8px] font-semibold text-[#425273] hover:bg-[#F8FAFD]">
                      Manage
                    </button>
                  </>
                ) : (
                  <button className="shrink-0 rounded bg-[#EB0711] px-2 py-0.5 text-[8px] font-bold text-white">
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </Box>
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[1fr_1fr_1fr]">
        <Box title="Crawler Configuration" className="h-[442px]">
          <div className="space-y-2 p-3">
            {crawlSettings.map((row) => (
              <Field key={row.label} label={row.label}>
                <ReadonlyInput value={row.value} />
              </Field>
            ))}
            <div className="space-y-1.5 border-t border-[#EDF1F5] pt-2">
              {crawlToggles.map((row) => (
                <div key={row.label} className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[9px] font-semibold text-[#172044]">{row.label}</b>
                    <small className="block text-[8px] leading-3 text-[#8A97AF]">{row.detail}</small>
                  </span>
                  <Toggle on={row.on} />
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Keyword Tracking" className="h-[442px]">
          <div className="p-3">
            {trackingSettings.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 border-b border-[#EDF1F5] py-2 last:border-b-0"
              >
                <Icon className="size-3.5 shrink-0 text-[#9AA6BC]" />
                <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-[#52617D]">
                  {label}
                </span>
                <b className="shrink-0 text-[9px] text-[#172044]">{value}</b>
              </div>
            ))}
            <div className="mt-2 rounded border border-[#E4EAF2] bg-[#FBFCFE] p-2">
              <div className="flex items-center justify-between text-[8.5px]">
                <span className="font-bold text-[#52617D]">Keyword quota</span>
                <b className="text-[#172044]">1,245 / 2,000</b>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#EDF1F7]">
                <i className="block h-full rounded-full bg-[#3186F3]" style={{ width: "62%" }} />
              </span>
              <p className="mt-1 text-[8px] text-[#8A97AF]">755 slots remaining on your plan.</p>
            </div>
          </div>
        </Box>

        <Box
          title="Alerts & Notifications"
          className="h-[442px]"
          action={<Bell className="size-3 text-[#9AA6BC]" />}
        >
          <div className="px-3">
            {alerts.map((row) => (
              <div key={row.label} className="flex items-start gap-2 border-b border-[#EDF1F5] py-2 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9px] font-semibold text-[#172044]">{row.label}</b>
                  <small className="block text-[8px] leading-3 text-[#8A97AF]">{row.detail}</small>
                  <Pill tone="low">{row.channel}</Pill>
                </span>
                <Toggle on={row.on} />
              </div>
            ))}
          </div>
        </Box>
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[1fr_1fr_.9fr]">
        <Box
          title="Tracked Competitors"
          className="h-[212px]"
          action={
            <button className="flex items-center gap-1 text-[9px] font-semibold text-[#EB0711]">
              <Plus className="size-3" />
              Add
            </button>
          }
        >
          <div className="px-3">
            {competitors.map((row) => (
              <div
                key={row.domain}
                className="flex items-center gap-2 border-b border-[#EDF1F5] py-2 last:border-b-0"
              >
                <Globe className="size-3.5 shrink-0 text-[#9AA6BC]" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9px] font-semibold text-[#172044]">{row.name}</b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">{row.domain}</small>
                </span>
                <span className="shrink-0 text-[8.5px] font-bold text-[#52617D]">DR {row.dr}</span>
                <button className="shrink-0 rounded p-0.5 text-[#EF4444] hover:bg-[#FFEAEC]">
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </Box>

        <Box
          title="Excluded URL Patterns"
          className="h-[212px]"
          action={
            <button className="flex items-center gap-1 text-[9px] font-semibold text-[#EB0711]">
              <Plus className="size-3" />
              Add pattern
            </button>
          }
        >
          <div className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {excluded.map((pattern) => (
                <span
                  key={pattern}
                  className="flex items-center gap-1.5 rounded border border-[#DDE4ED] bg-[#FBFCFE] px-2 py-1 font-mono text-[8.5px] text-[#425273]"
                >
                  {pattern}
                  <button className="text-[#9AA6BC] hover:text-[#EF4444]">×</button>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[8px] leading-3 text-[#8A97AF]">
              URLs matching these patterns are skipped during crawls and excluded from every report.
              Wildcards (<span className="font-mono">*</span>) are supported.
            </p>
          </div>
        </Box>

        <Box title="Access & Data" className="h-[212px]" action={<Lock className="size-3 text-[#9AA6BC]" />}>
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <Users className="size-3.5 shrink-0 text-[#9AA6BC]" />
              <span className="min-w-0 flex-1 text-[9px] font-semibold text-[#52617D]">
                Who can edit SEO settings
              </span>
              <b className="shrink-0 text-[9px] text-[#172044]">Admins only</b>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="size-3.5 shrink-0 text-[#9AA6BC]" />
              <span className="min-w-0 flex-1 text-[9px] font-semibold text-[#52617D]">
                Historical data retention
              </span>
              <b className="shrink-0 text-[9px] text-[#172044]">24 months</b>
            </div>
            <div className="flex items-start gap-2 rounded border border-[#FFE1E4] bg-[#FFF7F7] px-2 py-1.5">
              <Trash2 className="mt-0.5 size-3.5 shrink-0 text-[#D6293E]" />
              <span className="min-w-0 flex-1">
                <b className="block text-[9px] font-bold text-[#D6293E]">Reset SEO data</b>
                <small className="block text-[8px] leading-3 text-[#B4515C]">
                  Clears all crawl history, rankings and reports. This cannot be undone.
                </small>
              </span>
            </div>
            <button className="w-full rounded border border-[#F5C2C7] bg-white py-1 text-[9px] font-bold text-[#D6293E] hover:bg-[#FFF7F7]">
              Reset all SEO data
            </button>
          </div>
        </Box>
      </div>
    </SeoShell>
  );
}
