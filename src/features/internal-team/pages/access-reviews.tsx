"use client";

import { useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffCapabilitiesProvider } from "../data/capability-provider";
import { useAccessReviews, useAccessReviewKpis, useTeamMutations } from "../data/hooks";
import { StaffNav } from "../components/staff-nav";
import { AccessReviewTable } from "../components/access-review-table";
import { AccessReviewCompleteDialog } from "../components/access-review-dialog";
import type { StaffAccessReview, CompleteAccessReviewInput } from "../data/types";

function AccessReviewsContent() {
  const mutations = useTeamMutations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [completeReview, setCompleteReview] = useState<StaffAccessReview | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);

  const { data: reviews, isLoading } = useAccessReviews({ search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter });
  const { data: kpis } = useAccessReviewKpis();

  const handleComplete = (input: CompleteAccessReviewInput) => {
    mutations.completeAccessReview.mutate(input);
    setCompleteOpen(false);
    setCompleteReview(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardCheckIcon className="size-5 text-blue-600" />
            <span>Access Reviews</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Periodic access review workspace for platform staff governance.</p>
        </div>
      </div>

      <StaffNav />

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "DUE", value: kpis.reviewsDue, color: "text-amber-700" },
            { label: "OVERDUE", value: kpis.overdueReviews, color: kpis.overdueReviews > 0 ? "text-rose-700" : "text-slate-600" },
            { label: "PRIVILEGED", value: kpis.privilegedStaff, color: "text-violet-700" },
            { label: "MFA ACTION", value: kpis.mfaActionRequired, color: "text-amber-700" },
            { label: "SUSPENDED+ASSIGNED", value: kpis.suspendedWithAssignments, color: kpis.suspendedWithAssignments > 0 ? "text-rose-700" : "text-slate-600" },
            { label: "TEMP EXPIRING", value: kpis.tempAccessExpiring, color: "text-slate-600" },
          ].map((k) => (
            <div key={k.label} className="rounded-sm border border-border bg-white p-3 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Input placeholder="Search by staff name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs bg-white" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="due">Due</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="not_scheduled">Not Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <AccessReviewTable
        reviews={reviews ?? []}
        isLoading={isLoading}
        onCompleteReview={(review) => { setCompleteReview(review); setCompleteOpen(true); }}
      />

      <AccessReviewCompleteDialog
        review={completeReview}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        onConfirm={handleComplete}
        isPending={mutations.completeAccessReview.isPending}
      />
    </div>
  );
}

export function AccessReviewsPage() {
  return (
    <StaffCapabilitiesProvider>
      <AccessReviewsContent />
    </StaffCapabilitiesProvider>
  );
}
