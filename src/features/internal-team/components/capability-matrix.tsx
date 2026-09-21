"use client";

import { Badge } from "@/components/ui/badge";
import { INTERNAL_ROLE, ROLE_PERMISSIONS, type InternalRole, type Permission } from "@/types/domain/team";

const MODULES = [
  { label: "Dashboard", permissions: ["companies:read"] },
  { label: "Companies", permissions: ["companies:read", "companies:write"] },
  { label: "Users", permissions: ["users:read", "users:write"] },
  { label: "Clients", permissions: ["Clients:read"] },
  { label: "Internal Team", permissions: ["users:read", "users:write"] },
  { label: "Plans & Subscriptions", permissions: ["plans:write", "billing:read"] },
  { label: "Billing & Payments", permissions: ["billing:read", "billing:write"] },
  { label: "Usage & Limits", permissions: ["companies:read"] },
  { label: "Integrations", permissions: ["platform:read", "platform:write"] },
  { label: "System Health", permissions: ["platform:read"] },
  { label: "Jobs & Queues", permissions: ["platform:read"] },
  { label: "API Monitoring", permissions: ["platform:read"] },
  { label: "Webhooks", permissions: ["platform:read"] },
  { label: "Feature Flags", permissions: ["flags:write"] },
  { label: "Audit Logs", permissions: ["audit:read"] },
  { label: "Support & Tickets", permissions: ["support:write"] },
  { label: "Notifications", permissions: ["companies:read"] },
  { label: "Global Settings", permissions: ["settings:write"] },
];

const SENSITIVE_PERMISSIONS: Permission[] = ["settings:write", "flags:write", "users:write", "billing:write", "platform:write"];

const roles: InternalRole[] = ["super_admin", "technical_admin", "support", "finance", "operations"];

export function CapabilityMatrix() {
  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead className="bg-slate-50 border-b border-border sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px] min-w-[160px]">Module</th>
              {roles.map((r) => (
                <th key={r} className="text-center px-2 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px] min-w-[100px]">
                  {INTERNAL_ROLE[r].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {MODULES.map((mod) => (
              <tr key={mod.label} className="hover:bg-slate-50/50">
                <td className="px-3 py-2 font-medium text-slate-700">{mod.label}</td>
                {roles.map((r) => {
                  const perms = ROLE_PERMISSIONS[r];
                  const hasAny = mod.permissions.some((p) => perms.includes(p as Permission));
                  const hasAll = mod.permissions.every((p) => perms.includes(p as Permission));
                  const isSensitive = mod.permissions.some((p) => SENSITIVE_PERMISSIONS.includes(p as Permission));
                  return (
                    <td key={r} className="text-center px-2 py-2">
                      {hasAll ? (
                        <Badge tone={isSensitive ? "warning" : "success"} className="text-2xs">
                          {isSensitive ? "Restricted" : "Full"}
                        </Badge>
                      ) : hasAny ? (
                        <Badge tone="info" className="text-2xs">Partial</Badge>
                      ) : (
                        <Badge tone="neutral" className="text-2xs">None</Badge>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RoleComparison({ roleA, roleB }: { roleA: InternalRole; roleB: InternalRole }) {
  const permsA = ROLE_PERMISSIONS[roleA];
  const permsB = ROLE_PERMISSIONS[roleB];
  const allPerms = Array.from(new Set([...permsA, ...permsB]));
  const addedInB = allPerms.filter((p) => !permsA.includes(p) && permsB.includes(p));
  const removedInB = allPerms.filter((p) => permsA.includes(p) && !permsB.includes(p));

  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Badge tone="info">{INTERNAL_ROLE[roleA].label}</Badge>
        <span className="text-slate-400">vs</span>
        <Badge tone="info">{INTERNAL_ROLE[roleB].label}</Badge>
      </div>
      {addedInB.length > 0 && (
        <div className="p-2 rounded-sm bg-emerald-50 border border-emerald-200">
          <p className="text-[11px] font-semibold text-emerald-700 mb-1">Added in {INTERNAL_ROLE[roleB].label}</p>
          <div className="flex flex-wrap gap-1">{addedInB.map((p) => <Badge key={p} tone="success" className="text-2xs">{p}</Badge>)}</div>
        </div>
      )}
      {removedInB.length > 0 && (
        <div className="p-2 rounded-sm bg-rose-50 border border-rose-200">
          <p className="text-[11px] font-semibold text-rose-700 mb-1">Removed in {INTERNAL_ROLE[roleB].label}</p>
          <div className="flex flex-wrap gap-1">{removedInB.map((p) => <Badge key={p} tone="danger" className="text-2xs">{p}</Badge>)}</div>
        </div>
      )}
      {addedInB.length === 0 && removedInB.length === 0 && (
        <p className="text-xs text-slate-500">These roles have identical capabilities.</p>
      )}
    </div>
  );
}
