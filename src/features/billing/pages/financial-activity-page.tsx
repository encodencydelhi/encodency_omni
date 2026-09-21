/**
 * EnCodency OmniPlatform - Financial Activity Page
 * Platform-wide immutable audit log of billing events, allocations, adjustments and reviews.
 */

"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils/format";
import { exportToCsv } from "../data/export";
import { useFinancialActivity } from "../data/hooks";
import {
  SearchIcon,
  DownloadIcon,
} from "lucide-react";

export function FinancialActivityPage() {
  const { activities } = useFinancialActivity();

  const [search, setSearch] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          act.companyName.toLowerCase().includes(q) ||
          act.reference.toLowerCase().includes(q) ||
          act.actor.toLowerCase().includes(q) ||
          act.result.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (eventTypeFilter !== "ALL" && act.eventType !== eventTypeFilter) {
        return false;
      }
      return true;
    });
  }, [activities, search, eventTypeFilter]);

  const handleExportCsv = () => {
    const headers = ["Timestamp", "Actor", "Company", "Event Type", "Reference", "Result"];
    const rows = filteredActivities.map((a) => [
      formatDateTime(a.timestamp),
      a.actor,
      a.companyName,
      a.eventType,
      a.reference,
      a.result,
    ]);
    exportToCsv("financial-activity-export", headers, rows);
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border bg-card px-4 py-3 rounded-sm shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Financial Activity</h1>
            <span className="rounded-sm bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
              Platform Audit Stream
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable telemetry of invoice modifications, payment allocations, credit ledger applications and approvals.
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

      {/* Filters Bar */}
      <div className="bg-card rounded-sm border border-border p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, reference, actor..."
            className="h-8 pl-8 text-xs rounded-sm bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="h-8 w-48 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="ALL" className="text-xs">All Event Types</SelectItem>
              <SelectItem value="invoice_draft_created" className="text-xs">Draft Invoice Created</SelectItem>
              <SelectItem value="invoice_issued" className="text-xs">Invoice Issued</SelectItem>
              <SelectItem value="invoice_voided" className="text-xs">Invoice Voided</SelectItem>
              <SelectItem value="payment_recorded" className="text-xs">Payment Recorded</SelectItem>
              <SelectItem value="payment_allocated" className="text-xs">Payment Allocated</SelectItem>
              <SelectItem value="credit_note_drafted" className="text-xs">Credit Note Drafted</SelectItem>
              <SelectItem value="credit_note_approved" className="text-xs">Credit Note Approved</SelectItem>
              <SelectItem value="credit_applied" className="text-xs">Account Credit Applied</SelectItem>
              <SelectItem value="refund_requested" className="text-xs">Refund Requested</SelectItem>
              <SelectItem value="reconciliation_reviewed" className="text-xs">Reconciliation Reviewed</SelectItem>
              <SelectItem value="billing_account_updated" className="text-xs">Billing Account Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-card rounded-sm border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Actor / Origin</th>
                <th className="py-2 px-3">Company</th>
                <th className="py-2 px-3">Event Type</th>
                <th className="py-2 px-3">Reference</th>
                <th className="py-2 px-3">Action Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    No financial activity entries match search criteria.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(act.timestamp)}
                    </td>
                    <td className="py-2 px-3 font-medium text-foreground">
                      {act.actor}
                    </td>
                    <td className="py-2 px-3 font-semibold text-foreground">
                      {act.companyName}
                    </td>
                    <td className="py-2 px-3 capitalize text-muted-foreground">
                      {act.eventType.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-foreground">
                      {act.reference}
                    </td>
                    <td className="py-2 px-3 text-slate-800">
                      {act.result}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
