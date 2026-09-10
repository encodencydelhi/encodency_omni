"use client";

import { CalendarIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP } from "@/config/app";
import { cn } from "@/lib/utils/cn";
import { formatTime } from "@/lib/utils/format";
import { DASHBOARD_RANGES, type DashboardRange } from "../services/dashboard-service";

const RANGE_KEYS = Object.keys(DASHBOARD_RANGES) as DashboardRange[];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface DashboardHeaderProps {
  firstName: string;
  generatedAt: string | undefined;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DashboardHeader({
  firstName,
  generatedAt,
  range,
  onRangeChange,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting()}, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-[0.8125rem] text-muted-foreground">
          Here is what is happening across {APP.name}.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-2xs font-medium text-foreground">{today()}</p>
          <p className="text-2xs text-muted-foreground">
            {generatedAt ? `Last updated: ${formatTime(generatedAt)}` : "Loading…"}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard"
        >
          <RefreshCwIcon className={cn(isRefreshing && "animate-spin")} />
        </Button>

        <Select value={range} onValueChange={(value) => onRangeChange(value as DashboardRange)}>
          <SelectTrigger className="w-44 gap-2" aria-label="Comparison period">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {DASHBOARD_RANGES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
