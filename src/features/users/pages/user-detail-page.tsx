"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  BanIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  FolderIcon,
  KeyRoundIcon,
  LaptopIcon,
  LogOutIcon,
  MailIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  Trash2Icon,
  UnlockIcon,
  UserCheckIcon,
  UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/config/routes";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import {
  CompanyRoleBadge,
  MembershipStatusBadge,
  SecurityPostureBadge,
  TwoFactorStatusBadge,
  UserStatusBadge,
} from "../components/status-badges";
import { AddMembershipModal } from "../components/dialogs/add-membership-modal";
import { ChangeRoleModal } from "../components/dialogs/change-role-modal";
import { EditUserIdentityDrawer } from "../components/dialogs/edit-user-identity-drawer";
import { ManageClientAccessModal } from "../components/dialogs/manage-client-access-modal";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { RemoveMembershipModal } from "../components/dialogs/remove-membership-modal";
import {
  Require2faDialog,
  RequirePasswordResetDialog,
  RevokeSessionsDialog,
  UnlockAccountDialog,
} from "../components/dialogs/security-action-dialogs";
import { SuspendGlobalAccountModal } from "../components/dialogs/suspend-global-account-modal";
import { SuspendMembershipModal } from "../components/dialogs/suspend-membership-modal";
import { TransferOwnershipModal } from "../components/dialogs/transfer-ownership-modal";
import {
  SECURITY_POSTURE,
  type UserDetailTabId,
} from "../data/config";
import {
  useSecurityEvents,
  useUser,
  useUserActivities,
  useUserMutations,
} from "../data/hooks";
import type { CompanyMembership, UserSession } from "../data/types";

export function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = (params?.userId as string) || "";

  const tabQuery = searchParams.get("tab") as UserDetailTabId | null;
  const [activeTab, setActiveTab] = useState<UserDetailTabId>(
    tabQuery && ["overview", "company-access", "security", "activity"].includes(tabQuery)
      ? tabQuery
      : "overview",
  );

  useEffect(() => {
    if (tabQuery && ["overview", "company-access", "security", "activity"].includes(tabQuery)) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  const handleTabChange = (val: string) => {
    const nextTab = val as UserDetailTabId;
    setActiveTab(nextTab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", nextTab);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  // Queries
  const { data: user, isLoading, isError, refetch } = useUser(userId);
  const { data: activities = [] } = useUserActivities({ userId });
  const { data: allSecurityEvents = [] } = useSecurityEvents();
  const { data: companies } = useCompanyRefs();
  const mutations = useUserMutations();

  const companyOptions = useMemo(
    () => (companies ?? []).map((c) => ({ id: c.id, name: c.name })),
    [companies],
  );

  // Dialog states
  const [isAddMembershipOpen, setIsAddMembershipOpen] = useState(false);
  const [isEditIdentityOpen, setIsEditIdentityOpen] = useState(false);
  const [isSuspendGlobalOpen, setIsSuspendGlobalOpen] = useState(false);
  const [isRequire2faOpen, setIsRequire2faOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isUnlockAccountOpen, setIsUnlockAccountOpen] = useState(false);
  const [isRevokeSessionsOpen, setIsRevokeSessionsOpen] = useState(false);
  const [selectedSessionToRevoke, setSelectedSessionToRevoke] = useState<string | undefined>(undefined);

  // Membership action target
  const [activeMembership, setActiveMembership] = useState<CompanyMembership | null>(null);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isClientAccessOpen, setIsClientAccessOpen] = useState(false);
  const [isSuspendMembershipOpen, setIsSuspendMembershipOpen] = useState(false);
  const [isTransferOwnershipOpen, setIsTransferOwnershipOpen] = useState(false);
  const [isRemoveMembershipOpen, setIsRemoveMembershipOpen] = useState(false);

  // Search in tabs
  const [companySearch, setCompanySearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");

  const userSecurityEvents = useMemo(() => {
    return allSecurityEvents.filter((e) => e.userId === userId);
  }, [allSecurityEvents, userId]);

  const filteredMemberships = useMemo(() => {
    if (!user) return [];
    const q = companySearch.trim().toLowerCase();
    if (!q) return user.memberships;
    return user.memberships.filter(
      (m) =>
        m.companyName.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [user, companySearch]);

  const highestRole = useMemo(() => {
    if (!user || user.memberships.length === 0) return null;
    const rolePriority = ["owner", "admin", "project_admin", "marketing_manager", "seo_manager", "social_manager", "ads_manager", "sales_agent", "analyst", "viewer"];
    for (const role of rolePriority) {
      if (user.memberships.some((m) => m.role === role)) return role;
    }
    return user.memberships[0]?.role ?? null;
  }, [user]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (!activitySearch.trim()) return activities;
    const term = activitySearch.toLowerCase().trim();
    return activities.filter(
      (a) =>
        a.action.toLowerCase().includes(term) ||
        a.summary.toLowerCase().includes(term) ||
        (a.companyName && a.companyName.toLowerCase().includes(term)) ||
        (a.entity && a.entity.toLowerCase().includes(term)),
    );
  }, [activities, activitySearch]);

  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    }
  };

  const handleExportUserActivity = () => {
    if (!filteredActivities.length) {
      toast.info("No activity records to export.");
      return;
    }
    const headers = ["ID", "Timestamp", "Action", "Company", "Entity", "Result", "Actor", "Summary"];
    const rows = filteredActivities.map((a) => [
      a.id,
      a.timestamp,
      `"${a.action.replace(/"/g, '""')}"`,
      `"${(a.companyName || "Global").replace(/"/g, '""')}"`,
      `"${(a.entity || "").replace(/"/g, '""')}"`,
      a.result,
      `"${a.actor.name.replace(/"/g, '""')}"`,
      `"${a.summary.replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity-${user?.identity.id ?? "user"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported activity log to CSV");
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCwIcon className="size-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading user identity and memberships...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-full inline-flex border border-rose-200">
          <AlertCircleIcon className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">User Record Not Found</h2>
        <p className="text-xs text-slate-500">
          Could not locate user record for identifier <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{userId}</code>.
          The user may have been removed or the ID is invalid.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href={ROUTES.superAdmin.users}>
              <ArrowLeftIcon className="size-3.5 mr-1" />
              Return to Users Directory
            </Link>
          </Button>
          <Button variant="default" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const activeMemberships = user.memberships.filter((m) => m.status === "active");
  const primaryCompany = user.memberships.find((m) => m.role === "owner" && m.status === "active") || activeMemberships[0] || null;

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Breadcrumb & Navigation Back */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href={ROUTES.superAdmin.users}
            className="hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Users Directory</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{user.identity.name}</span>
          <span className="text-xs text-slate-400 font-mono">({user.identity.id})</span>
        </div>

        {user.identity.globalStatus === "suspended" && (
          <Badge tone="danger" className="bg-rose-50 text-rose-700 border-rose-200 text-xs px-2.5 py-0.5 font-semibold">
            Global Platform Access Suspended
          </Badge>
        )}
      </div>

      {/* 2. User Identity Header Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Avatar & Identity details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="size-16 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold tracking-wider shadow-sm ring-2 ring-white">
                {user.identity.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <span
                className={`absolute bottom-0 right-0 size-4 rounded-full border-2 border-white ${
                  user.identity.globalStatus === "active"
                    ? "bg-emerald-500"
                    : user.identity.globalStatus === "suspended"
                    ? "bg-rose-500"
                    : "bg-amber-500"
                }`}
                title={`Status: ${user.identity.globalStatus}`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {user.identity.name}
                </h1>
                <UserStatusBadge status={user.identity.globalStatus} />
                <TwoFactorStatusBadge status={user.security.twoFactorStatus} />
                <SecurityPostureBadge posture={user.securityPosture} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => handleCopy(user.identity.email, "Email")}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  title="Click to copy email"
                >
                  <MailIcon className="size-3.5 text-slate-400" />
                  <span>{user.identity.email}</span>
                  <CopyIcon className="size-3 text-slate-400 hover:text-slate-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(user.identity.id, "User ID")}
                  className="flex items-center gap-1 font-mono text-xs text-slate-400 hover:text-blue-600 transition-colors"
                  title="Click to copy ID"
                >
                  <span>{user.identity.id}</span>
                  <CopyIcon className="size-3 text-slate-400 hover:text-slate-600" />
                </button>

                {user.identity.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="size-3.5 text-slate-400" />
                    <span>{user.identity.phone}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3 text-slate-400" />
                  Joined {new Date(user.identity.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3 text-slate-400" />
                  Last active: {user.identity.lastLoginAt ? new Date(user.identity.lastLoginAt).toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddMembershipOpen(true)}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="size-3.5 mr-1.5" />
              Add to Company
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange("security")}
              className="h-8 text-xs"
            >
              <ShieldCheckIcon className="size-3.5 mr-1.5 text-slate-600" />
              Review Security
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditIdentityOpen(true)}
              className="h-8 text-xs"
            >
              <EditIcon className="size-3.5 mr-1.5 text-slate-600" />
              Edit Identity
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuLabel className="text-xs text-slate-400">Account Governance</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => setIsResetPasswordOpen(true)} className="gap-2">
                  <KeyRoundIcon className="size-3.5 text-amber-600" />
                  <span>Issue Password Reset</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setIsRequire2faOpen(true)} className="gap-2">
                  <ShieldAlertIcon className="size-3.5 text-blue-600" />
                  <span>{user.security.twoFactorRequired ? "Relax 2FA Requirement" : "Enforce Mandatory 2FA"}</span>
                </DropdownMenuItem>

                {user.security.isLocked && (
                  <DropdownMenuItem onClick={() => setIsUnlockAccountOpen(true)} className="gap-2 text-emerald-600 font-medium">
                    <UnlockIcon className="size-3.5" />
                    <span>Unlock Account</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => {
                    setSelectedSessionToRevoke(undefined);
                    setIsRevokeSessionsOpen(true);
                  }}
                  className="gap-2 text-rose-600"
                >
                  <LogOutIcon className="size-3.5" />
                  <span>Revoke All Sessions ({user.activeSessionsCount})</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {user.identity.globalStatus === "suspended" ? (
                  <DropdownMenuItem
                    onClick={() => mutations.reactivateGlobalAccount.mutate(user.identity.id)}
                    className="gap-2 text-emerald-600 font-semibold"
                  >
                    <CheckCircle2Icon className="size-3.5" />
                    <span>Reactivate Global Account</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setIsSuspendGlobalOpen(true)}
                    className="gap-2 text-rose-600 font-semibold"
                  >
                    <BanIcon className="size-3.5" />
                    <span>Suspend Global Account</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 3. Metric Strip (6 KPI cards using strictly gap-1, items-stretch for equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 items-stretch">
        <button
          type="button"
          onClick={() => handleTabChange("company-access")}
          className="group rounded-md border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left transition-colors hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Memberships</span>
            <Building2Icon className="size-3.5 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {user.memberships.length}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {activeMemberships.length} active companies
            </p>
          </div>
        </button>

        <div className="rounded-md border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Primary Company</span>
            <Building2Icon className="size-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 truncate" title={primaryCompany?.companyName ?? "Independent"}>
              {primaryCompany?.companyName ?? "None"}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {primaryCompany ? ORGANISATION_ROLE[primaryCompany.role]?.label : "Direct User"}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Highest Role</span>
            <UserCheckIcon className="size-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {highestRole ? (ORGANISATION_ROLE[highestRole as keyof typeof ORGANISATION_ROLE]?.label || highestRole) : "No Role"}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Across all companies</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleTabChange("security")}
          className="group rounded-md border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left transition-colors hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Active Sessions</span>
            <LaptopIcon className="size-3.5 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {user.activeSessionsCount}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {user.security.sessions.length} registered devices
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("security")}
          className="group rounded-md border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left transition-colors hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Security Posture</span>
            <ShieldCheckIcon className="size-3.5 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {SECURITY_POSTURE[user.securityPosture]?.label || user.securityPosture}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {user.security.twoFactorStatus === "enabled" ? "2FA Active" : "Action Needed"}
            </p>
          </div>
        </button>

        <div className="rounded-md border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Owned Resources</span>
            <FolderIcon className="size-3.5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {user.ownedResources.length}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Workflows & automations
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="border-b border-slate-200">
          <TabsList className="h-10 p-0 bg-transparent gap-2">
            <TabsTrigger
              value="overview"
              className="h-10 rounded-none border-b-2 border-transparent px-3 text-xs font-medium data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="company-access"
              className="h-10 rounded-none border-b-2 border-transparent px-3 text-xs font-medium data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none flex items-center gap-1.5"
            >
              <span>Company Access</span>
              <Badge tone="neutral" className="px-1.5 py-0 text-xs font-semibold">
                {user.memberships.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="security"
              className="h-10 rounded-none border-b-2 border-transparent px-3 text-xs font-medium data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none flex items-center gap-1.5"
            >
              <span>Security & Sessions</span>
              {user.securityPosture !== "healthy" && (
                <span className="size-2 rounded-full bg-amber-500" />
              )}
            </TabsTrigger>

            <TabsTrigger
              value="activity"
              className="h-10 rounded-none border-b-2 border-transparent px-3 text-xs font-medium data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none flex items-center gap-1.5"
            >
              <span>Activity Log</span>
              <Badge tone="neutral" className="px-1.5 py-0 text-xs font-semibold">
                {activities.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 outline-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
            {/* Identity & Profile details */}
            <Card className="shadow-xs h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <UserCogIcon className="size-4 text-blue-600" />
                    <span>Identity Profile & Settings</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Universal person-level identity attributes.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditIdentityOpen(true)}
                  className="h-7 text-xs"
                >
                  <EditIcon className="size-3 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Legal / Display Name:</span>
                  <span className="font-semibold text-slate-800">{user.identity.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Primary Email:</span>
                  <span className="font-semibold text-slate-800">{user.identity.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="font-semibold text-slate-800">{user.identity.phone || "Not set"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Timezone:</span>
                  <span className="font-semibold text-slate-800">Asia/Kolkata (IST)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Authentication Method:</span>
                  <span className="font-semibold text-slate-800">
                    Email & Password
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Created Date:</span>
                  <span className="font-semibold text-slate-800">{new Date(user.identity.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Global Account Status:</span>
                  <UserStatusBadge status={user.identity.globalStatus} />
                </div>
              </CardContent>
            </Card>

            {/* Security Snapshot Card */}
            <Card className="shadow-xs h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheckIcon className="size-4 text-emerald-600" />
                    <span>Security & Authentication Facts</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Multi-factor, session count, and credential state.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange("security")}
                  className="h-7 text-xs"
                >
                  Manage Security →
                </Button>
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Two-Factor Authentication:</span>
                  <TwoFactorStatusBadge status={user.security.twoFactorStatus} />
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Organization 2FA Policy:</span>
                  <span className="font-semibold text-slate-800">
                    {user.security.twoFactorRequired ? "Enforced (Mandatory)" : "Optional"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Active Live Sessions:</span>
                  <span className="font-semibold text-slate-800">
                    {user.activeSessionsCount} concurrent device(s)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Failed Sign-in Attempts:</span>
                  <span className={`font-semibold ${user.security.failedLoginAttempts > 0 ? "text-amber-600" : "text-slate-800"}`}>
                    {user.security.failedLoginAttempts} attempts
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Account Lockout:</span>
                  <span className={`font-semibold ${user.security.isLocked ? "text-rose-600" : "text-emerald-600"}`}>
                    {user.security.isLocked ? "Locked (Threshold Exceeded)" : "Normal (Unlocked)"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Overall Security Posture:</span>
                  <SecurityPostureBadge posture={user.securityPosture} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Owned Workflows & Resources */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FolderIcon className="size-4 text-indigo-600" />
                    <span>Owned Workflows & Active Resources ({user.ownedResources.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Automations, campaigns, and pipelines authored or owned by this user.
                  </CardDescription>
                </div>
                {user.ownedResources.length > 0 && (
                  <Badge tone="info" className="text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                    Protection Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-3 text-xs">
              {user.ownedResources.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <p>No operational workflows, campaigns, or automations are assigned to this user.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Reassignment Precaution:</strong> This user owns {user.ownedResources.length} live operational resources.
                      If their company membership is removed, the OmniPlatform workflow engine requires transferring ownership of these resources
                      to another active company member to prevent workflow stoppage.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {user.ownedResources.map((res) => (
                      <div
                        key={res.id}
                        className="rounded border border-slate-200 p-2.5 bg-slate-50/50 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {res.type}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{res.id}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-xs truncate" title={res.title}>
                          {res.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          Org: {res.companyName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Memberships Preview & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
            {/* Memberships snapshot */}
            <Card className="shadow-xs h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Building2Icon className="size-4 text-blue-600" />
                    <span>Company Memberships ({user.memberships.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Organizations where this identity holds access.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange("company-access")}
                  className="h-7 text-xs"
                >
                  Manage All Access →
                </Button>
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2">
                {user.memberships.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded border border-slate-100 hover:border-slate-200 bg-slate-50/30"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{m.companyName}</span>
                        {m.role === "owner" && (
                          <Badge tone="warning" className="text-xs px-1 py-0 bg-amber-50 text-amber-700 border-amber-200">
                            Owner
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Scope: {m.clientAccess.scope === "all" ? "All Clients" : `${m.clientAccess.clientIds.length} scoped clients`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CompanyRoleBadge role={m.role} />
                      <MembershipStatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent activity snippet */}
            <Card className="shadow-xs h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ClockIcon className="size-4 text-slate-600" />
                    <span>Recent Activity Feed</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Most recent actions performed by or on this user.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange("activity")}
                  className="h-7 text-xs"
                >
                  Full Activity Log →
                </Button>
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2.5">
                {activities.slice(0, 4).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 py-1 border-b border-slate-100 last:border-b-0">
                    <span className={`size-2 rounded-full mt-1.5 shrink-0 ${act.result === "successful" ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {act.action}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">{act.summary}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{act.companyName || "Global Platform"}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-center py-4 text-slate-400">No recorded activities for this user.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: COMPANY ACCESS (THE MOST IMPORTANT SECTION) */}
        <TabsContent value="company-access" className="space-y-4 outline-hidden">
          {/* Architectural Explanation Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
            <div className="flex items-start gap-3">
              <Building2Icon className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-800">
                  Strict Multi-Tenant Boundary Isolation
                </h4>
                <p className="leading-relaxed">
                  OmniPlatform strictly isolates company boundaries. A user may hold completely different roles (e.g. <em>Owner</em> in Company A,
                  <em>Member</em> in Company B, and <em>Guest</em> in Company C) without cross-contamination.
                  Suspending or modifying a role in one company will <strong>never</strong> affect their standing in any other company.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Toolbar & Add Membership CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Filter by company name, ID, or role..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddMembershipOpen(true)}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <PlusIcon className="size-3.5 mr-1.5" />
              Add to Another Company
            </Button>
          </div>

          {/* Independent Company Membership Cards */}
          <div className="space-y-3">
            {filteredMemberships.map((membership) => {
              const companyOwnedResources = user.ownedResources.filter(
                (r) => r.companyId === membership.companyId,
              );

              return (
                <div
                  key={membership.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {membership.companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {membership.companyName}
                          </h3>
                          <span className="font-mono text-xs text-slate-400">
                            ({membership.companyId})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Joined on {new Date(membership.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CompanyRoleBadge role={membership.role} />
                      <MembershipStatusBadge status={membership.status} />
                    </div>
                  </div>

                  {/* Body Info: Client Scope & Owned Resources */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded border border-slate-100 p-2.5 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 flex items-center gap-2">
                          <FolderIcon className="size-3.5 text-blue-500" />
                          <span>Client Access Scope:</span>
                        </span>
                        <Badge
                          tone={membership.clientAccess.scope === "all" ? "success" : "info"}
                          className={
                            membership.clientAccess.scope === "all"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                              : "bg-purple-50 text-purple-700 border-purple-200 text-xs"
                          }
                        >
                          {membership.clientAccess.scope === "all" ? "All Clients (Unrestricted)" : "Scoped Access"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {membership.clientAccess.scope === "all"
                          ? "User has visibility and execution access across all client workspaces in this company."
                          : `Restricted to ${membership.clientAccess.clientIds.length} designated client workspaces.`}
                      </p>
                    </div>

                    <div className="rounded border border-slate-100 p-2.5 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 flex items-center gap-2">
                          <FolderIcon className="size-3.5 text-indigo-500" />
                          <span>Owned Company Workflows:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {companyOwnedResources.length} items
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {companyOwnedResources.length > 0
                          ? companyOwnedResources.map((r) => r.title).join(", ")
                          : "No active workflows or automations authored in this organization."}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar for this specific company */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveMembership(membership);
                          setIsChangeRoleOpen(true);
                        }}
                        className="h-7 text-xs"
                      >
                        <ArrowRightLeftIcon className="size-3 mr-1 text-slate-500" />
                        Change Role
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveMembership(membership);
                          setIsClientAccessOpen(true);
                        }}
                        className="h-7 text-xs"
                      >
                        <FolderIcon className="size-3 mr-1 text-slate-500" />
                        Manage Client Access
                      </Button>

                      {membership.role === "owner" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveMembership(membership);
                            setIsTransferOwnershipOpen(true);
                          }}
                          className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          <UserCheckIcon className="size-3 mr-1" />
                          Transfer Ownership
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {membership.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveMembership(membership);
                            setIsSuspendMembershipOpen(true);
                          }}
                          className="h-7 text-xs text-amber-600 hover:bg-amber-50"
                        >
                          <BanIcon className="size-3 mr-1" />
                          Suspend Membership
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => mutations.reactivateMembership.mutate(membership.id)}
                          className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckIcon className="size-3 mr-1" />
                          Reactivate Access
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveMembership(membership);
                          setIsRemoveMembershipOpen(true);
                        }}
                        className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 hover:border-rose-300"
                      >
                        <Trash2Icon className="size-3 mr-1" />
                        Remove Membership
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMemberships.length === 0 && (
              <div className="p-8 text-center rounded-lg border border-dashed border-slate-200 space-y-2">
                <Building2Icon className="size-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  No company memberships match your criteria.
                </p>
                <p className="text-xs text-slate-400">
                  Try adjusting your search or add this user to an organization.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: SECURITY & SESSIONS */}
        <TabsContent value="security" className="space-y-4 outline-hidden">
          {/* Security Summary Banner */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4.5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Security Governance & Session State
                </h3>
                <SecurityPostureBadge posture={user.securityPosture} />
              </div>
              <p className="text-xs text-slate-500">
                Administrative policies, active web/mobile sessions, and authentication security logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRequire2faOpen(true)}
                className="h-8 text-xs"
              >
                <KeyRoundIcon className="size-3.5 mr-1 text-slate-500" />
                {user.security.twoFactorRequired ? "Relax 2FA Requirement" : "Enforce Mandatory 2FA"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetPasswordOpen(true)}
                className="h-8 text-xs text-amber-700 hover:bg-amber-50"
              >
                <MailIcon className="size-3.5 mr-1" />
                Demand Password Reset
              </Button>

              {user.security.isLocked && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsUnlockAccountOpen(true)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UnlockIcon className="size-3.5 mr-1" />
                  Unlock Account
                </Button>
              )}
            </div>
          </div>

          {/* Active Sessions List */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LaptopIcon className="size-4 text-blue-600" />
                  <span>Active Sessions & Logged-In Devices ({user.activeSessionsCount})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active authentication tokens issued for this user identity.
                </CardDescription>
              </div>

              {user.activeSessionsCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSessionToRevoke(undefined);
                    setIsRevokeSessionsOpen(true);
                  }}
                  className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <LogOutIcon className="size-3 mr-1" />
                  Revoke All Sessions
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-3 text-xs p-0">
              {user.security.sessions.length === 0 ? (
                <p className="p-6 text-center text-slate-400">No active login sessions recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {user.security.sessions.map((sess: UserSession) => (
                    <div
                      key={sess.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-slate-100 text-slate-600 mt-0.5">
                          {sess.device.toLowerCase().includes("mobile") || sess.device.toLowerCase().includes("phone") ? (
                            <SmartphoneIcon className="size-4" />
                          ) : (
                            <LaptopIcon className="size-4" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {sess.device} • {sess.browser}
                            </span>
                            {sess.current && (
                              <Badge tone="success" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                Current Session
                              </Badge>
                            )}
                            {sess.status === "revoked" && (
                              <Badge tone="neutral" className="bg-slate-100 text-slate-500 text-xs">
                                Revoked
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                            <span>IP: <code className="font-mono text-slate-600">{sess.ip}</code></span>
                            <span>•</span>
                            <span>Location: {sess.location}</span>
                            <span>•</span>
                            <span>Last Active: {new Date(sess.lastActiveAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {sess.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSessionToRevoke(sess.id);
                            setIsRevokeSessionsOpen(true);
                          }}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 self-end sm:self-center"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Security Audit Log */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldAlertIcon className="size-4 text-amber-600" />
                <span>Security Events Timeline ({userSecurityEvents.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Authentication challenges, password rotations, and session events.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 text-xs p-0">
              {userSecurityEvents.length === 0 ? (
                <p className="p-6 text-center text-slate-400">No abnormal security events recorded for this user.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {userSecurityEvents.map((evt) => (
                    <div key={evt.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-50/50">
                      <span
                        className={`size-2.5 rounded-full mt-1 shrink-0 ${
                          evt.result === "success"
                            ? "bg-emerald-500"
                            : evt.result === "warning"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            {evt.eventType}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600">{evt.summary}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                          <span>IP: {evt.ip || "N/A"}</span>
                          <span>•</span>
                          <span>Device: {evt.device || "N/A"}</span>
                          <span>•</span>
                          <span>Actor: {evt.actor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ACTIVITY LOG */}
        <TabsContent value="activity" className="space-y-4 outline-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Search actions, workflows, organizations..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportUserActivity}
              className="h-8 text-xs w-full sm:w-auto"
            >
              <DownloadIcon className="size-3.5 mr-1 text-slate-500" />
              Export User Activity (CSV)
            </Button>
          </div>

          <Card className="shadow-xs">
            <CardContent className="p-0 text-xs">
              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <ClockIcon className="size-6 mx-auto text-slate-300" />
                  <p className="font-medium text-slate-600">No activity logs found</p>
                  <p className="text-xs">No matching events recorded for this search query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Organization</th>
                        <th className="py-2.5 px-3">Entity / Target</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-xs">
                            {new Date(act.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800">
                              {act.action}
                            </span>
                            <p className="text-xs text-slate-400 line-clamp-1">{act.summary}</p>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {act.companyName || <span className="text-slate-400">Global Platform</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {act.entity || "—"}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Badge
                              tone={act.result === "successful" ? "success" : "danger"}
                              className={
                                act.result === "successful"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                                  : "bg-rose-50 text-rose-700 border-rose-200 text-xs"
                              }
                            >
                              {act.result}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-xs whitespace-nowrap">
                            {act.actor.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 5. Modals & Dialogs wired to user state */}
      <AddMembershipModal
        user={user}
        open={isAddMembershipOpen}
        onOpenChange={setIsAddMembershipOpen}
        companyOptions={companyOptions}
      />

      <EditUserIdentityDrawer
        user={user}
        open={isEditIdentityOpen}
        onOpenChange={setIsEditIdentityOpen}
      />

      <SuspendGlobalAccountModal
        user={user}
        open={isSuspendGlobalOpen}
        onOpenChange={setIsSuspendGlobalOpen}
      />

      <Require2faDialog
        user={user}
        open={isRequire2faOpen}
        onOpenChange={setIsRequire2faOpen}
      />

      <RequirePasswordResetDialog
        user={user}
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
      />

      <UnlockAccountDialog
        user={user}
        open={isUnlockAccountOpen}
        onOpenChange={setIsUnlockAccountOpen}
      />

      <RevokeSessionsDialog
        user={user}
        sessionId={selectedSessionToRevoke}
        open={isRevokeSessionsOpen}
        onOpenChange={setIsRevokeSessionsOpen}
      />

      {/* Membership Scoped Modals */}
      <ChangeRoleModal
        membership={activeMembership}
        userName={user.identity.name}
        open={isChangeRoleOpen}
        onOpenChange={setIsChangeRoleOpen}
      />

      <ManageClientAccessModal
        membership={activeMembership}
        userName={user.identity.name}
        open={isClientAccessOpen}
        onOpenChange={setIsClientAccessOpen}
      />

      <SuspendMembershipModal
        membership={activeMembership}
        userName={user.identity.name}
        open={isSuspendMembershipOpen}
        onOpenChange={setIsSuspendMembershipOpen}
        onSoleOwnerBlocked={() => {
          setIsSuspendMembershipOpen(false);
          setIsTransferOwnershipOpen(true);
        }}
      />

      <TransferOwnershipModal
        membership={activeMembership}
        currentOwnerName={user.identity.name}
        open={isTransferOwnershipOpen}
        onOpenChange={setIsTransferOwnershipOpen}
      />

      <RemoveMembershipModal
        membership={activeMembership}
        userName={user.identity.name}
        ownedResources={user.ownedResources}
        open={isRemoveMembershipOpen}
        onOpenChange={setIsRemoveMembershipOpen}
        onSoleOwnerBlocked={() => {
          setIsRemoveMembershipOpen(false);
          setIsTransferOwnershipOpen(true);
        }}
      />
    </div>
  );
}
