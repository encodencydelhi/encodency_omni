"use client";

import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/features/companies/components/primitives";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDate } from "@/lib/utils/format";
import { routes } from "../data/config";
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_IDS, cloneValue, sameValue, type LegalDocumentId } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot, LegalDocValue, LegalDocumentStatus, SettingValues } from "../data/types";
import { isValidHttpUrl, legalErrors } from "../data/validators";
import { SectionData, SettingGroup, TablePanel, useFocusKey, ViewOnlyNotice } from "../components/section-parts";
import { useSectionEditor, type SectionEditor } from "../components/use-section-editor";

const STATUS: Record<LegalDocumentStatus, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  published: { label: "Published", tone: "success" },
  under_review: { label: "Under Review", tone: "warning" },
  draft: { label: "Draft", tone: "info" },
  not_published: { label: "Not Published", tone: "neutral" },
};

const docKey = (id: LegalDocumentId) => `communications.legal.${id}`;

function LegalEditor({ id, editor, onClose }: { id: LegalDocumentId; editor: SectionEditor; onClose: () => void }) {
  const key = docKey(id);
  const [draft, setDraft] = useState<LegalDocValue>(() => cloneValue(editor.values[key] as LegalDocValue));
  const [attempted, setAttempted] = useState(false);
  const errors = attempted ? legalErrors(key, draft) : {};
  const set = <K extends keyof LegalDocValue>(field: K, value: LegalDocValue[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const field = (name: keyof LegalDocValue, label: string, props: { type?: string; placeholder?: string } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`legal-${name}`} className="text-[0.8125rem]">{label}</Label>
      <Input id={`legal-${name}`} type={props.type} placeholder={props.placeholder} value={String(draft[name])} aria-invalid={Boolean(errors[name]) || undefined} onChange={(event) => set(name, event.target.value as never)} />
      {errors[name] ? <p role="alert" className="text-2xs text-danger">{errors[name]}</p> : null}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {LEGAL_DOCUMENTS[id].label} reference</DialogTitle>
          <DialogDescription>You are recording where the document lives and which version applies. The wording is owned by Legal and is never generated or replaced here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("title", "Document Title")}</div>
          <div className="sm:col-span-2">{field("url", "Document URL", { placeholder: "https://example.com/legal/terms" })}</div>
          {field("version", "Version Label", { placeholder: "e.g. 2.1" })}
          <div className="space-y-1">
            <Label htmlFor="legal-status" className="text-[0.8125rem]">Publication Status</Label>
            <Select value={draft.status} onValueChange={(next) => set("status", next as LegalDocumentStatus)}>
              <SelectTrigger id="legal-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {field("effectiveDate", "Effective Date", { type: "date" })}
          {field("lastReviewed", "Last Reviewed", { type: "date" })}
          <div className="sm:col-span-2">{field("owner", "Document Owner")}</div>
        </div>
        <p className="text-2xs text-muted-foreground">The link is not checked. An entered URL does not mean the document is live or legally approved.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              setAttempted(true);
              if (Object.keys(legalErrors(key, draft)).length > 0) return;
              editor.set(key, draft);
              onClose();
            }}
          >
            Add to Unsaved Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegalTable({ editor }: { editor: SectionEditor }) {
  const focus = useFocusKey();
  const [editing, setEditing] = useState<LegalDocumentId | null>(null);
  return (
    <>
      <TablePanel title="Legal Document References" description="Where each document lives and which version applies. Terms and the privacy policy are required.">
        <MiniTable
          caption="Legal document references"
          rows={LEGAL_DOCUMENT_IDS}
          getKey={(id) => id}
          columns={[
            {
              id: "title",
              header: "Document",
              cell: (id) => {
                const value = editor.values[docKey(id)] as LegalDocValue;
                const edited = !sameValue(value, editor.saved[docKey(id)]);
                return (
                  <div id={`setting-${docKey(id)}`} className={focus === docKey(id) ? "rounded-sm bg-primary-subtle px-1" : undefined}>
                    <p className="font-medium text-foreground">{LEGAL_DOCUMENTS[id].label}{LEGAL_DOCUMENTS[id].required ? <span className="ml-1 text-danger" aria-hidden>*</span> : null}{edited ? <Badge tone="warning" className="ml-1.5">Edited</Badge> : null}</p>
                    <p className="max-w-56 truncate text-2xs text-muted-foreground" title={value.url}>{value.url || "No URL recorded"}</p>
                  </div>
                );
              },
            },
            { id: "version", header: "Version", cell: (id) => <span className="tabular">{(editor.values[docKey(id)] as LegalDocValue).version || "-"}</span> },
            { id: "effective", header: "Effective", hideBelow: "md", cell: (id) => <span className="whitespace-nowrap text-2xs tabular">{(editor.values[docKey(id)] as LegalDocValue).effectiveDate ? formatDate((editor.values[docKey(id)] as LegalDocValue).effectiveDate) : "-"}</span> },
            { id: "reviewed", header: "Last Reviewed", hideBelow: "lg", cell: (id) => <span className="whitespace-nowrap text-2xs tabular">{(editor.values[docKey(id)] as LegalDocValue).lastReviewed ? formatDate((editor.values[docKey(id)] as LegalDocValue).lastReviewed) : "Never"}</span> },
            { id: "status", header: "Status", cell: (id) => { const meta = STATUS[(editor.values[docKey(id)] as LegalDocValue).status]; return <Badge tone={meta.tone}>{meta.label}</Badge>; } },
            { id: "owner", header: "Owner", hideBelow: "lg", cell: (id) => <span className="text-2xs text-muted-foreground">{(editor.values[docKey(id)] as LegalDocValue).owner}</span> },
            {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              cell: (id) => {
                const value = editor.values[docKey(id)] as LegalDocValue;
                return (
                  <div className="flex justify-end gap-1">
                    {value.url && isValidHttpUrl(value.url) ? (
                      <Button asChild variant="ghost" size="sm"><a href={value.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${LEGAL_DOCUMENTS[id].label}`}><ExternalLinkIcon />View</a></Button>
                    ) : null}
                    {editor.canEdit ? <Button variant="ghost" size="sm" aria-label={`Edit ${LEGAL_DOCUMENTS[id].label} reference`} onClick={() => setEditing(id)}><PencilIcon />Edit</Button> : null}
                  </div>
                );
              },
            },
          ]}
        />
        <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">Links are shown as entered and are not checked for availability.</p>
      </TablePanel>
      {editing ? <LegalEditor id={editing} editor={editor} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function CommunicationPreview({ saved, values }: { saved: SettingValues; values: SettingValues }) {
  const differs = JSON.stringify(saved) !== JSON.stringify(values);
  const card = (title: string, source: SettingValues) => {
    const terms = source[docKey("terms")] as LegalDocValue;
    const privacy = source[docKey("privacy")] as LegalDocValue;
    return (
      <div className="min-w-0 space-y-1 rounded-sm border border-border p-3">
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-[0.8125rem] font-semibold text-foreground">{String(source["communications.display_name"])}</p>
        <p className="truncate text-2xs text-muted-foreground">{String(source["identity.platform_name"])}</p>
        <dl className="space-y-0.5 text-2xs">
          {[
            ["Support", String(source["identity.support_email"])],
            ["Website", String(source["identity.website_url"])],
            ["Privacy Policy", privacy.url || "Not Recorded"],
            ["Terms", terms.url || "Not Recorded"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2"><dt className="w-24 shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 truncate text-foreground" title={value}>{value}</dd></div>
          ))}
        </dl>
      </div>
    );
  };
  return (
    <Panel title="Communication Identity Preview" description="How official contact details read. This is not an email template; templates are managed in Notifications.">
      <div className={differs ? "grid grid-cols-1 gap-1 lg:grid-cols-2" : "grid grid-cols-1 gap-1"}>
        {card(differs ? "Current" : "Current", saved)}
        {differs ? card("Proposed", values) : null}
      </div>
    </Panel>
  );
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("communications", config, pending);
  return (
    <div className="space-y-3">
      {!editor.canEdit ? <ViewOnlyNotice section="communications" /> : null}
      {editor.banner}
      <SettingGroup editor={editor} group="contacts" compact />
      <Panel title="From General & Identity" description="Shown here so there is only one copy of each value.">
        <dl className="grid grid-cols-1 gap-1 sm:grid-cols-3">
          {[
            ["Support Email", String(config.values["identity.support_email"])],
            ["Official Website", String(config.values["identity.website_url"])],
            ["Support Portal", String(config.values["identity.support_url"])],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-sm border border-border bg-muted/30 px-3 py-2">
              <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 truncate text-[0.8125rem] text-foreground" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-2xs text-muted-foreground">
          Edit these in <Link href={routes.section("identity")} className="font-medium text-primary hover:underline">General &amp; Identity</Link>.
        </p>
      </Panel>
      <AlertBanner tone="info" title="References, Not Approvals">
        Recording a URL or version does not mean a document is legally approved or live, and no wording is generated here.
      </AlertBanner>
      <LegalTable editor={editor} />
      <CommunicationPreview saved={editor.saved} values={editor.values} />
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function CommunicationsLegalSection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
