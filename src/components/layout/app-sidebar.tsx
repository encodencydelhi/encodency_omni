"use client";

import { HeadphonesIcon, PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { APP } from "@/config/app";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { BrandGlyph, EnCodencyLogo } from "./brand-mark";
import { useSidebar } from "./sidebar-context";
import { SidebarNav } from "./sidebar-nav";

/** The red logo block that heads the rail, as on the corporate mark. */
function SidebarBrand({ isCollapsed, onNavigate }: { isCollapsed: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={ROUTES.superAdmin.dashboard}
      onClick={onNavigate}
      aria-label={`${APP.name} ${APP.panelName}`}
      className={cn(
        "flex shrink-0 items-center bg-primary",
        isCollapsed ? "justify-center py-3" : "px-2 py-2",
      )}
    >
      {isCollapsed ? (
        <BrandGlyph size="sm" className="bg-transparent" />
      ) : (
        <div className="relative h-[44px] w-full">
          <EnCodencyLogo fill priority />
        </div>
      )}
    </Link>
  );
}

/** Support entry point, pinned to the foot of the rail. */
function SidebarHelpCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-foreground">
        <HeadphonesIcon className="size-4 text-primary" />
        Need Help?
      </p>
      <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
        Get support from our team
      </p>
      <Button variant="outline" size="sm" asChild className="mt-3 w-full">
        <a href={`mailto:${APP.supportEmail}`}>Contact Support</a>
      </Button>
    </div>
  );
}

function SidebarBody({ isCollapsed, onNavigate }: { isCollapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <SidebarBrand isCollapsed={isCollapsed} onNavigate={onNavigate} />
      <SidebarNav isCollapsed={isCollapsed} onNavigate={onNavigate} />
      {!isCollapsed ? (
        <div className="p-3">
          <SidebarHelpCard />
        </div>
      ) : null}
    </>
  );
}

/**
 * Persistent navigation.
 *
 * Desktop renders a fixed rail that collapses to icons; below `lg` the same
 * content is presented in a drawer so the content area keeps its full width.
 */
export function AppSidebar() {
  const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      <aside
        data-collapsed={isCollapsed}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-(--sidebar-width-collapsed)" : "w-(--sidebar-width)",
        )}
      >
        <SidebarBody isCollapsed={isCollapsed} />

        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className="absolute -right-3 top-24 size-6 rounded-full p-0 text-muted-foreground shadow-xs"
        >
          <PanelLeftIcon className={cn("size-3 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar p-0" showClose={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody isCollapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
