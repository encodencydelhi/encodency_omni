"use client";

import type { ReactElement } from "react";
import { Arrow } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedIcon, type AnimatedIconName } from "@/components/shared/animated-icon";
import { cn } from "@/lib/utils/cn";

/** A quiet, consistent explanation for sidebar destinations. */
export function SidebarItemTooltip({
  label,
  description,
  collapsed,
  icon,
  iconColor,
  children,
}: {
  label: string;
  description: string;
  collapsed: boolean;
  icon: AnimatedIconName;
  iconColor: string;
  children: ReactElement;
}) {
  return (
    <TooltipProvider delayDuration={600} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          sideOffset={12}
          collisionPadding={12}
          className={cn(
            "z-[60] overflow-visible rounded-xl border-white/10 bg-slate-900 bg-linear-to-br from-slate-800/80 to-transparent px-3 py-2 text-[11px] leading-[1.4] text-slate-300 shadow-[0_8px_28px_-6px_rgb(2_6_23/0.5)] capitalize",
            collapsed ? "w-[264px] max-w-[calc(100vw-24px)]" : "w-[248px] max-w-[calc(100vw-24px)]",
          )}
        >
          <span className="mb-1.5 flex items-center gap-2">
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-md bg-white/5 ring-1 ring-inset ring-white/10", iconColor)}>
              <AnimatedIcon name={icon} size={15} active />
            </span>
            <span className="text-xs font-semibold leading-4 tracking-wide text-slate-50">{label}</span>
          </span>
          <span className="block border-t border-white/8 pt-1.5">{description}</span>
          <Arrow width={10} height={5} className="fill-slate-900" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
