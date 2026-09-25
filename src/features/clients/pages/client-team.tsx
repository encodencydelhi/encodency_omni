"use client";

import { ArrowRightLeftIcon, BuildingIcon, UserMinusIcon, UserPlusIcon, UserRoundIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/features/companies/components/primitives";
import { companySectionHref } from "@/features/companies/data/config";
import { relativeTime } from "@/features/companies/data/clock";
import { ROUTES } from "@/config/routes";
import { getInitials } from "@/lib/utils/format";
import { ORGANISATION_ROLE, USER_STATUS } from "@/types/domain/user";
import { usePathname, useRouter } from "next/navigation";
import { AssignMemberFlow, ChangeAccessFlow, RemoveAccessFlow } from "../components/flows/team-flows";
import { ClientError, StatGridSkeleton, TableSkeleton } from "../components/states";
import { AccessLevelBadge } from "../components/status-badges";
import { resolveClientBasePath } from "../data/config";
import { useClientCapabilities, useClientTeam } from "../data/hooks";
import type { ClientAssignmentView, ClientTeamData } from "../data/types";
import { useClientId } from "./client-shell";

type Flow = { kind: "assign" } | { kind: "change"; member: ClientAssignmentView } | { kind: "remove"; member: ClientAssignmentView };

function TeamBody({ data }: { data: ClientTeamData }) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = resolveClientBasePath(pathname);
  const isAdmin = basePath.startsWith(ROUTES.admin.root);
  const capabilities = useClientCapabilities();
  const [flow, setFlow] = useState<Flow | null>(null);
  const { summary, assignments, eligibleMembers } = data;
  const archived = summary.workspace === "archived";
  const canManage = capabilities.canManageClientTeam && !archived;
  const unassigned = eligibleMembers.filter((member) => !member.alreadyAssigned).length;

  const menu = (member: ClientAssignmentView): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      {
        id: "user",
        label: "View User",
        icon: UserRoundIcon,
        onSelect: () => router.push(isAdmin ? `${ROUTES.admin.team}?search=${encodeURIComponent(member.email)}` : `${ROUTES.superAdmin.users}?search=${encodeURIComponent(member.email)}`),
      },
      {
        id: "membership",
        label: "View Company Membership",
        icon: BuildingIcon,
        onSelect: () => router.push(isAdmin ? `${ROUTES.admin.team}?search=${encodeURIComponent(member.email)}` : companySectionHref(summary.company.id, "users", { q: member.email })),
      },
    ];
    if (canManage && member.membershipStatus === "active") {
      items.push({ id: "change", label: "Change Client Access", icon: ArrowRightLeftIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "change", member }) });
    }
    if (canManage) {
      items.push({ id: "remove", label: "Remove Client Access", icon: UserMinusIcon, variant: "destructive", onSelect: () => setFlow({ kind: "remove", member }) });
    }
    return items;
  };

  const columns: Array<DataTableColumn<ClientAssignmentView>> = [
    {
      id: "member",
      header: "Member",
      hideable: false,
      cell: (member) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="text-[10px]">{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">{member.name}</p>
            <p className="truncate text-2xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      ),
    },
    { id: "role", header: "Company role", hideBelow: "md", cell: (member) => <span className="text-[0.8125rem]">{ORGANISATION_ROLE[member.companyRole].label}</span> },
    {
      id: "access",
      header: "Client access",
      cell: (member) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <AccessLevelBadge level={member.level} />
          {member.isLead ? <span className="rounded-sm border border-primary/30 bg-primary-subtle px-1 text-[10px] font-medium leading-4 text-primary">Lead</span> : null}
        </span>
      ),
    },
    {
      id: "status",
      header: "Membership status",
      cell: (member) => (
        <div>
          <StatusBadge registry={USER_STATUS} status={member.membershipStatus} withDot />
          {member.issue ? <p className="mt-0.5 max-w-52 text-2xs text-warning">{member.issue}</p> : null}
        </div>
      ),
    },
    { id: "lastActive", header: "Last active", hideBelow: "lg", cell: (member) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{member.lastLoginAt ? relativeTime(member.lastLoginAt) : "Never"}</span> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (member) => <ActionMenu items={menu(member)} label={`Actions for ${member.name}`} /> },
  ];

  const lead = summary.lead;

  return (
    <div className="space-y-2">
      <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Assigned members" value={assignments.length} hint="With client access" />
        <StatCard label="Active members" value={summary.counts.activeMembers} hint="Active company membership" tone="success" />
        <StatCard label="Client lead" value={<span className="text-[0.8125rem]">{lead?.name ?? "Not assigned"}</span>} hint={lead ? "Leads this workspace" : "Optional"} />
        <StatCard label="Membership issues" value={summary.counts.accessIssues + summary.counts.pendingMembers} hint="Suspended, inactive or invited" tone={summary.counts.accessIssues > 0 ? "warning" : "neutral"} />
        <StatCard label="Available to assign" value={unassigned} hint={`Active in ${summary.company.name}`} />
      </StatGrid>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xs text-muted-foreground">Client access is separate from company roles. Only active members of {summary.company.name} can be assigned.</p>
        {canManage ? (
          <Button size="sm" onClick={() => setFlow({ kind: "assign" })}>
            <UserPlusIcon />
            Assign Member
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={assignments}
        getRowId={(member) => member.membershipId}
        isLoading={false}
        isFetching={false}
        caption={`Team with access to ${summary.client.name}`}
        emptyState={
          <EmptyState
            icon={UserPlusIcon}
            title="No one is assigned yet"
            description="Assign members of the parent company so this client has people working in it."
            action={canManage ? <Button onClick={() => setFlow({ kind: "assign" })}><UserPlusIcon />Assign Member</Button> : undefined}
          />
        }
      />

      {flow?.kind === "assign" ? <AssignMemberFlow summary={summary} members={eligibleMembers} onClose={() => setFlow(null)} /> : null}
      {flow?.kind === "change" ? <ChangeAccessFlow summary={summary} member={flow.member} onClose={() => setFlow(null)} /> : null}
      {flow?.kind === "remove" ? <RemoveAccessFlow summary={summary} member={flow.member} others={assignments} onClose={() => setFlow(null)} /> : null}
    </div>
  );
}

export function ClientTeamPage() {
  const clientId = useClientId();
  const query = useClientTeam(clientId);
  const body = useMemo(() => (query.data ? <TeamBody data={query.data} /> : null), [query.data]);

  if (query.error) return <ClientError subject="Team & access" error={query.error} onRetry={() => void query.refetch()} />;
  if (!body) {
    return (
      <div className="space-y-2">
        <StatGridSkeleton count={5} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" />
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }
  return body;
}
