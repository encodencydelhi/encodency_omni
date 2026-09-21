/**
 * EnCodency OmniPlatform - Reconciliation & Issues Workspace
 * Operational exception queue identifying discrepancies between provider statements and internal ledgers.
 */

"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../data/money";
import { exportToCsv } from "../data/export";
import { ReconciliationStatusBadge } from "../components/status-badges";
import { BillingKpiCard } from "../components/billing-kpi-card";
import { ExceptionDetailDrawer } from "../components/reconciliation/exception-detail-drawer";
import { useReconciliation } from "../data/hooks";
import type { ReconciliationException } from "../data/types";
import {
  ScaleIcon,
  SearchIcon,
  DownloadIcon,
  AlertCircleIcon,
  ClockIcon,
  CheckCircle2Icon,
  SplitIcon,
  ShieldAlertIcon,
} from "lucide-react";

export function ReconciliationPage() {
  const { exceptions } = useReconciliation();

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [selectedException, setSelectedException] = useState<ReconciliationException | null>(null);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter((exp) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          exp.financialReference.toLowerCase().includes(q) ||
          exp.companyName.toLowerCase().includes(q) ||
          exp.issueType.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== "ALL" && exp.status !== statusFilter) return false;
      if (severityFilter !== "ALL" && exp.severity !== severityFilter) return false;
      return true;
    });
  }, [exceptions, search, statusFilter, severityFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const open = exceptions.filter((e) => e.status === "open");
    const investigating = exceptions.filter((e) => e.status === "investigating");
    const mismatches = exceptions.filter((e) => e.issueType === "amount_mismatch");
    const unallocated = exceptions.filter((e) => e.issueType === "unallocated_settled_funds");
    const critical = exceptions.filter((e) => e.severity === "high" || e.severity === "critical");
    const resolved = exceptions.filter((e) => e.status === "resolved");

    return {
      openCount: open.length,
      investigatingCount: investigating.length,
      mismatchesCount: mismatches.length,
      unallocatedCount: unallocated.length,
      criticalCount: critical.length,
      resolvedCount: resolved.length,
    };
  }, [exceptions]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Exception ID",
      "Issue Type",
      "Company",
      "Reference",
      "Expected Amount",
      "Recorded Amount",
      "Difference",
      "Severity",
      "Status",
      "Detected Date",
    ];
    const rows = filteredExceptions.map((e) => [
      e.id,
      e.issueType,
      e.companyName,
      e.financialReference,
      formatMoney(e.expectedAmountMinor, e.currency),
      formatMoney(e.recordedAmountMinor, e.currency),
      formatMoney(e.differenceMinor, e.currency),
      e.severity,
      e.status,
      formatDate(e.detectedAt),
    ]);
    exportToCsv("reconciliation-exceptions-export", headers, rows);
  };

  const severityBadges: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 border-slate-300",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Reconciliation & Issues</h1>
            <span className="rounded-sm bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
              Operational Exception Queue
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational mismatch tracking between external gateway webhooks, bank deposits and internal receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 rounded-sm text-xs border-border gap-1.5"
          >
            <DownloadIcon className="size-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (gap-2, rounded-sm, equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-stretch">
        <BillingKpiCard
          label="Open Exceptions"
          value={kpis.openCount}
          hint="Uninvestigated items"
          badge="Action Needed"
          badgeTone={kpis.openCount > 0 ? "danger" : "neutral"}
          icon={AlertCircleIcon}
        />
        <BillingKpiCard
          label="Investigating"
          value={kpis.investigatingCount}
          hint="Under staff review"
          badge="In Progress"
          badgeTone="warning"
          icon={ClockIcon}
        />
        <BillingKpiCard
          label="Amount Mismatches"
          value={kpis.mismatchesCount}
          hint="Lump sum discrepancies"
          badge="Variance"
          badgeTone="info"
          icon={ScaleIcon}
        />
        <BillingKpiCard
          label="Unallocated Funds"
          value={kpis.unallocatedCount}
          hint="Settled unassigned cash"
          badge="Unallocated"
          badgeTone="info"
          icon={SplitIcon}
        />
        <BillingKpiCard
          label="High Severity"
          value={kpis.criticalCount}
          hint="Escalated items"
          badge="Escalated"
          badgeTone={kpis.criticalCount > 0 ? "danger" : "neutral"}
          icon={ShieldAlertIcon}
        />
        <BillingKpiCard
          label="Resolved Exceptions"
          value={kpis.resolvedCount}
          hint="Closed investigations"
          badge="Closed"
          badgeTone="success"
          icon={CheckCircle2Icon}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-sm border border-border p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, company, issue type..."
            className="h-8 pl-8 text-xs rounded-sm bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="open" className="text-xs">Open</SelectItem>
              <SelectItem value="investigating" className="text-xs">Investigating</SelectItem>
              <SelectItem value="awaiting_evidence" className="text-xs">Awaiting Evidence</SelectItem>
              <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-8 w-32 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="ALL" className="text-xs">All Severities</SelectItem>
              <SelectItem value="low" className="text-xs">Low</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="high" className="text-xs">High</SelectItem>
              <SelectItem value="critical" className="text-xs">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
              <tr>
                <th className="py-2 px-3">Issue Type</th>
                <th className="py-2 px-3">Company</th>
                <th className="py-2 px-3">Financial Reference</th>
                <th className="py-2 px-3 text-right">Expected</th>
                <th className="py-2 px-3 text-right">Recorded</th>
                <th className="py-2 px-3 text-right">Difference</th>
                <th className="py-2 px-3 text-center">Severity</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3">Detected Date</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    No reconciliation exceptions found matching query.
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedException(exp)}
                  >
                    <td className="py-2 px-3 font-medium capitalize text-foreground">
                      {exp.issueType.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-3 font-semibold text-foreground">
                      {exp.companyName}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-foreground">
                      {exp.financialReference}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {formatMoney(exp.expectedAmountMinor, exp.currency)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {formatMoney(exp.recordedAmountMinor, exp.currency)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">
                      {exp.differenceMinor > 0 ? formatMoney(exp.differenceMinor, exp.currency) : "-"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded-sm border text-xs capitalize ${severityBadges[exp.severity]}`}>
                        {exp.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <ReconciliationStatusBadge status={exp.status} />
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(exp.detectedAt)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedException(exp);
                        }}
                        className="h-6 text-[11px] rounded-sm px-2 border-border"
                      >
                        Investigate
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <ExceptionDetailDrawer
        exception={selectedException}
        isOpen={Boolean(selectedException)}
        onClose={() => setSelectedException(null)}
      />
    </div>
  );
}
