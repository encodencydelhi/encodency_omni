/**
 * Demo implementation of `SettingsRepository`.
 *
 * It behaves like a remote configuration service - asynchronous, validating,
 * throwing `ApiError` - and never claims more than it did. Saving records
 * configuration and a history entry; it does not enforce MFA, revoke a session,
 * delete data or stop a worker. Security-critical changes are held as pending
 * drafts because no approval workflow exists in this phase.
 *
 * Only `repository.ts` imports this file.
 */
import { env } from "@/config/env";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import { ApiError } from "@/types/api";
import { SECTION_BY_KEY } from "./config";
import { resolveNewCompanyDefaults } from "./effective-config";
import { sanitizeForHistory } from "./formatting";
import { getDefinition, isEditable } from "./registry";
import type { SettingsRepository } from "./repository";
import {
  buildChangeReview,
  buildMaintenanceEntries,
  buildSecurityReview,
  compareVersions,
  filterChanges,
} from "./selectors";
import { MAINTENANCE_RECORDS } from "./mock/seed";
import { commit, currentVersion, getValues, listChanges, listVersions, nextId, resetSettingsState } from "./mock/store";
import type {
  ChangeType,
  ConfigurationChange,
  ConfigurationSnapshot,
  ConfigurationVersion,
  EditableSectionKey,
  MutationActor,
  SaveResult,
  SaveSectionInput,
  SettingValues,
} from "./types";
import { validateValues } from "./validators";

function wait(kind: "read" | "write"): Promise<void> {
  const base = kind === "read" ? env.mockLatencyMs * 0.6 : env.mockLatencyMs * 1.1;
  return new Promise((resolve) => setTimeout(resolve, Math.round(base)));
}

function fail(code: ConstructorParameters<typeof ApiError>[0]["code"], message: string, fieldErrors?: Record<string, string>): never {
  const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "CONFLICT" ? 409 : 422;
  throw new ApiError({ code, status, message, fieldErrors });
}

const isPendingResult = (change: ConfigurationChange) => change.result === "pending_approval" || change.result === "scheduled";

function snapshot(): ConfigurationSnapshot {
  const version = currentVersion();
  const changes = listChanges();
  const changedAt: Record<string, string> = {};
  for (const change of [...changes].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (change.result === "applied") changedAt[change.key] = change.at;
  }
  const values = getValues();
  return {
    values,
    version: { id: version.id, number: version.number, label: version.label },
    updatedAt: version.createdAt,
    updatedBy: version.createdBy,
    changedAt,
    pendingCount: changes.filter(isPendingResult).length,
    pendingSensitiveCount: changes.filter((change) => change.result === "pending_approval").length,
    maintenance: buildMaintenanceEntries(values, MAINTENANCE_RECORDS, platformNow()),
  };
}

function changeTypeOf(key: string): ChangeType {
  const type = getDefinition(key)?.valueType;
  return type === "asset" ? "asset" : type === "legal_document" ? "reference" : "update";
}

export const mockSettingsProvider: SettingsRepository = {
  mode: "mock",

  async getConfiguration() {
    await wait("read");
    return snapshot();
  },

  async getNewCompanyDefaults() {
    await wait("read");
    return resolveNewCompanyDefaults(getValues(), currentVersion().label);
  },

  async reviewChanges(_section: EditableSectionKey, patch: SettingValues) {
    await wait("read");
    return buildChangeReview(getValues(), patch);
  },

  async saveSection(input: SaveSectionInput, actor: MutationActor): Promise<SaveResult> {
    await wait("write");
    const keys = Object.keys(input.values);
    const current = getValues();

    const fieldErrors: Record<string, string> = {};
    for (const key of keys) {
      const definition = getDefinition(key);
      if (!definition) fail("BAD_REQUEST", `Unknown setting ${key}.`);
      if (definition.section !== input.section) fail("BAD_REQUEST", `${definition.name} does not belong to ${SECTION_BY_KEY[input.section].label}.`);
      if (!isEditable(definition)) fieldErrors[key] = `${definition.name} cannot be changed here.`;
    }
    if (Object.keys(fieldErrors).length > 0) fail("VALIDATION_FAILED", "Some settings cannot be changed.", fieldErrors);

    const merged: SettingValues = { ...current, ...input.values };
    const invalid = validateValues(merged, keys);
    if (Object.keys(invalid).length > 0) fail("VALIDATION_FAILED", "Some values are not valid. Nothing was saved.", invalid);

    const review = buildChangeReview(current, input.values);
    if (review.rows.length === 0) return { version: null, applied: [], pending: [] };
    const reason = input.reason?.trim() ?? "";
    if (review.requiresReason && !reason) fail("VALIDATION_FAILED", "A reason is required for this change.", { reason: "Say why this is changing." });
    if (reason.length > 300) fail("VALIDATION_FAILED", "The reason is too long.", { reason: "Keep the reason under 300 characters." });

    const now = nowIso();
    const versionNumber = nextId("v");
    const versionId = `cfg_v${versionNumber}`;
    const nextValues: SettingValues = { ...current };
    const applied: ConfigurationChange[] = [];
    const pending: ConfigurationChange[] = [];
    const superseded: ConfigurationChange[] = [];

    for (const row of review.rows) {
      const definition = getDefinition(row.key);
      if (!definition) continue;
      const record: ConfigurationChange = {
        id: `cfg_chg_${String(nextId("chg")).padStart(4, "0")}`,
        versionId: row.pending ? null : versionId,
        at: now,
        actorId: actor.id,
        actorName: actor.name,
        section: input.section,
        key: row.key,
        settingName: row.name,
        previous: sanitizeForHistory(row.previous),
        next: sanitizeForHistory(row.next),
        changeType: changeTypeOf(row.key),
        result: row.pending ? "pending_approval" : "applied",
        scope: definition.scope,
        effectiveAt: row.pending ? null : now,
        reason,
        sensitivity: definition.sensitivity,
        demo: true,
        auditRef: null,
        approvalNote: row.pending
          ? "Awaiting secondary approval. Demo draft: no approval workflow runs in this frontend phase."
          : definition.approval === "none"
            ? "Not required"
            : "Reason recorded. The backend writes the audit event.",
      };
      if (row.pending) {
        pending.push(record);
        // A newer request for the same setting supersedes an older one.
        for (const older of listChanges().filter((item) => item.key === row.key && isPendingResult(item) && item.result === "pending_approval")) {
          superseded.push({ ...older, result: "withdrawn", approvalNote: `Superseded by a newer request from ${actor.name}.` });
        }
      } else {
        // The store keeps image data for previews; history records carry a summary only.
        nextValues[row.key] = row.next;
        applied.push(record);
      }
    }

    let version: ConfigurationVersion | null = null;
    if (applied.length > 0) {
      const names = applied.slice(0, 3).map((item) => item.settingName).join(", ");
      version = {
        id: versionId,
        number: versionNumber,
        label: `v${versionNumber}`,
        status: "current",
        createdBy: actor.name,
        createdAt: now,
        effectiveAt: now,
        sections: [input.section],
        summary: `${applied.length} setting${applied.length === 1 ? "" : "s"} changed in ${SECTION_BY_KEY[input.section].label}: ${names}${applied.length > 3 ? " and more" : ""}`,
        changeIds: applied.map((item) => item.id),
        snapshot: Object.fromEntries(Object.entries(nextValues).map(([key, value]) => [key, sanitizeForHistory(value)])),
      };
    }

    commit({
      values: applied.length > 0 ? nextValues : undefined,
      changes: [...applied, ...pending],
      updates: superseded,
      version: version ?? undefined,
    });
    return { version, applied, pending };
  },

  async listChanges(query) {
    await wait("read");
    return filterChanges(listChanges(), query, platformNow());
  },

  async getChange(id) {
    await wait("read");
    const found = listChanges().find((item) => item.id === id);
    if (!found) fail("NOT_FOUND", `Change ${id} was not found.`);
    return found;
  },

  async listPending() {
    await wait("read");
    return listChanges()
      .filter(isPendingResult)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  },

  async withdrawPending(id, reason, actor) {
    await wait("write");
    const found = listChanges().find((item) => item.id === id);
    if (!found) fail("NOT_FOUND", `Change ${id} was not found.`);
    if (!isPendingResult(found)) fail("CONFLICT", "Only a pending or planned change can be withdrawn.");
    if (!reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "Say why it is being withdrawn." });
    const updated: ConfigurationChange = { ...found, result: "withdrawn", approvalNote: `Withdrawn by ${actor.name}: ${reason.trim()}` };
    commit({ updates: [updated] });
    return updated;
  },

  async listVersions() {
    await wait("read");
    return [...listVersions()].sort((a, b) => b.number - a.number);
  },

  async compareVersions(fromId, toId) {
    await wait("read");
    const versions = listVersions();
    const from = versions.find((item) => item.id === fromId);
    const to = versions.find((item) => item.id === toId);
    if (!from || !to) fail("NOT_FOUND", "One of the versions was not found.");
    return compareVersions(from, to);
  },

  async getSecurityReview() {
    await wait("read");
    return buildSecurityReview(getValues(), listChanges());
  },

  async resetDemoData() {
    await wait("write");
    resetSettingsState();
  },
};

