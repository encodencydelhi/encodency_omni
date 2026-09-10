import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { getInitials } from "@/lib/utils/format";

interface EntityCellProps {
  name: string;
  /** Secondary line: email, company, industry — whatever identifies the row. */
  meta?: ReactNode;
  imageUrl?: string | null;
  /** Square avatars read as organisations, round ones as people. */
  shape?: "circle" | "square";
  className?: string;
}

/**
 * The first column of nearly every table: an avatar, a name and one line of
 * context. Defined once so identity looks the same product-wide.
 */
export function EntityCell({ name, meta, imageUrl, shape = "circle", className }: EntityCellProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Avatar className={cn("size-7 shrink-0", shape === "square" && "rounded-md")}>
        {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
        <AvatarFallback className={cn(shape === "square" && "rounded-md")}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-medium text-foreground">{name}</p>
        {meta ? <p className="truncate text-2xs text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  );
}
