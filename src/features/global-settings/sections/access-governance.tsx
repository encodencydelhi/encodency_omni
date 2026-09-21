"use client";

import { ArrowUpRightIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Panel } from "@/features/companies/components/primitives";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { APPROVAL_LABEL, GOVERNANCE_TABS, MODULE_LINKS, SECTIONS, SECTION_ACCESS, routes, type GovernanceTab } from "../data/config";
import { formatSettingValue } from "../data/formatting";
import { useGlobalSettingsCapabilities } from "../data/hooks";
import { SETTING_DEFINITIONS, getDefinition } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot, SectionKey, SettingValues } from "../data/types";
import { SettingDetails } from "../components/setting-field";
import { SectionData, SubTabs, TablePanel, useFocusKey, useTab, ViewOnlyNotice } from "../components/section-parts";
import { useSectionEditor, type SectionEditor } from "../components/use-section-editor";

function AccessMatrix() {
  const capabilities = useGlobalSettingsCapabilities();
  const rows = SECTIONS.map((section) => {
    const access = SECTION_ACCESS[section.key];
    const own = SETTING_DEFINITIONS.filter((item) => item.section === section.key);
    return { section, access, total: own.length, critical: own.filter((item) => item.sensitivity === "critical").length, high: own.filter((item) => item.sensitivity === "high").length };
  });
  return (
    <TablePanel title="Settings Access Matrix" description="Capability keys per category. Staff membership and role assignments are managed in Internal Team / Users, not here.">
      <MiniTable
        caption="Settings access matrix"
        rows={rows}
        getKey={(row) => row.section.key}
        columns={[
          { id: "category", header: "Category", cell: (row) => <span className="font-medium text-foreground">{row.section.label}</span> },
          {
            id: "view",
            header: "View Capability",
            cell: (row) => (
              <div>
                <code className="text-[11px] text-foreground">{row.access.view}</code>
                <p className="text-2xs text-muted-foreground">{row.access.viewPermissions.join(" + ")}</p>
              </div>
            ),
          },
          {
            id: "edit",
            header: "Edit Capability",
            cell: (row) => (
              <div>
                <code className="text-[11px] text-foreground">{row.access.edit}</code>
                <p className="text-2xs text-muted-foreground">{row.access.editPermissions.join(" + ")}</p>
                <p className="text-2xs">You: <span className={capabilities[row.access.edit] ? "font-medium text-success" : "font-medium text-muted-foreground"}>{capabilities[row.access.edit] ? "can" : "cannot"}</span></p>
              </div>
            ),
          },
          { id: "approval", header: "Sensitive Approval", hideBelow: "md", cell: (row) => <Badge tone={row.access.approval === "sensitive_review" ? "warning" : "neutral"}>{APPROVAL_LABEL[row.access.approval]}</Badge> },
          {
            id: "details",
            header: "Details",
            hideBelow: "lg",
            cell: (row) => (
              <span className="text-2xs text-muted-foreground">
                {row.total > 0 ? `${row.total} settings; ${row.critical} security-critical, ${row.high} high impact. ` : ""}
                {row.access.note}
              </span>
            ),
          },
        ]}
      />
    </TablePanel>
  );
}

const SENSITIVE_KEYS = [
  "security.sensitive.require_reason",
  "security.sensitive.require_reauth",
  "security.sensitive.require_mfa",
  "security.sensitive.require_secondary_approval",
  "security.sensitive.require_audit",
] as const;

function SensitiveGovernance({ saved }: { saved: SettingValues }) {
  const scope = SECTIONS.filter((section) => section.key !== "history").map((section) => {
    const own = SETTING_DEFINITIONS.filter((item) => item.section === section.key);
    return { key: section.key as SectionKey, label: section.label, held: own.filter((item) => item.approval === "sensitive_review").length, reason: own.filter((item) => item.approval === "reason").length };
  });
  return (
    <>
      <TablePanel
        title="Sensitive Change Requirements"
        description="What a sensitive change needs. These are edited under Authentication & Security, so there is one copy."
        action={<Link href={routes.section("security", { tab: "sensitive" })} className="text-2xs font-medium text-primary hover:underline">Edit in Security</Link>}
      >
        <MiniTable
          caption="Sensitive change requirements"
          rows={SENSITIVE_KEYS.map((key) => getDefinition(key)).filter((item) => item !== undefined)}
          getKey={(definition) => definition.key}
          columns={[
            { id: "name", header: "Requirement", cell: (definition) => <span className="font-medium text-foreground">{definition.name}</span> },
            { id: "value", header: "Currently", cell: (definition) => <Badge tone={saved[definition.key] === true ? "success" : "warning"}>{formatSettingValue(definition, saved[definition.key])}</Badge> },
            { id: "mode", header: "Policy", hideBelow: "md", cell: (definition) => (definition.locked ? <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground"><LockIcon className="size-3" aria-hidden />Mandatory, not editable</span> : <span className="text-2xs text-muted-foreground">Mandatory Minimum</span>) },
          ]}
        />
        <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">
          Review before saving is always shown. Real reauthentication, MFA and approval are enforced by the backend; editing this frontend state cannot bypass them.
        </p>
      </TablePanel>
      <TablePanel title="Affected Scope" description="How many settings in each category need a reason, or are held for review as pending drafts.">
        <MiniTable
          caption="Affected scope"
          rows={scope}
          getKey={(row) => row.key}
          columns={[
            { id: "label", header: "Category", cell: (row) => <span className="font-medium text-foreground">{row.label}</span> },
            { id: "reason", header: "Need a Reason", align: "right", cell: (row) => <span className="tabular">{row.reason}</span> },
            { id: "held", header: "Held for Review", align: "right", cell: (row) => <span className="tabular font-medium text-foreground">{row.held}</span> },
          ]}
        />
      </TablePanel>
    </>
  );
}

function OverrideSwitch({ editor, settingKey }: { editor: SectionEditor; settingKey: string }) {
  const definition = getDefinition(settingKey);
  if (!definition) return null;
  const checked = editor.values[settingKey] === true;
  const edited = editor.values[settingKey] !== editor.saved[settingKey];
  const pending = editor.pendingByKey[settingKey];
  return (
    <div className="flex items-center gap-2" id={`setting-${settingKey}`} data-setting-key={settingKey}>
      <Switch checked={checked} disabled={!editor.canEdit} onCheckedChange={(next) => editor.set(settingKey, next)} aria-label={definition.name} />
      <span className="text-[0.8125rem] text-foreground">{checked ? "Allowed" : "Off"}</span>
      {edited ? <Badge tone="warning">Edited</Badge> : null}
      {pending ? <Badge tone="warning">Pending</Badge> : null}
      <SettingDetails definition={definition} />
    </div>
  );
}

interface CustomizationRow {
  id: string;
  label: string;
  platform: string;
  gate?: string;
  range: string;
  behaviour: string;
  fixed?: string;
}

function customizationRows(values: SettingValues): CustomizationRow[] {
  const text = (key: string) => formatSettingValue(getDefinition(key), values[key]);
  return [
    { id: "tz", label: "Timezone", platform: text("localization.default_timezone"), gate: "governance.company_override.timezone", range: "Any Valid IANA Timezone", behaviour: "A company's own timezone replaces the platform default." },
    { id: "lang", label: "Language", platform: text("localization.default_locale"), gate: "governance.company_override.language", range: "Supported Languages", behaviour: "A company's own language replaces the platform default." },
    { id: "fmt", label: "Date, Time Format & First Day", platform: `${text("localization.date_format")}, ${text("localization.time_format")}`, gate: "governance.company_override.regional_formats", range: "Supported Formats", behaviour: "A company's own formats replace the platform defaults." },
    { id: "mfa", label: "MFA", platform: text("security.company_users.mfa_minimum"), gate: "governance.company_override.mfa_stricter", range: "The same as the minimum or stricter", behaviour: "A company may strengthen the requirement; it can never weaken the platform minimum." },
    { id: "session", label: "Session Timeout", platform: text("security.sessions.company_idle_timeout_minutes"), gate: "governance.company_override.session_timeout", range: "Shorter Than the Platform Value", behaviour: "A company may choose a shorter idle timeout, never a longer one." },
    { id: "identity", label: "Platform Identity", platform: text("identity.platform_name"), range: "Not Overridable", behaviour: "Name, logos and contacts are platform-owned.", fixed: "Not company-overridable" },
    { id: "plans", label: "Plans and Pricing", platform: "Managed in Plans & Subscriptions", range: "Not Overridable", behaviour: "Companies cannot customise global plans. Company entitlements are overrides in Plans & Subscriptions.", fixed: "Not company-overridable" },
    { id: "credentials", label: "Provider Credentials", platform: "Managed in Integrations", range: "Not Overridable", behaviour: "Companies never change platform provider credentials or OAuth applications.", fixed: "Not company-overridable" },
    { id: "policies", label: "Mandatory Platform Policies", platform: "Mandatory Minimums", range: "Strengthen Only", behaviour: "A mandatory minimum can only be met or exceeded.", fixed: "Cannot Be Weakened" },
  ];
}

function Customization({ editor }: { editor: SectionEditor }) {
  const rows = customizationRows(editor.values);
  const focus = useFocusKey();
  // A search result lands on its switch: bring it into view and mark it briefly.
  useEffect(() => {
    if (!focus) return;
    const row = document.getElementById(`setting-${focus}`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
    row?.classList.add("bg-primary-subtle", "rounded-sm", "px-1");
    const timer = window.setTimeout(() => row?.classList.remove("bg-primary-subtle"), 2600);
    return () => window.clearTimeout(timer);
  }, [focus]);
  return (
    <TablePanel title="Company Customisation Policy" description="Which platform defaults a company may override, and how far. Switching one off makes companies follow the platform value; it does not delete their stored choice.">
      <MiniTable
        caption="Company customisation policy"
        rows={rows}
        getKey={(row) => row.id}
        columns={[
          { id: "setting", header: "Setting", cell: (row) => <span className="font-medium text-foreground">{row.label}</span> },
          { id: "platform", header: "Platform Default / Minimum", cell: (row) => <span className="text-[0.8125rem]">{row.platform}</span> },
          { id: "allowed", header: "Company Override", cell: (row) => (row.gate ? <OverrideSwitch editor={editor} settingKey={row.gate} /> : <Badge tone="neutral">{row.fixed}</Badge>) },
          { id: "range", header: "Allowed Range", hideBelow: "md", cell: (row) => <span className="text-2xs text-muted-foreground">{row.range}</span> },
          { id: "behaviour", header: "Effective Behaviour", hideBelow: "lg", cell: (row) => <span className="text-2xs text-muted-foreground">{row.behaviour}</span> },
        ]}
      />
      {Object.values(editor.errors).length > 0 ? <p role="alert" className="px-3 py-2 text-2xs text-danger">{Object.values(editor.errors)[0]}</p> : null}
    </TablePanel>
  );
}

function ModuleShortcuts() {
  return (
    <Panel title="Managed in Other Modules" description="These are shortcuts only. Global Settings never duplicates their editors.">
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
        {MODULE_LINKS.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="flex h-full items-start gap-2 rounded-sm border border-border px-3 py-2 transition-colors hover:border-border-strong hover:bg-accent/40">
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-foreground">{item.label}</p>
                <p className="text-2xs text-muted-foreground">{item.owns}</p>
              </div>
              <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("governance", config, pending);
  const tab = useTab<GovernanceTab>(GOVERNANCE_TABS);
  return (
    <div className="space-y-3">
      <SubTabs tabs={GOVERNANCE_TABS} current={tab} label="Access and governance" />
      {!editor.canEdit ? <ViewOnlyNotice section="governance" /> : null}
      {editor.banner}
      {tab === "access" ? (
        <>
          <AccessMatrix />
          <ModuleShortcuts />
        </>
      ) : tab === "sensitive" ? (
        <SensitiveGovernance saved={editor.saved} />
      ) : (
        <Customization editor={editor} />
      )}
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function AccessGovernanceSection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
