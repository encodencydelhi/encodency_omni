"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CompareDialog, exportRoles, GuideDialog, Header, RoleCard, Shell } from "../components/roles-ui";
import { filterRoles, roleStats, type RoleFilters } from "../roles-data/selectors";
import { useRolesData } from "../roles-data/hooks";
import type { AccessLevel, AdminRole, RoleScope, RoleType } from "../roles-data/types";

const initialFilters: RoleFilters = { query: "", category: "all", scope: "all", type: "all", usage: "all", access: "all", sort: "name" };

export function RolesPage() {
  const { roles, isLoading, error, refresh } = useRolesData();
  const [filters, setFilters] = useState<RoleFilters>(initialFilters);
  const [guideOpen, setGuideOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<string[]>(["organization-admin", "marketing-manager"]);
  const shown = useMemo(() => filterRoles(roles, filters), [roles, filters]);
  const stats = roleStats(roles);

  const startCompare = (role?: AdminRole) => {
    if (role && !selectedCompare.includes(role.slug)) setSelectedCompare((current) => [...current.slice(0, 2), role.slug]);
    setCompareOpen(true);
  };

  if (isLoading) return <Shell><Header onCompare={() => startCompare()} onGuide={() => setGuideOpen(true)} onExport={() => exportRoles(roles)} /><Loading /></Shell>;
  if (error) return <Shell><State title="Roles unavailable" detail={error} action={<Button size="sm" onClick={refresh}>Retry</Button>} /></Shell>;

  return <Shell>
    <Header onCompare={() => startCompare()} onGuide={() => setGuideOpen(true)} onExport={() => exportRoles(roles)} />
    <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">{[
      ["Total Roles", stats.total], ["Protected", stats.protected], ["Functional", stats.functional], ["Members Assigned", stats.members], ["Unused Roles", stats.unused], ["Client Scoped", stats.clientScoped],
    ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#E8EAED] bg-white p-3 shadow-[0_1px_2px_rgba(60,64,67,0.08)]"><p className="text-[11.5px] font-medium text-[#5F6368]">{label}</p><strong className="text-[20px] font-medium text-[#202124]">{value}</strong></div>)}</div>
    <div className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
      <div className="flex gap-0.5 overflow-x-auto border-b border-[#E8EAED] px-2.5 pt-1">{[
        ["all", "All Roles"], ["organization", "Organization Roles"], ["functional", "Functional Roles"], ["viewer", "Read Only"],
      ].map(([value, label]) => <button key={value} onClick={() => setFilters({ ...filters, category: value as RoleFilters["category"] })} className={`shrink-0 border-b-2 px-2.5 py-2 text-[12.5px] font-medium ${filters.category === value ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:text-[#202124]"}`}>{label}</button>)}</div>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E8EAED] p-2.5"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" /><Input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" placeholder="Search roles, descriptions or modules..." /></div><Select label="Scope" value={filters.scope} onChange={(scope) => setFilters({ ...filters, scope: scope as RoleScope | "all" })} options={[["all", "Scope: All"], ["organization_wide", "Organization-wide"], ["client_scoped", "Client-scoped"], ["read_only", "Read-only"]]} /><Select label="Role Type" value={filters.type} onChange={(type) => setFilters({ ...filters, type: type as RoleType | "system" | "all" })} options={[["all", "Type: All"], ["system", "System"], ["functional", "Functional"], ["viewer", "Viewer"]]} /><Select label="Usage" value={filters.usage} onChange={(usage) => setFilters({ ...filters, usage: usage as RoleFilters["usage"] })} options={[["all", "Usage: All"], ["used", "Used"], ["unused", "Unused"]]} /><Select label="Access Level" value={filters.access} onChange={(access) => setFilters({ ...filters, access: access as AccessLevel | "all" })} options={[["all", "Access: All"], ["view", "View"], ["manage", "Manage"], ["full", "Full"]]} /><Select label="Sort" value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort: sort as RoleFilters["sort"] })} options={[["name", "Sort: Name"], ["most-used", "Most Used"], ["access", "Access Level"]]} /><Button size="sm" variant="ghost" onClick={() => setFilters(initialFilters)}>Clear Filters</Button></div>
      <div className="grid gap-1 p-2.5 md:grid-cols-2 xl:grid-cols-3">{shown.map((role) => <RoleCard key={role.slug} role={role} onCompare={startCompare} />)}</div>
      {!shown.length && <State title="No matching roles" detail="Try a different search term or clear filters." action={<Button size="sm" variant="outline" onClick={() => setFilters(initialFilters)}>Clear filters</Button>} />}
    </div>
    <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    <CompareDialog roles={roles} selected={selectedCompare} setSelected={setSelectedCompare} open={compareOpen} onOpenChange={setCompareOpen} />
  </Shell>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] text-[#3C4043] outline-none focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>;
}

function Loading() { return <div className="space-y-2"><div className="grid grid-cols-3 gap-1 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div><Skeleton className="h-12 rounded-lg" /><div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}</div></div>; }
function State({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) { return <div className="grid min-h-52 place-items-center p-6 text-center"><div><AlertCircle className="mx-auto size-8 text-[#80868B]" /><h2 className="mt-2 text-[14px] font-semibold text-[#202124]">{title}</h2><p className="mt-1 text-[12.5px] text-[#5F6368]">{detail}</p><div className="mt-3">{action}</div></div></div>; }
