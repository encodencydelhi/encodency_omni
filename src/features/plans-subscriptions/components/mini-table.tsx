"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

export interface MiniColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
  /** Hidden below this tailwind breakpoint. */
  hideBelow?: "sm" | "md" | "lg";
}

const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const;

/** A compact table for panels: dense rows, sticky-free, scrolls sideways instead of overflowing the page. */
export function MiniTable<T>({
  columns,
  rows,
  getKey,
  caption,
  onRowClick,
  empty,
  dense = false,
}: {
  columns: Array<MiniColumn<T>>;
  rows: readonly T[];
  getKey: (row: T) => string;
  caption: string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  /** Tighter cells and a sticky header, for tables that scroll inside a fixed-height panel. */
  dense?: boolean;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="relative overflow-x-auto scrollbar-thin">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.id} className={cn("h-8", dense ? "sticky top-0 z-[1] bg-surface-sunken px-2" : "px-3", column.align === "right" && "text-right", column.hideBelow && HIDE[column.hideBelow])}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn(onRowClick && "cursor-pointer")}>
              {columns.map((column) => (
                <TableCell key={column.id} className={cn(dense ? "px-2 py-1.5" : "px-3 py-2", "align-middle text-[0.8125rem]", column.align === "right" && "text-right", column.hideBelow && HIDE[column.hideBelow], column.className)}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
