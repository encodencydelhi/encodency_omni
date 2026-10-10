import { superAdminSettingsApi } from "../live/super-admin-settings-api";
import type { SettingsRepository } from "./repository";

/** Pure API implementation of `SettingsRepository`: every call hits the backend and errors propagate. */
export function createApiSettingsProvider(): SettingsRepository {
  return {
    mode: "api",

    getConfiguration: () => superAdminSettingsApi.getConfiguration(),

    getNewCompanyDefaults: () => superAdminSettingsApi.getNewCompanyDefaults(),

    reviewChanges: (section, patch) => superAdminSettingsApi.reviewChanges(section, patch),

    saveSection: (input) => superAdminSettingsApi.saveSection(input),

    listChanges: (query) => superAdminSettingsApi.listChanges(query),

    getChange: (id) => superAdminSettingsApi.getChange(id),

    listPending: () => superAdminSettingsApi.listPending(),

    withdrawPending: (id, reason) => superAdminSettingsApi.withdrawPending(id, reason),

    listVersions: () => superAdminSettingsApi.listVersions(),

    compareVersions: (fromId, toId) => superAdminSettingsApi.compareVersions(fromId, toId),

    getSecurityReview: () => superAdminSettingsApi.getSecurityReview(),
  };
}

export const apiSettingsProvider: SettingsRepository = createApiSettingsProvider();
