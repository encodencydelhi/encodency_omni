import { APP } from "@/config/app";
import type { QueryParams } from "@/lib/api/transport";
import type { PaginatedResponse, SortDirection } from "@/types/api";

export type Comparator<T> = (a: T, b: T) => number;
export type Predicate<T> = (item: T, value: string) => boolean;

export interface CollectionQueryConfig<T> {
  /** Fields concatenated for the free-text search box. */
  searchable?: (item: T) => Array<string | null | undefined>;
  /** Query-param name mapped to a predicate. Absent params are ignored. */
  filters?: Record<string, Predicate<T>>;
  /** Sort field mapped to an ascending comparator; direction is applied after. */
  sorters?: Record<string, Comparator<T>>;
  defaultSort?: { field: string; direction: SortDirection };
}

function readString(query: QueryParams, key: string): string | undefined {
  const value = query[key];
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function readNumber(query: QueryParams, key: string, fallback: number): number {
  const value = Number(query[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseSort(raw: string | undefined): { field: string; direction: SortDirection } | undefined {
  if (!raw) return undefined;
  const [field, direction] = raw.split(":");
  if (!field) return undefined;
  return { field, direction: direction === "desc" ? "desc" : "asc" };
}

/**
 * Applies search, filtering, sorting and pagination the way the future backend
 * will, so that no UI code changes when the data source is swapped.
 */
export function queryCollection<T>(
  items: readonly T[],
  query: QueryParams,
  config: CollectionQueryConfig<T> = {},
): PaginatedResponse<T> {
  let result = [...items];

  const search = readString(query, "search")?.toLowerCase();
  const searchable = config.searchable;
  if (search && searchable) {
    result = result.filter((item) =>
      searchable(item).some((field) => field?.toLowerCase().includes(search) ?? false),
    );
  }

  for (const [key, predicate] of Object.entries(config.filters ?? {})) {
    const value = readString(query, key);
    if (value !== undefined) {
      result = result.filter((item) => predicate(item, value));
    }
  }

  const sort = parseSort(readString(query, "sort")) ?? config.defaultSort;
  const comparator = sort ? config.sorters?.[sort.field] : undefined;
  if (sort && comparator) {
    const factor = sort.direction === "desc" ? -1 : 1;
    result.sort((a, b) => comparator(a, b) * factor);
  }

  const total = result.length;
  const pageSize = readNumber(query, "pageSize", APP.defaultPageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(readNumber(query, "page", 1), totalPages);
  const offset = (page - 1) * pageSize;

  return {
    data: result.slice(offset, offset + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/** Comparator builders, so every collection sorts consistently. */
export const compare = {
  text<T>(accessor: (item: T) => string): Comparator<T> {
    return (a, b) => accessor(a).localeCompare(accessor(b));
  },
  number<T>(accessor: (item: T) => number | null): Comparator<T> {
    return (a, b) => (accessor(a) ?? -Infinity) - (accessor(b) ?? -Infinity);
  },
  date<T>(accessor: (item: T) => string | null): Comparator<T> {
    return (a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      return (left ? Date.parse(left) : 0) - (right ? Date.parse(right) : 0);
    };
  },
  /** Orders by position in a declared list, e.g. priority or severity. */
  ordinal<T, V extends string>(order: readonly V[], accessor: (item: T) => V): Comparator<T> {
    return (a, b) => order.indexOf(accessor(a)) - order.indexOf(accessor(b));
  },
};

/** Equality predicate for the common "filter by enum value" case. */
export function equals<T>(accessor: (item: T) => string | null | undefined): Predicate<T> {
  return (item, value) => (accessor(item) ?? "") === value;
}

/** Predicate for `field >= date` / `field <= date` range filters. */
export function dateAtOrAfter<T>(accessor: (item: T) => string): Predicate<T> {
  return (item, value) => Date.parse(accessor(item)) >= Date.parse(value);
}

export function dateAtOrBefore<T>(accessor: (item: T) => string): Predicate<T> {
  return (item, value) => Date.parse(accessor(item)) <= Date.parse(value);
}
