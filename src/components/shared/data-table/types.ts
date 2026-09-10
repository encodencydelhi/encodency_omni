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
  /** Excluded from the column-visibility menu when false. */
  hideable?: boolean;
  defaultHidden?: boolean;
}

export interface DataTableSelection {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}
