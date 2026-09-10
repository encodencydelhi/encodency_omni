"use client";

import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GlobalSearch } from "./global-search";
import { NotificationsMenu } from "./notifications-menu";
import { useSidebar } from "./sidebar-context";
import { UserMenu } from "./user-menu";

/**
 * Search and account tools, kept thin so it never competes with the page.
 *
 * One control toggles the navigation in both directions: it collapses the rail
 * on desktop and opens the drawer on smaller screens.
 */
export function Topbar() {
  const { setMobileOpen, toggleCollapsed } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex h-(--topbar-height) items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm xl:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden"
      >
        <MenuIcon />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleCollapsed}
        aria-label="Toggle navigation"
        className="hidden lg:inline-flex"
      >
        <MenuIcon />
      </Button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <NotificationsMenu />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
