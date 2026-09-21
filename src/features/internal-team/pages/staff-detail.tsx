"use client";

import { useState } from "react";
import { ArrowLeftIcon, BanIcon, CheckCircle2Icon, Building2Icon, ClockIcon, Trash2Icon, BriefcaseIcon, KeyRoundIcon, ClipboardCheckIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/config/routes";
import { INTERNAL_ROLE, ROLE_PERMISSIONS } from "@/types/domain/team";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils/format";
import { StaffCapabilitiesProvider, useStaffCapabilities } from "../data/capability-provider";
import { useStaff, useStaffActivity, useStaffLifecycle, useTeamMutations } from "../data/hooks";
import { getStaffAvatarColor } from "../data/config";
import { StaffStatusBadge, StaffRoleBadge, MfaStateBadge, AccessReviewStatusBadge, PrivilegedBadge } from "../components/staff-status-badges";
import { RoleChangeDrawer } from "../components/role-change-drawer";
import { SuspendStaffDialog, ReactivateStaffDialog, DeactivateStaffDialog } from "../components/lifecycle-dialogs";
import { AssignmentDrawer } from "../components/assignment-drawer";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";

function StaffDetailContent() {
  const router = useRouter();
  const params = useParams();
  const staffId = (params?.staffId as string) || "";
  const caps = useStaffCapabilities();
  const mutations = useTeamMutations();

  const { data: member, isLoading, error } = useStaff(staffId);
  const { data: activities = [] } = useStaffActivity(staffId);
  const { data: lifecycle = [] } = useStaffLifecycle(staffId);

  const [tab, setTab] = useState("overview");
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-slate-100 rounded w-48" />
          <div className="h-4 bg-slate-100 rounded w-96" />
          <div className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-sm" />)}</div>
          <div className="h-64 bg-slate-100 rounded-sm" />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return <ErrorState error={error || new Error("Staff member not found")} onRetry={() => router.push(ROUTES.superAdmin.team)} />;
  }

  const activeAssignments = member.assignments.filter((a) => a.status === "active");
  const roleMeta = INTERNAL_ROLE[member.role];
  const capabilities = ROLE_PERMISSIONS[member.role];
  const sensitivePerms = capabilities.filter((p) => ["settings:write", "flags:write", "users:write", "billing:write", "platform:write"].includes(p));

  return (
    <div className="space-y-4 w-full min-w-0 max-w-7xl mx-auto pb-12">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 mb-2 -ml-1" onClick={() => router.push(ROUTES.superAdmin.team)}>
          <ArrowLeftIcon className="size-3.5" /> Back to Internal Team
        </Button>
      </div>

      {/* Staff Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback className={cn("text-sm font-bold", getStaffAvatarColor(member.name))}>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{member.name}</h1>
              <PrivilegedBadge privileged={member.privilegedAccess} />
            </div>
            <p className="text-xs text-slate-500">{member.email} &middot; {member.jobTitle} &middot; {member.department}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-400 font-mono">{member.id}</span>
              <StaffRoleBadge role={member.role} />
              <StaffStatusBadge status={member.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {caps.canChangePlatformRole && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRoleChangeOpen(true)}>Change Role</Button>
          )}
          {member.status === "suspended" ? (
            caps.canReactivateStaff && (
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setReactivateOpen(true)}>
                <CheckCircle2Icon className="size-3.5 mr-1" /> Reactivate
              </Button>
            )
          ) : (
            caps.canSuspendStaff && (
              <Button variant="outline" size="sm" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setSuspendOpen(true)}>
                <BanIcon className="size-3.5 mr-1" /> Suspend
              </Button>
            )
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: "ROLE", value: roleMeta?.label || member.role, color: "text-blue-700", icon: BriefcaseIcon, iconBg: "bg-blue-50 text-blue-600" },
          { label: "STATUS", value: member.status, color: member.status === "active" ? "text-emerald-700" : "text-rose-700", icon: member.status === "active" ? CheckCircle2Icon : BanIcon, iconBg: member.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600" },
          { label: "COMPANIES", value: activeAssignments.length, color: "text-violet-700", icon: Building2Icon, iconBg: "bg-violet-50 text-violet-600" },
          { label: "MFA", value: member.mfaState === "enrolled" ? "Enrolled" : "Required", color: member.mfaState === "enrolled" ? "text-emerald-700" : "text-amber-700", icon: KeyRoundIcon, iconBg: member.mfaState === "enrolled" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600" },
          { label: "ACCESS REVIEW", value: member.accessReviewStatus.replace(/_/g, " "), color: "text-slate-700", icon: ClipboardCheckIcon, iconBg: "bg-slate-50 text-slate-600" },
          { label: "LAST ACTIVE", value: member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never", color: "text-slate-600", icon: ClockIcon, iconBg: "bg-slate-50 text-slate-500" },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-border bg-white p-3 shadow-2xs flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-sm font-bold ${k.color} capitalize truncate`}>{k.value}</p>
            </div>
            <div className={`size-7 rounded-sm border border-white/80 flex items-center justify-center shrink-0 ${k.iconBg}`}>
              <k.icon className="size-3.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-10 w-full bg-transparent border-b border-border rounded-none p-0 gap-0">
          <TabsTrigger value="overview" className="text-xs h-9 px-4 rounded-none border-b-2 border-transparent text-slate-500 font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-slate-700">Overview</TabsTrigger>
          <TabsTrigger value="access" className="text-xs h-9 px-4 rounded-none border-b-2 border-transparent text-slate-500 font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-slate-700">Access & Roles</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs h-9 px-4 rounded-none border-b-2 border-transparent text-slate-500 font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-slate-700">Assignments</TabsTrigger>
          <TabsTrigger value="security" className="text-xs h-9 px-4 rounded-none border-b-2 border-transparent text-slate-500 font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-slate-700">Security</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs h-9 px-4 rounded-none border-b-2 border-transparent text-slate-500 font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-slate-700">Activity</TabsTrigger>
          <TabsTrigger value="lifecycle" className="text-xs h-9 px-4 rounded-none border-b-2 border-transparent text-slate-500 font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-slate-700">Settings & Lifecycle</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Profile */}
            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Staff Profile</h3>
              <div className="space-y-2 text-xs">
                {[
                  ["Full Name", member.name],
                  ["Work Email", member.email],
                  ["Staff ID", member.id],
                  ["Department", member.department],
                  ["Job Title", member.jobTitle],
                  ["Global User ID", member.globalUserId],
                  ["Joined", formatDate(member.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-900 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Access Summary */}
            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Access Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-slate-500">Platform Role</span>
                  <StaffRoleBadge role={member.role} />
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-slate-500">Privileged Access</span>
                  {member.privilegedAccess ? <Badge tone="warning" className="text-2xs">Yes</Badge> : <Badge tone="neutral" className="text-2xs">No</Badge>}
                </div>
                <div className="py-1 border-b border-border/50">
                  <span className="text-slate-500 block mb-1">Effective Capabilities</span>
                  <div className="flex flex-wrap gap-1">{capabilities.slice(0, 8).map((p) => <Badge key={p} tone="info" className="text-2xs">{p}</Badge>)}</div>
                </div>
                {sensitivePerms.length > 0 && (
                  <div className="py-1">
                    <span className="text-slate-500 block mb-1">Sensitive Capabilities</span>
                    <div className="flex flex-wrap gap-1">{sensitivePerms.map((p) => <Badge key={p} tone="warning" className="text-2xs">{p}</Badge>)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Assignments Snapshot */}
            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Assignments</h3>
              {activeAssignments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No active assignments</p>
              ) : (
                <div className="space-y-1.5">
                  {activeAssignments.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded-sm bg-slate-50 border border-border/50">
                      <span className="text-slate-700 truncate">{a.companyName}</span>
                      <Badge tone="info" className="text-2xs shrink-0 ml-2">{a.responsibility.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {caps.canAssignCompanies && (
                <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={() => setAssignOpen(true)}>Add Assignment</Button>
              )}
            </div>

            {/* Security Readiness */}
            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Security</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-slate-500">MFA State</span>
                  <MfaStateBadge state={member.mfaState} />
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-slate-500">Access Review</span>
                  <AccessReviewStatusBadge status={member.accessReviewStatus} />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Last Active</span>
                  <span className="text-slate-700">{member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never"}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Access & Roles Tab */}
        <TabsContent value="access" className="mt-3">
          <div className="rounded-sm border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Current Role & Capabilities</h3>
              {caps.canChangePlatformRole && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRoleChangeOpen(true)}>Change Role</Button>
              )}
            </div>
            <div className="mb-3 p-3 rounded-sm bg-slate-50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <StaffRoleBadge role={member.role} />
                <PrivilegedBadge privileged={member.privilegedAccess} />
              </div>
              <p className="text-xs text-slate-500">{roleMeta?.description}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">All Capabilities ({capabilities.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {capabilities.map((p) => (
                  <Badge key={p} tone={sensitivePerms.includes(p) ? "warning" : "info"} className="text-2xs">{p}</Badge>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-3">
          <div className="rounded-sm border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Company Assignments</h3>
              {caps.canAssignCompanies && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAssignOpen(true)}>Add Assignment</Button>
              )}
            </div>
            {activeAssignments.length === 0 ? (
              <EmptyState icon={Building2Icon} title="No Active Assignments" description="This staff member has no active company assignments." size="sm" />
            ) : (
              <div className="space-y-1.5">
                {activeAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-sm bg-slate-50 border border-border/50 text-xs">
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900 block">{a.companyName}</span>
                      <span className="text-slate-500">Assigned {formatDate(a.assignedAt)}</span>
                    </div>
                    <Badge tone="info" className="text-2xs shrink-0 ml-2">{a.responsibility.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-3">
          <div className="rounded-sm border border-border bg-white p-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Security State</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-slate-500">Global Identity Status</span>
                <Badge tone="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-slate-500">Staff Membership Status</span>
                <StaffStatusBadge status={member.status} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-slate-500">MFA Enrollment</span>
                <MfaStateBadge state={member.mfaState} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-slate-500">Access Review</span>
                <AccessReviewStatusBadge status={member.accessReviewStatus} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Last Active</span>
                <span className="text-slate-700">{member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never"}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-3">
          <div className="rounded-sm border border-border bg-white p-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Recent Activity</h3>
            {activities.length === 0 ? (
              <EmptyState icon={ClockIcon} title="No Activity" description="No recorded activity for this staff member." size="sm" />
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 10).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-sm bg-slate-50 border border-border/50 text-xs">
                    <div className="size-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700">{act.details}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{formatDate(act.timestamp)}</span>
                        <span>by {act.actor.name}</span>
                        {act.companyName && <span>at {act.companyName}</span>}
                      </div>
                    </div>
                    <Badge tone={act.result === "successful" ? "success" : "danger"} className="text-2xs shrink-0">{act.result}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Settings & Lifecycle Tab */}
        <TabsContent value="lifecycle" className="mt-3">
          <div className="space-y-3">
            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Staff Profile</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-slate-500">Department</span>
                  <span className="text-slate-900">{member.department}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-slate-500">Job Title</span>
                  <span className="text-slate-900">{member.jobTitle}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Staff Code</span>
                  <span className="text-slate-900 font-mono">{member.id}</span>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Lifecycle Actions</h3>
              <div className="space-y-2">
                {member.status === "suspended" ? (
                  caps.canReactivateStaff && (
                    <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 w-full justify-start" onClick={() => setReactivateOpen(true)}>
                      <CheckCircle2Icon className="size-3.5 mr-2" /> Reactivate Staff Member
                    </Button>
                  )
                ) : (
                  <>
                    {caps.canSuspendStaff && (
                      <Button variant="outline" size="sm" className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 w-full justify-start" onClick={() => setSuspendOpen(true)}>
                        <BanIcon className="size-3.5 mr-2" /> Suspend Staff Access
                      </Button>
                    )}
                    {caps.canDeactivateStaff && (
                      <Button variant="outline" size="sm" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 w-full justify-start" onClick={() => setDeactivateOpen(true)}>
                        <Trash2Icon className="size-3.5 mr-2" /> Deactivate Staff Member
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Lifecycle Events */}
            <div className="rounded-sm border border-border bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Lifecycle History</h3>
              {lifecycle.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No lifecycle events recorded.</p>
              ) : (
                <div className="space-y-2">
                  {lifecycle.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-3 p-2.5 rounded-sm bg-slate-50 border border-border/50 text-xs">
                      <div className="size-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700">{evt.details}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(evt.timestamp)} by {evt.actor.name}</p>
                      </div>
                      <Badge tone="neutral" className="text-2xs shrink-0">{evt.eventType.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawers & Dialogs */}
      <RoleChangeDrawer member={member} open={roleChangeOpen} onOpenChange={setRoleChangeOpen} onConfirm={(id, role, reason) => { mutations.changeRole.mutate({ staffId: id, newRole: role, reason }); setRoleChangeOpen(false); }} isPending={mutations.changeRole.isPending} />
      <SuspendStaffDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} onConfirm={(id, reason) => { mutations.suspendStaff.mutate({ staffId: id, reason }); setSuspendOpen(false); }} isPending={mutations.suspendStaff.isPending} />
      <ReactivateStaffDialog member={member} open={reactivateOpen} onOpenChange={setReactivateOpen} onConfirm={(id, reason) => { mutations.reactivateStaff.mutate({ staffId: id, reason }); setReactivateOpen(false); }} isPending={mutations.reactivateStaff.isPending} />
      <DeactivateStaffDialog member={member} open={deactivateOpen} onOpenChange={setDeactivateOpen} onConfirm={(id, reason) => { mutations.deactivateStaff.mutate({ staffId: id, reason, reassignmentPlan: [] }); setDeactivateOpen(false); }} isPending={mutations.deactivateStaff.isPending} />
      <AssignmentDrawer member={member} open={assignOpen} onOpenChange={setAssignOpen} onConfirm={(staffId, companyId, companyName, responsibility) => { mutations.assignCompany.mutate({ staffId, companyId, companyName, responsibility }); setAssignOpen(false); }} isPending={mutations.assignCompany.isPending} />
    </div>
  );
}

export function StaffDetailPage() {
  return (
    <StaffCapabilitiesProvider>
      <StaffDetailContent />
    </StaffCapabilitiesProvider>
  );
}
