"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { getInitials } from "@/lib/utils/format";

type ClientLogoProp = string | { url?: string | null } | null | undefined;

/** The client's logo (SafeAsset object, URL string, or local preview) or their initials fallback. */
export function ClientAvatar({ name, logo, className }: { name: string; logo?: ClientLogoProp; className?: string }) {
  const src = typeof logo === "string" ? logo : logo?.url ?? null;

  return (
    <Avatar className={cn("size-8 shrink-0 rounded-sm", className)}>
      {src ? <AvatarImage src={src} alt={name || "Client"} className="rounded-sm object-cover" /> : null}
      <AvatarFallback className="rounded-sm text-[11px] font-semibold">{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

