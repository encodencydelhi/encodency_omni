/**
 * EnCodency OmniPlatform - React Hooks for Billing & Payments
 * Connected to reactive billingStore via useSyncExternalStore for instant updates.
 */

"use client";

import { useSyncExternalStore, useMemo } from "react";
import { billingStore } from "./store";
import { calculateOverviewKpis } from "./selectors";
import type { BillingOverviewKpis } from "./types";

export function useBillingOverview(options: { periodDays?: number; currency?: string } = {}) {
  const periodDays = options.periodDays ?? 30;
  const currency = options.currency ?? "ALL";

  const invoices = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getInvoices(),
  );

  const payments = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getPayments(),
  );

  const refunds = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getRefunds(),
  );

  const exceptions = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getExceptions(),
  );

  const activities = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getActivities(),
  );

  const kpis: BillingOverviewKpis = useMemo(() => {
    return calculateOverviewKpis(invoices, payments, refunds, currency, periodDays);
  }, [invoices, payments, refunds, currency, periodDays]);

  return {
    kpis,
    invoices,
    payments,
    refunds,
    exceptions,
    activities,
  };
}

export function useInvoices() {
  const invoices = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getInvoices(),
  );

  return {
    invoices,
    createDraftInvoice: billingStore.createDraftInvoice.bind(billingStore),
    voidInvoice: billingStore.voidInvoice.bind(billingStore),
  };
}

export function useInvoiceDetail(id: string) {
  const invoices = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getInvoices(),
  );

  const payments = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getPayments(),
  );

  const creditNotes = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getCreditNotes(),
  );

  const invoice = useMemo(() => {
    return invoices.find((i) => i.id === id || i.number === id);
  }, [invoices, id]);

  const relatedAllocations = useMemo(() => {
    if (!invoice) return [];
    return payments.flatMap((p) =>
      p.allocations
        .filter((a) => a.invoiceId === invoice.id || a.invoiceNumber === invoice.number)
        .map((a) => ({ ...a, paymentReference: p.reference, provider: p.provider, method: p.method, currency: p.currency })),
    );
  }, [payments, invoice]);

  const relatedCreditNotes = useMemo(() => {
    if (!invoice) return [];
    return creditNotes.filter((c) => c.invoiceId === invoice.id || c.invoiceNumber === invoice.number);
  }, [creditNotes, invoice]);

  return {
    invoice,
    relatedAllocations,
    relatedCreditNotes,
    voidInvoice: billingStore.voidInvoice.bind(billingStore),
  };
}

export function usePayments() {
  const payments = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getPayments(),
  );

  return {
    payments,
    allocatePayment: billingStore.allocatePayment.bind(billingStore),
    recordManualPayment: billingStore.recordManualPayment.bind(billingStore),
  };
}

export function usePaymentDetail(id: string) {
  const payments = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getPayments(),
  );

  const invoices = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getInvoices(),
  );

  const refunds = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getRefunds(),
  );

  const payment = useMemo(() => {
    return payments.find((p) => p.id === id || p.reference === id);
  }, [payments, id]);

  const relatedRefunds = useMemo(() => {
    if (!payment) return [];
    return refunds.filter((r) => r.paymentId === payment.id || r.paymentReference === payment.reference);
  }, [refunds, payment]);

  return {
    payment,
    invoices,
    relatedRefunds,
    allocatePayment: billingStore.allocatePayment.bind(billingStore),
    requestRefund: billingStore.requestRefund.bind(billingStore),
  };
}

export function useCreditsAndRefunds() {
  const creditNotes = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getCreditNotes(),
  );

  const ledgerEntries = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getLedgerEntries(),
  );

  const refunds = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getRefunds(),
  );

  const accounts = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getAccounts(),
  );

  const invoices = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getInvoices(),
  );

  return {
    creditNotes,
    ledgerEntries,
    refunds,
    accounts,
    invoices,
    createCreditNote: billingStore.createCreditNote.bind(billingStore),
    approveCreditNote: billingStore.approveCreditNote.bind(billingStore),
    applyAccountCredit: billingStore.applyAccountCredit.bind(billingStore),
    requestRefund: billingStore.requestRefund.bind(billingStore),
  };
}

export function useBillingAccounts() {
  const accounts = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getAccounts(),
  );

  return {
    accounts,
    updateBillingAccount: billingStore.updateBillingAccount.bind(billingStore),
  };
}

export function useBillingAccountDetail(id: string) {
  const accounts = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getAccounts(),
  );

  const invoices = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getInvoices(),
  );

  const payments = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getPayments(),
  );

  const creditNotes = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getCreditNotes(),
  );

  const ledgerEntries = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getLedgerEntries(),
  );

  const account = useMemo(() => {
    return accounts.find((a) => a.id === id || a.companyId === id);
  }, [accounts, id]);

  const companyInvoices = useMemo(() => {
    if (!account) return [];
    return invoices.filter((i) => i.billingAccountId === account.id || i.companyId === account.companyId);
  }, [invoices, account]);

  const companyPayments = useMemo(() => {
    if (!account) return [];
    return payments.filter((p) => p.billingAccountId === account.id || p.companyId === account.companyId);
  }, [payments, account]);

  const companyLedger = useMemo(() => {
    if (!account) return [];
    return ledgerEntries.filter((l) => l.billingAccountId === account.id || l.companyId === account.companyId);
  }, [ledgerEntries, account]);

  return {
    account,
    companyInvoices,
    companyPayments,
    companyLedger,
    creditNotes,
    updateBillingAccount: billingStore.updateBillingAccount.bind(billingStore),
  };
}

export function useReconciliation() {
  const exceptions = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getExceptions(),
  );

  return {
    exceptions,
    updateReconciliationIssue: billingStore.updateReconciliationIssue.bind(billingStore),
  };
}

export function useFinancialActivity() {
  const activities = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getActivities(),
  );

  return {
    activities,
  };
}

export function useBillingPolicies() {
  const policies = useSyncExternalStore(
    (onStoreChange) => billingStore.subscribe(onStoreChange),
    () => billingStore.getPolicies(),
  );

  return {
    policies,
    updatePolicies: billingStore.updatePolicies.bind(billingStore),
  };
}
