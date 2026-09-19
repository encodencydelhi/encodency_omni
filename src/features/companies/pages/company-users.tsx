"use client";

import { ActivityIcon, ArrowRightLeftIcon, LockIcon, SearchXIcon, ShieldCheckIcon, UserRoundCheckIcon, UserRoundXIcon, UsersIcon, EyeIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getInitials, formatDate } from "@/lib/utils/format";
import { ORGANISATION_ROLE, USER_STATUS } from "@/types/domain/user";
import { toStatusOptions } from "@/types/common";
import { ModuleLinkButton } from "../components/module-link";
import { Panel, StatCard, StatGrid, WithTooltip } from "../components/primitives";
import { SectionError, StatGridSkeleton, TableSkeleton } from "../components/states";
import { useCompanyActions } from "../components/use-company-actions";
import { useCompanyCapabilities } from "../data/capability-provider";
import { relativeTime } from "../data/clock";
import { companySectionHref, resolveModuleLink } from "../data/config";
import { describeError, useCompany, useCompanyMutations, useCompanyUsers } from "../data/hooks";
import type { CompanyUsersData } from "../data/repository";
import type { CompanyUser } from "../data/types";
import { useDebouncedText, useUrlParams } from "../hooks/use-url-params";
import { useCompanyId } from "./company-shell";

const URL_KEYS = ["q", "status"] as const;
const STATUS_OPTIONS = toStatusOptions(USER_STATUS);

export function CompanyUsersPage() {
  const companyId = useCompanyId();
  const query = useCompanyUsers(companyId);

  if (query.error) return <SectionError subject="Users" error={query.error} onRetry={() => void query.refetch()} module={{ key: "users", label: "Users" }} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <StatGridSkeleton count={5} className="grid-cols-2 sm:grid-cols-5" />
        <TableSkeleton rows={6} columns={7} />
      </div>
    );
  }
  return <UsersBody companyId={companyId} data={query.data} />;
}

function UsersBody({ companyId, data }: { companyId: string; data: CompanyUsersData }) {
  const router = useRouter();
  const capabilities = useCompanyCapabilities();
  const mutations = useCompanyMutations();
  const company = useCompany(companyId);
  const { openFlow, dialogs } = useCompanyActions();
  const url = useUrlParams(URL_KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, useCallback((value: string) => url.set({ q: value }), [url]));

  const [confirming, setConfirming] = useState<{ user: CompanyUser; status: "active" | "suspended" } | null>(null);
  const [pending, setPending] = useState(false);
  const [accessUser, setAccessUser] = useState<CompanyUser | null>(null);

  const { users } = data;
  const activeOwners = users.filter((user) => user.role === "owner" && user.status === "active");
  const stats = {
    total: users.length,
    active: users.filter((user) => user.status === "active").length,
    invited: users.filter((user) => user.status === "invited").length,
    suspended: users.filter((user) => user.status === "suspended").length,
    no2fa: users.filter((user) => user.status !== "invited" && !user.mfaEnabled).length,
  };

  const filtered = useMemo(() => {
    const term = url.values.q.trim().toLowerCase();
    return users.filter((user) => {
      if (url.values.status && user.status !== url.values.status) return false;
      return !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    });
  }, [url.values.q, url.values.status, users]);

  const isProtected = (user: CompanyUser) => user.role === "owner" && user.status === "active" && activeOwners.length <= 1;

  const menu = (user: CompanyUser): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    const usersModule = resolveModuleLink("users", { search: user.email });
    if (usersModule.available && usersModule.href) {
      items.push({ id: "open", label: "Open User", icon: SquareArrowOutUpRightIcon, onSelect: () => router.push(usersModule.href ?? "") });
    }
    items.push({ id: "activity", label: "View Activity", icon: ActivityIcon, onSelect: () => router.push(companySectionHref(companyId, "activity", { q: user.name })) });
    items.push({ id: "access", label: "Review Client Access", icon: EyeIcon, onSelect: () => setAccessUser(user) });

    if (capabilities.canManageCompanySecurity) {
      if (user.status === "active" && !user.mfaEnabled && !user.twoFactorRequired) {
        items.push({
          id: "2fa",
          label: "Require 2FA",
          icon: ShieldCheckIcon,
          separatorBefore: true,
          onSelect: () => {
            void mutations
              .requireUserTwoFactor(companyId, user.id)
              .then(() => toast.success(`2FA requirement recorded for ${user.name} (demo - not enforced)`))
              .catch((failure) => toast.error(describeError(failure).message));
          },
        });
      }
      if (user.status === "suspended") {
        items.push({ id: "reactivate", label: "Reactivate User", icon: UserRoundCheckIcon, separatorBefore: true, onSelect: () => setConfirming({ user, status: "active" }) });
      } else if (user.status === "active") {
        items.push({
          id: "suspend",
          label: isProtected(user) ? "Suspend User (owner protected)" : "Suspend User",
          icon: isProtected(user) ? LockIcon : UserRoundXIcon,
          variant: "destructive",
          disabled: isProtected(user),
          separatorBefore: true,
          onSelect: () => setConfirming({ user, status: "suspended" }),
        });
      }
    }
    if (isProtected(user) && capabilities.canTransferOwnership && company.data) {
      const summary = company.data;
      items.push({ id: "transfer", label: "Transfer Ownership", icon: ArrowRightLeftIcon, onSelect: () => openFlow({ kind: "transfer", summary }) });
    }
    return items;
  };

  const columns: Array<DataTableColumn<CompanyUser>> = [
    {
      id: "user",
      header: "User",
      hideable: false,
      width: "min-w-48",
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="text-[11px]">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">{user.name}</p>
            <p className="truncate text-2xs text-muted-foreground">{user.email}</p>
          </div>
          {isProtected(user) ? (
            <WithTooltip content="The only active organisation owner. Transfer ownership before suspending or removing them.">
              <LockIcon className="size-3.5 text-muted-foreground" aria-label="Protected owner" />
            </WithTooltip>
          ) : null}
        </div>
      ),
    },
    { id: "role", header: "Role", cell: (user) => <StatusBadge registry={ORGANISATION_ROLE} status={user.role} /> },
    {
      id: "access",
      header: "Client access",
      cell: (user) => {
        const total = data.clients.length;
        const count = user.clientAccessIds.length;
        const names = data.clients.filter((client) => user.clientAccessIds.includes(client.id)).map((client) => client.name);
        return (
          <WithTooltip content={names.length > 0 ? names.join(", ") : "No client access"}>
            <span className="text-[0.8125rem] text-foreground">
              {total === 0 ? "-" : count === 0 ? <span className="text-muted-foreground">None</span> : count === total ? "All clients" : `${count} of ${total}`}
            </span>
          </WithTooltip>
        );
      },
    },
    { id: "status", header: "Status", cell: (user) => <StatusBadge registry={USER_STATUS} status={user.status} withDot /> },
    {
      id: "twofa",
      header: "2FA",
      cell: (user) =>
        user.status === "invited" ? (
          <span className="text-2xs text-muted-foreground">Pending</span>
        ) : user.mfaEnabled ? (
          <span className="text-[0.8125rem] text-success">Enabled</span>
        ) : user.twoFactorRequired ? (
          <span className="text-[0.8125rem] text-warning">Required (demo)</span>
        ) : (
          <span className="text-[0.8125rem] text-muted-foreground">Not enabled</span>
        ),
    },
    { id: "lastActive", header: "Last active", cell: (user) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{user.lastLoginAt ? relativeTime(user.lastLoginAt) : "Never"}</span> },
    { id: "created", header: "Created", defaultHidden: true, cell: (user) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(user.createdAt)}</span> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (user) => <ActionMenu items={menu(user)} label={`Actions for ${user.name}`} /> },
  ];

  const confirmChange = async () => {
    if (!confirming) return;
    setPending(true);
    try {
      await mutations.setUserStatus(companyId, confirming.user.id, confirming.status);
      toast.success(`${confirming.user.name} ${confirming.status === "suspended" ? "suspended" : "reactivated"}`);
      setConfirming(null);
    } catch (failure) {
      toast.error(describeError(failure).message);
      setConfirming(null);
    } finally {
      setPending(false);
    }
  };

  const companyName = company.data?.company.name ?? "this company";

  return (
    <div className="space-y-1">
      <StatGrid className="grid-cols-2 sm:grid-cols-5">
        <StatCard label="Total users" value={stats.total} icon={UsersIcon} />
        <StatCard label="Active" value={stats.active} tone="success" />
        <StatCard label="Pending invitations" value={stats.invited} tone={stats.invited > 0 ? "info" : "neutral"} />
        <StatCard label="Suspended" value={stats.suspended} tone={stats.suspended > 0 ? "danger" : "neutral"} />
        <StatCard label="Without 2FA" value={stats.no2fa} tone={stats.no2fa > 0 ? "warning" : "neutral"} hint="Excludes pending invitations" />
      </StatGrid>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or email..." aria-label="Search users" className="w-full sm:w-72" />
          <FilterSelect label="Status" value={url.values.status || undefined} options={STATUS_OPTIONS} onChange={(value) => url.set({ status: value })} />
          {url.activeCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={url.clear}>
              Clear
            </Button>
          ) : null}
        </div>
        <ModuleLinkButton module="users" query={{ companyId }} variant="ghost">
          Open in global Users
        </ModuleLinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(user) => user.id}
        isLoading={false}
        caption={`Users of ${companyName}`}
        enableColumnVisibility
        emptyState={
          users.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No users yet" description="People appear here once the organisation owner accepts their invitation and invites a team." />
          ) : (
            <EmptyState icon={SearchXIcon} title="No users match" description="Try a different search or clear the filters." action={<Button variant="outline" onClick={url.clear}>Clear filters</Button>} />
          )
        }
      />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && !pending && setConfirming(null)}
        title={confirming?.status === "suspended" ? `Suspend ${confirming.user.name}?` : `Reactivate ${confirming?.user.name ?? "user"}?`}
        description={
          confirming?.status === "suspended"
            ? `${confirming.user.name} will lose access to ${companyName}. Their client assignments are kept. The identity service is responsible for ending existing sessions.`
            : `${confirming?.user.name ?? "This user"} regains access to ${companyName}.`
        }
        confirmLabel={confirming?.status === "suspended" ? "Suspend user" : "Reactivate user"}
        variant={confirming?.status === "suspended" ? "destructive" : "default"}
        isPending={pending}
        onConfirm={() => void confirmChange()}
      />

      <Sheet open={accessUser !== null} onOpenChange={(open) => !open && setAccessUser(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Client access</SheetTitle>
            <SheetDescription>{accessUser?.name} · {accessUser?.email}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <Panel title="Clients this user can reach">
              {data.clients.length === 0 ? (
                <p className="text-[0.8125rem] text-muted-foreground">This company has no clients yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.clients.map((client) => {
                    const has = accessUser?.clientAccessIds.includes(client.id);
                    return (
                      <li key={client.id} className="flex items-center justify-between py-1.5 text-[0.8125rem]">
                        <span className="text-foreground">{client.name}</span>
                        <span className={has ? "text-success" : "text-muted-foreground"}>{has ? "Has access" : "No access"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            <p className="text-2xs text-muted-foreground">
              Client access is managed by the organisation&apos;s own admins. Super Admin reviews it here but does not change it.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={companySectionHref(companyId, "clients")}>Open Clients</Link>
            </Button>
          </SheetBody>
        </SheetContent>
      </Sheet>
      {dialogs}
    </div>
  );
}

