import type { AllSettingsState, SettingsActivityItem, SettingsSectionId, UserPreferences } from "./types";
import { INITIAL_SETTINGS_STATE, neutralSettingsState, UNAVAILABLE_SECURITY_SUMMARY } from "./mock-provider";
import { SETTINGS_MOCK_MODE, SETTINGS_STORAGE_KEY } from "./config";
import { apiClient } from "@/lib/api/client";
import { getStoredCompanyId, setStoredTenancy, clearStoredClientId, DEFAULT_FALLBACK_COMPANY_ID } from "@/lib/api/tenancy-storage";
import { brandingApi } from "../live/branding-api";
import { organizationApi, type OrganizationRecord, type UpdateOrganizationPayload } from "../live/organization-api";
import { teamApi, type TeamActivityRecord, type TeamMemberRecord } from "@/features/admin/team/live/team-api";
import { clientsApi } from "@/features/admin/projects/live/clients-api";
import type { BackendBillingSummary } from "@/features/admin/billing/billing-data/live-snapshot";
import { timeAgo } from "@/features/support/time";
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

/** `GET /team/members/security-summary` (Owners and Admins only). */
interface TeamSecurityResponse {
  members: number;
  suspended: number;
  twoFactorEnabled: number;
  twoFactorRate: number;
  privilegedMembers: number;
  privilegedWithoutTwoFactor: number;
}

const ROLE_LABEL: Record<string, string> = { OWNER: "Organization Owner", ADMIN: "Organization Admin", MANAGER: "Manager", VIEWER: "Viewer" };

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function planStatusLabel(status: string): string {
  const known: Record<string, string> = { ACTIVE: "Active", PAST_DUE: "Past Due", TRIALING: "Trialing", CANCELED: "Canceled", CANCELLED: "Canceled", SUSPENDED: "Suspended" };
  return known[status] ?? (status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "");
}

/** A row of the Company's real audit feed, shaped for the settings activity list. The feed carries no before/after values or IP, so those stay empty (the UI hides them). */
function activityItem(record: TeamActivityRecord, roleByUser: Map<string, string>): SettingsActivityItem {
  const actor = record.actor;
  return {
    id: record.id,
    user: {
      name: actor?.name?.trim() || actor?.email || "System",
      email: actor?.email ?? "",
      role: (actor && roleByUser.get(actor.userId)) || "Member",
    },
    action: record.label,
    section: record.module === "Organization" ? "organization" : "audit",
    settingName: `${record.module} · ${record.resourceLabel}${record.clientName ? ` · ${record.clientName}` : ""}`,
    previousValue: "",
    newValue: "",
    timestamp: timeAgo(record.at),
    ipAddress: "",
  };
}

/**
 * Whatever an older version cached in this browser must never be shown as if it were this Company's data: everything that is
 * read from the server on every load is dropped, and sample values that used to be the defaults are cleared.
 */
function sanitizeCached(state: AllSettingsState): AllSettingsState {
  if (SETTINGS_MOCK_MODE) return state;
  const sample = INITIAL_SETTINGS_STATE;
  const sampleDomains = sample.security.accessPolicy.allowedEmailDomains.join("|");
  return {
    ...state,
    activity: [],
    securitySummary: UNAVAILABLE_SECURITY_SUMMARY,
    dataPrivacy: { ...state.dataPrivacy, recentExports: [] },
    branding: {
      ...state.branding,
      footerText: state.branding.footerText === sample.branding.footerText ? "" : state.branding.footerText,
      customDomain: state.branding.customDomain === sample.branding.customDomain ? "" : state.branding.customDomain,
    },
    security: {
      ...state.security,
      accessPolicy: {
        ...state.security.accessPolicy,
        allowedEmailDomains: state.security.accessPolicy.allowedEmailDomains.join("|") === sampleDomains ? [] : state.security.accessPolicy.allowedEmailDomains,
      },
    },
  };
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
    let base: AllSettingsState = SETTINGS_MOCK_MODE ? structuredClone(INITIAL_SETTINGS_STATE) : neutralSettingsState();

    if (this.isBrowser()) {
      let activeCompanyId = getStoredCompanyId();

      // Read initial cached state (scoped key if available, else general fallback)
      try {
        const stored =
          (activeCompanyId ? localStorage.getItem(this.getStorageKey(activeCompanyId)) : null) ??
          localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          base = sanitizeCached(JSON.parse(stored));
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
                  base = sanitizeCached(JSON.parse(companyStored));
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
                },
              };
            }
          }
        } catch (uErr) {
          console.warn("Could not fetch live /users/me for settings:", uErr);
        }

        // 2. Everything below is read live from the server; nothing is filled in from sample data.
        if (activeCompanyId && activeCompanyId !== DEFAULT_FALLBACK_COMPANY_ID) {
          const scope = { "x-company-id": activeCompanyId };
          const [brandingR, teamR, orgR, billingR, clientsR, activityR, securityR] = await Promise.allSettled([
            brandingApi.get(activeCompanyId),
            apiClient.request<TeamMemberRecord[]>({ method: "GET", path: "/team/members", headers: scope }),
            organizationApi.get(activeCompanyId),
            apiClient.request<BackendBillingSummary>({ method: "GET", path: "/billing/summary", headers: scope }),
            clientsApi.list(activeCompanyId),
            teamApi.listActivity(activeCompanyId, { limit: 50 }),
            apiClient.request<TeamSecurityResponse>({ method: "GET", path: "/team/members/security-summary", headers: scope }),
          ]);

          // A. Branding images (/settings/branding)
          if (brandingR.status === "fulfilled" && brandingR.value) {
            const branding = brandingR.value;
            base.branding = {
              ...base.branding,
              logo: branding.logo?.url ?? "",
              favicon: branding.favicon?.url ?? "",
              reportLogo: branding.reportLogo?.url ?? "",
              emailLogo: branding.emailLogo?.url ?? "",
            };
            base.organization.logo = branding.logo?.url ?? "";
          } else if (brandingR.status === "rejected") {
            console.warn("Could not fetch live branding for settings:", brandingR.reason);
          }

          // B. Team: member count and the real Owner (not whoever happens to be signed in)
          const members = teamR.status === "fulfilled" && Array.isArray(teamR.value) ? teamR.value : null;
          if (members) {
            const owner = members.find((member) => member.systemRole === "OWNER" && !member.suspendedAt) ?? members.find((member) => member.systemRole === "OWNER");
            base.organization.metadata = {
              ...base.organization.metadata,
              totalMembers: members.length,
              owner: owner ? owner.user.name?.trim() || owner.user.email : "",
              ownerEmail: owner?.user.email ?? "",
            };
          } else if (teamR.status === "rejected") {
            console.warn("Could not fetch live team members for settings:", teamR.reason);
          }

          // C. Organization profile (/settings/organization): a field the server has no value for stays empty
          if (orgR.status === "fulfilled" && orgR.value) {
            const orgRecord = orgR.value;
            base.organization = {
              ...base.organization,
              name: orgRecord.name || base.organization.name,
              displayName: orgRecord.displayName || base.organization.displayName,
              legalName: orgRecord.legalName ?? "",
              industry: orgRecord.industry ?? "",
              website: orgRecord.website ?? "",
              contactEmail: orgRecord.contactEmail ?? "",
              contactPhone: orgRecord.contactPhone ?? "",
              description: orgRecord.description ?? "",
              timezone: orgRecord.timezone ?? "",
              currency: orgRecord.currency ?? "",
              address: {
                address: orgRecord.address?.street ?? "",
                street: orgRecord.address?.street ?? "",
                city: orgRecord.address?.city ?? "",
                state: orgRecord.address?.state ?? "",
                country: orgRecord.address?.country === "IN" ? "India" : (orgRecord.address?.country ?? ""),
                postalCode: orgRecord.address?.postalCode ?? "",
              },
              metadata: {
                ...base.organization.metadata,
                id: orgRecord.id,
                revision: orgRecord.revision,
                createdAt: orgRecord.createdAt ? formatDate(orgRecord.createdAt) : "",
              },
            };
            base.branding.brandName = orgRecord.displayName || orgRecord.name || base.branding.brandName;
          } else if (orgR.status === "rejected") {
            console.warn("Could not fetch live organization record for settings:", orgR.reason);
          }

          // D. The Company's real plan (a Company without a subscription has no plan; the server's stand-in is not shown as one)
          if (billingR.status === "fulfilled" && billingR.value) {
            const summary = billingR.value;
            base.organization.metadata = {
              ...base.organization.metadata,
              currentPlan: summary.subscriptionId ? summary.plan.name : "No Active Plan",
              planStatus: summary.subscriptionId ? planStatusLabel(summary.status) : "None",
            };
          }

          // E. Clients: the real count, and workspace choices that point at a Client that no longer exists are cleared
          if (clientsR.status === "fulfilled" && Array.isArray(clientsR.value)) {
            const names = clientsR.value.map((client) => client.displayName?.trim() || client.name);
            base.organization.metadata = { ...base.organization.metadata, totalClients: names.length };
            const choices = new Set(["Last Used Client", "Prompt Every Time", ...names]);
            base.workspace = {
              ...base.workspace,
              primaryClient: names.includes(base.workspace.primaryClient) ? base.workspace.primaryClient : "",
              defaultClientAfterLogin: choices.has(base.workspace.defaultClientAfterLogin) ? base.workspace.defaultClientAfterLogin : "Last Used Client",
            };
          }

          // F. Recent activity of this Company's people, from the audit log (Owners and Admins; others get none)
          if (activityR.status === "fulfilled" && activityR.value?.items) {
            const roleByUser = new Map((members ?? []).map((member) => [member.user.id, ROLE_LABEL[member.systemRole] ?? member.systemRole] as const));
            base.activity = activityR.value.items.map((record) => activityItem(record, roleByUser));
          } else {
            base.activity = [];
          }

          // G. Real sign-in security numbers (Owners and Admins)
          base.securitySummary =
            securityR.status === "fulfilled" && securityR.value
              ? { available: true, ...securityR.value }
              : UNAVAILABLE_SECURITY_SUMMARY;
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
      // The Street input is bound to `address.address`; `street` only mirrors
      // the value the page was loaded with. After the first save the two can
      // differ, and the field the operator actually edits must win — otherwise
      // every later edit sends the stale mirror and silently changes nothing.
      // A cleared input stays "" here and is sent as null (clear), never as
      // the stale mirror.
      const streetValue = addr ? (addr.address ?? addr.street ?? "").trim() : "";
      const hasAnyAddress = addr && Boolean(streetValue || addr.city || addr.state || addr.country || addr.postalCode);
      const addressPayload = hasAnyAddress
        ? {
            street: streetValue || null,
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
