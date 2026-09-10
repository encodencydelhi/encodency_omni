"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { NAV_ITEMS_BY_HREF } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

interface BreadcrumbLabelContextValue {
  /** Maps a dynamic path segment (an id) to a human label. */
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
}

const BreadcrumbLabelContext = createContext<BreadcrumbLabelContextValue | null>(null);

/**
 * Lets a detail page contribute the name behind an id in the URL, so the trail
 * reads "Companies › Meridian Digital" instead of exposing a raw identifier.
 */
export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((segment: string, label: string) => {
    setLabels((current) => (current[segment] === label ? current : { ...current, [segment]: label }));
  }, []);

  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);

  return <BreadcrumbLabelContext.Provider value={value}>{children}</BreadcrumbLabelContext.Provider>;
}

export function useBreadcrumbLabels(): BreadcrumbLabelContextValue {
  const context = useContext(BreadcrumbLabelContext);
  if (!context) throw new Error("useBreadcrumbLabels must be used inside a BreadcrumbLabelProvider");
  return context;
}

interface Crumb {
  label: string;
  href: string;
}

function toTitleCase(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { labels } = useBreadcrumbLabels();

  const crumbs = useMemo<Crumb[]>(() => {
    const segments = pathname.split("/").filter(Boolean);
    // Everything under the panel hangs off the dashboard, which is the root.
    const trail: Crumb[] = [{ label: "Dashboard", href: ROUTES.superAdmin.dashboard }];

    let href = "";
    for (const segment of segments) {
      href += `/${segment}`;
      if (href === ROUTES.superAdmin.root) continue;

      const navItem = NAV_ITEMS_BY_HREF.get(href);
      trail.push({
        label: navItem?.label ?? labels[segment] ?? toTitleCase(segment),
        href,
      });
    }

    return trail;
  }, [labels, pathname]);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 overflow-hidden">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="truncate text-[0.8125rem] font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
