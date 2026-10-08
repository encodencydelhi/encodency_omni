import type { ReactNode } from "react";
import { isMockMode } from "@/config/env";

/** Marks a dashboard tile whose numbers come from the demo snapshot, not a live backend aggregate. */
export function DemoTag({ children = "Demo data" }: { children?: ReactNode }) {
  if (!isMockMode) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-px text-[11px] font-medium text-amber-700">
      {children}
    </span>
  );
}
