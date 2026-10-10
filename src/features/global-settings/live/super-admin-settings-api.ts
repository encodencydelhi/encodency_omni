import { apiClient } from "@/lib/api/client";
import type {
  ChangeListResult,
  ChangeQuery,
  ChangeReview,
  ConfigurationChange,
  ConfigurationSnapshot,
  ConfigurationVersion,
  EditableSectionKey,
  NewCompanyDefaults,
  SaveResult,
  SaveSectionInput,
  SecurityReviewData,
  SettingValues,
  VersionComparison,
} from "../data/types";

const BASE = "/super-admin/settings";

export const superAdminSettingsApi = {
  getConfiguration(signal?: AbortSignal): Promise<ConfigurationSnapshot> {
    return apiClient.request({ method: "GET", path: `${BASE}/configuration`, signal });
  },

  getNewCompanyDefaults(signal?: AbortSignal): Promise<NewCompanyDefaults> {
    return apiClient.request({ method: "GET", path: `${BASE}/new-company-defaults`, signal });
  },

  reviewChanges(section: EditableSectionKey, values: SettingValues, signal?: AbortSignal): Promise<ChangeReview> {
    return apiClient.request({ method: "POST", path: `${BASE}/review`, body: { section, values }, signal });
  },

  saveSection(input: SaveSectionInput, signal?: AbortSignal): Promise<SaveResult> {
    return apiClient.request({
      method: "PUT",
      path: `${BASE}/sections/${encodeURIComponent(input.section)}`,
      body: { values: input.values, reason: input.reason },
      signal,
    });
  },

  listChanges(query: ChangeQuery, signal?: AbortSignal): Promise<ChangeListResult> {
    return apiClient.request({
      method: "GET",
      path: `${BASE}/changes`,
      query: {
        section: query.section,
        actor: query.actor,
        range: query.range,
        changeType: query.changeType,
        result: query.result,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    });
  },

  getChange(id: string, signal?: AbortSignal): Promise<ConfigurationChange> {
    return apiClient.request({ method: "GET", path: `${BASE}/changes/${encodeURIComponent(id)}`, signal });
  },

  listPending(signal?: AbortSignal): Promise<ConfigurationChange[]> {
    return apiClient.request({ method: "GET", path: `${BASE}/pending`, signal });
  },

  withdrawPending(id: string, reason: string, signal?: AbortSignal): Promise<ConfigurationChange> {
    return apiClient.request({
      method: "POST",
      path: `${BASE}/pending/${encodeURIComponent(id)}/withdraw`,
      body: { reason },
      signal,
    });
  },

  listVersions(signal?: AbortSignal): Promise<ConfigurationVersion[]> {
    return apiClient.request({ method: "GET", path: `${BASE}/versions`, signal });
  },

  compareVersions(from: string, to: string, signal?: AbortSignal): Promise<VersionComparison> {
    return apiClient.request({ method: "GET", path: `${BASE}/versions/compare`, query: { from, to }, signal });
  },

  getSecurityReview(signal?: AbortSignal): Promise<SecurityReviewData> {
    return apiClient.request({ method: "GET", path: `${BASE}/security-review`, signal });
  },
};
