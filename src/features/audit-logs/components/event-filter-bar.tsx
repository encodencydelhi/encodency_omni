"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedText } from "@/features/companies/hooks/use-url-params";
import { cn } from "@/lib/utils/cn";
import { ACTOR_TYPE, CATEGORY, ENVIRONMENTS, EVENT_SORTS, OUTCOME, PRIORITY, QUICK_FILTERS, WORKFLOW_STAGE } from "../data/config";
import { useFacets, useScopeOptions } from "../data/hooks";
import type { EventFilters } from "./use-event-filters";

const quickClass = (active: boolean) => `rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors ${active ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`;

export interface FilterBarOptions {
  /** Hide filters a screen already fixes (a view that is only sensitive events has no "sensitive" toggle). */
  hide?: Array<"category" | "quick" | "sensitive" | "stage" | "actorType">;
  placeholder?: string;
  showSort?: boolean;
}

/**
 * The search and filter controls every event list shares. Company is a convenience filter, not a
 * tenant security boundary: a backend must enforce which companies a person may see. Choosing a
 * company limits the Client filter to that company's own clients.
 */
export function EventFilterBar({ filters, hide = [], placeholder = "Search event ID, actor, action, company or resource...", showSort = true }: { filters: EventFilters } & FilterBarOptions) {
  const { values: v, setFilter, clear, activeCount } = filters;
  const facets = useFacets();
  const scopes = useScopeOptions();
  const [search, setSearch] = useDebouncedText(v.q, (value) => setFilter({ q: value }));
  const company = scopes.data?.find((item) => item.id === v.company);
  const hidden = new Set(hide);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder={placeholder} aria-label="Search audit events" className="w-full sm:w-96" />
        {!hidden.has("category") ? <FilterSelect label="Category" value={v.category || undefined} options={Object.entries(CATEGORY).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => setFilter({ category: value })} /> : null}
        <FilterSelect label="Result" value={v.outcome || undefined} options={Object.entries(OUTCOME).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => setFilter({ outcome: value })} />
        {!hidden.has("actorType") ? <FilterSelect label="Actor Type" value={v.actorType || undefined} options={Object.entries(ACTOR_TYPE).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => setFilter({ actorType: value })} /> : null}
        <FilterSelect label="Company" value={v.company || undefined} options={(scopes.data ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => setFilter({ company: value, client: null })} />
        {company ? <FilterSelect label="Client" value={v.client || undefined} options={company.clients.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => setFilter({ client: value })} /> : null}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><SlidersHorizontalIcon />More Filters</Button>
          </PopoverTrigger>
          <PopoverContent className="w-[22rem] space-y-2.5" align="start">
            <p className="text-[13px] font-semibold text-foreground">More Filters</p>
            <div className="grid grid-cols-1 gap-2">
              <FilterSelect label="Action Type" value={v.action || undefined} options={(facets.data?.actions ?? []).map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => setFilter({ action: value })} className="w-full justify-between" />
              <FilterSelect label="Review Priority" value={v.priority || undefined} options={Object.entries(PRIORITY).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => setFilter({ priority: value })} className="w-full justify-between" />
              <FilterSelect label="Specific Actor" value={v.actor || undefined} options={(facets.data?.actors ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => setFilter({ actor: value })} className="w-full justify-between" />
              <FilterSelect label="Resource Type" value={v.resource || undefined} options={(facets.data?.resourceTypes ?? []).map((item) => ({ value: item, label: item.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }))} onChange={(value) => setFilter({ resource: value })} className="w-full justify-between" />
              <FilterSelect label="Environment" value={v.env || undefined} options={ENVIRONMENTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => setFilter({ env: value })} className="w-full justify-between" />
              <FilterSelect label="Source Module" value={v.module || undefined} options={(facets.data?.sourceModules ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => setFilter({ module: value })} className="w-full justify-between" />
              {!hidden.has("stage") ? <FilterSelect label="Workflow State" value={v.stage || undefined} options={Object.entries(WORKFLOW_STAGE).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => setFilter({ stage: value })} className="w-full justify-between" /> : null}
              <div className="space-y-1">
                <Label htmlFor="filter-corr" className="text-2xs">Correlation ID</Label>
                <Input id="filter-corr" defaultValue={v.corr} key={`corr-${v.corr}`} placeholder="wf_..." className="h-8 font-mono text-2xs" onBlur={(event) => event.target.value !== v.corr && setFilter({ corr: event.target.value.trim() || null })} onKeyDown={(event) => event.key === "Enter" && setFilter({ corr: (event.target as HTMLInputElement).value.trim() || null })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-req" className="text-2xs">Request ID</Label>
                <Input id="filter-req" defaultValue={v.req} key={`req-${v.req}`} placeholder="req_..." className="h-8 font-mono text-2xs" onBlur={(event) => event.target.value !== v.req && setFilter({ req: event.target.value.trim() || null })} onKeyDown={(event) => event.key === "Enter" && setFilter({ req: (event.target as HTMLInputElement).value.trim() || null })} />
              </div>
              {!hidden.has("sensitive") ? (
                <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem]"><Checkbox checked={v.sensitive === "1"} onCheckedChange={(checked) => setFilter({ sensitive: checked === true ? "1" : null })} aria-label="Sensitive events only" />Sensitive Events Only</label>
              ) : null}
            </div>
            <p className="text-2xs text-muted-foreground">IP address filtering is not available: this demo does not collect it.</p>
          </PopoverContent>
        </Popover>

        {showSort ? <FilterSelect label="Sort" value={v.sort || undefined} options={EVENT_SORTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => filters.set({ sort: value, page: null })} /> : null}
        {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={clear}>Clear All ({activeCount})</Button> : null}
      </div>

      {!hidden.has("quick") ? (
        <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-1">
          <button type="button" aria-pressed={!v.quick} onClick={() => setFilter({ quick: null })} className={quickClass(!v.quick)}>All Events</button>
          {QUICK_FILTERS.map((item) => <button key={item.value} type="button" aria-pressed={v.quick === item.value} onClick={() => setFilter({ quick: v.quick === item.value ? null : item.value })} className={cn(quickClass(v.quick === item.value))}>{item.label}</button>)}
          <span className="ml-1 text-2xs text-muted-foreground">{activeCount === 0 ? "No filters active" : `${activeCount} ${activeCount === 1 ? "filter" : "filters"} active`}</span>
        </div>
      ) : null}
    </div>
  );
}
