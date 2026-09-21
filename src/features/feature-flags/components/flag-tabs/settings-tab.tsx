"use client";

import { ArchiveIcon, Loader2Icon, TimerResetIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, KeyValue, Panel } from "@/features/companies/components/primitives";
import { IMPLEMENTATION, OWNER_TEAMS, PROTECTION, RELATED_MODULES } from "../../data/config";
import { describeError, useFlagCapabilities, useFlagMutations } from "../../data/hooks";
import type { FlagDetail } from "../../data/repository";
import type { Environment } from "../../data/types";
import { ImplementationBadge, LifecycleBadge, ProtectionBadge } from "../badges";
import { LifecycleDialog } from "../lifecycle-dialog";

/** Metadata, protection and the lifecycle. The stable key is never editable. */
export function SettingsTab({ detail, environment }: { detail: FlagDetail; environment: Environment }) {
  const { flag } = detail;
  const capabilities = useFlagCapabilities();
  const mutations = useFlagMutations();
  const archived = flag.lifecycle === "archived";
  const editable = !archived && capabilities.canChangeRollout;
  const [description, setDescription] = useState(flag.description);
  const [owner, setOwner] = useState(flag.ownerTeam);
  const [module, setModule] = useState(flag.relatedModule);
  const [docs, setDocs] = useState(flag.documentation);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState<"deprecate" | "archive" | null>(null);
  const dirty = description !== flag.description || owner !== flag.ownerTeam || module !== flag.relatedModule || docs !== flag.documentation;

  const save = async () => {
    setBusy(true);
    setErrors({});
    setGeneral(null);
    try {
      await mutations.updateMetadata(flag.key, { description, ownerTeam: owner, relatedModule: module, documentation: docs });
      toast.success("Details Saved", { description: "The feature key and every rollout setting are unchanged." });
    } catch (failure) {
      const { message, fieldErrors } = describeError(failure);
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) setGeneral(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Details" description="Descriptive information only. Changing it never changes availability.">
          <fieldset disabled={!editable || busy} className="space-y-3">
            <Field label="Stable Key" htmlFor="settings-key" hint="The key is referenced by application code, so it is never edited.">
              <Input id="settings-key" value={flag.key} readOnly className="font-mono" />
            </Field>
            <Field label="Description" htmlFor="settings-description" error={errors.description}>
              <Textarea id="settings-description" rows={3} maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Owner Team" htmlFor="settings-owner">
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger id="settings-owner" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{OWNER_TEAMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Related Module" htmlFor="settings-module">
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger id="settings-module" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{RELATED_MODULES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Documentation Link" htmlFor="settings-docs" error={errors.documentation}>
              <Input id="settings-docs" value={docs} onChange={(event) => setDocs(event.target.value)} placeholder="https://..." aria-invalid={Boolean(errors.documentation)} />
            </Field>
          </fieldset>
          {general ? <AlertBanner tone="danger" title="Not Saved" className="mt-2">{general}</AlertBanner> : null}
          <div className="mt-3 flex items-center gap-1.5">
            <Button size="sm" disabled={!dirty || !editable || busy} onClick={() => void save()}>{busy ? <Loader2Icon className="animate-spin" /> : null}Save Details</Button>
            <Button size="sm" variant="ghost" disabled={!dirty || busy} onClick={() => { setDescription(flag.description); setOwner(flag.ownerTeam); setModule(flag.relatedModule); setDocs(flag.documentation); setErrors({}); }}>Discard</Button>
          </div>
          {!editable ? <p className="mt-2 text-2xs text-muted-foreground">{archived ? "An archived flag is read-only." : "You can view these details but not change them."}</p> : null}
        </Panel>

        <Panel title="Classification" description="Set by the feature registry and by governance. Read-only here.">
          <dl className="divide-y divide-border">
            <KeyValue label="Lifecycle"><LifecycleBadge status={flag.lifecycle} /></KeyValue>
            <KeyValue label="Protection Level"><ProtectionBadge level={flag.protection} /></KeyValue>
            <KeyValue label="Implementation"><ImplementationBadge status={flag.implementation} /></KeyValue>
            <KeyValue label="Code References">{flag.codeReferences === "unverified" ? "Unverified" : flag.codeReferences === "none_found" ? "None Found" : "Referenced"}</KeyValue>
          </dl>
          <p className="mt-2 text-2xs text-muted-foreground">{PROTECTION[flag.protection].description}</p>
          <p className="mt-1 text-2xs text-muted-foreground">{IMPLEMENTATION[flag.implementation].description}</p>
          <p className="mt-1 text-2xs text-muted-foreground">Code-reference verification is not connected in this phase, so a flag is never shown as safe to remove on that basis.</p>
        </Panel>
      </div>

      <Panel title="Lifecycle" description="Deprecate a flag that is being retired, and archive it once nothing depends on it.">
        {archived ? (
          <p className="text-[0.8125rem] text-muted-foreground">This flag is archived and read-only. Its history and configuration versions are kept.</p>
        ) : (
          <div className="space-y-2">
            {detail.archiveBlockers.length > 0 ? (
              <AlertBanner tone="warning" title="Archiving Is Blocked">
                <ul className="list-disc pl-4">{detail.archiveBlockers.map((item) => <li key={item}>{item}</li>)}</ul>
              </AlertBanner>
            ) : (
              <p className="text-[0.8125rem] text-muted-foreground">Nothing blocks archiving this flag.</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {flag.lifecycle !== "deprecated" ? <Button size="sm" variant="outline" disabled={!capabilities.canManageLifecycle} onClick={() => setLifecycle("deprecate")}><TimerResetIcon />Deprecate</Button> : null}
              <Button size="sm" variant="outline" className="text-danger" disabled={!capabilities.canManageLifecycle} onClick={() => setLifecycle("archive")}><ArchiveIcon />Archive</Button>
            </div>
            {!capabilities.canManageLifecycle ? <p className="text-2xs text-muted-foreground">Changing a lifecycle needs the flag-management and platform-write rights.</p> : null}
          </div>
        )}
      </Panel>

      {lifecycle ? <LifecycleDialog flagKey={flag.key} flagName={flag.name} action={lifecycle} environment={environment} onClose={() => setLifecycle(null)} /> : null}
    </div>
  );
}
