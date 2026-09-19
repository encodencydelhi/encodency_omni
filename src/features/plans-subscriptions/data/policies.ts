import type { SubscriptionPolicy } from "./types";

/** The demo policy. Every value is editable in Settings and saved to the shared demo state. */
export const DEFAULT_POLICY: SubscriptionPolicy = {
  trial: {
    defaultTrialDays: 14,
    extensionLimitDays: 30,
    reminderDays: [7, 3, 1],
    defaultTrialPlan: "growth",
    allowWithoutPaymentMethod: true,
  },
  renewal: {
    defaultBillingCycle: "monthly",
    reminderDays: [14, 7],
    gracePeriodDays: 7,
    failedPaymentHandling: "keep_access_with_warning",
  },
  cancellation: {
    defaultTiming: "end_of_term",
    reactivationWindowDays: 60,
  },
  overLimit: {
    users: "allow_existing_resources",
    clients: "allow_existing_resources",
    connectedAccounts: "allow_existing_resources",
    aiCredits: "temporary_grace_period",
    automationRuns: "block_new_creation",
  },
};

export function validatePolicy(policy: SubscriptionPolicy): Record<string, string> {
  const errors: Record<string, string> = {};
  const whole = (value: number) => Number.isInteger(value);
  if (!whole(policy.trial.defaultTrialDays) || policy.trial.defaultTrialDays < 1 || policy.trial.defaultTrialDays > 90) errors.defaultTrialDays = "Enter a whole number of days between 1 and 90.";
  if (!whole(policy.trial.extensionLimitDays) || policy.trial.extensionLimitDays < 0 || policy.trial.extensionLimitDays > 90) errors.extensionLimitDays = "Enter a whole number of days between 0 and 90.";
  if (!whole(policy.renewal.gracePeriodDays) || policy.renewal.gracePeriodDays < 0 || policy.renewal.gracePeriodDays > 60) errors.gracePeriodDays = "Enter a whole number of days between 0 and 60.";
  if (!whole(policy.cancellation.reactivationWindowDays) || policy.cancellation.reactivationWindowDays < 0 || policy.cancellation.reactivationWindowDays > 365) errors.reactivationWindowDays = "Enter a whole number of days between 0 and 365.";
  for (const [key, days] of [["trialReminders", policy.trial.reminderDays], ["renewalReminders", policy.renewal.reminderDays]] as const) {
    if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 90)) errors[key] = "Reminders are whole days between 1 and 90, e.g. 7, 3, 1.";
  }
  return errors;
}

/** "7, 3, 1" -> [7, 3, 1]; anything unparseable yields NaN so validation can reject it. */
export function parseDays(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((part) => Number(part))
    .sort((a, b) => b - a);
}
