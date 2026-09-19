"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { APP } from "@/config/app";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { EnCodencyLogo } from "./brand-mark";
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
        "flex h-[60px] shrink-0 items-center justify-center border-b border-slate-800/50",
        isCollapsed ? "px-0" : "px-3",
      )}
    >
      {isCollapsed ? (
        <span className="grid size-8 place-items-center rounded-sm bg-[#1E293B] text-[15px] font-semibold text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]">
          e
        </span>
      ) : (
        <EnCodencyLogo height={44} priority className="drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
      )}
    </Link>
  );
}



function SidebarBody({ isCollapsed, onNavigate }: { isCollapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <SidebarBrand isCollapsed={isCollapsed} onNavigate={onNavigate} />
      <SidebarNav isCollapsed={isCollapsed} onNavigate={onNavigate} />
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
          "fixed inset-y-0 left-0 z-50 flex bg-[#0B1121] transition-[width,transform] duration-200 lg:translate-x-0",
          "border-r border-[#1E293B] shadow-[1px_0_12px_rgb(0_0_0/0.5)] flex-col lg:flex",
          !isMobileOpen && "hidden", // In app-sidebar logic, it hides unless mobile open or lg
          isCollapsed ? "w-[64px]" : "w-[220px]",
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-[200px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex min-w-0 flex-1 flex-col relative z-10 min-h-0">
        <SidebarBody isCollapsed={isCollapsed} />

        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className="absolute -right-3 top-24 size-6 rounded-sm p-0 text-muted-foreground shadow-xs"
        >
          <PanelLeftIcon className={cn("size-3 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
        </div>
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
