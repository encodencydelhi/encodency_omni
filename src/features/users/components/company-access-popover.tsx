import { Building2Icon, ExternalLinkIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ROUTES } from "@/config/routes";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import { MembershipStatusBadge, RoleBadge } from "./status-badges";
import type { CompanyMembership } from "../data/types";

interface CompanyAccessPopoverProps {
  memberships: CompanyMembership[];
  userId: string;
  className?: string;
}

export function CompanyAccessPopover({
  memberships,
  userId,
}: CompanyAccessPopoverProps) {
  const [open, setOpen] = useState(false);

  if (memberships.length === 0) {
    return (
      <span className="text-xs text-slate-400 italic">No companies</span>
    );
  }

  const primary = memberships[0]!;
  const remaining = memberships.length - 1;

  const triggerLabel =
    remaining > 0 ? (
      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors">
        <span className="truncate max-w-[130px]">{primary?.companyName}</span>
        <span className="rounded bg-slate-100 px-1 py-0.2 text-xs font-semibold text-slate-600">
          +{remaining}
        </span>
      </span>
    ) : (
      <span className="text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors truncate max-w-[170px] inline-block">
        {primary?.companyName}
      </span>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="text-left cursor-pointer hover:underline focus:outline-hidden"
        >
          {triggerLabel}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-84 p-3 shadow-lg border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Building2Icon className="size-3.5 text-slate-500" />
            <span>Company Memberships ({memberships.length})</span>
          </div>
          <Link
            href={`${ROUTES.superAdmin.user(userId)}?tab=company-access`}
            className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-2"
          >
            <span>Manage</span>
            <ExternalLinkIcon className="size-2.5" />
          </Link>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 rounded border border-slate-100 p-2 bg-slate-50 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={ROUTES.superAdmin.company(m.companyId)}
                  className="font-medium text-slate-900 hover:text-blue-600 hover:underline truncate"
                >
                  {m.companyName}
                </Link>
                <MembershipStatusBadge status={m.status} />
              </div>

              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="flex items-center gap-2">
                  <RoleBadge role={m.role} isOwner={m.isOwner} />
                </div>
                <span className="text-xs text-slate-500">
                  {m.clientAccess.clients.length} {m.clientAccess.clients.length === 1 ? "client" : "clients"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Distinct Access column cell rendering roles without combining into a fake global role. */
export function CompanyRoleAccessCell({
  memberships,
  userId,
}: {
  memberships: CompanyMembership[];
  userId: string;
}) {
  if (memberships.length === 0) {
    return <span className="text-xs text-slate-400 italic">No assigned role</span>;
  }

  const primary = memberships[0]!;
  const extraCount = memberships.length - 1;

  return (
    <Link
      href={`${ROUTES.superAdmin.user(userId)}?tab=company-access`}
      onClick={(e) => e.stopPropagation()}
      className="group block text-left leading-tight py-0.5"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-800 group-hover:text-blue-600 group-hover:underline">
          {primary ? (ORGANISATION_ROLE[primary.role]?.label || primary.role) : ""}
        </span>
        {primary?.isOwner && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200">
            <ShieldCheckIcon className="size-2.5" />
            Owner
          </span>
        )}
      </div>

      <div className="text-xs text-slate-400 truncate">
        <span>{primary?.companyName}</span>
        {extraCount > 0 && (
          <span className="ml-1 text-slate-500 font-medium group-hover:text-blue-500">
            +{extraCount} other role{extraCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
