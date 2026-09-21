/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Directory filter state. Initial values may come from the URL so header shortcuts deep-link into a
 * pre-filtered list; edits stay local to the page.
 */

"use client";

import { FilterXIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { FilterSelect, type FilterOption } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENVIRONMENT_OPTIONS } from "../data/config";
import type { WebhookEnvironment } from "../data/types";
import { useWebhooks } from "./webhooks-context";

export function useFilterState<K extends string>(keys: readonly K[]) {
  const search = useSearchParams();
  const [values, setValues] = useState<Record<K, string | undefined>>(() => {
    const initial = {} as Record<K, string | undefined>;
    keys.forEach((key) => {
      initial[key] = search.get(key) ?? undefined;
    });
    return initial;
  });
  const [query, setQuery] = useState(search.get("q") ?? "");

  const set = useCallback((key: K, value: string | null) => setValues((current) => ({ ...current, [key]: value ?? undefined })), []);
  const clear = useCallback(() => {
    setValues((current) => Object.fromEntries(Object.keys(current).map((key) => [key, undefined])) as Record<K, string | undefined>);
    setQuery("");
  }, []);
  const activeCount = Object.values(values).filter(Boolean).length + (query ? 1 : 0);
  return { values, set, query, setQuery, clear, activeCount };
}

export function FilterControls<K extends string>({
  state,
  searchPlaceholder,
  filters,
}: {
  state: ReturnType<typeof useFilterState<K>>;
  searchPlaceholder: string;
  filters: Array<{ key: K; label: string; options: FilterOption[] }>;
}) {
  return (
    <>
      <SearchInput value={state.query} onChange={state.setQuery} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="w-full sm:w-72" />
      {filters.map((filter) => (
        <FilterSelect key={filter.key} label={filter.label} value={state.values[filter.key]} options={filter.options} onChange={(value) => state.set(filter.key, value)} />
      ))}
      {state.activeCount > 0 ? (
        <Button type="button" variant="ghost" size="sm" onClick={state.clear}>
          <FilterXIcon />
          Clear filters
        </Button>
      ) : null}
    </>
  );
}

/** Environment is a global setting. This control changes it, and has no "All" option that would do nothing. */
export function EnvironmentFilter() {
  const { environment, setEnvironment } = useWebhooks();
  return (
    <Select value={environment} onValueChange={(value) => setEnvironment(value as WebhookEnvironment)}>
      <SelectTrigger size="sm" aria-label="Environment" className="w-auto min-w-[9.5rem] gap-1.5 border-primary/40 bg-primary-subtle">
        <span className="text-muted-foreground">Environment:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENVIRONMENT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const DATE_FILTER_OPTIONS: FilterOption[] = [
  { value: "1", label: "Last 1 Hour" },
  { value: "24", label: "Last 24 Hours" },
  { value: "168", label: "Last 7 Days" },
  { value: "720", label: "Last 30 Days" },
];

export const optionsFrom = (values: Array<string | null | undefined>, label: (value: string) => string = (value) => value): FilterOption[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))].sort().map((value) => ({ value, label: label(value) }));
