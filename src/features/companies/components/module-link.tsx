"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveModuleLink, type GlobalModule } from "../data/config";

/**
 * A link into another Super Admin module.
 *
 * If that module has no route yet, this renders a disabled control that says so.
 * That is more honest than a link to a 404, and it switches to a real link the
 * moment the module's availability flag is flipped in `config.ts`.
 */
export function ModuleLinkButton({
  module,
  query,
  children,
  variant = "outline",
  size = "sm",
  className,
}: {
  module: GlobalModule;
  query?: Record<string, string>;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "subtle" | "link";
  size?: "sm" | "default";
  className?: string;
}) {
  const link = resolveModuleLink(module, query);

  if (link.available && link.href) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <Link href={link.href}>{children}</Link>
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={0}>
          <Button variant={variant} size={size} disabled className={className}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{link.label} is not available in this build yet.</TooltipContent>
    </Tooltip>
  );
}
