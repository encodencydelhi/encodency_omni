import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

/** One template. "starter" ships with the platform and is read-only; "company" belongs to the Company and can be changed. */
export interface TemplateRecord {
  id: string;
  source: "starter" | "company";
  title: string;
  category: string;
  content: string;
  hashtags: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TemplateList {
  items: TemplateRecord[];
  categories: string[];
}

export interface TemplateInput {
  title: string;
  category: string;
  content: string;
  hashtags?: string[];
}

/**
 * Content Studio templates. Company-wide, so no Client header is sent.
 * Auth: @CompanyContextRoute() + content:read (list) / content:write (create, update, archive).
 */
export const templatesApi = {
  list(companyId: string, query?: { category?: string; search?: string }, signal?: AbortSignal): Promise<TemplateList> {
    return apiClient.request<TemplateList>({
      method: "GET",
      path: "/content/templates",
      headers: companyScopeHeaders(companyId),
      query: { category: query?.category, search: query?.search },
      signal,
    });
  },

  create(companyId: string, input: TemplateInput): Promise<TemplateRecord> {
    return apiClient.request<TemplateRecord>({
      method: "POST",
      path: "/content/templates",
      headers: companyScopeHeaders(companyId),
      body: input,
    });
  },

  update(companyId: string, id: string, input: Partial<TemplateInput>): Promise<TemplateRecord> {
    return apiClient.request<TemplateRecord>({
      method: "PATCH",
      path: `/content/templates/${encodeURIComponent(id)}`,
      headers: companyScopeHeaders(companyId),
      body: input,
    });
  },

  archive(companyId: string, id: string): Promise<void> {
    return apiClient.request<void>({
      method: "DELETE",
      path: `/content/templates/${encodeURIComponent(id)}`,
      headers: companyScopeHeaders(companyId),
    });
  },
};
