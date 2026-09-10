import { apiClient } from "@/lib/api/client";
import { toListQuery } from "@/lib/api/transport";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { Project, ProjectFilters } from "@/types/domain/project";

export type ProjectListParams = ListParams<Record<keyof ProjectFilters, string>>;

export const Clientservice = {
  list(params: ProjectListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<Project>>({
      method: "GET",
      path: "/Clients",
      query: toListQuery(params),
      signal,
    });
  },
};
