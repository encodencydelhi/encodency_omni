"use client";

import { CheckCircle2Icon, Loader2Icon, ShieldAlertIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { SECTION_ACCESS, SETTINGS_MOCK_MODE } from "../data/config";
import { describeError, useGlobalSettingsCapabilities, useSettingsMutations } from "../data/hooks";
import { definitionsFor, getDefinition, sameValue } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot, EditableSectionKey, SaveResult, SettingValue, SettingValues } from "../data/types";
import { validateValues, type FieldErrors } from "../data/validators";
import { ChangeReviewDialog } from "./change-review-dialog";
import { useSettingsGuard } from "./settings-guard";

export interface SectionEditor {
  section: EditableSectionKey;
  canEdit: boolean;
  saved: SettingValues;
  /** Saved values with the draft applied. */
  values: SettingValues;
  set: (key: string, value: SettingValue) => void;
  dirtyKeys: string[];
  dirty: boolean;
  errors: FieldErrors;
  pendingByKey: Record<string, ConfigurationChange>;
  saving: boolean;
  requestSave: () => void;
  discard: () => void;
  /** The review dialog. Render it once per section. */
  dialog: ReactNode;
  /** The sticky unsaved-changes bar and the result of the last save. */
  bar: ReactNode;
  banner: ReactNode;
}

function scrollToFirstError(keys: string[]) {
  const first = keys.map((key) => document.getElementById(`setting-${key}`)).find(Boolean);
  first?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/**
 * The draft/save lifecycle for one section: a local draft over the saved
 * values, dirty tracking, validation, the review dialog for changes that matter,
 * and the result of the last save. Each section saves on its own.
 */
export function useSectionEditor(section: EditableSectionKey, config: ConfigurationSnapshot, pending: ConfigurationChange[] = []): SectionEditor {
  const capabilities = useGlobalSettingsCapabilities();
  const mutations = useSettingsMutations();
  const guard = useSettingsGuard();
  const canEdit = capabilities[SECTION_ACCESS[section].edit];

  const [patch, setPatch] = useState<SettingValues>({});
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const saved = config.values;
  const values = useMemo(() => ({ ...saved, ...patch }), [saved, patch]);
  const dirtyKeys = useMemo(() => Object.keys(patch).filter((key) => !sameValue(patch[key], saved[key])), [patch, saved]);
  const dirty = dirtyKeys.length > 0;
  const dirtyPatch = useMemo(() => Object.fromEntries(dirtyKeys.map((key) => [key, patch[key] as SettingValue])), [dirtyKeys, patch]);

  const sectionKeys = useMemo(() => definitionsFor(section).map((definition) => definition.key), [section]);
  const liveErrors = useMemo(() => validateValues(values, attempted ? sectionKeys : dirtyKeys), [values, attempted, sectionKeys, dirtyKeys]);
  const errors = useMemo(() => ({ ...liveErrors, ...serverErrors }), [liveErrors, serverErrors]);

  useEffect(() => {
    guard.register(section, dirty);
    return () => guard.register(section, false);
  }, [guard, section, dirty]);

  const set = useCallback(
    (key: string, value: SettingValue) => {
      setPatch((current) => {
        const next = { ...current };
        if (sameValue(value, saved[key])) delete next[key];
        else next[key] = value;
        return next;
      });
      setServerErrors((current) => {
        if (!current[key]) return current;
        const rest = { ...current };
        delete rest[key];
        return rest;
      });
      setResult(null);
      setSaveError(null);
    },
    [saved],
  );

  const discard = useCallback(() => {
    setPatch({});
    setAttempted(false);
    setServerErrors({});
    setSaveError(null);
    setReviewOpen(false);
  }, []);

  const run = useCallback(
    async (reason?: string) => {
      setSaving(true);
      setSaveError(null);
      setReasonError(undefined);
      try {
        const outcome = await mutations.saveSection({ section, values: dirtyPatch, reason });
        setResult(outcome);
        setPatch({});
        setAttempted(false);
        setServerErrors({});
        setReviewOpen(false);
      } catch (failure) {
        const described = describeError(failure);
        const { reason: reasonMessage, ...fields } = described.fieldErrors;
        setSaveError(described.message);
        setReasonError(reasonMessage);
        setServerErrors(fields);
        if (Object.keys(fields).length > 0) {
          setReviewOpen(false);
          scrollToFirstError(Object.keys(fields));
        }
      } finally {
        setSaving(false);
      }
    },
    [dirtyPatch, mutations, section],
  );

  const requestSave = useCallback(() => {
    setAttempted(true);
    const problems = validateValues(values, dirtyKeys);
    if (Object.keys(problems).length > 0) {
      scrollToFirstError(Object.keys(problems));
      return;
    }
    const needsReview = dirtyKeys.some((key) => (getDefinition(key)?.sensitivity ?? "low") !== "low");
    if (needsReview) setReviewOpen(true);
    else void run();
  }, [dirtyKeys, run, values]);

  const pendingByKey = useMemo(() => {
    const map: Record<string, ConfigurationChange> = {};
    for (const change of pending) if (change.section === section && change.result === "pending_approval") map[change.key] = change;
    return map;
  }, [pending, section]);

  const errorCount = Object.keys(liveErrors).length + Object.keys(serverErrors).length;

  const dialog = (
    <ChangeReviewDialog
      open={reviewOpen}
      onOpenChange={setReviewOpen}
      section={section}
      patch={dirtyPatch}
      saving={saving}
      error={reviewOpen ? saveError : null}
      reasonError={reasonError}
      onConfirm={(reason) => void run(reason)}
    />
  );

  const bar =
    dirty && canEdit ? (
      <div role="region" aria-label="Unsaved changes" className="sticky bottom-12 z-10 flex flex-wrap items-center gap-2 rounded-sm border border-primary/30 bg-card px-3 py-2 shadow-md">
        <p className="text-[0.8125rem] font-medium text-foreground">
          {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}
        </p>
        {attempted && errorCount > 0 ? <p className="text-2xs text-danger">Fix the highlighted fields to save.</p> : <p className="hidden text-2xs text-muted-foreground sm:block">Saved on their own; other sections are unaffected.</p>}
        {saveError && !reviewOpen ? <p role="alert" className="text-2xs text-danger">{saveError}</p> : null}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={discard} disabled={saving}>Discard</Button>
          <Button size="sm" onClick={requestSave} disabled={saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : null}
            {dirtyKeys.some((key) => (getDefinition(key)?.sensitivity ?? "low") !== "low") ? "Review & Save" : "Save Changes"}
          </Button>
        </div>
      </div>
    ) : null;

  const banner = result ? <SaveResultBanner result={result} onDismiss={() => setResult(null)} /> : null;

  return { section, canEdit, saved, values, set, dirtyKeys, dirty, errors, pendingByKey, saving, requestSave, discard, dialog, bar, banner };
}

/** The outcome of the last save, stated as exactly what happened in this frontend phase. */
export function SaveResultBanner({ result, onDismiss }: { result: SaveResult; onDismiss: () => void }) {
  if (result.applied.length === 0 && result.pending.length === 0) {
    return <AlertBanner tone="info" title="No Changes to Save">Nothing differed from the saved configuration.</AlertBanner>;
  }
  const mode = SETTINGS_MOCK_MODE ? "demo configuration" : "configuration";
  return (
    <div role="status" className="flex items-start gap-3 rounded-sm border border-success/25 bg-success-subtle px-3.5 py-3">
      {result.pending.length > 0 && result.applied.length === 0 ? <ShieldAlertIcon className="mt-px size-4 shrink-0 text-warning" aria-hidden /> : <CheckCircle2Icon className="mt-px size-4 shrink-0 text-success" aria-hidden />}
      <div className="min-w-0 flex-1 space-y-0.5 text-[0.8125rem]">
        <p className="font-medium text-foreground">
          {result.applied.length > 0
            ? `Saved to the ${mode} as ${result.version?.label ?? "a new version"}`
            : "Submitted as a pending draft"}
        </p>
        <p className="text-muted-foreground">
          {result.applied.length > 0 ? `${result.applied.length} setting${result.applied.length === 1 ? "" : "s"} applied and recorded in configuration history. ` : ""}
          {result.pending.length > 0 ? `${result.pending.length} security-critical change${result.pending.length === 1 ? " is" : "s are"} held as a pending draft and not effective. ` : ""}
          No real account, session or service was changed.
        </p>
      </div>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground">
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
