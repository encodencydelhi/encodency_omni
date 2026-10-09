import type { AllSettingsState, DataExportRequest, SettingsActivityItem, SettingsSectionId, UserPreferences } from "./types";
import { INITIAL_SETTINGS_STATE } from "./mock-provider";
import { SETTINGS_STORAGE_KEY } from "./config";
import { apiClient } from "@/lib/api/client";
import { getStoredCompanyId, setStoredTenancy, clearStoredClientId, DEFAULT_FALLBACK_COMPANY_ID } from "@/lib/api/tenancy-storage";
import { brandingApi } from "../live/branding-api";
import { organizationApi, type OrganizationRecord, type UpdateOrganizationPayload } from "../live/organization-api";
import { teamApi } from "@/features/admin/team/live/team-api";
import type { CurrentUserResponse } from "@/types/domain/auth";

function normalizeCountryCode(country?: string | null): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  const map: Record<string, string> = {
    india: "IN",
    "united states": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
    canada: "CA",
    australia: "AU",
    germany: "DE",
    france: "FR",
    singapore: "SG",
    uae: "AE",
    "united arab emirates": "AE",
  };
  return map[lower] ?? (trimmed.length >= 2 ? trimmed.slice(0, 2).toUpperCase() : null);
}

function normalizeTimezone(timezone?: string | null): string | null {
  if (!timezone) return null;
  const trimmed = timezone.trim();
  if (!trimmed) return null;
  return trimmed.split(" ")[0] || trimmed;
}

export class SettingsRepository {
  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  public static getStorageKey(companyId?: string): string {
    return companyId && companyId !== DEFAULT_FALLBACK_COMPANY_ID
      ? `${SETTINGS_STORAGE_KEY}_${companyId}`
      : SETTINGS_STORAGE_KEY;
  }

  public static async getSettings(): Promise<AllSettingsState> {
    let base: AllSettingsState = INITIAL_SETTINGS_STATE;

    if (this.isBrowser()) {
      let activeCompanyId = getStoredCompanyId();

      // Read initial cached state (scoped key if available, else general fallback)
      try {
        const stored =
          (activeCompanyId ? localStorage.getItem(this.getStorageKey(activeCompanyId)) : null) ??
          localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          base = JSON.parse(stored);
        }
      } catch (err) {
        console.warn("Failed to read settings from localStorage, falling back to initial state", err);
      }

      try {
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
              if (activeCompanyId !== activeMembership.companyId) {
                clearStoredClientId();
              }
              activeCompanyId = activeMembership.companyId;
              setStoredTenancy(activeCompanyId);

              // Re-check company-specific cached data
              const companyStored = localStorage.getItem(this.getStorageKey(activeCompanyId));
              if (companyStored) {
                try {
                  base = JSON.parse(companyStored);
                } catch {
                  // ignore
                }
              }

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

        // 2. Fetch live branding and organization from backend if we have a valid companyId
        if (activeCompanyId && activeCompanyId !== DEFAULT_FALLBACK_COMPANY_ID) {
          // A. Fetch live branding from /settings/branding
          try {
            const brandingRes = await brandingApi.get(activeCompanyId);
            if (brandingRes) {
              base.branding = {
                ...base.branding,
                logo: brandingRes.logo?.url ?? "",
                favicon: brandingRes.favicon?.url ?? "",
                reportLogo: brandingRes.reportLogo?.url ?? "",
                emailLogo: brandingRes.emailLogo?.url ?? "",
              };
              base.organization.logo = brandingRes.logo?.url ?? "";
            }
          } catch (bErr) {
            console.warn("Could not fetch live branding for settings:", bErr);
          }

          // B. Fetch live team members to sync totalMembers count
          try {
            const teamMembers = await apiClient.request<unknown[]>({
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

          // C. Fetch live organization record from /settings/organization
          try {
            const orgRecord = await organizationApi.get(activeCompanyId);
            if (orgRecord) {
              base.organization = {
                ...base.organization,
                name: orgRecord.name || base.organization.name,
                displayName: orgRecord.displayName || base.organization.displayName,
                legalName: orgRecord.legalName ?? "",
                industry: orgRecord.industry ?? base.organization.industry,
                website: orgRecord.website ?? "",
                contactEmail: orgRecord.contactEmail ?? "",
                contactPhone: orgRecord.contactPhone ?? "",
                description: orgRecord.description ?? "",
                timezone: orgRecord.timezone ?? base.organization.timezone,
                currency: orgRecord.currency ?? base.organization.currency,
                address: {
                  address: orgRecord.address?.street ?? base.organization.address?.address ?? "",
                  street: orgRecord.address?.street ?? base.organization.address?.street ?? "",
                  city: orgRecord.address?.city ?? base.organization.address?.city ?? "",
                  state: orgRecord.address?.state ?? base.organization.address?.state ?? "",
                  country: orgRecord.address?.country === "IN" ? "India" : (orgRecord.address?.country ?? base.organization.address?.country ?? "India"),
                  postalCode: orgRecord.address?.postalCode ?? base.organization.address?.postalCode ?? "",
                },
                metadata: {
                  ...base.organization.metadata,
                  id: orgRecord.id,
                  revision: orgRecord.revision,
                },
              };
              base.branding.brandName = orgRecord.displayName || orgRecord.name || base.branding.brandName;
            }
          } catch (oErr) {
            console.warn("Could not fetch live organization record for settings:", oErr);
          }
        }

        // Cache synced data to localStorage for instant re-renders
        try {
          const key = this.getStorageKey(activeCompanyId);
          localStorage.setItem(key, JSON.stringify(base));
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

  public static async saveSettings(
    partial: Partial<AllSettingsState>,
    activityNote?: { action: string; section: SettingsSectionId; setting: string }
  ): Promise<AllSettingsState> {
    const current = await this.getSettings();
    let activeCompanyId = getStoredCompanyId();

    if (!activeCompanyId || activeCompanyId === DEFAULT_FALLBACK_COMPANY_ID) {
      try {
        const user = await apiClient.request<CurrentUserResponse>({
          method: "GET",
          path: "/users/me",
        });
        if (user?.memberships?.[0]?.companyId) {
          activeCompanyId = user.memberships[0].companyId;
          setStoredTenancy(activeCompanyId);
        }
      } catch {
        // ignore
      }
    }

    // Only patch the backend organization endpoint if organization section was changed or submitted
    const shouldUpdateOrg =
      Boolean(partial.organization) &&
      Boolean(activeCompanyId) &&
      activeCompanyId !== DEFAULT_FALLBACK_COMPANY_ID &&
      (activityNote?.section === "organization" || !activityNote);

    if (shouldUpdateOrg && partial.organization && activeCompanyId) {
      const orgPatch = partial.organization;
      // The revision this state was read at. If the state carries none (fresh
      // session), read it now rather than guessing `1` — a guess would conflict
      // on every save and teach callers to swallow real conflicts.
      const revisionOf = (metadata: unknown): number | undefined => {
        const value = (metadata ?? {}) as { revision?: unknown };
        return typeof value.revision === "number" ? value.revision : undefined;
      };
      let expectedRevision: number = revisionOf(orgPatch.metadata) ?? revisionOf(current.organization.metadata) ?? 0;
      if (!expectedRevision) {
        expectedRevision = (await organizationApi.get(activeCompanyId)).revision;
      }

      const addr = orgPatch.address;
      const hasAnyAddress = addr && Boolean(addr.street || addr.address || addr.city || addr.state || addr.country || addr.postalCode);
      const addressPayload = hasAnyAddress
        ? {
            street: (addr.street ?? addr.address)?.trim() || null,
            city: addr.city?.trim() || null,
            state: addr.state?.trim() || null,
            country: normalizeCountryCode(addr.country),
            postalCode: (addr.postalCode ?? (addr as { zip?: string | null }).zip)?.trim() || null,
          }
        : null;

      const payload: UpdateOrganizationPayload = {
        expectedRevision,
        // `name` (the Company title) has no backend write endpoint, so it is
        // read-only in the form; only the Display Name the operator actually
        // edited is sent — never the Company name pushed into displayName.
        displayName: orgPatch.displayName?.trim() || undefined,
        legalName: orgPatch.legalName ? orgPatch.legalName.trim() : null,
        industry: orgPatch.industry ? orgPatch.industry.trim() : null,
        website: orgPatch.website ? orgPatch.website.trim() : null,
        contactEmail: orgPatch.contactEmail ? orgPatch.contactEmail.trim().toLowerCase() : null,
        contactPhone: orgPatch.contactPhone ? orgPatch.contactPhone.trim() : null,
        description: orgPatch.description ? orgPatch.description.trim() : null,
        timezone: orgPatch.timezone ? normalizeTimezone(orgPatch.timezone) : null,
        currency: orgPatch.currency ? orgPatch.currency.slice(0, 3).toUpperCase() : null,
        address: addressPayload,
      };

      try {
        // Optimistic concurrency is the backend's contract: a 409 means another
        // session saved between our read and this write. Retrying with the fresh
        // revision would silently overwrite their change, so the conflict is
        // surfaced and the operator is told to reload (backend message: "The
        // organization profile was changed by someone else. Reload it before saving.").
        const updatedOrg: OrganizationRecord | null = await organizationApi.update(activeCompanyId, payload);
        if (updatedOrg) {
          partial.organization = {
            ...partial.organization,
            name: updatedOrg.name,
            displayName: updatedOrg.displayName,
            legalName: updatedOrg.legalName ?? "",
            industry: updatedOrg.industry ?? partial.organization.industry,
            website: updatedOrg.website ?? "",
            contactEmail: updatedOrg.contactEmail ?? "",
            contactPhone: updatedOrg.contactPhone ?? "",
            description: updatedOrg.description ?? "",
            timezone: updatedOrg.timezone ?? partial.organization.timezone,
            currency: updatedOrg.currency ?? partial.organization.currency,
            address: {
              address: updatedOrg.address?.street ?? partial.organization.address?.address ?? "",
              street: updatedOrg.address?.street ?? partial.organization.address?.street ?? "",
              city: updatedOrg.address?.city ?? partial.organization.address?.city ?? "",
              state: updatedOrg.address?.state ?? partial.organization.address?.state ?? "",
              country: updatedOrg.address?.country === "IN" ? "India" : (updatedOrg.address?.country ?? partial.organization.address?.country ?? "India"),
              postalCode: updatedOrg.address?.postalCode ?? partial.organization.address?.postalCode ?? "",
            },
            metadata: {
              ...partial.organization.metadata,
              revision: updatedOrg.revision,
              id: updatedOrg.id,
            },
          };
          if (partial.branding) {
            partial.branding.brandName = updatedOrg.displayName || updatedOrg.name;
          }
        }
      } catch (orgErr) {
        // A plain message, never the Error object: handing an ApiError to the
        // logger makes the Next dev overlay paint a full-screen error for a
        // business conflict that the caller already reports to the operator.
        console.warn("Organization profile save failed:", orgErr instanceof Error ? orgErr.message : String(orgErr));
        throw orgErr;
      }
    }

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
        lastChangedBy: updated.organization.metadata.owner || "Administrator",
      };
    }

    // Append an activity record if relevant
    if (activityNote) {
      const newActivity: SettingsActivityItem = {
        id: `act_${Date.now()}`,
        user: {
          name: updated.organization.metadata.owner || "Workspace Admin",
          email: updated.organization.metadata.ownerEmail || "admin@workspace.com",
          role: "Organization Admin",
        },
        action: activityNote.action,
        section: activityNote.section,
        settingName: activityNote.setting,
        previousValue: "Previous configuration",
        newValue: "Updated configuration",
        timestamp: "Just now",
        ipAddress: "Verified Session",
      };
      updated.activity = [newActivity, ...updated.activity.slice(0, 19)];
    }

    if (this.isBrowser()) {
      try {
        const key = this.getStorageKey(activeCompanyId);
        localStorage.setItem(key, JSON.stringify(updated));
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to write settings to localStorage", err);
      }
    }

    return updated;
  }

  /**
   * Reads the current organization revision so a conflicted state can be
   * re-based after the operator has been told about the conflict — without
   * touching any of the values they are still editing.
   */
  public static async refreshOrganizationRevision(): Promise<number | null> {
    const companyId = getStoredCompanyId();
    if (!companyId || companyId === DEFAULT_FALLBACK_COMPANY_ID) return null;
    try {
      return (await organizationApi.get(companyId)).revision;
    } catch {
      return null;
    }
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
    const companyId = getStoredCompanyId();
    if (!companyId || companyId === DEFAULT_FALLBACK_COMPANY_ID) {
      throw new Error("Select a Company to continue.");
    }

    const me = await apiClient.request<CurrentUserResponse>({
      method: "GET",
      path: "/users/me",
    });

    const currentMembership = me.memberships.find((membership) => membership.companyId === companyId && membership.systemRole === "OWNER");
    if (!currentMembership) {
      throw new Error("Only the current organization owner can transfer ownership.");
    }

    const members = await teamApi.listMembers(companyId);
    const targetMember = members.find((member) => {
      const matchEmail = member.user.email.trim().toLowerCase() === newOwnerEmail.trim().toLowerCase();
      const matchName = member.user.name?.trim().toLowerCase() === newOwnerName.trim().toLowerCase();
      return matchEmail || matchName;
    });

    if (!targetMember) {
      throw new Error(`No active member in this company matches ${newOwnerName || newOwnerEmail}.`);
    }

    if (targetMember.id === currentMembership.membershipId) {
      throw new Error("The new owner must be a different member of this organization.");
    }

    // Match the live backend role-transfer contract: demote the current owner,
    // then promote the replacement owner to the final OWNER role.
    await teamApi.updateRole(companyId, currentMembership.membershipId, "ADMIN");
    await teamApi.updateRole(companyId, targetMember.id, "OWNER");
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
      const activeCompanyId = getStoredCompanyId();
      localStorage.removeItem(this.getStorageKey(activeCompanyId));
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }
}
