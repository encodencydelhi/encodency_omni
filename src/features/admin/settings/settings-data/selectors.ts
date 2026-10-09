import { OrganizationProfile, SettingsActivityItem, SettingsSectionId } from "./types";

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
