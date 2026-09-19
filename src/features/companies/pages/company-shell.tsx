"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CompanyDetailHeader, CompanyHeaderSkeleton, CompanySummaryStrip } from "../components/company-detail-header";
import { SectionError } from "../components/states";
import { COMPANY_SECTIONS, companySectionHref } from "../data/config";
import { useCompany } from "../data/hooks";
import type { CompanySection, CompanySummary } from "../data/types";

/** The company id from the route. Pages read it here instead of parsing the URL themselves. */
export function useCompanyId(): string {
  const params = useParams<{ companyId: string }>();
  return decodeURIComponent(params.companyId ?? "");
}

function activeSection(pathname: string, companyId: string): CompanySection {
  const base = `/super-admin/companies/${companyId}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, "").split("/")[0] : "";
  return COMPANY_SECTIONS.find((section) => section.slug === rest)?.key ?? "overview";
}

function SectionNav({ summary }: { summary: CompanySummary }) {
  const pathname = usePathname();
  const current = activeSection(pathname, summary.company.id);
  const counts: Partial<Record<CompanySection, number>> = {
    users: summary.counts.users,
    clients: summary.counts.clients,
    integrations: summary.counts.connections,
  };

  return (
    <nav aria-label="Company sections" className="overflow-x-auto border-b border-border scrollbar-thin">
      <ul className="flex min-w-max gap-0.5">
        {COMPANY_SECTIONS.map((section) => {
          const active = section.key === current;
          const count = counts[section.key];
          return (
            <li key={section.key}>
              <Link
                href={companySectionHref(summary.company.id, section.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {section.label}
                {count !== undefined ? (
                  <span className="rounded-sm bg-muted px-1 text-[11px] font-medium tabular text-muted-foreground">{count}</span>
                ) : null}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Frame shared by every company section: identity header, summary strip and
 * section navigation. It loads the company once; each section loads its own
 * data, keyed by company id, so nothing from another tenant can leak in.
 */
export function CompanyShell({ children }: { children: ReactNode }) {
  const companyId = useCompanyId();
  const query = useCompany(companyId);

  if (query.error && !query.data) {
    return <SectionError subject="Company" error={query.error} onRetry={() => void query.refetch()} />;
  }

  if (!query.data) {
    return (
      <div className="space-y-3">
        <CompanyHeaderSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <CompanyDetailHeader summary={query.data} />
      <CompanySummaryStrip summary={query.data} />
      <SectionNav summary={query.data} />
      <div className="pt-1">{children}</div>
    </div>
  );
}
