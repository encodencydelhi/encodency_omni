import type { ListParams } from "@/types/api";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

export interface RequestSpec {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}
export interface Transport {
  request<TResult>(spec: RequestSpec): Promise<TResult>;
}
export function toListQuery(params: ListParams<Record<string, string>> = {}): QueryParams {
  const { page, pageSize, search, sort, filters } = params;

  const query: QueryParams = {
    page,
    pageSize,
    search: search?.trim() || undefined,
    sort: sort ? `${sort.field}:${sort.direction}` : undefined,
  };

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      query[key] = value as QueryValue;
    }
  }

  return query;
}

export function buildSearchParams(query: QueryParams | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : "";
}
