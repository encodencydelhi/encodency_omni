/**
 * EnCodency OmniPlatform - Super Admin Billing Navigation Tabs
 * Compact, URL-addressable horizontal sub-navigation.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboardIcon,
  ReceiptIcon,
  WalletCardsIcon,
  RotateCcwIcon,
  Building2Icon,
  ScaleIcon,
  HistoryIcon,
  SettingsIcon,
} from "lucide-react";

export function BillingTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Overview",
      href: "/super-admin/billing",
      icon: LayoutDashboardIcon,
      exact: true,
    },
    {
      label: "Invoices",
      href: "/super-admin/billing/invoices",
      icon: ReceiptIcon,
      exact: false,
    },
    {
      label: "Payments",
      href: "/super-admin/billing/payments",
      icon: WalletCardsIcon,
      exact: false,
    },
    {
      label: "Credits & Refunds",
      href: "/super-admin/billing/credits-refunds",
      icon: RotateCcwIcon,
      exact: false,
    },
    {
      label: "Billing Accounts",
      href: "/super-admin/billing/accounts",
      icon: Building2Icon,
      exact: false,
    },
    {
      label: "Reconciliation & Issues",
      href: "/super-admin/billing/reconciliation",
      icon: ScaleIcon,
      exact: false,
    },
    {
      label: "Activity",
      href: "/super-admin/billing/activity",
      icon: HistoryIcon,
      exact: false,
    },
    {
      label: "Settings",
      href: "/super-admin/billing/settings",
      icon: SettingsIcon,
      exact: false,
    },
  ];

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-xs px-2">
      <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none" aria-label="Billing sections">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "bg-slate-900 text-white shadow-2xs dark:bg-slate-100 dark:text-slate-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-white dark:text-slate-900" : "text-muted-foreground group-hover:text-foreground")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
