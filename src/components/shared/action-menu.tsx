"use client";

import { MoreHorizontalIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
  align?: "start" | "end";
}

export function ActionMenu({ items, label = "Open actions", align = "end" }: ActionMenuProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(event) => event.stopPropagation()}>
        {items.map((item) => (
          <div key={item.id}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              variant={item.variant}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              {item.icon ? <item.icon /> : null}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
