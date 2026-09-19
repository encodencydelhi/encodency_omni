import {
  ArrowDownUpIcon,
  DownloadIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALLOWED_COMPANY_ROLES, exportUsersToCsv, USER_SORT_OPTIONS } from "../data/config";
import type { UserAggregate, UserFilters, UserSortField } from "../data/types";

interface UsersFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: UserFilters;
  onFilterChange: <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  sort: UserSortField;
  onSortChange: (sort: UserSortField) => void;
  filteredUsers: UserAggregate[];
  companyOptions: Array<{ id: string; name: string }>;
  className?: string;
}

export function UsersFilterToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
  sort,
  onSortChange,
  filteredUsers,
  companyOptions,
}: UsersFilterToolbarProps) {
  const handleExport = () => {
    exportUsersToCsv(filteredUsers, `omniplatform-users-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, user ID or company..."
            className="h-8.5 pl-8 pr-2.5 text-xs bg-white border-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.companyId ?? "all"}
            onValueChange={(val) => onFilterChange("companyId", val === "all" ? undefined : val)}
          >
            <SelectTrigger className="h-8.5 text-xs w-[140px] bg-white">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companyOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(val) => onFilterChange("status", val === "all" ? undefined : (val as any))}
          >
            <SelectTrigger className="h-8.5 text-xs w-[125px] bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.role ?? "all"}
            onValueChange={(val) => onFilterChange("role", val === "all" ? undefined : (val as any))}
          >
            <SelectTrigger className="h-8.5 text-xs w-[135px] bg-white">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ALLOWED_COMPANY_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.twoFactor ?? "all"}
            onValueChange={(val) => onFilterChange("twoFactor", val === "all" ? undefined : (val as any))}
          >
            <SelectTrigger className="h-8.5 text-xs w-[120px] bg-white">
              <SelectValue placeholder="2FA Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All 2FA</SelectItem>
              <SelectItem value="enabled">2FA Active</SelectItem>
              <SelectItem value="not_enabled">Not Enabled</SelectItem>
              <SelectItem value="required">Policy Required</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(val) => onSortChange(val as UserSortField)}>
            <SelectTrigger className="h-8.5 text-xs w-[135px] bg-white">
              <ArrowDownUpIcon className="size-3 mr-1 text-slate-400" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {USER_SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 text-xs gap-1 bg-white px-2.5"
              >
                <SlidersHorizontalIcon className="size-3 text-slate-500" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-blue-600 text-white px-1.5 py-0.2 text-xs font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel>Advanced Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.multiCompanyOnly ?? false}
                onCheckedChange={(checked) => onFilterChange("multiCompanyOnly", checked || undefined)}
              >
                Multi-Company Users Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.ownerOnly ?? false}
                onCheckedChange={(checked) => onFilterChange("ownerOnly", checked || undefined)}
              >
                Organization Owners
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.adminOnly ?? false}
                onCheckedChange={(checked) => onFilterChange("adminOnly", checked || undefined)}
              >
                Admins & Managers
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.noActiveMembership ?? false}
                onCheckedChange={(checked) => onFilterChange("noActiveMembership", checked || undefined)}
              >
                No Active Membership
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.accessIssues ?? false}
                onCheckedChange={(checked) => onFilterChange("accessIssues", checked || undefined)}
              >
                Security & Access Issues
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8.5 text-xs text-slate-500 hover:text-slate-800 px-2 gap-1"
            >
              <RotateCcwIcon className="size-3" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8.5 text-xs gap-1 bg-white ml-auto"
            title="Export visible or filtered users to CSV"
          >
            <DownloadIcon className="size-3 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
