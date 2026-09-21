"use client";

import { Building2Icon, MoreHorizontalIcon, UserPlusIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { StaffAssignment, StaffMember } from "../data/types";

interface CompanyCoverage {
  companyId: string;
  companyName: string;
  primaryOwner: StaffMember | null;
  backupOwner: StaffMember | null;
  supportOwner: StaffMember | null;
  status: "complete" | "missing_primary" | "missing_backup" | "staff_inactive";
}

interface CoverageTableProps {
  coverage: CompanyCoverage[];
  staff: StaffMember[];
  isLoading?: boolean;
  onAssignOwner?: (companyId: string, companyName: string) => void;
}

export function CoverageTable({ coverage, staff, isLoading, onAssignOwner }: CoverageTableProps) {
  const getStatusBadge = (status: CompanyCoverage["status"]) => {
    switch (status) {
      case "complete": return <Badge tone="success" className="text-2xs">Complete</Badge>;
      case "missing_primary": return <Badge tone="warning" className="text-2xs">Missing Primary</Badge>;
      case "missing_backup": return <Badge tone="info" className="text-2xs">Missing Backup</Badge>;
      case "staff_inactive": return <Badge tone="danger" className="text-2xs">Staff Inactive</Badge>;
    }
  };

  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs w-full min-w-0 overflow-hidden">
      <div className="w-full overflow-x-auto min-w-0">
        <Table className="w-full min-w-[700px]">
          <TableHeader className="bg-slate-50 border-b border-border text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3">Company</TableHead>
              <TableHead className="px-3">Primary Owner</TableHead>
              <TableHead className="px-3">Backup Owner</TableHead>
              <TableHead className="px-3">Support Owner</TableHead>
              <TableHead className="px-3">Coverage</TableHead>
              <TableHead className="w-12 text-right pr-3"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-11">
                  <TableCell colSpan={6} className="py-2 px-3"><div className="h-4 bg-slate-100 rounded w-3/4" /></TableCell>
                </TableRow>
              ))
            ) : coverage.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">No company coverage data.</TableCell>
              </TableRow>
            ) : (
              coverage.map((c) => (
                <TableRow key={c.companyId} className="text-xs hover:bg-slate-50/80">
                  <TableCell className="py-2 font-medium text-slate-900">{c.companyName}</TableCell>
                  <TableCell className="py-2">
                    {c.primaryOwner ? (
                      <span className="text-slate-700">{c.primaryOwner.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {c.backupOwner ? (
                      <span className="text-slate-700">{c.backupOwner.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {c.supportOwner ? (
                      <span className="text-slate-700">{c.supportOwner.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">{getStatusBadge(c.status)}</TableCell>
                  <TableCell className="py-2 text-right pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="size-7 rounded-sm p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
                          <MoreHorizontalIcon className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel className="font-semibold text-slate-700">{c.companyName}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAssignOwner?.(c.companyId, c.companyName)} className="gap-2 cursor-pointer text-blue-600 font-medium">
                          <UserPlusIcon className="size-3.5" /> Assign Owner
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
