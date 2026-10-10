/**
 * EnCodency OmniPlatform - Super Admin Billing Navigation Tabs
 * Compact, URL-addressable horizontal sub-navigation.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function BillingTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Overview",
      href: "/super-admin/billing",
      exact: true,
    },
    {
      label: "Invoices",
      href: "/super-admin/billing/invoices",
      exact: false,
    },
    {
      label: "Payments",
      href: "/super-admin/billing/payments",
      exact: false,
    },
    {
      label: "Credits & Refunds",
      href: "/super-admin/billing/credits-refunds",
      exact: false,
    },
    {
      label: "Billing Accounts",
      href: "/super-admin/billing/accounts",
      exact: false,
    },
    {
      label: "Reconciliation & Issues",
      href: "/super-admin/billing/reconciliation",
      exact: false,
    },
    {
      label: "Activity",
      href: "/super-admin/billing/activity",
      exact: false,
    },
    {
      label: "Settings",
      href: "/super-admin/billing/settings",
      exact: false,
    },
  ];

  return (
    <nav aria-label="Billing Sections" className="overflow-x-auto overflow-y-hidden border-b border-border scrollbar-none">
      <ul className="flex min-w-max gap-0.5">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {isActive ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
