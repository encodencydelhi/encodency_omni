/**
 * EnCodency OmniPlatform - Financial Semantic Status Badges
 * Compact, modern badges with rounded-sm and minimum 12px text size.
 */

import { cn } from "@/lib/utils/cn";
import type {
  InvoiceDocumentState,
  InvoiceCollectionState,
  InvoiceTimingState,
  PaymentAttemptStatus,
  PaymentSettlementStatus,
  PaymentAllocationStatus,
  CreditNoteStatus,
  RefundStatus,
  ReconciliationStatus,
} from "../data/types";

interface BadgeProps {
  className?: string;
}

export function DocumentStateBadge({ state, className }: { state: InvoiceDocumentState } & BadgeProps) {
  const styles: Record<InvoiceDocumentState, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    issued: "bg-blue-50 text-blue-700 border-blue-200",
    void: "bg-neutral-100 text-neutral-500 border-neutral-300 line-through",
  };

  const labels: Record<InvoiceDocumentState, string> = {
    draft: "Draft",
    issued: "Issued",
    void: "Void",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight",
        styles[state] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {labels[state] ?? state}
    </span>
  );
}

export function CollectionStateBadge({ state, className }: { state: InvoiceCollectionState } & BadgeProps) {
  const styles: Record<InvoiceCollectionState, string> = {
    unpaid: "bg-amber-50 text-amber-700 border-amber-200",
    partially_paid: "bg-indigo-50 text-indigo-700 border-indigo-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const labels: Record<InvoiceCollectionState, string> = {
    unpaid: "Unpaid",
    partially_paid: "Partially Paid",
    paid: "Paid",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight",
        styles[state] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {labels[state] ?? state}
    </span>
  );
}

export function TimingStateBadge({ state, className }: { state: InvoiceTimingState } & BadgeProps) {
  if (state === "not_due") return null;

  const styles: Record<InvoiceTimingState, string> = {
    not_due: "hidden",
    due_soon: "bg-orange-50 text-orange-700 border-orange-200",
    overdue: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
  };

  const labels: Record<InvoiceTimingState, string> = {
    not_due: "",
    due_soon: "Due Soon",
    overdue: "Overdue",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight",
        styles[state],
        className,
      )}
    >
      {labels[state]}
    </span>
  );
}

export function PaymentAttemptBadge({ status, className }: { status: PaymentAttemptStatus } & BadgeProps) {
  const styles: Record<PaymentAttemptStatus, string> = {
    initiated: "bg-slate-100 text-slate-700 border-slate-300",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-300",
  };

  const labels: Record<PaymentAttemptStatus, string> = {
    initiated: "Initiated",
    pending: "Pending",
    succeeded: "Succeeded",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight capitalize",
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function SettlementBadge({ status, className }: { status: PaymentSettlementStatus } & BadgeProps) {
  const styles: Record<PaymentSettlementStatus, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    settled: "bg-teal-50 text-teal-700 border-teal-200",
    on_hold: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight capitalize",
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AllocationBadge({ status, className }: { status: PaymentAllocationStatus } & BadgeProps) {
  const styles: Record<PaymentAllocationStatus, string> = {
    unallocated: "bg-amber-50 text-amber-700 border-amber-200",
    partially_allocated: "bg-blue-50 text-blue-700 border-blue-200",
    fully_allocated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const labels: Record<PaymentAllocationStatus, string> = {
    unallocated: "Unallocated",
    partially_allocated: "Partially Allocated",
    fully_allocated: "Fully Allocated",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight",
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function CreditNoteStatusBadge({ status, className }: { status: CreditNoteStatus } & BadgeProps) {
  const styles: Record<CreditNoteStatus, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
    issued: "bg-emerald-50 text-emerald-700 border-emerald-200",
    void: "bg-neutral-100 text-neutral-500 border-neutral-300 line-through",
  };

  const labels: Record<CreditNoteStatus, string> = {
    draft: "Draft",
    pending_approval: "Pending Approval",
    issued: "Issued",
    void: "Void",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight",
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function RefundStatusBadge({ status, className }: { status: RefundStatus } & BadgeProps) {
  const styles: Record<RefundStatus, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-purple-50 text-purple-700 border-purple-200",
    succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<RefundStatus, string> = {
    draft: "Draft",
    pending_approval: "Pending Approval",
    approved: "Approved",
    processing: "Processing",
    succeeded: "Succeeded",
    failed: "Failed",
    rejected: "Rejected",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight",
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function ReconciliationStatusBadge({ status, className }: { status: ReconciliationStatus } & BadgeProps) {
  const styles: Record<ReconciliationStatus, string> = {
    open: "bg-rose-50 text-rose-700 border-rose-200",
    investigating: "bg-amber-50 text-amber-700 border-amber-200",
    awaiting_evidence: "bg-blue-50 text-blue-700 border-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-xs font-medium tracking-tight capitalize",
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-300",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
