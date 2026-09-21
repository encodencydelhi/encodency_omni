"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platformNow } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { RANGES } from "../data/config";
import { useAuditWindow } from "../data/hooks";
import { utcShort } from "../lib/format";

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The one date-range control. Every metric, chart, category breakdown and list on a screen
 * uses the window it sets, so no component has its own unexplained time scope.
 */
export function RangeControl({ className }: { className?: string }) {
  const { range, window, from, to, setRange, setCustom, invalidCustom } = useAuditWindow();
  const [draftFrom, setDraftFrom] = useState(from || day(platformNow() - 7 * 86_400_000));
  const [draftTo, setDraftTo] = useState(to || day(platformNow()));
  const reversed = Date.parse(draftFrom) > Date.parse(draftTo);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <div role="group" aria-label="Date range" className="inline-flex overflow-hidden rounded-sm border border-border-strong">
        {RANGES.map((item) => (
          <button key={item.value} type="button" aria-pressed={range === item.value} onClick={() => setRange(item.value)} className={cn("h-8 px-3 text-[0.8125rem] font-medium transition-colors", range === item.value ? "bg-primary-subtle text-primary" : "bg-card text-muted-foreground hover:bg-accent")}>
            {item.label}
          </button>
        ))}
      </div>
      {range === "custom" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Input type="date" aria-label="From date" value={draftFrom} max={draftTo} onChange={(event) => setDraftFrom(event.target.value)} className="h-8 w-36" />
          <span className="text-2xs text-muted-foreground">to</span>
          <Input type="date" aria-label="To date" value={draftTo} min={draftFrom} onChange={(event) => setDraftTo(event.target.value)} className="h-8 w-36" />
          <Button size="sm" variant="outline" disabled={!draftFrom || !draftTo || reversed} onClick={() => setCustom(draftFrom, draftTo)}>Apply</Button>
          {reversed ? <span role="alert" className="text-2xs text-danger">The start date is after the end date.</span> : null}
          {invalidCustom && !reversed ? <span className="text-2xs text-warning">Choose both dates. Showing the last 30 days.</span> : null}
        </div>
      ) : null}
      <span className="text-2xs text-muted-foreground">{utcShort(window.from)} to {utcShort(window.to)}</span>
    </div>
  );
}
