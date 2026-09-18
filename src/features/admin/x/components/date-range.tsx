"use client";

/**
 * The shared date range control. Presets write `?period=`, a custom range
 * writes `?period=custom&from=&to=` so the window survives refresh and sharing.
 */

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { usePeriod, useQueryState } from "../hooks/use-query-state";
import { PERIODS } from "../lib/constants";
import { Button, FormField, Segmented, buttonClass, x } from "./ui";

const DEFAULTS = { period: "30d", from: "", to: "" };

export function PeriodSegmented({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const { period, label } = usePeriod();
  const { set } = useQueryState(useMemo(() => DEFAULTS, []));
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => format(subDays(new Date(), 13), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const invalid = !from || !to || new Date(to) < new Date(from);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Segmented
        label="Date range"
        size={size}
        value={period === "custom" ? "custom" : period}
        onChange={(value) => {
          if (value === "custom") setOpen(true);
          else set({ period: value, from: null, to: null });
        }}
        items={[
          ...PERIODS.map((item) => ({ value: item.value, label: item.short, title: item.label })),
          { value: "custom" as const, label: "Custom", title: "Pick your own range" },
        ]}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Choose a custom date range" className={cn(buttonClass("secondary", size === "sm" ? "sm" : "md"), period !== "custom" && "sr-only")}>
            <CalendarDays className="size-3.5" />
            {period === "custom" ? label : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[290px] border-[#E4E9F0] p-3.5">
          <p className="mb-2.5 text-[12.5px] font-semibold text-[#0F1B3D]">Custom range</p>
          <div className="grid gap-2.5">
            <FormField label="From" htmlFor="x-range-from">
              <input id="x-range-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className={x.input} />
            </FormField>
            <FormField
              label="To"
              htmlFor="x-range-to"
              error={invalid ? "The end date must be on or after the start date." : undefined}
            >
              <input id="x-range-to" type="date" value={to} min={from} max={format(new Date(), "yyyy-MM-dd")} onChange={(event) => setTo(event.target.value)} className={x.input} />
            </FormField>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={invalid}
              onClick={() => {
                set({ period: "custom", from, to });
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
