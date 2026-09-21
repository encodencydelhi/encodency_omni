"use client";

import { useState, useMemo } from "react";
import { Building2Icon, CheckCircle2Icon, UserXIcon, ShieldAlertIcon, UsersIcon, RefreshCwIcon } from "lucide-react";
import { StaffCapabilitiesProvider } from "../data/capability-provider";
import { useStaffList, useTeamMutations } from "../data/hooks";
import { StaffNav } from "../components/staff-nav";
import { CoverageTable } from "../components/coverage-table";
import { AssignmentDrawer } from "../components/assignment-drawer";
import { COMPANY_POOL_EXPORT } from "../data/config";

function AssignmentsContent() {
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const mutations = useTeamMutations();

  const { data: listResult } = useStaffList({ pageSize: 100 });
  const staff = listResult?.items ?? [];

  const coverage = useMemo(() => {
    return COMPANY_POOL_EXPORT.map((company) => {
      const companyAssignments = staff.flatMap((s) => s.assignments.filter((a) => a.companyId === company.id && a.status === "active"));
      const primary = companyAssignments.find((a) => a.responsibility === "primary_owner");
      const backup = companyAssignments.find((a) => a.responsibility === "backup_owner");
      const support = companyAssignments.find((a) => a.responsibility === "support_owner");

      const primaryStaff = primary ? staff.find((s) => s.id === primary.staffId) || null : null;
      const backupStaff = backup ? staff.find((s) => s.id === backup.staffId) || null : null;
      const supportStaff = support ? staff.find((s) => s.id === support.staffId) || null : null;

      let status: "complete" | "missing_primary" | "missing_backup" | "staff_inactive" = "complete";
      if (!primary) status = "missing_primary";
      else if (!backup) status = "missing_backup";
      else if (primaryStaff && primaryStaff.status !== "active") status = "staff_inactive";

      return {
        companyId: company.id,
        companyName: company.name,
        primaryOwner: primaryStaff,
        backupOwner: backupStaff,
        supportOwner: supportStaff,
        status,
      };
    });
  }, [staff]);

  const unassignedCount = coverage.filter((c) => c.status === "missing_primary").length;
  const completeCount = coverage.filter((c) => c.status === "complete").length;
  const missingBackupCount = coverage.filter((c) => c.status === "missing_backup").length;
  const staffWithAssignments = new Set(staff.filter((s) => s.assignments.some((a) => a.status === "active")).map((s) => s.id)).size;

  const selectedStaff = selectedStaffId ? staff.find((s) => s.id === selectedStaffId) || null : null;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2Icon className="size-5 text-blue-600" />
            <span>Assignments & Coverage</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage operational responsibility for client companies.</p>
        </div>
      </div>

      <StaffNav />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: "COMPANIES", value: COMPANY_POOL_EXPORT.length, color: "text-blue-700", icon: Building2Icon, iconBg: "bg-blue-50 text-blue-600" },
          { label: "COMPLETE", value: completeCount, color: "text-emerald-700", icon: CheckCircle2Icon, iconBg: "bg-emerald-50 text-emerald-600" },
          { label: "UNASSIGNED", value: unassignedCount, color: unassignedCount > 0 ? "text-rose-700" : "text-slate-600", icon: UserXIcon, iconBg: unassignedCount > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500" },
          { label: "NO BACKUP", value: missingBackupCount, color: "text-amber-700", icon: ShieldAlertIcon, iconBg: "bg-amber-50 text-amber-600" },
          { label: "STAFF ASSIGNED", value: staffWithAssignments, color: "text-violet-700", icon: UsersIcon, iconBg: "bg-violet-50 text-violet-600" },
          { label: "NEED REASSIGN", value: 0, color: "text-slate-600", icon: RefreshCwIcon, iconBg: "bg-slate-50 text-slate-500" },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-border bg-white p-3 shadow-2xs flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
            </div>
            <div className={`size-7 rounded-sm border border-white/80 flex items-center justify-center shrink-0 ${k.iconBg}`}>
              <k.icon className="size-3.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Coverage Table */}
      <CoverageTable
        coverage={coverage}
        onAssignOwner={() => {
          setSelectedStaffId(staff[0]?.id || null);
          setAssignDrawerOpen(true);
        }}
      />

      <AssignmentDrawer
        member={selectedStaff}
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        onConfirm={(staffId, companyId, companyName, responsibility) => {
          mutations.assignCompany.mutate({ staffId, companyId, companyName, responsibility });
          setAssignDrawerOpen(false);
        }}
        isPending={mutations.assignCompany.isPending}
      />
    </div>
  );
}

export function AssignmentsCoveragePage() {
  return (
    <StaffCapabilitiesProvider>
      <AssignmentsContent />
    </StaffCapabilitiesProvider>
  );
}
