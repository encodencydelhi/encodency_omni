"use client";

import { EyeIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDate } from "@/lib/utils/format";
import { PRIVACY_TABS, type PrivacyTab } from "../data/config";
import { formatDuration } from "../data/formatting";
import { RETENTION_CATEGORIES, getDefinition } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot } from "../data/types";
import { SectionData, SettingGroup, SubTabs, TablePanel, useFocusKey, useTab, ViewOnlyNotice } from "../components/section-parts";
import { useSectionEditor, type SectionEditor } from "../components/use-section-editor";

const UNAVAILABLE = "Unavailable until backend integration";

type Category = (typeof RETENTION_CATEGORIES)[number];
const keyOf = (category: Category) => `privacy.retention.${category.id}`;

function RetentionDialog({ category, editor, mode, onClose, changedAt }: { category: Category; editor: SectionEditor; mode: "view" | "edit"; onClose: () => void; changedAt?: string }) {
  const key = keyOf(category);
  const current = Number(editor.saved[key]);
  const [text, setText] = useState(String(editor.values[key]));
  const proposed = text === "" ? NaN : Number(text);
  const invalid = !Number.isInteger(proposed) || proposed < category.min || proposed > category.max;
  const shorter = !invalid && proposed < current;
  const definition = getDefinition(key);

  const rows: Array<[string, string]> = [
    ["Data Category", category.label],
    ["Current Retention", formatDuration(current, "days")],
    ["Applicable Scope", category.scope],
    ["Policy Owner", category.owner],
    ["Affected Records", UNAVAILABLE],
    ["Affected Companies", UNAVAILABLE],
    ["Dependencies", `${category.owner} and any export or support process that reads ${category.label.toLowerCase()}.`],
    ["Effective Date", "When a lifecycle service enforces the policy. Saving does not purge anything."],
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? `Edit ${category.label.toLowerCase()} retention` : `${category.label} retention`}</DialogTitle>
          <DialogDescription>{definition?.description}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-sm border border-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-2 px-3 py-1.5 text-[0.8125rem]">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
          {changedAt ? (
            <div className="grid grid-cols-[9rem_1fr] gap-2 px-3 py-1.5 text-[0.8125rem]">
              <dt className="text-muted-foreground">Last Changed</dt>
              <dd className="text-foreground">{formatDate(changedAt)}</dd>
            </div>
          ) : null}
        </dl>
        {mode === "edit" ? (
          <div className="space-y-1">
            <Label htmlFor="retention-days" className="text-[0.8125rem]">Proposed retention (days)</Label>
            <div className="flex items-center gap-2">
              <Input id="retention-days" inputMode="numeric" className="tabular max-w-32" value={text} aria-invalid={invalid || undefined} onChange={(event) => setText(event.target.value.replace(/\D/g, ""))} />
              <span className="text-[0.8125rem] text-muted-foreground">days ({category.min}-{category.max})</span>
            </div>
            {invalid ? <p role="alert" className="text-2xs text-danger">Enter a whole number between {category.min} and {category.max} days.</p> : null}
            {shorter ? <p className="text-2xs text-warning">Shortening retention makes older records eligible for removal once a lifecycle service enforces it. Nothing is deleted by saving in this demo.</p> : null}
            <p className="text-2xs text-muted-foreground">This is a configured policy, not a verified legal or compliance requirement. Applying adds it to your unsaved changes; you review and confirm it when you save the section.</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{mode === "edit" ? "Cancel" : "Close"}</Button>
          {mode === "edit" ? (
            <Button
              disabled={invalid}
              onClick={() => {
                editor.set(key, proposed);
                onClose();
              }}
            >
              Add to Unsaved Changes
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetentionTable({ editor, changedAt }: { editor: SectionEditor; changedAt: Record<string, string> }) {
  const focus = useFocusKey();
  const [open, setOpen] = useState<{ category: Category; mode: "view" | "edit" } | null>(null);
  return (
    <>
      <TablePanel title="Retention" description="Configured retention per data category. Enforcement needs a data lifecycle service, which is not connected; nothing is purged.">
        <MiniTable
          caption="Retention policies"
          rows={RETENTION_CATEGORIES}
          getKey={(category) => category.id}
          columns={[
            { id: "category", header: "Data Category", cell: (category) => <span className="font-medium text-foreground" id={`setting-${keyOf(category)}`}>{category.label}</span> },
            {
              id: "retention",
              header: "Configured Retention",
              cell: (category) => {
                const key = keyOf(category);
                const edited = editor.values[key] !== editor.saved[key];
                return (
                  <span className={focus === key ? "rounded-sm bg-primary-subtle px-1 tabular" : "tabular"}>
                    {formatDuration(Number(editor.values[key]), "days")}
                    {edited ? <Badge tone="warning" className="ml-1.5">Edited</Badge> : null}
                    {editor.pendingByKey[key] ? <Badge tone="warning" className="ml-1.5">Pending</Badge> : null}
                  </span>
                );
              },
            },
            { id: "scope", header: "Scope", hideBelow: "md", cell: (category) => <span className="text-2xs text-muted-foreground">{category.scope}</span> },
            { id: "owner", header: "Policy Owner", hideBelow: "lg", cell: (category) => <span className="text-2xs text-muted-foreground">{category.owner}</span> },
            { id: "effective", header: "Effective", hideBelow: "lg", cell: (category) => <span className="whitespace-nowrap text-2xs tabular text-muted-foreground">{changedAt[keyOf(category)] ? formatDate(changedAt[keyOf(category)] as string) : "Initial Policy"}</span> },
            { id: "state", header: "Backend State", hideBelow: "md", cell: () => <Badge tone="warning">Not Enforced</Badge> },
            {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              cell: (category) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" aria-label={`View ${category.label} policy`} onClick={() => setOpen({ category, mode: "view" })}><EyeIcon />View</Button>
                  {editor.canEdit ? <Button variant="ghost" size="sm" aria-label={`Edit ${category.label} policy`} onClick={() => setOpen({ category, mode: "edit" })}><PencilIcon />Edit</Button> : null}
                </div>
              ),
            },
          ]}
        />
      </TablePanel>
      {open ? <RetentionDialog category={open.category} editor={editor} mode={open.mode} changedAt={changedAt[keyOf(open.category)]} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

const REFERENCES = [
  { label: "Encryption at Rest Policy", owner: "Platform Engineering" },
  { label: "Encryption in Transit Policy", owner: "Platform Engineering" },
  { label: "Secret Management Policy", owner: "Platform Engineering" },
  { label: "Backup Policy", owner: "Platform Engineering" },
  { label: "Access Review Policy", owner: "Security" },
  { label: "Incident Response Policy", owner: "Security" },
  { label: "Data Processing Reference", owner: "Legal & Compliance" },
];

function HandlingReferences() {
  return (
    <TablePanel title="Data Handling References" description="Read-only. A checkbox here would not prove encryption or backups exist, so no status is asserted.">
      <MiniTable
        caption="Data handling references"
        rows={REFERENCES}
        getKey={(row) => row.label}
        columns={[
          { id: "label", header: "Reference", cell: (row) => <span className="font-medium text-foreground">{row.label}</span> },
          { id: "owner", header: "Owner", hideBelow: "md", cell: (row) => <span className="text-2xs text-muted-foreground">{row.owner}</span> },
          { id: "status", header: "Status", cell: () => <Badge tone="neutral">Not Verified</Badge> },
          { id: "detail", header: "Detail", hideBelow: "md", cell: () => <span className="text-2xs text-muted-foreground">Backend Integration Required to Verify</span> },
        ]}
      />
    </TablePanel>
  );
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("privacy", config, pending);
  const tab = useTab<PrivacyTab>(PRIVACY_TABS);
  return (
    <div className="space-y-3">
      <SubTabs tabs={PRIVACY_TABS} current={tab} label="Data and privacy" />
      {!editor.canEdit ? <ViewOnlyNotice section="privacy" /> : null}
      {editor.banner}
      <AlertBanner tone="info" title="Policy Only">
        This records policy and its history. It does not delete, export or purge any data; those need audited backend services.
      </AlertBanner>
      {tab === "retention" ? <RetentionTable editor={editor} changedAt={config.changedAt} /> : null}
      {tab === "export" ? <SettingGroup editor={editor} group="export" /> : null}
      {tab === "deletion" ? <SettingGroup editor={editor} group="deletion" /> : null}
      {tab === "handling" ? <HandlingReferences /> : null}
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function DataPrivacySection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
