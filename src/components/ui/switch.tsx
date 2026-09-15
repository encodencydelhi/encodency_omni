"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-emerald-500/25",
        "data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
          "data-[state=checked]:translate-x-[1rem] data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
