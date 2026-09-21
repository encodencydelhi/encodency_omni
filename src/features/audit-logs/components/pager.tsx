"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Range, total and page controls. Paging keeps every active filter. */
export function Pager({ page, pageSize, total, onPage, noun = "events" }: { page: number; pageSize: number; total: number; onPage: (page: number) => void; noun?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-2xs text-muted-foreground">
      <span aria-live="polite">Showing {first}-{last} of {total} matching {noun}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeftIcon /></Button>
        <span className="tabular">Page {page} of {pages}</span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRightIcon /></Button>
      </div>
    </div>
  );
}
