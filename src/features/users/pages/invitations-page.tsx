"use client";

import {
  AlertCircleIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MailIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/routes";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { formatDate } from "@/lib/utils/format";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import { InviteUserWizard } from "../components/dialogs/invite-user-wizard";
import { UsersNav } from "../components/users-nav";
import { INVITATION_STATUS } from "../data/config";
import { useInvitations, useUserMutations } from "../data/hooks";
import type { UserInvitation } from "../data/types";
import { UserCapabilitiesProvider, useUserCapabilities } from "../data/capability-provider";
import { ErrorState } from "@/components/shared/error-state";

export function InvitationsPage() {
  return (
    <UserCapabilitiesProvider>
      <InvitationsContent />
    </UserCapabilitiesProvider>
  );
}

function InvitationsContent() {
  const router = useRouter();
  const capabilities = useUserCapabilities();
  const mutations = useUserMutations();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inviteWizardOpen, setInviteWizardOpen] = useState(false);

  // Detail drawer
  const [selectedInvite, setSelectedInvite] = useState<UserInvitation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: companies } = useCompanyRefs();
  const { data: invitations = [], isLoading, error: invitationsError, refetch } = useInvitations({
    search: search.trim() || undefined,
    status: statusFilter,
  });

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));

  // KPI Calculations
  const counts = {
    pending: invitations.filter((i) => i.status === "pending").length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
    expired: invitations.filter((i) => i.status === "expired").length,
    revoked: invitations.filter((i) => i.status === "revoked").length,
  };

  const handleOpenDetail = (inv: UserInvitation) => {
    setSelectedInvite(inv);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MailIcon className="size-5 text-blue-600" />
            <span>Invitations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform-wide overview of pending and processed company user onboarding invitations.
          </p>
        </div>

        {capabilities.canInviteUsers && (
          <Button
            type="button"
            size="sm"
            onClick={() => setInviteWizardOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusIcon className="size-3.5" />
            <span> Invite User</span>
          </Button>
        )}
      </div>

      {/* KPI Row */}
      {invitationsError ? (
        <ErrorState error={invitationsError} onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 items-stretch">
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`p-3 h-full min-h-[92px] rounded-lg border text-left bg-white transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            statusFilter === "pending" ? "border-sky-500 bg-sky-50/20" : "border-border hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Pending</span>
            <ClockIcon className="size-3.5 text-sky-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-sky-600">{counts.pending}</div>
            <div className="text-xs text-slate-400">Awaiting acceptance</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("accepted")}
          className={`p-3 h-full min-h-[92px] rounded-lg border text-left bg-white transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            statusFilter === "accepted" ? "border-emerald-500 bg-emerald-50/20" : "border-border hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Accepted</span>
            <CheckCircle2Icon className="size-3.5 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600">{counts.accepted}</div>
            <div className="text-xs text-slate-400">Onboarded to tenant</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("expired")}
          className={`p-3 h-full min-h-[92px] rounded-lg border text-left bg-white transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            statusFilter === "expired" ? "border-amber-500 bg-amber-50/20" : "border-border hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Expired</span>
            <AlertCircleIcon className="size-3.5 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-600">{counts.expired}</div>
            <div className="text-xs text-slate-400">Passed validity period</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("revoked")}
          className={`p-3 h-full min-h-[92px] rounded-lg border text-left bg-white transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            statusFilter === "revoked" ? "border-slate-500 bg-slate-50/20" : "border-border hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Revoked</span>
            <XCircleIcon className="size-3.5 text-slate-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-700">{counts.revoked}</div>
            <div className="text-xs text-slate-400">Cancelled by admin</div>
          </div>
        </button>
      </div>
      )}

      {/* Module Navigation */}
      <UsersNav />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, recipient or company..."
            className="h-8.5 pl-8 text-xs bg-white border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8.5 text-xs w-[130px] bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>

          {(search || statusFilter !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="h-8.5 text-xs gap-1"
            >
              <RotateCcwIcon className="size-3" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="h-8.5 text-xs bg-white"
            title="Refresh invitations"
          >
            <RefreshCwIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Invitations Table (Section 32) */}
      <div className="rounded-md border border-border bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50/75 border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <TableRow>
              <TableHead className="min-w-[200px]">Recipient</TableHead>
              <TableHead className="min-w-[140px]">Target Company</TableHead>
              <TableHead className="min-w-[130px]">Intended Role</TableHead>
              <TableHead className="min-w-[110px]">Client Access</TableHead>
              <TableHead className="min-w-[130px]">Invited By</TableHead>
              <TableHead className="min-w-[95px]">Sent Date</TableHead>
              <TableHead className="min-w-[95px]">Expiry</TableHead>
              <TableHead className="min-w-[90px]">Status</TableHead>
              <TableHead className="w-12 text-right pr-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-12">
                  <TableCell colSpan={9} className="py-3 px-4">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </TableCell>
                </TableRow>
              ))
            ) : invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-slate-400 text-xs italic">
                  No invitations match the current search or status filter.
                </TableCell>
              </TableRow>
            ) : (
              invitations.map((inv) => {
                const statusMeta = INVITATION_STATUS[inv.status];
                return (
                  <TableRow
                    key={inv.id}
                    onClick={() => handleOpenDetail(inv)}
                    className="group text-xs cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Recipient */}
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-slate-800">{inv.name}</div>
                      <div className="text-xs text-slate-400">{inv.email}</div>
                    </TableCell>

                    {/* Target Company */}
                    <TableCell className="py-2.5">
                      <Link
                        href={ROUTES.superAdmin.company(inv.companyId)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-slate-700 hover:text-blue-600 hover:underline truncate"
                      >
                        {inv.companyName}
                      </Link>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="py-2.5">
                      <span className="inline-block rounded px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                        {ORGANISATION_ROLE[inv.role]?.label || inv.role}
                      </span>
                    </TableCell>

                    {/* Client Access */}
                    <TableCell className="py-2.5 text-slate-600">
                      {inv.clientAccessScope === "all" ? (
                        <span className="text-emerald-700 font-medium">All Clients</span>
                      ) : (
                        <span>{inv.clientAccessIds.length} Selected</span>
                      )}
                    </TableCell>

                    {/* Invited By */}
                    <TableCell className="py-2.5 text-xs text-slate-500">
                      <div>{inv.invitedBy.name}</div>
                      <div className="text-xs text-slate-400 truncate">{inv.invitedBy.email}</div>
                    </TableCell>

                    {/* Sent Date */}
                    <TableCell className="py-2.5 text-slate-500 whitespace-nowrap">
                      {formatDate(inv.sentAt)}
                    </TableCell>

                    {/* Expiry */}
                    <TableCell className="py-2.5 text-slate-500 whitespace-nowrap">
                      {formatDate(inv.expiresAt)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          inv.status === "pending"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : inv.status === "accepted"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "expired"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {statusMeta?.label || inv.status}
                      </span>
                    </TableCell>

                    {/* Row Actions */}
                    <TableCell className="py-2.5 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 rounded p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => handleOpenDetail(inv)} className="cursor-pointer gap-2">
                            <MailIcon className="size-3.5 text-slate-500" />
                            <span>View Details</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => router.push(ROUTES.superAdmin.company(inv.companyId))}
                            className="cursor-pointer gap-2"
                          >
                            <ExternalLinkIcon className="size-3.5 text-slate-500" />
                            <span>Open Company</span>
                          </DropdownMenuItem>

                          {inv.status === "accepted" && inv.acceptedUserId && (
                            <DropdownMenuItem
                              onClick={() => router.push(ROUTES.superAdmin.user(inv.acceptedUserId!))}
                              className="cursor-pointer gap-2"
                            >
                              <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                              <span>Open User Profile</span>
                            </DropdownMenuItem>
                          )}

                          {capabilities.canInviteUsers && (inv.status === "pending" || inv.status === "expired") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => mutations.resendInvitation.mutate(inv.id)}
                                className="cursor-pointer gap-2 text-blue-600 font-medium"
                              >
                                <SendIcon className="size-3.5" />
                                <span>Resend Invitation</span>
                              </DropdownMenuItem>
                            </>
                          )}

                          {capabilities.canInviteUsers && inv.status === "pending" && (
                            <DropdownMenuItem
                              onClick={() => mutations.revokeInvitation.mutate(inv.id)}
                              className="cursor-pointer gap-2 text-rose-600"
                            >
                              <BanIcon className="size-3.5" />
                              <span>Revoke Invitation</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invitation Detail Drawer (Section 39) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border bg-slate-50/60">
            <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MailIcon className="size-4.5 text-blue-600" />
              <span>Invitation Detail</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Platform onboarding status for {selectedInvite?.name}.
            </SheetDescription>
          </SheetHeader>

          {selectedInvite && (
            <SheetBody className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="rounded border border-border p-3.5 bg-slate-50/70 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Recipient Name</span>
                  <span className="font-semibold text-slate-800">{selectedInvite.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Email</span>
                  <span className="font-semibold text-slate-800">{selectedInvite.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Target Company</span>
                  <span className="font-semibold text-slate-800">{selectedInvite.companyName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Assigned Role</span>
                  <span className="font-semibold text-slate-800">
                    {ORGANISATION_ROLE[selectedInvite.role]?.label || selectedInvite.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Client Scope</span>
                  <span className="font-semibold text-slate-800">
                    {selectedInvite.clientAccessScope === "all" ? "All Clients" : `${selectedInvite.clientAccessIds.length} Selected`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">2FA Requirement</span>
                  <span className="font-semibold text-slate-800">
                    {selectedInvite.requires2fa ? "Mandatory" : "Optional"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Sent Date</span>
                  <span className="text-slate-700">{formatDate(selectedInvite.sentAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Expiry Date</span>
                  <span className="text-slate-700">{formatDate(selectedInvite.expiresAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold capitalize text-blue-600">{selectedInvite.status}</span>
                </div>
              </div>

              {selectedInvite.note && (
                <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
                  <span className="font-semibold text-slate-700">Internal Note</span>
                  <p className="text-slate-500 text-xs">{selectedInvite.note}</p>
                </div>
              )}
            </SheetBody>
          )}

          {selectedInvite && (
            <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="text-xs">
                Close
              </Button>

              {capabilities.canInviteUsers && (selectedInvite.status === "pending" || selectedInvite.status === "expired") && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    mutations.resendInvitation.mutate(selectedInvite.id);
                    setDrawerOpen(false);
                  }}
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
                >
                  <SendIcon className="size-3.5" />
                  <span>Resend Invite</span>
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Invite User Wizard */}
      <InviteUserWizard
        open={inviteWizardOpen}
        onOpenChange={setInviteWizardOpen}
        companyOptions={companyOptions}
      />
    </div>
  );
}
