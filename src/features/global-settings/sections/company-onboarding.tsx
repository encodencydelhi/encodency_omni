"use client";

import { CheckCircle2Icon, CircleDashedIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { Panel } from "@/features/companies/components/primitives";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { resolveNewCompanyDefaults } from "../data/effective-config";
import type { ConfigurationChange, ConfigurationSnapshot } from "../data/types";
import { SectionData, SettingGroup, TablePanel, ViewOnlyNotice } from "../components/section-parts";
import { useSectionEditor } from "../components/use-section-editor";

const CHECKLIST = [
  { label: "Company Identity Initialised", note: "Name, slug and display ID are created with the company." },
  { label: "Owner Invitation Initialised", note: "Uses the owner invitation expiry below." },
  { label: "Subscription Assigned", note: "Chosen in the Create Company flow; plans are managed in Plans & Subscriptions." },
  { label: "Default Workspace Preferences Applied", note: "Timezone, language, currency and region from these defaults." },
  { label: "Company Settings Initialised", note: "Stamped with the current configuration version." },
  { label: "Audit Event Created", note: "Written by the backend when company creation is connected." },
];

function ImpactPreview({ current, proposed, changed }: { current: ReturnType<typeof resolveNewCompanyDefaults>; proposed: ReturnType<typeof resolveNewCompanyDefaults>; changed: boolean }) {
  const rows = [
    { label: "Timezone", now: current.timezone, next: proposed.timezone, existing: "Companies with an explicit timezone remain unchanged." },
    { label: "Language", now: current.language, next: proposed.language, existing: "Companies with an explicit language remain unchanged." },
    { label: "Currency", now: current.currency, next: proposed.currency, existing: "Existing companies and every stored price are unchanged." },
    { label: "Workspace Region", now: current.region, next: proposed.region, existing: "Existing workspaces are not moved." },
    { label: "Owner Invitation Expiry", now: `${current.ownerInviteExpiryDays} days`, next: `${proposed.ownerInviteExpiryDays} days`, existing: "Invitations already sent keep their expiry date." },
    { label: "Member Invitation Expiry", now: `${current.memberInviteExpiryDays} days`, next: `${proposed.memberInviteExpiryDays} days`, existing: "Invitations already sent keep their expiry date." },
  ];
  return (
    <TablePanel title="New Company Impact" description={changed ? "Current defaults against your unsaved changes." : "What a company created right now would start with."}>
      <MiniTable
        caption="New company impact"
        rows={rows}
        getKey={(row) => row.label}
        columns={[
          { id: "label", header: "Default", cell: (row) => <span className="font-medium text-foreground">{row.label}</span> },
          { id: "now", header: "Current", cell: (row) => <span className="tabular">{row.now}</span> },
          { id: "next", header: "Proposed", cell: (row) => (row.now === row.next ? <span className="text-muted-foreground">No Change</span> : <span className="font-medium tabular text-foreground">{row.next}</span>) },
          { id: "existing", header: "Existing Companies", hideBelow: "md", cell: (row) => <span className="text-2xs text-muted-foreground">{row.existing}</span> },
        ]}
      />
      <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">
        Applied to new companies only. Existing tenants are never migrated without an explicit, reviewed migration workflow.
      </p>
    </TablePanel>
  );
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("onboarding", config, pending);
  const current = resolveNewCompanyDefaults(editor.saved, config.version.label);
  const proposed = resolveNewCompanyDefaults(editor.values, config.version.label);
  return (
    <div className="space-y-3">
      {!editor.canEdit ? <ViewOnlyNotice section="onboarding" /> : null}
      {editor.banner}
      <AlertBanner tone="info" title="New Companies Start Active, Waiting for Their Owner">
        The Companies model has no &ldquo;pending activation&rdquo; account state. A new company is Active and its onboarding shows as awaiting the owner until the invitation is accepted. Nothing here restricts access; that needs the backend.
      </AlertBanner>
      <SettingGroup editor={editor} group="new_company" />
      <SettingGroup editor={editor} group="invitations" />
      <ImpactPreview current={current} proposed={proposed} changed={editor.dirtyKeys.length > 0} />
      <Panel
        title="Initialisation Checklist"
        description="A readiness reference for what creating a company sets up. This section never creates a company."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.superAdmin.companies}>
              Open Companies
              <ExternalLinkIcon />
            </Link>
          </Button>
        }
      >
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {CHECKLIST.map((item) => (
            <li key={item.label} className="flex items-start gap-2 rounded-sm border border-border px-3 py-2">
              {item.label.startsWith("Audit") ? <CircleDashedIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />}
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-foreground">{item.label}</p>
                <p className="text-2xs text-muted-foreground">{item.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-2xs text-muted-foreground">
          <Badge tone="neutral">Reference</Badge>
          Create a company from Companies &rarr; Create Company.
        </p>
      </Panel>
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function CompanyOnboardingSection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
