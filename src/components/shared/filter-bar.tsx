"use client";

import { FilterXIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface FilterBarProps {
  /** Search input, rendered first and given priority width. */
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

/**
 * The toolbar above every data table: search on the left, filters beside it,
 * table-level actions on the right.
 */
export function FilterBar({
  search,
  filters,
  actions,
  activeFilterCount = 0,
  onClearFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search}
        {filters}
        {activeFilterCount > 0 && onClearFilters ? (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1.5">
            <FilterXIcon />
            Clear
            <span className="rounded-full bg-muted px-1.5 text-2xs tabular">{activeFilterCount}</span>
          </Button>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
