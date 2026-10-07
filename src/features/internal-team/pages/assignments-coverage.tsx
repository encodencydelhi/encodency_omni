"use client";

import { useState } from "react";
import { Building2Icon, CheckCircle2Icon, UserXIcon, ShieldAlertIcon, UsersIcon, RefreshCwIcon } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { StaffCapabilitiesProvider } from "../data/capability-provider";
import { useCoverage, useTeamMutations } from "../data/hooks";
import { StaffNav } from "../components/staff-nav";
import { CoverageTable } from "../components/coverage-table";
import { AssignOwnerDialog } from "../components/staff-live-dialogs";

function AssignmentsContent() {
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);
  const mutations = useTeamMutations();
  const { data, isLoading, error, refetch } = useCoverage();

  const rows = data?.items ?? [];
  const kpis = data?.kpis;

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

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "COMPANIES", value: kpis?.companiesRequiringCoverage ?? 0, color: "text-blue-700", icon: Building2Icon, iconBg: "bg-blue-50 text-blue-600" },
              { label: "COMPLETE", value: rows.filter((c) => c.status === "complete").length, color: "text-emerald-700", icon: CheckCircle2Icon, iconBg: "bg-emerald-50 text-emerald-600" },
              { label: "UNASSIGNED", value: kpis?.unassignedCompanies ?? 0, color: (kpis?.unassignedCompanies ?? 0) > 0 ? "text-rose-700" : "text-slate-600", icon: UserXIcon, iconBg: (kpis?.unassignedCompanies ?? 0) > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500" },
              { label: "NO BACKUP", value: kpis?.companiesWithoutBackup ?? 0, color: "text-amber-700", icon: ShieldAlertIcon, iconBg: "bg-amber-50 text-amber-600" },
              { label: "STAFF ASSIGNED", value: kpis?.staffWithAssignments ?? 0, color: "text-violet-700", icon: UsersIcon, iconBg: "bg-violet-50 text-violet-600" },
              { label: "NEED REASSIGN", value: kpis?.assignmentsNeedingReassignment ?? 0, color: (kpis?.assignmentsNeedingReassignment ?? 0) > 0 ? "text-rose-700" : "text-slate-600", icon: RefreshCwIcon, iconBg: "bg-slate-50 text-slate-500" },
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
          <CoverageTable coverage={rows} isLoading={isLoading} onAssignOwner={(id, name) => setAssignTarget({ id, name })} />
        </>
      )}

      <AssignOwnerDialog
        company={assignTarget}
        open={assignTarget !== null}
        onOpenChange={(o) => !o && setAssignTarget(null)}
        onConfirm={(staffId, companyId, companyName, responsibility) => mutations.assignCompany.mutate({ staffId, companyId, companyName, responsibility })}
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
