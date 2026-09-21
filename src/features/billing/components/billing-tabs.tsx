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
    <div className="bg-transparent px-2">
      <nav className="flex items-center gap-0 overflow-x-auto scrollbar-none" aria-label="Billing sections">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap outline-none border-b-2 focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
