import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/types/common";

/**
 * Tone-driven badge. Callers pass meaning, never colour, so status palettes
 * stay consistent everywhere a state is displayed.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-2xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        brand: "border-primary/20 bg-primary-subtle text-primary",
        success: "border-success/20 bg-success-subtle text-success",
        warning: "border-warning/20 bg-warning-subtle text-warning",
        danger: "border-danger/20 bg-danger-subtle text-danger",
        info: "border-info/20 bg-info-subtle text-info",
        neutral: "border-border-strong bg-neutral-subtle text-neutral",
      } satisfies Record<Tone, string>,
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

export function Badge({ className, tone, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return <Comp className={cn(badgeVariants({ tone }), className)} {...props} />;
}
