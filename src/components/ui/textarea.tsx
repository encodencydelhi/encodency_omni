import type * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-not-allowed disabled:opacity-70",
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
}
