import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface DefinitionItem {
  label: string;
  value: ReactNode;
}

interface DefinitionListProps {
  items: DefinitionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}

/** Label/value pairs used on detail pages and drawers. */
export function DefinitionList({ items, columns = 2, className }: DefinitionListProps) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</dt>
          <dd className="truncate text-[0.8125rem] text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
