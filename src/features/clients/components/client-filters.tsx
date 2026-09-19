"use client";

import { DownloadIcon, Loader2Icon, SlidersHorizontalIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { FilterSelect, type FilterOption } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TableQueryState } from "@/hooks/use-table-query-state";
import { cn } from "@/lib/utils/cn";
import { toStatusOptions } from "@/types/common";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import {
  CREATED_OPTIONS,
  HEALTH_FILTER_OPTIONS,
  LAST_ACTIVE_OPTIONS,
  ONBOARDING_FILTER_OPTIONS,
  SORT_OPTIONS,
  TEAM_FILTER_OPTIONS,
  WEBSITE_FILTER_OPTIONS,
  WORKSPACE_STATUS,
} from "../data/config";
import { useClientFacets } from "../data/hooks";
import type { ClientListQuery } from "../data/types";

export const CLIENT_FILTER_KEYS = ["company", "workspace", "onboarding", "health", "provider", "website", "team", "created", "lastActive"] as const;

export type ClientFilterKey = (typeof CLIENT_FILTER_KEYS)[number];
export type ClientTableState = TableQueryState<ClientFilterKey>;

export function buildClientQuery(table: ClientTableState): ClientListQuery {
  const { filters } = table;
  return {
    search: table.listParams.search,
    company: filters.company,
    workspace: filters.workspace,
    onboarding: filters.onboarding,
    health: filters.health,
    provider: filters.provider,
    website: filters.website,
    team: filters.team,
    created: filters.created,
    lastActive: filters.lastActive,
    sort: table.sort,
    page: table.page,
    pageSize: table.pageSize,
  };
}

/** Quick views: each is just a filter combination, so it is also a shareable URL. */
export const QUICK_VIEWS: ReadonlyArray<{ id: string; label: string; filters: Partial<Record<ClientFilterKey, string>> }> = [
  { id: "all", label: "All Clients", filters: {} },
  { id: "attention", label: "Needs Attention", filters: { health: "at_risk" } },
  { id: "onboarding", label: "Onboarding Pending", filters: { onboarding: "pending" } },
  { id: "paused", label: "Paused", filters: { workspace: "paused" } },
  { id: "archived", label: "Archived", filters: { workspace: "archived" } },
];

function activeView(filters: Partial<Record<ClientFilterKey, string>>, search: string): string | null {
  const set = Object.entries(filters).filter(([, value]) => value);
  if (search) return null;
  return (
    QUICK_VIEWS.find((view) => {
      const wanted = Object.entries(view.filters);
      return wanted.length === set.length && wanted.every(([key, value]) => filters[key as ClientFilterKey] === value);
    })?.id ?? null
  );
}

interface FilterDef {
  key: ClientFilterKey;
  label: string;
  options: FilterOption[];
}

function useFilterDefs(): { primary: FilterDef[]; secondary: FilterDef[] } {
  const facets = useClientFacets();
  return useMemo(() => {
    const companies = (facets.data?.companies ?? []).map((company) => ({ value: company.id, label: company.name }));
    const providers = (facets.data?.providers ?? []).map((provider) => ({ value: provider, label: INTEGRATION_PROVIDER[provider].label }));
    return {
      primary: [
        { key: "company", label: "Parent company", options: companies },
        { key: "workspace", label: "Workspace", options: toStatusOptions(WORKSPACE_STATUS) },
      ],
      secondary: [
        { key: "onboarding", label: "Onboarding", options: ONBOARDING_FILTER_OPTIONS },
        { key: "health", label: "Health", options: HEALTH_FILTER_OPTIONS },
        { key: "provider", label: "Connected provider", options: providers },
        { key: "website", label: "Website", options: WEBSITE_FILTER_OPTIONS },
        { key: "team", label: "Assigned team", options: TEAM_FILTER_OPTIONS },
        { key: "created", label: "Created", options: CREATED_OPTIONS },
        { key: "lastActive", label: "Last active", options: LAST_ACTIVE_OPTIONS },
      ],
    };
  }, [facets.data]);
}

function SortSelect({ table }: { table: ClientTableState }) {
  const current = table.sort ? `${table.sort.field}:${table.sort.direction}` : "createdAt:desc";
  const known = SORT_OPTIONS.some((option) => option.value === current);
  return (
    <Select
      value={known ? current : ""}
      onValueChange={(value) => {
        const option = SORT_OPTIONS.find((item) => item.value === value);
        if (option) table.setSort(option.field, option.direction);
      }}
    >
      <SelectTrigger size="sm" aria-label="Sort clients" className="w-auto min-w-[10.5rem] gap-1.5">
        <span className="text-muted-foreground">Sort:</span>
        <SelectValue placeholder="Custom" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ClientFilterBar({
  table,
  canExport,
  exporting,
  onExportFiltered,
  onQuickView,
}: {
  table: ClientTableState;
  canExport: boolean;
  exporting: boolean;
  onExportFiltered: () => void;
  onQuickView: (filters: Partial<Record<ClientFilterKey, string>>) => void;
}) {
  const defs = useFilterDefs();
  const [sheetOpen, setSheetOpen] = useState(false);
  const current = activeView(table.filters, table.search);
  const secondaryActive = defs.secondary.filter((def) => table.filters[def.key]).length;
  const hasAnything = table.activeFilterCount > 0 || table.search.length > 0;

  const renderFilter = (def: FilterDef, className?: string) => (
    <FilterSelect key={def.key} label={def.label} value={table.filters[def.key]} options={def.options} onChange={(value) => table.setFilter(def.key, value)} className={className} />
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search client, company, website or client ID..."
          aria-label="Search clients"
          className="w-full sm:w-[24rem]"
        />

        <div className="hidden flex-wrap items-center gap-1.5 lg:flex">
          {defs.primary.map((def) => renderFilter(def))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={secondaryActive > 0 ? "border-primary/40 bg-primary-subtle" : undefined}>
                <SlidersHorizontalIcon />
                More filters
                {secondaryActive > 0 ? <span className="rounded-sm bg-primary px-1 text-2xs text-primary-foreground tabular">{secondaryActive}</span> : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 space-y-2">
              {defs.secondary.map((def) => renderFilter(def, "w-full justify-between"))}
            </PopoverContent>
          </Popover>
        </div>

        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontalIcon />
          Filters
          {table.activeFilterCount > 0 ? <span className="rounded-sm bg-primary px-1 text-2xs text-primary-foreground tabular">{table.activeFilterCount}</span> : null}
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <SortSelect table={table} />
          {canExport ? (
            <Button variant="outline" size="sm" onClick={onExportFiltered} disabled={exporting}>
              {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
              <span className="hidden sm:inline">Export Filtered Results</span>
              <span className="sm:hidden">Export</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick views">
        {QUICK_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={current === view.id}
            onClick={() => onQuickView(view.filters)}
            className={cn(
              "rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors",
              current === view.id ? "border-primary/30 bg-primary-subtle text-primary" : "border-border-strong bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {view.label}
          </button>
        ))}
        {hasAnything ? (
          <Button variant="ghost" size="sm" onClick={table.clearFilters}>
            Clear Filters
          </Button>
        ) : null}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh]">
          <SheetHeader>
            <SheetTitle>Filter clients</SheetTitle>
            <SheetDescription>Results update as you choose.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-2">{[...defs.primary, ...defs.secondary].map((def) => renderFilter(def, "w-full justify-between"))}</SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={table.clearFilters}>
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
