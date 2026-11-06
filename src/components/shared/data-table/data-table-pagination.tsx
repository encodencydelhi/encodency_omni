"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { APP } from "@/config/app";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/utils/format";
import type { PaginationMeta } from "@/types/api";

interface DataTablePaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Server cursors can only step to the next or previous page, so the jump-to-first/last controls and the page count are hidden. */
  cursorMode?: boolean;
}

export function DataTablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  cursorMode = false,
}: DataTablePaginationProps) {
  const { page, pageSize, total, totalPages, hasNextPage, hasPreviousPage } = pagination;

  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-2xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{formatNumber(firstRow)}</span>–
        <span className="font-medium text-foreground">{formatNumber(lastRow)}</span> of{" "}
        <span className="font-medium text-foreground">{formatNumber(total)}</span>
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange ? (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-2xs text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-[4.5rem]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP.pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <span className="mr-2 text-2xs text-muted-foreground">
            {cursorMode ? `Page ${page}` : `Page ${page} of ${totalPages}`}
          </span>
          {cursorMode ? null : (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(1)}
              disabled={!hasPreviousPage}
              aria-label="First page"
            >
              <ChevronsLeftIcon />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPreviousPage}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
          {cursorMode ? null : (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage}
              aria-label="Last page"
            >
              <ChevronsRightIcon />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
