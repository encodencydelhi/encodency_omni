"use client";

import { ClockIcon, CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, MailIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffCapabilitiesProvider, useStaffCapabilities } from "../data/capability-provider";
import { useStaffInvitations, useInvitationKpis, useTeamMutations } from "../data/hooks";
import { StaffNav } from "../components/staff-nav";
import { InvitationTable } from "../components/invitation-table";
import { InviteStaffWizard } from "../components/invite-staff-wizard";

function InvitationsContent() {
  const caps = useStaffCapabilities();
  const mutations = useTeamMutations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: invitations, isLoading } = useStaffInvitations({ search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter });
  const { data: kpis } = useInvitationKpis();

  const kpiCards = kpis ? [
    { label: "Pending", value: kpis.pending, color: "text-blue-700", icon: ClockIcon, iconBg: "bg-blue-50 text-blue-600" },
    { label: "Accepted", value: kpis.accepted, color: "text-emerald-700", icon: CheckCircle2Icon, iconBg: "bg-emerald-50 text-emerald-600" },
    { label: "Expired", value: kpis.expired, color: "text-amber-700", icon: AlertTriangleIcon, iconBg: "bg-amber-50 text-amber-600" },
    { label: "Revoked", value: kpis.revoked, color: "text-slate-600", icon: XCircleIcon, iconBg: "bg-slate-50 text-slate-500" },
    { label: "Expiring Soon", value: kpis.expiringSoon, color: "text-rose-700", icon: AlertTriangleIcon, iconBg: "bg-rose-50 text-rose-600" },
  ] : [];

  return (
    <div className="space-y-4 w-full min-w-0 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MailIcon className="size-5 text-blue-600" />
            <span>Staff Invitations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Invite internal platform staff and review pending access requests.</p>
        </div>
        <div className="flex items-center gap-2">
          {caps.canInviteStaff && (
            <Button type="button" size="sm" onClick={() => setInviteOpen(true)} className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <PlusIcon className="size-3.5" /> <span>Invite Staff Member</span>
            </Button>
          )}
        </div>
      </div>

      <StaffNav />

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-5 gap-2">
          {kpiCards.map((k) => (
            <div key={k.label} className="rounded-sm border border-border bg-white p-3 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.label}</p>
              <p className="text-xl font-extrabold text-slate-900">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Input placeholder="Search invitations..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs bg-white" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <InvitationTable
        invitations={invitations ?? []}
        isLoading={isLoading}
        onRevoke={(inv) => mutations.revokeInvitation.mutate(inv.id)}
        onResend={(inv) => mutations.revokeInvitation.mutate(inv.id)}
      />

      <InviteStaffWizard open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

export function InvitationsPage() {
  return (
    <StaffCapabilitiesProvider>
      <InvitationsContent />
    </StaffCapabilitiesProvider>
  );
}
