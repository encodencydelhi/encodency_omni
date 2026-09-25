import { AllSettingsState, DataExportRequest, SettingsActivityItem, UserPreferences } from "./types";
import { INITIAL_SETTINGS_STATE } from "./mock-provider";
import { SETTINGS_MOCK_MODE, SETTINGS_STORAGE_KEY } from "./config";
import { apiClient } from "@/lib/api/client";
import { getStoredCompanyId, setStoredTenancy, DEFAULT_FALLBACK_COMPANY_ID } from "@/lib/api/tenancy-storage";
import { brandingApi } from "../live/branding-api";
import type { CurrentUserResponse } from "@/types/domain/auth";

export class SettingsRepository {
  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  public static async getSettings(): Promise<AllSettingsState> {
    let base: AllSettingsState = INITIAL_SETTINGS_STATE;

    if (this.isBrowser()) {
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          base = JSON.parse(stored);
        }
      } catch (err) {
        console.warn("Failed to read settings from localStorage, falling back to initial mock", err);
      }
    }

    if (this.isBrowser()) {
      try {
        let activeCompanyId = getStoredCompanyId();

        // 1. Fetch current authenticated user & company context from /users/me
        try {
          const user = await apiClient.request<CurrentUserResponse>({
            method: "GET",
            path: "/users/me",
          });

          if (user?.memberships && user.memberships.length > 0) {
            const activeMembership =
              user.memberships.find((m) => m.companyId === activeCompanyId) ?? user.memberships[0];

            if (activeMembership) {
              activeCompanyId = activeMembership.companyId;
              setStoredTenancy(activeCompanyId);

              base.organization = {
                ...base.organization,
                name: activeMembership.companyName || base.organization.name,
                displayName: activeMembership.companyName || base.organization.displayName,
                metadata: {
                  ...base.organization.metadata,
                  id: activeMembership.companyId,
                  owner: user.email.split("@")[0] || base.organization.metadata.owner,
                  ownerEmail: user.email || base.organization.metadata.ownerEmail,
                  planStatus:
                    activeMembership.companyStatus === "ACTIVE"
                      ? "Active"
                      : base.organization.metadata.planStatus,
                },
              };
            }
          }
        } catch (uErr) {
          console.warn("Could not fetch live /users/me for settings:", uErr);
        }

        // 2. Fetch live branding from /settings/branding if we have a valid companyId
        if (activeCompanyId && activeCompanyId !== DEFAULT_FALLBACK_COMPANY_ID) {
          try {
            const brandingRes = await brandingApi.get(activeCompanyId);
            if (brandingRes) {
              base.branding = {
                ...base.branding,
                logo: brandingRes.logo?.url || base.branding.logo,
                favicon: brandingRes.favicon?.url || base.branding.favicon,
                reportLogo: brandingRes.reportLogo?.url || base.branding.reportLogo,
                emailLogo: brandingRes.emailLogo?.url || base.branding.emailLogo,
              };
              if (brandingRes.logo?.url) {
                base.organization.logo = brandingRes.logo.url;
              }
            }
          } catch (bErr) {
            console.warn("Could not fetch live branding for settings:", bErr);
          }

          // 3. Fetch live team members to sync totalMembers count
          try {
            const teamMembers = await apiClient.request<any[]>({
              method: "GET",
              path: "/team/members",
              headers: { "x-company-id": activeCompanyId },
            });
            if (Array.isArray(teamMembers)) {
              base.organization.metadata.totalMembers = teamMembers.length;
            }
          } catch (tErr) {
            console.warn("Could not fetch live team members for settings:", tErr);
          }
        }

        // Cache synced data to localStorage for instant re-renders
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(base));
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("Live settings sync encountered an error, falling back to local state", err);
      }
    }

    return base;
  }

  public static async saveSettings(partial: Partial<AllSettingsState>, activityNote?: { action: string; section: any; setting: string }): Promise<AllSettingsState> {
    if (!SETTINGS_MOCK_MODE) {
      throw new Error("SETTINGS_SERVICE_UNAVAILABLE: Real backend settings service is not yet connected.");
    }

    const current = await this.getSettings();
    const updated: AllSettingsState = {
      ...current,
      ...partial,
      organization: partial.organization ? { ...current.organization, ...partial.organization } : current.organization,
      workspace: partial.workspace ? { ...current.workspace, ...partial.workspace } : current.workspace,
      branding: partial.branding ? { ...current.branding, ...partial.branding } : current.branding,
      security: partial.security ? { ...current.security, ...partial.security } : current.security,
      preferences: partial.preferences ? { ...current.preferences, ...partial.preferences } : current.preferences,
      dataPrivacy: partial.dataPrivacy ? { ...current.dataPrivacy, ...partial.dataPrivacy } : current.dataPrivacy,
    };

    // Calculate updated security summary if security settings changed
    if (partial.security) {
      const sec = updated.security;
      let score = 70;
      if (sec.authentication.require2FAForAdmins) score += 10;
      if (sec.authentication.require2FAForAllMembers) score += 10;
      if (sec.accessPolicy.blockPersonalEmailDomains) score += 5;
      if (sec.accessPolicy.allowedEmailDomains.length > 0) score += 5;
      updated.securitySummary = {
        ...current.securitySummary,
        securityScore: Math.min(100, score),
        lastSecurityPolicyChange: "Just now",
        lastChangedBy: "Manish Sirohi",
      };
    }

    // Append an activity record if relevant
    if (activityNote) {
      const newActivity: SettingsActivityItem = {
        id: `act_${Date.now()}`,
        user: {
          name: "Manish Sirohi",
          email: "manishsirohi@encodency.com",
          role: "Organization Owner",
        },
        action: activityNote.action,
        section: activityNote.section,
        settingName: activityNote.setting,
        previousValue: "Previous configuration",
        newValue: "Updated configuration",
        timestamp: "Just now",
        ipAddress: "103.21.144.92 (New Delhi, IN)",
      };
      updated.activity = [newActivity, ...updated.activity.slice(0, 19)];
    }

    if (this.isBrowser()) {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to write settings to localStorage", err);
      }
    }

    return updated;
  }

  public static async resetPreferences(): Promise<UserPreferences> {
    const defaults = INITIAL_SETTINGS_STATE.preferences;
    await this.saveSettings({ preferences: defaults }, {
      action: "Reset workspace preferences to factory default",
      section: "preferences",
      setting: "UserPreferences",
    });
    return defaults;
  }

  public static async requestExport(categories: string[]): Promise<DataExportRequest> {
    const newExport: DataExportRequest = {
      id: `exp_${Date.now().toString().slice(-4)}_req`,
      requestedAt: "Just now",
      completedAt: undefined,
      categories,
      status: "preparing",
      progressPercentage: 15,
    };

    const current = await this.getSettings();
    const updatedExports = [newExport, ...current.dataPrivacy.recentExports];
    await this.saveSettings({
      dataPrivacy: {
        ...current.dataPrivacy,
        recentExports: updatedExports,
      },
    }, {
      action: "Initiated full organization archive export",
      section: "data-privacy",
      setting: "DataExportRequest",
    });

    return newExport;
  }

  public static async transferOwnership(newOwnerName: string, newOwnerEmail: string): Promise<void> {
    const current = await this.getSettings();
    await this.saveSettings({
      organization: {
        ...current.organization,
        metadata: {
          ...current.organization.metadata,
          owner: newOwnerName,
          ownerEmail: newOwnerEmail,
        },
      },
    }, {
      action: `Transferred organization ownership to ${newOwnerName} (${newOwnerEmail})`,
      section: "danger",
      setting: "OrganizationOwner",
    });
  }

  public static async deactivateOrganization(): Promise<void> {
    await this.saveSettings({}, {
      action: "Requested organization deactivation / suspension",
      section: "danger",
      setting: "OrganizationStatus",
    });
  }

  public static async deleteOrganization(): Promise<void> {
    if (this.isBrowser()) {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }
}
