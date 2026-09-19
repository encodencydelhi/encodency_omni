import { AllSettingsState, DataExportRequest, SettingsActivityItem, UserPreferences } from "./types";
import { INITIAL_SETTINGS_STATE } from "./mock-provider";
import { SETTINGS_MOCK_MODE, SETTINGS_STORAGE_KEY } from "./config";

export class SettingsRepository {
  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  public static async getSettings(): Promise<AllSettingsState> {
    if (!SETTINGS_MOCK_MODE) {
      throw new Error("SETTINGS_SERVICE_UNAVAILABLE: Real backend settings service is not yet connected.");
    }

    if (this.isBrowser()) {
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (err) {
        console.warn("Failed to read settings from localStorage, falling back to initial mock", err);
      }
    }

    return INITIAL_SETTINGS_STATE;
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
