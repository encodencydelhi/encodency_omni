"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Download, Info, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AllowedIcon, accessLabel, accessTone, Badge, CompareDialog, exportRoles, GuideDialog, OpenLink, scopeLabel, Shell, typeLabel } from "../components/roles-ui";
import { useRolesData } from "../roles-data/hooks";
import type { AdminRole } from "../roles-data/types";

const tabs = ["Overview", "Permissions", "Members", "Access Scope"] as const;

export function RoleDetailPage({ roleId }: { roleId: string }) {
  const { roles, isLoading, error, refresh } = useRolesData();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [guideOpen, setGuideOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<string[]>([roleId, "marketing-manager"]);
  const role = useMemo(() => roles.find((item) => item.slug === roleId || item.id === roleId), [roles, roleId]);

  if (isLoading) return <Shell><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-96 rounded-lg" /></Shell>;
  if (error) return <Shell><State title="Role data unavailable" detail={error} action={<Button size="sm" onClick={refresh}>Retry</Button>} /></Shell>;
  if (!role) return <Shell><State title="Role not found" detail="This role does not exist for this organization." action={<Button asChild size="sm"><Link href="/admin/roles">Back to Roles</Link></Button>} /></Shell>;

  return <Shell>
    <Button asChild size="sm" variant="ghost"><Link href="/admin/roles"><ArrowLeft />Back</Link></Button>
    <section className="rounded-lg border border-[#E8EAED] bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-[22px] font-semibold text-[#202124]">{role.name}</h1><Badge tone={role.isProtected ? "blue" : "neutral"}>{typeLabel(role.type, role.isProtected)}</Badge><Badge tone={role.scope === "client_scoped" ? "purple" : "blue"}>{scopeLabel(role.scope)}</Badge></div><p className="mt-1 max-w-[760px] text-[12.5px] text-[#5F6368]">{role.description}</p><p className="mt-2 text-[12px] font-medium text-[#3C4043]">{role.assignedMemberCount} assigned members</p></div><div className="flex flex-wrap gap-1.5"><Button asChild size="sm" variant="outline"><Link href={`/admin/team?role=${role.slug}`}><UsersRound />View Members</Link></Button><Button size="sm" onClick={() => setCompareOpen(true)}>Compare Role</Button><Button size="sm" variant="outline" onClick={() => exportRoles([role], `${role.slug}-permissions.csv`)}><Download />Export Role</Button><Button size="sm" variant="ghost" onClick={() => setGuideOpen(true)}><Info />Guide</Button></div></div>
      {role.isProtected && <div className="mt-3 rounded-lg border border-[#D2E3FC] bg-[#F8FBFF] p-3 text-[12.5px] text-[#3C4043]"><ShieldCheck className="mr-1 inline size-4 text-[#1A73E8]" />{role.slug === "organization-owner" ? "This is the highest organization-level role. Its permissions are managed by OmniPlatform at platform level." : "This role provides broad organization administration access. Permission definitions are managed at platform level."}</div>}
    </section>
    <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
      <nav className="flex gap-0.5 overflow-x-auto border-b border-[#E8EAED] px-3">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-2.5 py-2.5 text-[12.5px] font-medium ${tab === item ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:text-[#202124]"}`}>{item}</button>)}</nav>
      <div className="p-3">{tab === "Overview" && <Overview role={role} />}{tab === "Permissions" && <Permissions role={role} />}{tab === "Members" && <Members role={role} />}{tab === "Access Scope" && <Scope role={role} />}</div>
    </section>
    <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    <CompareDialog roles={roles} selected={selectedCompare} setSelected={setSelectedCompare} open={compareOpen} onOpenChange={setCompareOpen} />
  </Shell>;
}

function Overview({ role }: { role: AdminRole }) {
  const summary = [["Role Type", typeLabel(role.type, role.isProtected)], ["Scope", scopeLabel(role.scope)], ["Assigned Members", `${role.assignedMemberCount}`], ["Protection Status", role.isProtected ? "Protected system role" : "Standard platform role"], ["Managed By", role.managedBy], ["Last Updated", new Date(role.lastUpdated).toLocaleDateString()]];
  return <div className="space-y-3"><div className="grid gap-1 md:grid-cols-3">{summary.map(([label, value]) => <div key={label} className="rounded-lg border border-[#E8EAED] p-3"><p className="text-[11px] uppercase tracking-[0.04em] text-[#5F6368]">{label}</p><p className="mt-1 text-[13px] font-medium text-[#202124]">{value}</p></div>)}</div><div className="rounded-lg border border-[#E8EAED]"><div className="border-b border-[#E8EAED] px-3 py-2 text-[13px] font-semibold">Module Access Summary</div><div className="grid gap-1 p-2 md:grid-cols-2 xl:grid-cols-4">{role.moduleAccess.map((item) => <div key={item.module} className="flex items-center justify-between rounded-md border border-[#F1F3F4] px-2.5 py-2"><span className="text-[12.5px] font-medium">{item.module}</span><span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${accessTone(item.level)}`}>{accessLabel(item.level)}</span></div>)}</div></div></div>;
}

function Permissions({ role }: { role: AdminRole }) {
  const modules = role.moduleAccess.filter((m) => role.permissions.some((p) => p.module === m.module));
  return <div className="space-y-2">{modules.map((module) => { const items = role.permissions.filter((p) => p.module === module.module); const allowed = items.filter((p) => p.allowed).length; return <details key={module.module} className="rounded-lg border border-[#E8EAED] bg-white" open={module.level !== "none"}><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[13px] font-semibold"><span>{module.module}</span><span className="text-[12px] font-medium text-[#5F6368]">{allowed} of {items.length} permissions</span></summary><div className="grid gap-1 border-t border-[#E8EAED] p-2 md:grid-cols-2">{items.map((permission) => <div key={permission.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px]"><AllowedIcon allowed={permission.allowed} /><span className={permission.allowed ? "text-[#202124]" : "text-[#80868B]"}>{permission.label}</span></div>)}</div></details>; })}</div>;
}

function Members({ role }: { role: AdminRole }) {
  if (!role.members.length) return <State title="No members assigned" detail="Role assignment is managed in the Team module." action={<Button asChild size="sm"><Link href={`/admin/team?role=${role.slug}`}>Manage Team</Link></Button>} />;
  return <div className="space-y-2"><div className="flex justify-end"><Button asChild size="sm"><Link href={`/admin/team?role=${role.slug}`}>Manage Team</Link></Button></div><div className="overflow-x-auto rounded-lg border border-[#E8EAED]"><table className="w-full min-w-[760px] text-left text-[12.5px]"><thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]"><tr>{["Member", "Clients", "Status", "Last Active", "Actions"].map((h) => <th key={h} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{role.members.map((member) => <tr key={member.id} className="hover:bg-[#F8F9FA]"><td className="border-b border-[#F1F3F4] px-3 py-2.5"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-[#E8F0FE] text-[11px] font-medium text-[#1967D2]">{member.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span><span><span className="block font-medium text-[#202124]">{member.name}</span><span className="text-[11px] text-[#5F6368]">{member.email}</span></span></div></td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{member.clients.length === 1 ? member.clients[0] : `${member.clients.length} Clients`}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5 capitalize">{member.status}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5 text-[#5F6368]">{member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleDateString() : "Never"}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5"><OpenLink href={`/admin/team/${member.id}`}>Open Member</OpenLink></td></tr>)}</tbody></table></div></div>;
}

function Scope({ role }: { role: AdminRole }) {
  const rows = [["Scope Type", scopeLabel(role.scope)], ["Client restriction behavior", role.scope === "organization_wide" ? "All clients visible" : role.scope === "read_only" ? "Selected clients, read-only" : "Selected clients only"], ["Module scope", `${role.moduleAccess.filter((m) => m.level !== "none").length} modules with access`], ["Can access all clients?", role.scope === "organization_wide" ? "Yes" : "No"], ["Publishing allowed?", role.moduleAccess.some((m) => ["Content", "Meta & Instagram", "LinkedIn", "Google Business", "YouTube", "X"].includes(m.module) && ["manage", "full"].includes(m.level)) ? "Yes, within assigned scope" : "No"], ["Destructive actions allowed?", role.isProtected || role.moduleAccess.some((m) => m.level === "full") ? "Limited by platform policy" : "No"]];
  return <div className="grid gap-2 md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-lg border border-[#E8EAED] p-3"><p className="text-[11px] uppercase tracking-[0.04em] text-[#5F6368]">{label}</p><p className="mt-1 text-[13px] font-medium text-[#202124]">{value}</p></div>)}</div>;
}

function State({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) { return <div className="grid min-h-44 place-items-center p-6 text-center"><div><AlertCircle className="mx-auto size-8 text-[#80868B]" /><h2 className="mt-2 text-[14px] font-semibold text-[#202124]">{title}</h2><p className="mt-1 text-[12.5px] text-[#5F6368]">{detail}</p><div className="mt-3">{action}</div></div></div>; }
