/**
 * EnCodency OmniPlatform - Financial Capabilities
 * Role and permission mappings for Super Admin billing operations.
 */

export interface BillingCapabilities {
  canViewPlatformBilling: boolean;
  canViewAllInvoices: boolean;
  canCreateInvoiceDraft: boolean;
  canIssueInvoice: boolean;
  canVoidInvoice: boolean;
  canViewAllPayments: boolean;
  canRecordManualPayment: boolean;
  canVerifyManualPayment: boolean;
  canAllocatePayment: boolean;
  canViewCreditNotes: boolean;
  canCreateCreditNote: boolean;
  canApproveCreditNote: boolean;
  canViewAccountCredits: boolean;
  canApplyAccountCredit: boolean;
  canViewRefunds: boolean;
  canRequestRefund: boolean;
  canApproveRefund: boolean;
  canProcessRefund: boolean;
  canViewBillingAccounts: boolean;
  canEditBillingAccount: boolean;
  canViewReconciliation: boolean;
  canManageReconciliation: boolean;
  canViewFinancialActivity: boolean;
  canManageBillingPolicies: boolean;
  canExportBillingData: boolean;
}

/**
 * Derives financial capabilities for current session.
 * In Super Admin context, privileged financial staff has full access,
 * while non-finance roles have restricted permissions.
 */
export function getBillingCapabilities(role = "super_admin"): BillingCapabilities {
  const isSuperAdmin = role === "super_admin" || role === "finance_lead";
  const isSupport = role === "support_agent";

  return {
    canViewPlatformBilling: true,
    canViewAllInvoices: true,
    canCreateInvoiceDraft: isSuperAdmin,
    canIssueInvoice: isSuperAdmin,
    canVoidInvoice: isSuperAdmin,
    canViewAllPayments: true,
    canRecordManualPayment: isSuperAdmin,
    canVerifyManualPayment: isSuperAdmin,
    canAllocatePayment: isSuperAdmin,
    canViewCreditNotes: true,
    canCreateCreditNote: isSuperAdmin,
    canApproveCreditNote: isSuperAdmin,
    canViewAccountCredits: true,
    canApplyAccountCredit: isSuperAdmin,
    canViewRefunds: true,
    canRequestRefund: true, // support can draft requests
    canApproveRefund: isSuperAdmin && !isSupport,
    canProcessRefund: isSuperAdmin && !isSupport,
    canViewBillingAccounts: true,
    canEditBillingAccount: isSuperAdmin,
    canViewReconciliation: true,
    canManageReconciliation: isSuperAdmin,
    canViewFinancialActivity: true,
    canManageBillingPolicies: isSuperAdmin,
    canExportBillingData: true,
  };
}
