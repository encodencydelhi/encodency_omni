/**
 * EnCodency OmniPlatform - Super Admin Billing & Payments Data Types
 * Enterprise-grade financial contracts, lifecycle states and multi-currency domain models.
 */

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type InvoiceDocumentState = "draft" | "issued" | "void";
export type InvoiceCollectionState = "unpaid" | "partially_paid" | "paid";
export type InvoiceTimingState = "not_due" | "due_soon" | "overdue";
export type InvoiceType = "subscription" | "overage" | "addon" | "custom_service";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRatePercent: number;
  totalMinor: number;
}

export interface Invoice {
  id: string;
  number: string;
  companyId: string;
  companyName: string;
  billingAccountId: string;
  subscriptionId: string | null;
  subscriptionName: string | null;
  type: InvoiceType;
  documentState: InvoiceDocumentState;
  collectionState: InvoiceCollectionState;
  timingState: InvoiceTimingState;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  currency: "INR" | "USD" | string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  adjustedReceivableMinor: number;
  allocatedPaymentsMinor: number;
  accountCreditAppliedMinor: number;
  outstandingBalanceMinor: number;
  lineItems: InvoiceLineItem[];
  notes: string | null;
  billingAddress: BillingAddress;
  issuerLegalName: string;
  issuerAddress: BillingAddress;
  issuerTaxId: string;
  clientTaxId?: string;
}

export type PaymentAttemptStatus = "initiated" | "pending" | "succeeded" | "failed" | "cancelled";
export type PaymentSettlementStatus = "pending" | "settled" | "on_hold";
export type PaymentReconciliationStatus = "pending" | "matched" | "mismatch" | "needs_review";
export type PaymentAllocationStatus = "unallocated" | "partially_allocated" | "fully_allocated";

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number;
  allocatedAt: string;
  allocatedBy: string;
}

export interface Payment {
  id: string;
  reference: string;
  companyId: string;
  companyName: string;
  billingAccountId: string;
  provider: "Razorpay" | "Stripe" | "Manual Bank Wire" | "Direct Debit";
  providerReference: string | null;
  method: string;
  currency: "INR" | "USD" | string;
  grossAmountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  attemptStatus: PaymentAttemptStatus;
  settlementStatus: PaymentSettlementStatus;
  reconciliationStatus: PaymentReconciliationStatus;
  allocationStatus: PaymentAllocationStatus;
  allocatedAmountMinor: number;
  unallocatedBalanceMinor: number;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
  allocations: PaymentAllocation[];
}

export type CreditNoteStatus = "draft" | "pending_approval" | "issued" | "void";
export type CreditNoteDisposition = "retain_as_account_credit" | "direct_refund_pending" | "balance_adjustment";

export interface CreditNote {
  id: string;
  number: string;
  companyId: string;
  companyName: string;
  billingAccountId: string;
  invoiceId: string;
  invoiceNumber: string;
  currency: "INR" | "USD" | string;
  amountMinor: number;
  reason: string;
  status: CreditNoteStatus;
  disposition: CreditNoteDisposition;
  issuedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export type AccountCreditEntryType =
  | "credit_note_issued"
  | "applied_to_invoice"
  | "manual_adjustment"
  | "overpayment_credit"
  | "refunded";

export interface AccountCreditLedgerEntry {
  id: string;
  companyId: string;
  billingAccountId: string;
  date: string;
  entryType: AccountCreditEntryType;
  reference: string;
  creditMinor: number;
  debitMinor: number;
  runningBalanceMinor: number;
  currency: "INR" | "USD" | string;
  description: string;
  status: "posted" | "pending";
}

export type RefundStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "processing"
  | "succeeded"
  | "failed"
  | "rejected";

export interface Refund {
  id: string;
  reference: string;
  companyId: string;
  companyName: string;
  billingAccountId: string;
  paymentId: string;
  paymentReference: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  currency: "INR" | "USD" | string;
  originalPaymentAmountMinor: number;
  previouslyRefundedMinor: number;
  availableRefundableMinor: number;
  requestedAmountMinor: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy: string | null;
  providerRefundReference: string | null;
  createdAt: string;
  processedAt: string | null;
  failureReason?: string | null;
}

export interface BillingAccount {
  id: string;
  companyId: string;
  companyName: string;
  legalName: string;
  billingEmail: string;
  billingContact: string;
  billingPhone: string | null;
  address: BillingAddress;
  taxId: string | null;
  currency: "INR" | "USD" | string;
  paymentTerms: "Due on Receipt" | "Net 15" | "Net 30" | "Net 60";
  invoiceDelivery: "email_pdf" | "portal_only" | "email_and_portal";
  defaultPaymentMethod: string;
  accountStatus: "active" | "delinquent" | "suspended" | "on_hold";
  currentOutstandingMinor: number;
  overdueMinor: number;
  availableCreditMinor: number;
  unpaidInvoiceCount: number;
  subscriptionTier: string;
  renewsAt: string;
}

export type ReconciliationIssueType =
  | "unmatched_payment"
  | "amount_mismatch"
  | "duplicate_reference"
  | "missing_provider_record"
  | "unallocated_settled_funds"
  | "failed_refund"
  | "balance_discrepancy";

export type ReconciliationStatus = "open" | "investigating" | "awaiting_evidence" | "resolved";

export interface ReconciliationException {
  id: string;
  issueType: ReconciliationIssueType;
  companyId: string;
  companyName: string;
  financialReference: string;
  paymentId: string | null;
  invoiceId: string | null;
  expectedAmountMinor: number;
  recordedAmountMinor: number;
  differenceMinor: number;
  currency: "INR" | "USD" | string;
  severity: "low" | "medium" | "high" | "critical";
  status: ReconciliationStatus;
  detectedAt: string;
  assignedOwner: string | null;
  investigationNotes: string[];
}

export type FinancialEventType =
  | "invoice_draft_created"
  | "invoice_issued"
  | "invoice_voided"
  | "payment_recorded"
  | "payment_allocated"
  | "credit_note_drafted"
  | "credit_note_approved"
  | "credit_applied"
  | "refund_requested"
  | "refund_approved"
  | "reconciliation_reviewed"
  | "billing_account_updated"
  | "policy_updated";

export interface FinancialActivity {
  id: string;
  timestamp: string;
  actor: string;
  companyId: string;
  companyName: string;
  eventType: FinancialEventType;
  reference: string;
  result: string;
  details?: Record<string, unknown>;
}

export interface BillingPolicies {
  invoicePrefix: string;
  defaultDueDays: number;
  invoiceTemplate: "modern_compact" | "enterprise_classic" | "minimalist";
  issuerEntity: string;
  issuerTaxId: string;
  allowPartialPayments: boolean;
  manualPaymentRequiresApproval: boolean;
  autoReconciliationThresholdMinor: number;
  creditNoteRequiresFinanceApproval: boolean;
  refundMaxInstantThresholdMinor: number;
  requireTwoPersonApprovalForLargeRefunds: boolean;
  highImpactThresholdMinor: number;
  disclaimerText: string;
}

export interface BillingOverviewKpis {
  issuedInvoiceMinor: number;
  collectedPaymentsMinor: number;
  outstandingBalanceMinor: number;
  overdueAmountMinor: number;
  unpaidInvoicesCount: number;
  partiallyPaidCount: number;
  failedPaymentsCount: number;
  pendingRefundsCount: number;
  currency: string;
  period: string;
  asOf: string;
}
