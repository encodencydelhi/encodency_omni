"use client";

import {
  DownloadIcon,
  MailIcon,
  MoreVerticalIcon,
  PlusIcon,
  ShieldAlertIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { BulkActionsToolbar } from "../components/bulk-actions-toolbar";
import { AddMembershipModal } from "../components/dialogs/add-membership-modal";
import { InviteUserWizard } from "../components/dialogs/invite-user-wizard";
import {
  Require2faDialog,
  RequirePasswordResetDialog,
  RevokeSessionsDialog,
} from "../components/dialogs/security-action-dialogs";
import { SuspendGlobalAccountModal } from "../components/dialogs/suspend-global-account-modal";
import { NeedsAttentionSection } from "../components/needs-attention-section";
import { RecentUserActivityCard } from "../components/recent-user-activity-card";
import { UserPreviewDrawer } from "../components/user-preview-drawer";
import { UsersFilterToolbar } from "../components/users-filter-toolbar";
import { UsersKpiCards } from "../components/users-kpi-cards";
import { UsersNav } from "../components/users-nav";
import { UsersTable } from "../components/users-table";
import { exportUsersToCsv } from "../data/config";
import {
  useAttentionItems,
  useUserActivities,
  useUserKpis,
  useUserMutations,
  useUsersList,
} from "../data/hooks";
import type { UserAggregate, UserFilters } from "../data/types";
import { UserCapabilitiesProvider, useUserCapabilities } from "../data/capability-provider";
import { ErrorState } from "@/components/shared/error-state";
import { useUsersQueryState } from "../hooks/use-users-query-state";

export function UsersListPage() {
  return (
    <UserCapabilitiesProvider>
      <UsersListContent />
    </UserCapabilitiesProvider>
  );
}

function UsersListContent() {
  const router = useRouter();
  const capabilities = useUserCapabilities();
  const mutations = useUserMutations();

  const {
    page,
    pageSize,
    search,
    sort,
    filters,
    activeFilterCount,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
  } = useUsersQueryState();

  const [selectedUsers, setSelectedUsers] = useState<UserAggregate[]>([]);

  const [previewUser, setPreviewUser] = useState<UserAggregate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [inviteWizardOpen, setInviteWizardOpen] = useState(false);
  const [addMembershipUser, setAddMembershipUser] = useState<UserAggregate | null>(null);
  const [addMembershipOpen, setAddMembershipOpen] = useState(false);

  const [suspendModalUser, setSuspendModalUser] = useState<UserAggregate | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  const [secDialogUser, setSecDialogUser] = useState<UserAggregate | null>(null);
  const [require2faOpen, setRequire2faOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [revokeSessionsOpen, setRevokeSessionsOpen] = useState(false);

  const { data: companies } = useCompanyRefs();
  const { data: kpis } = useUserKpis();
  const { data: attentionItems = [] } = useAttentionItems();
  const { data: activities = [] } = useUserActivities();

  const queryParams = useMemo(
    () => ({
      filters: { ...filters, search: search.trim() || undefined },
      sort,
      page,
      pageSize,
    }),
    [filters, search, sort, page, pageSize],
  );

  const { data: listResult, isLoading, error: listError, refetch } = useUsersList(queryParams);
  const users = listResult?.items ?? [];

  const companyOptions = useMemo(
    () =>
      (companies ?? []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    [companies],
  );

  const handleFilterChange = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
    setFilter(key, value);
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  const handleKpiSelect = (kpiId: string) => {
    if (kpiId === "all") {
      handleClearFilters();
    } else if (kpiId === "active") {
      setFilter("status", "active");
    } else if (kpiId === "suspended") {
      setFilter("status", "suspended");
    } else if (kpiId === "pending_invites") {
      router.push(ROUTES.superAdmin.userInvitations);
    } else if (kpiId === "two_factor") {
      setFilter("twoFactor", "enabled");
    } else if (kpiId === "inactive_30d") {
      setFilter("lastActive", "inactive30d");
    } else if (kpiId === "multi_company") {
      setFilter("multiCompanyOnly", true);
    } else if (kpiId === "needs_attention") {
      setFilter("accessIssues", true);
    }
  };

  const handleToggleSelect = (user: UserAggregate) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.identity.id === user.identity.id)
        ? prev.filter((u) => u.identity.id !== user.identity.id)
        : [...prev, user],
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...users]);
    }
  };

  const handleRowClick = (user: UserAggregate) => {
    router.push(ROUTES.superAdmin.user(user.identity.id));
  };

  const handlePreviewUser = (user: UserAggregate) => {
    setPreviewUser(user);
    setPreviewOpen(true);
  };

  const handleExportAll = () => {
    exportUsersToCsv(users, `omniplatform-users-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UsersIcon className="size-5 text-blue-600" />
            <span>Users</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage platform users, company memberships, account access and security.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {capabilities.canInviteUsers && (
            <Button
              type="button"
              size="sm"
              onClick={() => setInviteWizardOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
            >
              <PlusIcon className="size-3.5" />
              <span>Invite User</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            className="h-8 text-xs gap-1.5 bg-white"
          >
            <DownloadIcon className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export Users</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 size-8 p-0 bg-white"
                aria-label="More user options"
              >
                <MoreVerticalIcon className="size-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem
                onClick={() => router.push(ROUTES.superAdmin.userSecurity)}
                className="cursor-pointer gap-2"
              >
                <ShieldAlertIcon className="size-3.5 text-slate-500" />
                <span>Review Access Issues</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(ROUTES.superAdmin.userInvitations)}
                className="cursor-pointer gap-2"
              >
                <MailIcon className="size-3.5 text-slate-500" />
                <span>View Invitations</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(ROUTES.superAdmin.userActivity)}
                className="cursor-pointer gap-2"
              >
                <UsersIcon className="size-3.5 text-slate-500" />
                <span>View Security Activity</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      {listError ? (
        <ErrorState error={listError} onRetry={() => refetch()} />
      ) : kpis && (
        <UsersKpiCards
          kpis={kpis}
          activeFilter={filters.status || (filters.multiCompanyOnly ? "multi_company" : filters.accessIssues ? "needs_attention" : undefined)}
          onSelectFilter={handleKpiSelect}
        />
      )}

      {/* Module Navigation */}
      <UsersNav />

      {/* Needs Attention */}
      {attentionItems.length > 0 && (
        <NeedsAttentionSection items={attentionItems} />
      )}

      {/* Search & Filter Toolbar */}
      <UsersFilterToolbar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
        sort={sort}
        onSortChange={setSort}
        filteredUsers={users}
        companyOptions={companyOptions}
      />

      {/* Users Table */}
      <UsersTable
        users={users}
        selectedUsers={selectedUsers}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onRowClick={handleRowClick}
        onPreviewClick={handlePreviewUser}
        onAddMembershipClick={(u) => {
          setAddMembershipUser(u);
          setAddMembershipOpen(true);
        }}
        onSuspendClick={(u) => {
          setSuspendModalUser(u);
          setSuspendModalOpen(true);
        }}
        onReactivateClick={(u) => {
          mutations.reactivateGlobalAccount.mutate(u.identity.id);
        }}
        onRequire2faClick={(u) => {
          setSecDialogUser(u);
          setRequire2faOpen(true);
        }}
        onRequireResetClick={(u) => {
          setSecDialogUser(u);
          setPasswordResetOpen(true);
        }}
        onRevokeSessionsClick={(u) => {
          setSecDialogUser(u);
          setRevokeSessionsOpen(true);
        }}
        isLoading={isLoading}
      />

      {/* Recent Activity */}
      {activities.length > 0 && (
        <RecentUserActivityCard
          activities={activities}
          onSelectEvent={(evt) => {
            router.push(`${ROUTES.superAdmin.user(evt.userId)}?tab=activity`);
          }}
        />
      )}

      {/* Bulk Actions */}
      <BulkActionsToolbar
        selectedUsers={selectedUsers}
        onClearSelection={() => setSelectedUsers([])}
      />

      {/* Quick Preview Drawer */}
      <UserPreviewDrawer
        user={previewUser}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onSuspendClick={(u) => {
          setPreviewOpen(false);
          setSuspendModalUser(u);
          setSuspendModalOpen(true);
        }}
        onReactivateClick={(u) => {
          mutations.reactivateGlobalAccount.mutate(u.identity.id);
        }}
        onRequire2faClick={(u) => {
          setSecDialogUser(u);
          setRequire2faOpen(true);
        }}
        onRequireResetClick={(u) => {
          setSecDialogUser(u);
          setPasswordResetOpen(true);
        }}
      />

      {/* Invite User Wizard */}
      <InviteUserWizard
        open={inviteWizardOpen}
        onOpenChange={setInviteWizardOpen}
        companyOptions={companyOptions}
        onSwitchToAddMembership={(existingId) => {
          const u = users.find((usr) => usr.identity.id === existingId);
          if (u) {
            setAddMembershipUser(u);
            setAddMembershipOpen(true);
          }
        }}
      />

      {/* Add Membership Modal */}
      <AddMembershipModal
        user={addMembershipUser}
        open={addMembershipOpen}
        onOpenChange={setAddMembershipOpen}
        companyOptions={companyOptions}
      />

      {/* Suspend Global Account Modal */}
      <SuspendGlobalAccountModal
        user={suspendModalUser}
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
      />

      {/* Security Action Dialogs */}
      <Require2faDialog
        user={secDialogUser}
        open={require2faOpen}
        onOpenChange={setRequire2faOpen}
      />
      <RequirePasswordResetDialog
        user={secDialogUser}
        open={passwordResetOpen}
        onOpenChange={setPasswordResetOpen}
      />
      <RevokeSessionsDialog
        user={secDialogUser}
        open={revokeSessionsOpen}
        onOpenChange={setRevokeSessionsOpen}
      />
    </div>
  );
}
