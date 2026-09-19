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
import { toStatusOptions } from "@/types/common";
import { PLAN_TIER } from "@/types/domain/plan";
import {
  ACCOUNT_STATUS,
  ATTENTION_KIND_META,
  BILLING_STATUS_META,
  CREATED_OPTIONS,
  INTERNAL_TAG_OPTIONS,
  LAST_ACTIVE_OPTIONS,
  SORT_OPTIONS,
  SUBSCRIPTION_STATUS_META,
  USAGE_LEVEL_META,
} from "../data/config";
import type { AttentionKind, CompanyListQuery } from "../data/types";

/**
 * Filter keys are URL parameters. `status` is accepted as an alias of
 * `accountStatus` so links like `?status=active&plan=growth` keep working.
 */
export const FILTER_KEYS = [
  "plan",
  "accountStatus",
  "status",
  "subscriptionStatus",
  "billingStatus",
  "health",
  "usageLevel",
  "created",
  "lastActive",
  "issue",
  "tag",
] as const;

export type CompanyFilterKey = (typeof FILTER_KEYS)[number];
export type CompanyTableState = TableQueryState<CompanyFilterKey>;

export function buildCompanyQuery(table: CompanyTableState): CompanyListQuery {
  const { filters } = table;
  return {
    search: table.listParams.search,
    plan: filters.plan,
    accountStatus: filters.accountStatus ?? filters.status,
    subscriptionStatus: filters.subscriptionStatus,
    billingStatus: filters.billingStatus,
    health: filters.health,
    usageLevel: filters.usageLevel,
    created: filters.created,
    lastActive: filters.lastActive,
    issue: filters.issue,
    tag: filters.tag,
    sort: table.sort,
    page: table.page,
    pageSize: table.pageSize,
  };
}

const HEALTH_FILTER_OPTIONS: FilterOption[] = [
  { value: "healthy", label: "Healthy" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "critical", label: "Critical" },
  { value: "at_risk", label: "Needs attention or critical" },
  { value: "suspended", label: "Suspended" },
];

const ISSUE_OPTIONS: FilterOption[] = (Object.keys(ATTENTION_KIND_META) as AttentionKind[]).map((kind) => ({
  value: kind,
  label: ATTENTION_KIND_META[kind].label,
}));

interface FilterDef {
  key: CompanyFilterKey;
  label: string;
  options: FilterOption[];
}

function useFilterDefs(extraTags: string[]): { primary: FilterDef[]; secondary: FilterDef[] } {
  return useMemo(() => {
    const tags = [...new Set([...INTERNAL_TAG_OPTIONS, ...extraTags])].sort();
    return {
      primary: [
        { key: "plan", label: "Plan", options: toStatusOptions(PLAN_TIER) },
        { key: "accountStatus", label: "Account", options: toStatusOptions(ACCOUNT_STATUS) },
        { key: "subscriptionStatus", label: "Subscription", options: toStatusOptions(SUBSCRIPTION_STATUS_META) },
        { key: "billingStatus", label: "Billing", options: toStatusOptions(BILLING_STATUS_META) },
        { key: "health", label: "Health", options: HEALTH_FILTER_OPTIONS },
      ],
      secondary: [
        { key: "usageLevel", label: "Usage", options: toStatusOptions(USAGE_LEVEL_META).filter((option) => option.value !== "not_metered") },
        { key: "created", label: "Created", options: CREATED_OPTIONS },
        { key: "lastActive", label: "Last active", options: LAST_ACTIVE_OPTIONS },
        { key: "issue", label: "Attention", options: ISSUE_OPTIONS },
        { key: "tag", label: "Tag", options: tags.map((tag) => ({ value: tag, label: tag })) },
      ],
    };
  }, [extraTags]);
}

function SortSelect({ table, className }: { table: CompanyTableState; className?: string }) {
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
      <SelectTrigger size="sm" aria-label="Sort companies" className={className ?? "w-auto min-w-[9.5rem] gap-1.5"}>
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

export function CompanyFilterBar({
  table,
  extraTags,
  canExport,
  exporting,
  onExportFiltered,
}: {
  table: CompanyTableState;
  extraTags: string[];
  canExport: boolean;
  exporting: boolean;
  onExportFiltered: () => void;
}) {
  const defs = useFilterDefs(extraTags);
  const [sheetOpen, setSheetOpen] = useState(false);

  const valueOf = (key: CompanyFilterKey) => (key === "accountStatus" ? (table.filters.accountStatus ?? table.filters.status) : table.filters[key]);
  // The legacy alias keeps its own parameter so changing it edits the URL the user arrived with.
  const change = (key: CompanyFilterKey, value: string | null) =>
    table.setFilter(key === "accountStatus" && table.filters.status !== undefined ? "status" : key, value);

  const secondaryActive = defs.secondary.filter((def) => valueOf(def.key)).length;

  const renderFilter = (def: FilterDef, className?: string) => (
    <FilterSelect key={def.key} label={def.label} value={valueOf(def.key)} options={def.options} onChange={(value) => change(def.key, value)} className={className} />
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search company, owner, email, domain or company ID..."
          aria-label="Search companies"
          className="w-full sm:w-[22rem]"
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
          {table.activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={table.clearFilters}>
              Clear filters
            </Button>
          ) : null}
          {canExport ? (
            <Button variant="outline" size="sm" onClick={onExportFiltered} disabled={exporting}>
              {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
              <span className="hidden sm:inline">Export results</span>
            </Button>
          ) : null}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh]">
          <SheetHeader>
            <SheetTitle>Filter companies</SheetTitle>
            <SheetDescription>Results update as you choose.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-2">
            {[...defs.primary, ...defs.secondary].map((def) => renderFilter(def, "w-full justify-between"))}
          </SheetBody>
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
