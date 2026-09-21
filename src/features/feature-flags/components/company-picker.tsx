"use client";

import { XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";
import { useCompanySearch } from "../data/hooks";

/**
 * Chooses the companies a rollout targets. Selecting a company here only targets it;
 * it never grants a plan entitlement, so the plan column stays visible.
 */
export function CompanyPicker({ selected, onChange, disabled = false, className }: { selected: readonly string[]; onChange: (ids: string[]) => void; disabled?: boolean; className?: string }) {
  const [term, setTerm] = useState("");
  const all = useCompanySearch("");
  const results = useCompanySearch(term);
  const names = useMemo(() => new Map((all.data ?? []).map((item) => [item.id, item.name])), [all.data]);
  const set = useMemo(() => new Set(selected), [selected]);
  const toggle = (id: string) => onChange(set.has(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-1" aria-label="Selected companies">
        {selected.length === 0 ? <p className="text-2xs text-muted-foreground">No company selected yet.</p> : null}
        {selected.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-primary-subtle px-1.5 py-0.5 text-2xs font-medium text-primary">
            {names.get(id) ?? id}
            {!disabled ? (
              <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${names.get(id) ?? id}`} className="rounded-sm hover:bg-primary/10">
                <XIcon className="size-3" aria-hidden />
              </button>
            ) : null}
          </span>
        ))}
      </div>
      {!disabled ? (
        <>
          <SearchInput value={term} onChange={setTerm} placeholder="Search companies..." aria-label="Search companies to target" className="w-full" />
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin" aria-label="Companies">
            {results.isLoading ? <li className="px-3 py-2 text-2xs text-muted-foreground" role="status">Loading companies...</li> : null}
            {results.data?.length === 0 ? <li className="px-3 py-2 text-2xs text-muted-foreground">No company matches this search.</li> : null}
            {results.data?.map((company) => (
              <li key={company.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[0.8125rem] hover:bg-accent/50">
                  <Checkbox checked={set.has(company.id)} onCheckedChange={() => toggle(company.id)} aria-label={company.name} />
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{company.name}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">{company.plan}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
