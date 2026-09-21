"use client";

import { DownloadIcon, MailIcon, MoreVerticalIcon, PlusIcon, ShieldCheckIcon, UserCogIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { StaffCapabilitiesProvider, useStaffCapabilities } from "../data/capability-provider";
import { useStaffList, useStaffKpis, useTeamMutations } from "../data/hooks";
import type { StaffMember, StaffListQuery } from "../data/types";
import { StaffKpiCards } from "../components/staff-kpi-cards";
import { StaffNav } from "../components/staff-nav";
import { StaffFilterToolbar } from "../components/staff-filter-toolbar";
import { StaffTable } from "../components/staff-table";
import { StaffQuickPreview } from "../components/staff-quick-preview";
import { InviteStaffWizard } from "../components/invite-staff-wizard";
import { RoleChangeDrawer } from "../components/role-change-drawer";
import { SuspendStaffDialog, ReactivateStaffDialog } from "../components/lifecycle-dialogs";
import { exportStaffToCsv } from "../data/config";

function DirectoryContent() {
  const router = useRouter();
  const caps = useStaffCapabilities();
  const mutations = useTeamMutations();

  const [query, setQuery] = useState<StaffListQuery>({ page: 1, pageSize: 10, sort: "recently_active" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewMember, setPreviewMember] = useState<StaffMember | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleChangeMember, setRoleChangeMember] = useState<StaffMember | null>(null);
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [suspendMember, setSuspendMember] = useState<StaffMember | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateMember, setReactivateMember] = useState<StaffMember | null>(null);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const { data: listResult, isLoading } = useStaffList(query);
  const { data: kpis } = useStaffKpis();
  const staff = listResult?.items ?? [];
  const total = listResult?.total ?? 0;
  const pageCount = listResult?.pageCount ?? 0;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.role) count++;
    if (query.status) count++;
    if (query.department) count++;
    if (query.mfaState) count++;
    if (query.accessReviewStatus) count++;
    return count;
  }, [query]);

  const handleKpiSelect = (id: string) => {
    if (id === "all") setQuery({ page: 1, pageSize: 10, sort: "recently_active" });
    else if (id === "active") setQuery((q) => ({ ...q, status: "active", page: 1 }));
    else if (id === "invited") setQuery((q) => ({ ...q, status: "invited", page: 1 }));
    else if (id === "suspended") setQuery((q) => ({ ...q, status: "suspended", page: 1 }));
    else if (id === "mfa") setQuery((q) => ({ ...q, mfaState: "setup_required", page: 1 }));
    else if (id === "reviews") setQuery((q) => ({ ...q, accessReviewStatus: "due", page: 1 }));
    else if (id === "assigned" || id === "unassigned") router.push(ROUTES.superAdmin.team + "/assignments");
  };

  const handleClearFilters = () => setQuery({ page: 1, pageSize: 10, sort: "recently_active" });

  const handleExport = () => {
    exportStaffToCsv(staff, `internal-team-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-4 w-full min-w-0 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCogIcon className="size-5 text-blue-600" />
            <span>Internal Team</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage platform staff, operational assignments, access and internal team lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {caps.canInviteStaff && (
            <Button type="button" size="sm" onClick={() => setInviteOpen(true)} className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs">
              <PlusIcon className="size-3.5" /> <span>Invite Staff Member</span>
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs gap-1.5 bg-white">
            <DownloadIcon className="size-3.5 text-slate-500" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 size-8 p-0 bg-white" aria-label="More options">
                <MoreVerticalIcon className="size-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => router.push(`${ROUTES.superAdmin.team}/invitations`)} className="cursor-pointer gap-2">
                <MailIcon className="size-3.5 text-slate-500" /> <span>View Pending Invitations</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`${ROUTES.superAdmin.team}/assignments`)} className="cursor-pointer gap-2">
                <UserCogIcon className="size-3.5 text-slate-500" /> <span>Review Unassigned Companies</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuery((q) => ({ ...q, status: "suspended", page: 1 }))} className="cursor-pointer gap-2">
                <ShieldCheckIcon className="size-3.5 text-slate-500" /> <span>View Deactivated Staff</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && <StaffKpiCards kpis={kpis} onSelectFilter={handleKpiSelect} />}

      {/* Module Navigation */}
      <StaffNav />

      {/* Filter Toolbar */}
      <StaffFilterToolbar query={query} onQueryChange={(q) => setQuery((prev) => ({ ...prev, ...q, page: 1 }))} activeFilterCount={activeFilterCount} onClearFilters={handleClearFilters} />

      {/* Staff Table */}
      <StaffTable
        staff={staff}
        selectedIds={selectedIds}
        onToggleSelect={(id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
        onToggleSelectAll={() => setSelectedIds(selectedIds.length === staff.length ? [] : staff.map((s) => s.id))}
        onRowClick={(m) => router.push(`${ROUTES.superAdmin.team}/${m.id}`)}
        onPreview={(m) => { setPreviewMember(m); setPreviewOpen(true); }}
        onChangeRole={(m) => { setRoleChangeMember(m); setRoleChangeOpen(true); }}
        onSuspend={(m) => { setSuspendMember(m); setSuspendOpen(true); }}
        onReactivate={(m) => { setReactivateMember(m); setReactivateOpen(true); }}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} staff members</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!query.page || query.page <= 1} onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) - 1 }))}>Prev</Button>
            <span className="px-2">Page {query.page || 1} of {pageCount}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={(query.page || 1) >= pageCount} onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      {/* Quick Preview Drawer */}
      <StaffQuickPreview member={previewMember} open={previewOpen} onOpenChange={setPreviewOpen} />

      {/* Invite Staff Wizard */}
      <InviteStaffWizard open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Role Change Drawer */}
      <RoleChangeDrawer member={roleChangeMember} open={roleChangeOpen} onOpenChange={setRoleChangeOpen} onConfirm={(id, role, reason) => { mutations.changeRole.mutate({ staffId: id, newRole: role, reason }); setRoleChangeOpen(false); }} isPending={mutations.changeRole.isPending} />

      {/* Suspend Dialog */}
      <SuspendStaffDialog member={suspendMember} open={suspendOpen} onOpenChange={setSuspendOpen} onConfirm={(id, reason) => { mutations.suspendStaff.mutate({ staffId: id, reason }); setSuspendOpen(false); }} isPending={mutations.suspendStaff.isPending} />

      {/* Reactivate Dialog */}
      <ReactivateStaffDialog member={reactivateMember} open={reactivateOpen} onOpenChange={setReactivateOpen} onConfirm={(id, reason) => { mutations.reactivateStaff.mutate({ staffId: id, reason }); setReactivateOpen(false); }} isPending={mutations.reactivateStaff.isPending} />
    </div>
  );
}

export function DirectoryPage() {
  return (
    <StaffCapabilitiesProvider>
      <DirectoryContent />
    </StaffCapabilitiesProvider>
  );
}
