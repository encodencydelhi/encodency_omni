"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/features/companies/components/primitives";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { OVERRIDE_LABEL, TIMING_LABEL, routes } from "../data/config";
import { companyMayOverride } from "../data/effective-config";
import { formatCurrencyPreview, formatDatePreview, formatSettingValue, formatTimePreview, separatorsOf, weekdayPreview } from "../data/formatting";
import { getDefinition } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot, SettingValues } from "../data/types";
import { PREVIEW_TIMESTAMP } from "../data/config";
import { SectionData, SettingGroup, TablePanel, ViewOnlyNotice } from "../components/section-parts";
import { regionalOf } from "../components/setting-field";
import { useSectionEditor } from "../components/use-section-editor";

function PreviewCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-border bg-muted/30 px-3 py-2">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[0.8125rem] font-semibold tabular text-foreground">{value}</p>
      {hint ? <p className="truncate text-2xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DateTimePreview({ values }: { values: SettingValues }) {
  const sample = regionalOf(values);
  return (
    <Panel title="Date and Time Preview" description="An example: a fixed demonstration moment (19 Sep 2026, 12:00 UTC) formatted with the selected settings. It is not a live clock.">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <PreviewCell label="Timezone" value={sample.timezone} hint={sample.locale} />
        <PreviewCell label="Date" value={formatDatePreview(sample)} hint={sample.dateFormat} />
        <PreviewCell label="Time" value={formatTimePreview(sample)} hint={sample.timeFormat === "24h" ? "24-hour" : "12-hour"} />
        <PreviewCell label="Week starts" value={weekdayPreview(String(values["localization.first_day_of_week"])).slice(0, 3).join(" ")} hint={String(values["localization.first_day_of_week"])} />
      </div>
      <p className="sr-only">Example moment: {PREVIEW_TIMESTAMP}</p>
    </Panel>
  );
}

function CurrencyPreview({ values }: { values: SettingValues }) {
  const locale = String(values["localization.number_locale"] ?? "en-IN");
  const separators = separatorsOf(locale);
  const show = (text: string) => (text === " " || text === " " || text === " " ? "space" : text || "none");
  return (
    <Panel title="Currency Preview" description="An example amount, not a price. Changing the display currency never converts a stored price, invoice or historical financial record.">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <PreviewCell label="Amount" value={formatCurrencyPreview({ currency: String(values["localization.display_currency"]), locale, display: String(values["localization.currency_display"]) })} hint="1,234,567.89 as an example" />
        <PreviewCell label="Currency" value={String(values["localization.display_currency"])} />
        <PreviewCell label="Thousands separator" value={show(separators.group)} />
        <PreviewCell label="Decimal separator" value={show(separators.decimal)} />
      </div>
    </Panel>
  );
}

const INHERITED = [
  "localization.default_timezone",
  "localization.default_locale",
  "localization.date_format",
  "localization.time_format",
  "localization.first_day_of_week",
  "localization.display_currency",
  "security.company_users.mfa_minimum",
] as const;

function InheritanceTable({ values }: { values: SettingValues }) {
  const rows = INHERITED.map((key) => getDefinition(key)).filter((item) => item !== undefined);
  return (
    <TablePanel title="Company Inheritance Rules" description="What companies inherit, and whether they may replace it. Changing a default never rewrites a company's own choice.">
      <MiniTable
        caption="Company inheritance rules"
        rows={rows}
        getKey={(definition) => definition.key}
        columns={[
          { id: "setting", header: "Setting", cell: (definition) => <span className="font-medium text-foreground">{definition.name.replace(/^Default /, "")}</span> },
          { id: "default", header: "Platform Default", cell: (definition) => <span className="tabular">{formatSettingValue(definition, values[definition.key])}</span> },
          {
            id: "override",
            header: "Company Override",
            cell: (definition) => {
              const allowed = companyMayOverride(definition, values);
              const label = definition.override === "stricter_only" ? (allowed ? "Stricter only" : "Off") : allowed ? "Allowed" : definition.override === "allowed" ? "Off (governance)" : "Not allowed";
              return <Badge tone={allowed ? OVERRIDE_LABEL[definition.override].tone : "neutral"}>{label}</Badge>;
            },
          },
          {
            id: "behaviour",
            header: "Effective Behaviour",
            hideBelow: "md",
            cell: (definition) =>
              definition.override === "stricter_only" ? (
                <span className="text-2xs text-muted-foreground">Platform minimum applies. A company may strengthen it, never weaken it.</span>
              ) : (
                <span className="text-2xs text-muted-foreground">{TIMING_LABEL[definition.timing].label}: {TIMING_LABEL[definition.timing].description}</span>
              ),
          },
        ]}
      />
      <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">
        Company override switches are edited in <Link href={routes.section("governance", { tab: "customization" })} className="font-medium text-primary hover:underline">Access &amp; Governance</Link>.
      </p>
    </TablePanel>
  );
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("localization", config, pending);
  const values = editor.values;
  const timezoneChanged = editor.dirtyKeys.includes("localization.default_timezone");
  const inheritanceValues = useMemo(() => ({ ...values }), [values]);
  return (
    <div className="space-y-3">
      {!editor.canEdit ? <ViewOnlyNotice section="localization" /> : null}
      {editor.banner}
      <SettingGroup editor={editor} group="regional" />
      {timezoneChanged ? (
        <AlertBanner tone="info" title="Existing Companies Keep Their Own Timezone">
          Companies that chose a timezone are unchanged. Only companies without one, and companies created from now on, follow the new default.
        </AlertBanner>
      ) : null}
      <DateTimePreview values={values} />
      <SettingGroup editor={editor} group="currency" />
      <CurrencyPreview values={values} />
      <InheritanceTable values={inheritanceValues} />
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function LocalizationDefaultsSection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
