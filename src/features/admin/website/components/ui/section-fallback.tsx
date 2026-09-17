import { SkeletonChart, SkeletonStats, SkeletonTable } from "./states";
import { CARD } from "./kit";
import { cn } from "@/lib/utils/cn";

/** Suspense fallback for a Website screen while its client bundle resolves. */
export function WebsiteSectionFallback() {
  return (
    <div className="space-y-1" role="status" aria-label="Loading website data">
      <SkeletonStats count={4} />
      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={cn(CARD, "overflow-hidden")}>
          <SkeletonChart height={200} />
        </div>
        <div className={cn(CARD, "overflow-hidden")}>
          <SkeletonTable rows={5} />
        </div>
      </div>
    </div>
  );
}
