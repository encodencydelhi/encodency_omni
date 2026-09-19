import type { ReactNode } from "react";

export interface DataTableColumn<TRow> {
  /** Stable identifier, also used for column-visibility persistence. */
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  /**
   * Server-side sort field. Providing it makes the header interactive; the
   * table never sorts rows itself, because real pages are server-sorted.
   */
  sortField?: string;
  align?: "left" | "right";
  /** Tailwind width utility, e.g. "w-48". Keeps column sizing declarative. */
  width?: string;
  className?: string;
  /**
   * Hides the column below a breakpoint, for low-priority columns that would
   * otherwise force a horizontal scroll on laptop and tablet widths.
   */
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl" | 1320 | 1400 | 1500 | 1600 | 1720;
  /** Excluded from the column-visibility menu when false. */
  hideable?: boolean;
  defaultHidden?: boolean;
}

export interface DataTableSelection {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}
