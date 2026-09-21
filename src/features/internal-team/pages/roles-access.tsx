"use client";

import { useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { INTERNAL_ROLE, type InternalRole } from "@/types/domain/team";
import { StaffCapabilitiesProvider } from "../data/capability-provider";
import { StaffNav } from "../components/staff-nav";
import { CapabilityMatrix, RoleComparison } from "../components/capability-matrix";

function RolesContent() {
  const [compareA, setCompareA] = useState<InternalRole>("super_admin");
  const [compareB, setCompareB] = useState<InternalRole>("support");

  const roles = Object.keys(INTERNAL_ROLE) as InternalRole[];
  const totalRoles = roles.length;
  const protectedRoles = 1; // super_admin
  const privilegedCount = roles.filter((r) => r === "super_admin" || r === "technical_admin").length;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-blue-600" />
            <span>Roles & Access</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Platform staff role visibility, capability matrix and access governance.</p>
        </div>
      </div>

      <StaffNav />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total Roles", value: totalRoles },
          { label: "Protected Roles", value: protectedRoles },
          { label: "Privileged Access", value: privilegedCount },
          { label: "System Defined", value: totalRoles },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-border bg-white p-3 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.label}</p>
            <p className="text-xl font-extrabold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Role Catalogue */}
      <div className="rounded-sm border border-border bg-white shadow-2xs p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Platform Role Catalogue</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {roles.map((r) => {
            const meta = INTERNAL_ROLE[r];
            return (
              <div key={r} className="p-3 rounded-sm border border-border hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-900">{meta.label}</span>
                  {r === "super_admin" && <Badge tone="warning" className="text-2xs">Protected</Badge>}
                </div>
                <p className="text-xs text-slate-500 mb-2">{meta.description}</p>
                <Badge tone={meta.tone as "brand" | "info" | "neutral"} className="text-2xs">{meta.label}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capability Matrix */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Capability Matrix</h3>
        <CapabilityMatrix />
      </div>

      {/* Role Comparison */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Role Comparison</h3>
        <div className="flex items-center gap-2 mb-2">
          <Select value={compareA} onValueChange={(v) => setCompareA(v as InternalRole)}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map((r) => <SelectItem key={r} value={r}>{INTERNAL_ROLE[r].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-slate-400 text-xs">vs</span>
          <Select value={compareB} onValueChange={(v) => setCompareB(v as InternalRole)}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map((r) => <SelectItem key={r} value={r}>{INTERNAL_ROLE[r].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <RoleComparison roleA={compareA} roleB={compareB} />
      </div>
    </div>
  );
}

export function RolesAccessPage() {
  return (
    <StaffCapabilitiesProvider>
      <RolesContent />
    </StaffCapabilitiesProvider>
  );
}
