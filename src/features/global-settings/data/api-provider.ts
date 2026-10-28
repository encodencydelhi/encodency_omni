import { superAdminSettingsApi } from "../live/super-admin-settings-api";
import type { SettingsRepository } from "./repository";

/** Pure API implementation of `SettingsRepository`: every call hits the backend and errors propagate. */
export function createApiSettingsProvider(): SettingsRepository {
  return {
    mode: "api",

    getConfiguration: () => superAdminSettingsApi.getConfiguration(),

    getNewCompanyDefaults: () => superAdminSettingsApi.getNewCompanyDefaults(),

    reviewChanges: (section, patch) => superAdminSettingsApi.reviewChanges(section, patch),

    saveSection: async (input) => {
      const values = { ...input.values };
      for (const [key, value] of Object.entries(values)) {
        if (!value || typeof value !== "object" || Array.isArray(value) || !("dataUrl" in value) || !value.dataUrl || !["image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"].includes(value.mimeType)) continue;
        const image = new Image();
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The image could not be decoded.")); image.src = value.dataUrl!; });
        const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d"); if (!context) throw new Error("Image conversion is unavailable.");
        context.drawImage(image, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        values[key] = { ...value, dataUrl, mimeType: "image/png", sizeBytes: Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 3 / 4) };
      }
      return superAdminSettingsApi.saveSection({ ...input, values });
    },

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
