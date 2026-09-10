import type { EntityRef, StatusRegistry, TrendPoint } from "@/types/common";
import type { PaymentStatus } from "./subscription";

export const TRANSACTION_TYPE = {
  subscription: { label: "Subscription", tone: "neutral" },
  overage: { label: "Overage", tone: "info" },
  addon: { label: "Add-on", tone: "neutral" },
  refund: { label: "Refund", tone: "warning" },
} as const satisfies StatusRegistry<string>;

export type TransactionType = keyof typeof TRANSACTION_TYPE;

export interface Transaction {
  id: string;
  reference: string;
  company: EntityRef;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  failureReason: string | null;
  invoiceNumber: string | null;
  createdAt: string;
}

export interface TransactionFilters {
  status: PaymentStatus;
  type: TransactionType;
  companyId: string;
}

export type TransactionSortField = "createdAt" | "amountMinor" | "company" | "status";

export const INVOICE_STATUS = {
  paid: { label: "Paid", tone: "success" },
  open: { label: "Open", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  void: { label: "Void", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type InvoiceStatus = keyof typeof INVOICE_STATUS;

export interface Invoice {
  id: string;
  number: string;
  company: EntityRef;
  status: InvoiceStatus;
  amountMinor: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
}

export interface RevenueSummary {
  mrrMinor: number;
  mrrChangePercent: number;
  arrMinor: number;
  currency: string;
  collectedThisMonthMinor: number;
  outstandingMinor: number;
  failedPaymentsCount: number;
  failedPaymentsMinor: number;
  refundedThisMonthMinor: number;
  averageRevenuePerCompanyMinor: number;
  revenueTrend: TrendPoint[];
  revenueByPlan: Array<{ planName: string; amountMinor: number; companies: number }>;
}
