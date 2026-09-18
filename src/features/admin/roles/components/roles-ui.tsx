"use client";

import Link from "next/link";
import { Check, Download, ExternalLink, Info, Minus, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import type { AccessLevel, AdminRole, RoleScope, RoleType } from "../roles-data/types";

export function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1520px] space-y-3 pb-6 text-[#202124]">{children}</div>;
}

export function Header({ onCompare, onGuide, onExport }: { onCompare: () => void; onGuide: () => void; onExport: () => void }) {
  return <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[12px] font-medium text-[#5F6368]">Management / Company Admin</p><h1 className="mt-0.5 text-[22px] font-semibold tracking-normal text-[#202124]">Roles & Permissions</h1><p className="mt-0.5 max-w-[760px] text-[12.5px] text-[#5F6368]">View available roles, understand access levels, and see how roles are used across your organization.</p></div><div className="flex flex-wrap gap-1.5"><Button asChild size="sm" variant="outline"><Link href="/admin/team"><UsersRound />View Team</Link></Button><Button size="sm" onClick={onCompare}>Compare Roles</Button><Button size="sm" variant="outline" onClick={onExport}><Download />Export Roles</Button><Button size="sm" variant="ghost" onClick={onGuide}><Info />Permission Guide</Button></div></header>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "blue" | "purple" | "gray" | "neutral" }) {
  const cls = tone === "blue" ? "border-[#D2E3FC] bg-[#E8F0FE] text-[#1967D2]" : tone === "purple" ? "border-[#E9D2FD] bg-[#F3E8FD] text-[#8430CE]" : tone === "gray" ? "border-[#E8EAED] bg-[#F1F3F4] text-[#5F6368]" : "border-[#E8EAED] bg-white text-[#3C4043]";
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium", cls)}>{children}</span>;
}

export function typeLabel(type: RoleType, protectedRole?: boolean) {
  if (protectedRole) return "Protected System Role";
  return type === "organization" ? "System Role" : type === "viewer" ? "Read Only" : "Functional Role";
}

export function scopeLabel(scope: RoleScope) {
  return scope === "organization_wide" ? "Organization-wide" : scope === "read_only" ? "Read-only" : "Client-scoped";
}

export function accessLabel(level: AccessLevel) {
  return level === "none" ? "No Access" : level === "view" ? "View" : level === "manage" ? "Manage" : "Full";
}

export function accessTone(level: AccessLevel) {
  return level === "full" ? "text-[#137333] bg-[#E6F4EA]" : level === "manage" ? "text-[#1967D2] bg-[#E8F0FE]" : level === "view" ? "text-[#5F6368] bg-[#F1F3F4]" : "text-[#80868B] bg-white";
}

export function RoleCard({ role, onCompare }: { role: AdminRole; onCompare: (role: AdminRole) => void }) {
  const activeModules = role.moduleAccess.filter((m) => m.level !== "none");
  return <article className="group flex min-h-[214px] flex-col justify-between rounded-lg border border-[#E8EAED] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition hover:border-[#DADCE0] hover:shadow-[0_4px_14px_rgba(60,64,67,0.12)]"><div><div className="flex items-start justify-between gap-2"><div className="min-w-0"><Link href={`/admin/roles/${role.slug}`} className="text-[14px] font-semibold text-[#202124] hover:text-[#1A73E8]">{role.name}</Link><div className="mt-1 flex flex-wrap gap-1"><Badge tone={role.isProtected ? "blue" : role.type === "viewer" ? "gray" : "neutral"}>{typeLabel(role.type, role.isProtected)}</Badge><Badge tone={role.scope === "client_scoped" ? "purple" : "blue"}>{scopeLabel(role.scope)}</Badge></div></div><ShieldCheck className={cn("size-4 shrink-0", role.isProtected ? "text-[#1A73E8]" : "text-[#80868B]")} /></div><p className="mt-2 line-clamp-2 text-[12.5px] leading-5 text-[#5F6368]">{role.description}</p>{role.isProtected && <p className="mt-2 rounded-md border border-[#D2E3FC] bg-[#F8FBFF] px-2 py-1.5 text-[11.5px] text-[#3C4043]">Permissions for this role are managed at platform level.</p>}<button type="button" onClick={() => location.assign(`/admin/team?role=${role.slug}`)} className="mt-2 inline-flex text-[12px] font-medium text-[#1A73E8] hover:underline">{role.assignedMemberCount ? `${role.assignedMemberCount} members assigned` : "No members assigned"}</button><div className="mt-2 flex flex-wrap gap-1">{activeModules.slice(0, 5).map((item) => <span key={item.module} className="rounded-md bg-[#F1F3F4] px-1.5 py-0.5 text-[11px] text-[#3C4043]">{item.module}</span>)}{activeModules.length > 5 && <span className="rounded-md bg-[#F1F3F4] px-1.5 py-0.5 text-[11px] text-[#5F6368]">+{activeModules.length - 5} more</span>}</div></div><div className="mt-3 flex flex-wrap gap-1"><Button asChild size="sm" variant="outline"><Link href={`/admin/roles/${role.slug}`}>View Permissions</Link></Button><Button asChild size="sm" variant="ghost"><Link href={`/admin/team?role=${role.slug}`}>View Members</Link></Button><Button size="sm" variant="ghost" onClick={() => onCompare(role)}>Compare</Button></div></article>;
}

export function GuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const rows = [["No Access", "Role cannot open or use the module."], ["View", "Can read data and inspect reports only."], ["Manage", "Can create and update operational records."], ["Full", "Can perform management actions within the assigned scope."]];
  const terms = [["System Role", "Platform-defined organization role."], ["Functional Role", "Platform-defined job role for client work."], ["Protected Role", "Definition is managed at platform level."], ["Client-scoped", "Applies only to assigned clients."], ["Organization-wide", "Applies across the organization."]];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-[620px]"><DialogHeader><DialogTitle>Permission Guide</DialogTitle><DialogDescription>Company Admins can inspect these definitions. Editing is reserved for Platform Super Admin.</DialogDescription></DialogHeader><div className="grid gap-3 md:grid-cols-2"><section className="rounded-lg border border-[#E8EAED] p-3"><h3 className="text-[13px] font-semibold">Access levels</h3><div className="mt-2 divide-y divide-[#F1F3F4]">{rows.map(([title, body]) => <div key={title} className="py-2"><p className="text-[12.5px] font-medium">{title}</p><p className="text-[12px] text-[#5F6368]">{body}</p></div>)}</div></section><section className="rounded-lg border border-[#E8EAED] p-3"><h3 className="text-[13px] font-semibold">Role terms</h3><div className="mt-2 divide-y divide-[#F1F3F4]">{terms.map(([title, body]) => <div key={title} className="py-2"><p className="text-[12.5px] font-medium">{title}</p><p className="text-[12px] text-[#5F6368]">{body}</p></div>)}</div></section></div></DialogContent></Dialog>;
}

export function CompareDialog({ roles, selected, setSelected, open, onOpenChange }: { roles: AdminRole[]; selected: string[]; setSelected: (ids: string[]) => void; open: boolean; onOpenChange: (open: boolean) => void }) {
  const picked = roles.filter((role) => selected.includes(role.slug)).slice(0, 3);
  const metrics = ["Scope", "Members", "Publishing", "Analytics", "Team access", "Automation", "Reports", "Settings"];
  const value = (role: AdminRole, metric: string) => {
    if (metric === "Scope") return scopeLabel(role.scope);
    if (metric === "Members") return `${role.assignedMemberCount}`;
    const module = metric === "Publishing" ? "Content" : metric === "Team access" ? "Team" : metric === "Settings" ? "Billing" : metric;
    return accessLabel(role.moduleAccess.find((m) => m.module === module)?.level ?? "none");
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92dvh] max-w-[900px] overflow-y-auto"><DialogHeader><DialogTitle>Compare Roles</DialogTitle><DialogDescription>Select 2-3 roles to compare scope, members and access levels.</DialogDescription></DialogHeader><div className="flex flex-wrap gap-1">{roles.map((role) => { const active = selected.includes(role.slug); const disabled = !active && selected.length >= 3; return <button key={role.slug} disabled={disabled} onClick={() => setSelected(active ? selected.filter((id) => id !== role.slug) : [...selected, role.slug])} className={cn("rounded-md border px-2 py-1 text-[12px] font-medium disabled:opacity-40", active ? "border-[#1A73E8] bg-[#E8F0FE] text-[#1967D2]" : "border-[#E8EAED] hover:bg-[#F8F9FA]")}>{role.name}</button>; })}</div>{picked.length < 2 ? <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-[#DADCE0] text-[12.5px] text-[#5F6368]">Select at least two roles.</div> : <div className="overflow-x-auto rounded-lg border border-[#E8EAED]"><table className="w-full min-w-[620px] text-left text-[12.5px]"><thead className="bg-[#F8F9FA]"><tr><th className="border-b border-[#E8EAED] px-3 py-2">Permission / Module</th>{picked.map((role) => <th key={role.slug} className="border-b border-[#E8EAED] px-3 py-2">{role.name}</th>)}</tr></thead><tbody>{metrics.map((metric) => <tr key={metric}>{[<td key="m" className="border-b border-[#F1F3F4] px-3 py-2 font-medium">{metric}</td>, ...picked.map((role) => <td key={role.slug} className="border-b border-[#F1F3F4] px-3 py-2">{value(role, metric)}</td>)]}</tr>)}</tbody></table></div>}</DialogContent></Dialog>;
}

export function AllowedIcon({ allowed }: { allowed: boolean }) {
  return allowed ? <Check className="size-3.5 text-[#137333]" /> : <Minus className="size-3.5 text-[#80868B]" />;
}

export function exportRoles(roles: AdminRole[], filename = "company-admin-roles.csv") {
  const csv = ["Role,Type,Scope,Protected,Members,Modules", ...roles.map((role) => `"${role.name}","${typeLabel(role.type, role.isProtected)}","${scopeLabel(role.scope)}","${role.isProtected ? "Yes" : "No"}","${role.assignedMemberCount}","${role.moduleAccess.filter((m) => m.level !== "none").map((m) => `${m.module}: ${accessLabel(m.level)}`).join("; ")}"`)].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function OpenLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1A73E8] hover:underline">{children}<ExternalLink className="size-3" /></Link>;
}
