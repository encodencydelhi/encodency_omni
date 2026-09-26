import { OrganizationProfile, SecurityPolicy, SettingsActivityItem, SettingsSectionId } from "./types";

export interface CompletenessResult {
  score: number;
  completedItems: string[];
  pendingItems: string[];
}

export function calculateOrganizationCompleteness(profile: OrganizationProfile): CompletenessResult {
  const checks: { label: string; done: boolean }[] = [
    { label: "Organization Name", done: !!profile.name && profile.name.trim().length > 2 },
    { label: "Legal Entity Name", done: !!profile.legalName && profile.legalName.trim().length > 2 },
    { label: "Primary Website", done: !!profile.website && profile.website.startsWith("http") },
    { label: "Support Email", done: !!profile.contactEmail && profile.contactEmail.includes("@") },
    { label: "Contact Phone", done: !!profile.contactPhone && profile.contactPhone.length >= 8 },
    { label: "Official Brand Logo", done: !!profile.logo && profile.logo.length > 5 },
    { label: "Registered Address & Postal Code", done: !!profile.address.address && !!profile.address.postalCode },
    { label: "Organization Mission / Description", done: !!profile.description && profile.description.length > 15 },
  ];

  const completed = checks.filter((c) => c.done).map((c) => c.label);
  const pending = checks.filter((c) => !c.done).map((c) => c.label);
  const score = Math.round((completed.length / checks.length) * 100);

  return { score, completedItems: completed, pendingItems: pending };
}

export interface SecurityHealthResult {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "Needs Attention";
  checks: { title: string; status: "passed" | "warning" | "failed"; detail: string }[];
}

export function calculateSecurityHealth(policy: SecurityPolicy): SecurityHealthResult {
  const checks: { title: string; status: "passed" | "warning" | "failed"; detail: string; weight: number }[] = [];

  if (policy.authentication.require2FAForAdmins) {
    checks.push({ title: "Admin 2FA Enforced", status: "passed", detail: "All workspace administrators must use 2FA.", weight: 30 });
  } else {
    checks.push({ title: "Admin 2FA Optional", status: "failed", detail: "Admins can login with password only.", weight: 0 });
  }

  if (policy.authentication.require2FAForAllMembers) {
    checks.push({ title: "Organization-wide 2FA", status: "passed", detail: "Mandatory for 100% of staff & contributors.", weight: 25 });
  } else {
    checks.push({ title: "Member 2FA Recommended", status: "warning", detail: "Non-admin members are exempt from mandatory 2FA.", weight: 15 });
  }

  if (policy.accessPolicy.blockPersonalEmailDomains) {
    checks.push({ title: "Personal Email Domains Blocked", status: "passed", detail: "Gmail, Yahoo, Hotmail are blocked from joining.", weight: 20 });
  } else {
    checks.push({ title: "Personal Emails Allowed", status: "warning", detail: "Personal addresses can be invited to organization.", weight: 10 });
  }

  if (policy.sessionPolicy.idleSessionTimeoutMinutes <= 60) {
    checks.push({ title: "Tight Session Timeout (<=60m)", status: "passed", detail: `Inactive tabs timeout after ${policy.sessionPolicy.idleSessionTimeoutMinutes}m.`, weight: 15 });
  } else {
    checks.push({ title: "Extended Session Inactivity", status: "warning", detail: `Sessions remain open for ${policy.sessionPolicy.idleSessionTimeoutMinutes}m idle.`, weight: 8 });
  }

  if (policy.sensitiveActionProtection.requireReauthTransferOwnership) {
    checks.push({ title: "Sensitive Actions Re-authentication", status: "passed", detail: "High-risk actions require password re-entry.", weight: 10 });
  } else {
    checks.push({ title: "Unprotected High-Risk Actions", status: "failed", detail: "Destructive actions execute without re-prompt.", weight: 0 });
  }

  const score = checks.reduce((acc, c) => acc + c.weight, 0);
  let grade: SecurityHealthResult["grade"] = "Needs Attention";
  if (score >= 90) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";

  return {
    score,
    grade,
    checks: checks.map(({ title, status, detail }) => ({ title, status, detail })),
  };
}

export function filterActivityLogs(
  logs: SettingsActivityItem[],
  options: { user?: string; section?: SettingsSectionId | "all"; query?: string }
): SettingsActivityItem[] {
  return logs.filter((log) => {
    if (options.user && options.user !== "all" && !log.user.name.toLowerCase().includes(options.user.toLowerCase())) {
      return false;
    }
    if (options.section && options.section !== "all" && log.section !== options.section) {
      return false;
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        log.settingName.toLowerCase().includes(q) ||
        log.newValue.toLowerCase().includes(q) ||
        log.user.name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}
