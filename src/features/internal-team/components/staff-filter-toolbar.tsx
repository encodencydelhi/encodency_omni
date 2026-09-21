"use client";

import { FilterIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { INTERNAL_ROLE, type InternalRole, type TeamMemberStatus } from "@/types/domain/team";
import { DEPARTMENTS, TEAM_SORT_OPTIONS } from "../data/config";
import type { AccessReviewStatus, MfaState, StaffListQuery } from "../data/types";

interface StaffFilterToolbarProps {
  query: StaffListQuery;
  onQueryChange: (query: Partial<StaffListQuery>) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}

export function StaffFilterToolbar({ query, onQueryChange, activeFilterCount, onClearFilters }: StaffFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 min-w-0">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        <Input
          placeholder="Search staff name, email, role or staff ID..."
          value={query.search || ""}
          onChange={(e) => onQueryChange({ search: e.target.value })}
          className="h-8 pl-8 text-xs bg-white"
        />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Select value={query.role || "all"} onValueChange={(v) => onQueryChange({ role: v === "all" ? undefined : v as InternalRole })}>
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs bg-white">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {(Object.keys(INTERNAL_ROLE) as InternalRole[]).map((r) => (
              <SelectItem key={r} value={r}>{INTERNAL_ROLE[r].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={query.status || "all"} onValueChange={(v) => onQueryChange({ status: v === "all" ? undefined : v as TeamMemberStatus })}>
          <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={query.department || "all"} onValueChange={(v) => onQueryChange({ department: v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs bg-white">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={query.sort || "recently_active"} onValueChange={(v) => onQueryChange({ sort: v as StaffListQuery["sort"] })}>
          <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs bg-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-slate-500" onClick={onClearFilters}>
            <XIcon className="size-3" /> Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}
