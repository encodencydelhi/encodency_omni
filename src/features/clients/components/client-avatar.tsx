"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { getInitials } from "@/lib/utils/format";

/** The client's logo (a local preview) or their initials. */
export function ClientAvatar({ name, logo, className }: { name: string; logo?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-8 shrink-0 rounded-sm", className)}>
      {logo ? <AvatarImage src={logo} alt="" className="rounded-sm object-cover" /> : null}
      <AvatarFallback className="rounded-sm text-[11px] font-semibold">{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
