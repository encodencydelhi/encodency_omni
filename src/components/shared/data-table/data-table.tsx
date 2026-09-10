"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, SettingsIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import type { PaginationMeta, SortSpec } from "@/types/api";
import { ErrorState } from "../error-state";
import { DataTablePagination } from "./data-table-pagination";
import type { DataTableColumn, DataTableSelection } from "./types";

export interface DataTableProps<TRow> {
  columns: Array<DataTableColumn<TRow>>;
  rows: TRow[];
  getRowId: (row: TRow) => string;

  isLoading: boolean;
  /** True during a background refetch — keeps rows visible but dims them. */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Rendered when the query succeeds with no rows. */
  emptyState: React.ReactNode;

  sort?: SortSpec | null;
  onToggleSort?: (field: string) => void;

  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  selection?: DataTableSelection;
  onRowClick?: (row: TRow) => void;
  /** Adds the column-visibility control to the table toolbar. */
  enableColumnVisibility?: boolean;
  /** Rows rendered by the skeleton before the first response arrives. */
  skeletonRows?: number;
  caption?: string;
}

function SortIcon({ state }: { state: "asc" | "desc" | null }) {
  if (state === "asc") return <ArrowUpIcon className="size-3" />;
  if (state === "desc") return <ArrowDownIcon className="size-3" />;
  return <ChevronsUpDownIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />;
}

/**
 * The single table implementation used by every list view.
 *
 * It is deliberately presentational: sorting, filtering and pagination are
 * requested from the server, so behaviour does not change when the mock
 * adapter is replaced by the real API.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  isLoading,
  isFetching = false,
  error,
  onRetry,
  emptyState,
  sort,
  onToggleSort,
  pagination,
  onPageChange,
  onPageSizeChange,
  selection,
  onRowClick,
  enableColumnVisibility = false,
  skeletonRows = 8,
  caption,
}: DataTableProps<TRow>) {
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() =>
    columns.filter((column) => column.defaultHidden).map((column) => column.id),
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumns.includes(column.id)),
    [columns, hiddenColumns],
  );

  const selectedIds = selection?.selectedIds ?? [];
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(getRowId(row)));
  const someSelected = !allSelected && rows.some((row) => selectedIds.includes(getRowId(row)));

  const toggleAll = () => {
    if (!selection) return;
    selection.onChange(allSelected ? [] : rows.map(getRowId));
  };

  const toggleRow = (id: string) => {
    if (!selection) return;
    selection.onChange(
      selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  };

  const columnCount = visibleColumns.length + (selection ? 1 : 0);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {enableColumnVisibility ? (
        <div className="flex items-center justify-end border-b border-border px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <SettingsIcon />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              {columns
                .filter((column) => column.hideable !== false)
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={!hiddenColumns.includes(column.id)}
                    onCheckedChange={(checked) =>
                      setHiddenColumns((current) =>
                        checked ? current.filter((id) => id !== column.id) : [...current, column.id],
                      )
                    }
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selection ? (
                <TableHead className="w-10 pr-0">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows on this page"
                    disabled={rows.length === 0}
                  />
                </TableHead>
              ) : null}

              {visibleColumns.map((column) => {
                const sortField = column.sortField;
                const sortState = sortField && sort?.field === sortField ? sort.direction : null;

                return (
                  <TableHead
                    key={column.id}
                    className={cn(column.width, column.align === "right" && "text-right")}
                    aria-sort={sortState === "asc" ? "ascending" : sortState === "desc" ? "descending" : undefined}
                  >
                    {sortField && onToggleSort ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort(sortField)}
                        className={cn(
                          "group inline-flex items-center gap-1.5 rounded-sm text-2xs font-semibold uppercase tracking-wider transition-colors hover:text-foreground",
                          sortState && "text-foreground",
                          column.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {column.header}
                        <SortIcon state={sortState} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody className={cn(isFetching && !isLoading && "opacity-60 transition-opacity")}>
            {isLoading
              ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                    {Array.from({ length: columnCount }, (_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className={cn("h-4", cellIndex === 0 ? "w-40" : "w-20")} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => {
                  const id = getRowId(row);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(onRowClick && "cursor-pointer")}
                    >
                      {selection ? (
                        <TableCell className="pr-0" onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(id)}
                            aria-label="Select row"
                          />
                        </TableCell>
                      ) : null}

                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(column.align === "right" && "text-right", column.className)}
                        >
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {!isLoading && rows.length === 0 ? emptyState : null}

      {pagination && onPageChange && rows.length > 0 ? (
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
