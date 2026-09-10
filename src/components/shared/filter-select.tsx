"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string | undefined;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  className?: string;
}

/** Sentinel for "no filter"; Radix Select cannot use an empty string value. */
const ALL_VALUE = "__all__";

export function FilterSelect({ label, value, options, onChange, className }: FilterSelectProps) {
  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(next) => onChange(next === ALL_VALUE ? null : next)}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={cn("w-auto min-w-[8.5rem] gap-1.5", value && "border-primary/40 bg-primary-subtle", className)}
      >
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
