/**
 * EnCodency OmniPlatform - Centralized Financial Selectors
 * Pure calculation functions ensuring zero discrepancies across Overview, Invoices, Payments, and Billing Accounts.
 */

import type {
  Invoice,
  InvoiceTimingState,
  InvoiceCollectionState,
  Payment,
  CreditNote,
  AccountCreditLedgerEntry,
  Refund,
  BillingOverviewKpis,
} from "./types";
import { addMinor, subMinor } from "./money";

/**
 * Calculates current timing state based on due date and collection state.
 */
export function deriveInvoiceTimingState(
  dueAt: string,
  collectionState: InvoiceCollectionState,
  nowMs = Date.now(),
): InvoiceTimingState {
  if (collectionState === "paid") return "not_due";
  const dueMs = Date.parse(dueAt);
  if (isNaN(dueMs)) return "not_due";
  if (dueMs < nowMs) return "overdue";
  if (dueMs - nowMs <= 7 * 86_400_000) return "due_soon";
  return "not_due";
}

/**
 * Calculates collection state based on total, paid and credit applied.
 */
export function deriveInvoiceCollectionState(
  adjustedReceivableMinor: number,
  allocatedPaymentsMinor: number,
  accountCreditAppliedMinor: number,
): InvoiceCollectionState {
  const covered = addMinor(allocatedPaymentsMinor, accountCreditAppliedMinor);
  if (covered <= 0) return "unpaid";
  if (covered >= adjustedReceivableMinor && adjustedReceivableMinor > 0) return "paid";
  return "partially_paid";
}

/**
 * Adjusted receivable = Original Total - Sum of valid issued credit notes
 */
export function calculateInvoiceAdjustedReceivable(invoice: Invoice, creditNotes: CreditNote[]): number {
  const activeCreditNotes = creditNotes.filter(
    (cn) => cn.invoiceId === invoice.id && (cn.status === "issued" || cn.status === "pending_approval"),
  );
  const totalCreditMinor = activeCreditNotes.reduce((acc, cn) => acc + cn.amountMinor, 0);
  return Math.max(0, subMinor(invoice.totalMinor, totalCreditMinor));
}

/**
 * Outstanding balance = Adjusted Receivable - Allocated Payments - Account Credit Applied
 */
export function calculateInvoiceOutstanding(
  adjustedReceivableMinor: number,
  allocatedPaymentsMinor: number,
  accountCreditAppliedMinor: number,
): number {
  const covered = addMinor(allocatedPaymentsMinor, accountCreditAppliedMinor);
  return Math.max(0, subMinor(adjustedReceivableMinor, covered));
}

/**
 * Available credit on an account from its ledger.
 */
export function calculateAccountAvailableCredit(
  ledgerEntries: AccountCreditLedgerEntry[],
  billingAccountId: string,
): number {
  const entries = ledgerEntries.filter((e) => e.billingAccountId === billingAccountId && e.status === "posted");
  const totalCredits = entries.reduce((acc, e) => acc + e.creditMinor, 0);
  const totalDebits = entries.reduce((acc, e) => acc + e.debitMinor, 0);
  return Math.max(0, totalCredits - totalDebits);
}

/**
 * Helper to compute overview KPIs given filtered records.
 */
export function calculateOverviewKpis(
  invoices: Invoice[],
  payments: Payment[],
  refunds: Refund[],
  currencyFilter = "ALL",
  periodDays = 30,
): BillingOverviewKpis {
  const now = Date.now();
  const periodStartMs = periodDays > 0 ? now - periodDays * 86_400_000 : 0;

  // Filter by currency if specific
  const currencyMatch = (c: string) => (currencyFilter === "ALL" ? true : c.toUpperCase() === currencyFilter.toUpperCase());

  // Invoices issued in period
  const periodInvoices = invoices.filter((inv) => {
    if (!currencyMatch(inv.currency)) return false;
    if (inv.documentState === "void") return false;
    const issuedMs = Date.parse(inv.issuedAt);
    return issuedMs >= periodStartMs;
  });

  const issuedInvoiceMinor = periodInvoices.reduce((acc, inv) => acc + inv.totalMinor, 0);

  // Payments collected in period
  const periodPayments = payments.filter((p) => {
    if (!currencyMatch(p.currency)) return false;
    if (p.attemptStatus !== "succeeded") return false;
    const pDate = Date.parse(p.settledAt ?? p.createdAt);
    return pDate >= periodStartMs;
  });

  const collectedPaymentsMinor = periodPayments.reduce((acc, p) => acc + p.grossAmountMinor, 0);

  // Outstanding and overdue across all current active invoices (not just this period's)
  const activeInvoices = invoices.filter((inv) => {
    if (!currencyMatch(inv.currency)) return false;
    return inv.documentState === "issued" && inv.collectionState !== "paid";
  });

  const outstandingBalanceMinor = activeInvoices.reduce((acc, inv) => acc + inv.outstandingBalanceMinor, 0);

  const overdueInvoices = activeInvoices.filter((inv) => inv.timingState === "overdue");
  const overdueAmountMinor = overdueInvoices.reduce((acc, inv) => acc + inv.outstandingBalanceMinor, 0);

  const unpaidInvoicesCount = activeInvoices.filter((inv) => inv.collectionState === "unpaid").length;
  const partiallyPaidCount = activeInvoices.filter((inv) => inv.collectionState === "partially_paid").length;

  const failedPaymentsCount = payments.filter((p) => {
    if (!currencyMatch(p.currency)) return false;
    const pDate = Date.parse(p.createdAt);
    return p.attemptStatus === "failed" && pDate >= periodStartMs;
  }).length;

  const pendingRefundsCount = refunds.filter((r) => {
    if (!currencyMatch(r.currency)) return false;
    return r.status === "pending_approval" || r.status === "draft";
  }).length;

  return {
    issuedInvoiceMinor,
    collectedPaymentsMinor,
    outstandingBalanceMinor,
    overdueAmountMinor,
    unpaidInvoicesCount,
    partiallyPaidCount,
    failedPaymentsCount,
    pendingRefundsCount,
    currency: currencyFilter === "ALL" ? "INR" : currencyFilter,
    period: `${periodDays}D`,
    asOf: new Date().toISOString(),
  };
}
