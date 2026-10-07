"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, Download, MoreHorizontal, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { TeamProvider, useTeam } from "../team-data/team-store";
import { toast } from "sonner";
import { TEAM_LIVE } from "../team-data/live-team";
import { CreateGroupButton, InviteMemberButton } from "./team-actions";
import { reasonOf, useTeamAuthority } from "./team-live-dialogs";

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const ROLE_WORDS = ["admin", "manager", "viewer", "owner"];

const tabs = [
  ["Members", "/admin/team", UsersRound], ["Invitations", "/admin/team/invitations", UserPlus],
  ["Groups", "/admin/team/groups", ShieldCheck], ["Activity", "/admin/team/activity", Activity],
] as const;

export function TeamLayout({ children }: { children: ReactNode }) {
  return <TeamProvider><TeamFrame>{children}</TeamFrame></TeamProvider>;
}

function TeamFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { inviteMember, members, invitations, warnings, refresh } = useTeam();
  const { canManage, systemRole, membershipId } = useTeamAuthority();
  const download = (name: string, text: string, type: string) => {
    const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
  };
  const exportData = () => {
    if (!TEAM_LIVE) { download("team-export.txt", "Team export generated from OmniPlatform", "text/plain"); return; }
    const header = ["Name", "Email", "Role", "Job title", "Department", "Groups", "Clients", "Joined"];
    const rows = members.map((m) => [m.name, m.email, m.roleName, m.jobTitle ?? "", m.department ?? "", m.groups.map((g) => g.name).join("; "), m.isOrgAdmin ? "All" : m.clientAccess.map((c) => c.clientName).join("; "), m.joinedAt.slice(0, 10)]);
    download("team-members.csv", [header, ...rows].map((row) => row.map((cell) => csvCell(String(cell))).join(",")).join("\n"), "text/csv");
    toast.success(`Exported ${members.length} members`);
  };
  /** CSV of `email[,role]` (role: admin, manager or viewer; default viewer). A header row is skipped automatically. */
  const importLive = async (file?: File) => {
    if (!file) return;
    const lines = (await file.text()).split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))).filter((row) => row[0]);
    const rows = lines.filter((row, index) => !(index === 0 && !/@/.test(row[0]!)));
    if (!rows.length) { toast.error("The file has no email addresses."); return; }
    const known = new Set([...members.map((m) => m.email.toLowerCase()), ...invitations.filter((i) => i.status === "pending").map((i) => i.email.toLowerCase())]);
    let sent = 0; const skipped: string[] = [];
    for (const row of rows.slice(0, 100)) {
      const email = row[0]!.toLowerCase(); const word = (row[1] ?? "viewer").toLowerCase();
      const roleId = ROLE_WORDS.includes(word) && !(word === "owner" && systemRole !== "OWNER") ? word : "viewer";
      if (!/^\S+@\S+\.\S+$/.test(email)) { skipped.push(`${row[0]} (invalid email)`); continue; }
      if (known.has(email)) { skipped.push(`${email} (already a member or invited)`); continue; }
      try {
        await inviteMember({ email, name: email.split("@")[0] ?? email, roleId, roleName: roleId, clients: [], accessLevel: "full", groups: [], invitedBy: { id: membershipId ?? "", name: "" }, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
        known.add(email); sent += 1;
      } catch (err) { skipped.push(`${email} (${reasonOf(err)})`); }
    }
    if (rows.length > 100) skipped.push(`${rows.length - 100} rows beyond the first 100`);
    if (sent) toast.success(`${sent} invitation${sent === 1 ? "" : "s"} sent`);
    if (skipped.length) toast.warning(`${skipped.length} skipped`, { description: skipped.slice(0, 4).join("; ") + (skipped.length > 4 ? "…" : ""), duration: 10000 });
  };
  const importMembers = async (file?: File) => {
    if (TEAM_LIVE) return importLive(file);
    if (!file) return;
    const rows = (await file.text()).split(/\r?\n/).slice(1).map((row) => row.split(",").map((cell) => cell.trim())).filter((row) => row[0]);
    for (const row of rows) {
      const email = row[0]!; const name = row[1] || "New member"; const jobTitle = row[2] || "Team member";
      if (!/^\S+@\S+\.\S+$/.test(email)) continue;
      await inviteMember({ email, name, jobTitle, roleId: "contributor", roleName: "Contributor", clients: [], accessLevel: "read_only", groups: [], invitedBy: { id: "mem-1", name: "Manish Sirohi" }, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    }
  };
  return <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F8F9FA] px-4 py-4 text-[#202124] sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-3">
      <header className="flex flex-col gap-2.5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[#5F6368]">
          <span>Workspace</span><span className="text-[#C6C9CD]">/</span><span aria-current="page" className="font-medium text-[#202124]">Team</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#E8F0FE] text-[#1A73E8] ring-1 ring-[#D2E3FC]"><Building2 className="size-6" /></span>
            <div className="min-w-0"><h1 className="text-[20px] font-medium leading-6 tracking-normal text-[#202124]">Team</h1><p className="truncate text-[12.5px] text-[#5F6368]">Manage members, client access, groups, assignments and team activity.</p></div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2"><CreateGroupButton compact />{(!TEAM_LIVE || canManage) && <InviteMemberButton compact={false} />}<Button size="icon-sm" variant="outline" onClick={exportData} title="Export"><Download /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="More team actions"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{(!TEAM_LIVE || canManage) && <DropdownMenuItem onSelect={() => document.querySelector<HTMLInputElement>("#team-import")?.click()}>Import members (CSV)</DropdownMenuItem>}<DropdownMenuItem asChild><Link href="/admin/roles">Roles & permissions</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu><input id="team-import" type="file" accept=".csv" className="hidden" onChange={(event) => { void importMembers(event.target.files?.[0]); event.target.value = ""; }} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between border-b border-[#E8EAED] pb-px">
          <nav className="scrollbar-thin -mb-px flex min-w-0 gap-0.5 overflow-x-auto pt-1">{tabs.map(([name, href, Icon]) => { const active = href === "/admin/team" ? pathname === href || (/^\/admin\/team\/[^/]+$/.test(pathname) && !pathname.includes("invitations") && !pathname.includes("groups") && !pathname.includes("activity")) : pathname.startsWith(href); return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2 pt-1.5 text-[13px] font-medium transition", active ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:border-[#DADCE0] hover:text-[#202124]")}><Icon className="size-3.5" />{name}</Link>; })}</nav>
        </div>
      </header>
      {warnings.length > 0 && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span>{warnings.join(" ")} The rest of the page is up to date.</span><Button size="sm" variant="outline" onClick={() => void refresh()}>Retry</Button></div>}
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}