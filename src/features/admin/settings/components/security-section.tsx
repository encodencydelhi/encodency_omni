"use client";

import { useState } from "react";
import {
  KeyRound,
  Clock,
  Globe,
  AlertTriangle,
  Plus,
  X,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SecurityPolicy, SecuritySummary } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";

interface SecuritySectionProps {
  policy: SecurityPolicy;
  summary: SecuritySummary;
  onChange: (partial: Partial<SecurityPolicy>) => void;
}

export function SecuritySection({ policy, summary, onChange }: SecuritySectionProps) {
  const { capabilities } = useSettingsCapability();
  const [newDomain, setNewDomain] = useState("");

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    let formatted = newDomain.trim().toLowerCase();
    if (!formatted.startsWith("@")) formatted = "@" + formatted;

    if (policy.accessPolicy.allowedEmailDomains.includes(formatted)) {
      toast.warning(`Domain ${formatted} is already in the allowed list.`);
      return;
    }

    const updated = [...policy.accessPolicy.allowedEmailDomains, formatted];
    onChange({
      accessPolicy: {
        ...policy.accessPolicy,
        allowedEmailDomains: updated,
      },
    });
    setNewDomain("");
    toast.success(`Domain ${formatted} added to allowed roster.`);
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    const updated = policy.accessPolicy.allowedEmailDomains.filter((d) => d !== domainToRemove);
    onChange({
      accessPolicy: {
        ...policy.accessPolicy,
        allowedEmailDomains: updated,
      },
    });
    toast.info(`Domain ${domainToRemove} removed.`);
  };

  return (
    <div className="space-y-2">
      {/* SECTION 1: AUTHENTICATION & 2FA */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
              <KeyRound className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Authentication & Two-Factor (2FA)</h3>
              <p className="text-[10px] text-[#64748B]">
                Enforce multi-factor verification across administrative tiers and standard users.
              </p>
            </div>
          </div>
          <span className="text-[9.5px] text-[#64748B] hidden sm:block">
            Last modified {summary.lastSecurityPolicyChange} by {summary.lastChangedBy}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#111C3A] flex items-center gap-1.5">
                Require 2FA for Administrators
                <span className="text-[8.5px] font-bold bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200">
                  Recommended
                </span>
              </div>
              <p className="text-[9.5px] text-[#64748B]">
                Mandates Google Authenticator or SMS 2FA for Owners, Admins, and Project Managers.
              </p>
            </div>
            <Switch
              checked={policy.authentication.require2FAForAdmins}
              onCheckedChange={(val) =>
                onChange({
                  authentication: { ...policy.authentication, require2FAForAdmins: val },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#111C3A]">
                Require 2FA for All Organization Members
              </div>
              <p className="text-[9.5px] text-[#64748B]">
                Enforces 2FA setup upon login for 100% of staff, content creators, and external analysts.
              </p>
            </div>
            <Switch
              checked={policy.authentication.require2FAForAllMembers}
              onCheckedChange={(val) =>
                onChange({
                  authentication: { ...policy.authentication, require2FAForAllMembers: val },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#111C3A]">
                Sensitive Action Re-authentication
              </div>
              <p className="text-[9.5px] text-[#64748B]">
                Requires re-entering account password before high-risk changes (e.g. deleting webhooks or exporting data).
              </p>
            </div>
            <Switch
              checked={policy.authentication.sensitiveActionReauth}
              onCheckedChange={(val) =>
                onChange({
                  authentication: { ...policy.authentication, sensitiveActionReauth: val },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: SESSION MANAGEMENT POLICIES */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0">
            <Clock className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Session Lifecycle & Timeouts</h3>
            <p className="text-[10px] text-[#64748B]">
              Controls how long inactive sessions persist before expiring to mitigate device abandonment risks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
              Idle Session Inactivity Timeout
            </label>
            <select
              value={policy.sessionPolicy.idleSessionTimeoutMinutes}
              onChange={(e) =>
                onChange({
                  sessionPolicy: {
                    ...policy.sessionPolicy,
                    idleSessionTimeoutMinutes: Number(e.target.value),
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
              className="w-full h-8 px-2.5 rounded-md border border-[#CBD5E1] bg-white text-[11.5px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 cursor-pointer"
            >
              <option value={15}>15 minutes (High Security)</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour (Recommended)</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours (Full working day)</option>
            </select>
            <span className="text-[9px] text-[#94A3B8] mt-0.5 block">
              Auto-locks workspace when no keyboard or mouse activity is detected.
            </span>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
              Maximum Absolute Session Duration
            </label>
            <select
              value={policy.sessionPolicy.maximumSessionDurationHours}
              onChange={(e) =>
                onChange({
                  sessionPolicy: {
                    ...policy.sessionPolicy,
                    maximumSessionDurationHours: Number(e.target.value),
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
              className="w-full h-8 px-2.5 rounded-md border border-[#CBD5E1] bg-white text-[11.5px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 cursor-pointer"
            >
              <option value={12}>12 hours</option>
              <option value={24}>24 hours (1 day)</option>
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
            </select>
            <span className="text-[9px] text-[#94A3B8] mt-0.5 block">
              Forces complete credential re-authentication once max duration elapses.
            </span>
          </div>

          <div className="md:col-span-2 pt-0.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="space-y-0.5 pr-2 min-w-0">
                <div className="text-[11.5px] font-semibold text-[#111C3A]">
                  Revoke All Active Sessions on Password Change
                </div>
                <p className="text-[9.5px] text-[#64748B]">
                  Instantly terminates mobile app and desktop web sessions if user password is reset.
                </p>
              </div>
              <Switch
                checked={policy.sessionPolicy.revokeSessionsAfterPasswordChange}
                onCheckedChange={(val) =>
                  onChange({
                    sessionPolicy: {
                      ...policy.sessionPolicy,
                      revokeSessionsAfterPasswordChange: val,
                    },
                  })
                }
                disabled={!capabilities.canManageSecurity}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ACCESS & DOMAIN POLICIES */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center border border-emerald-200 shrink-0">
            <Globe className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Access Control & Email Domain Whitelisting</h3>
            <p className="text-[10px] text-[#64748B]">
              Restrict organization invitation eligibility to verified corporate email domains.
            </p>
          </div>
        </div>

        {/* Domain Tag List */}
        <div className="space-y-1.5">
          <label className="block text-[10.5px] font-bold text-[#334155]">
            Allowed Corporate Email Domains
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg min-h-[38px]">
            {policy.accessPolicy.allowedEmailDomains.map((dom) => (
              <span
                key={dom}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[11px] font-mono font-semibold text-[#111C3A] shadow-2xs"
              >
                {dom}
                {capabilities.canManageSecurity && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(dom)}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                    title={`Remove ${dom}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}

            {capabilities.canManageSecurity && (
              <form onSubmit={handleAddDomain} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="@company.org"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="h-7 w-28 px-2 text-[10.5px] font-mono rounded border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="submit"
                  className="h-7 px-2 bg-white border border-[#CBD5E1] rounded text-[10px] font-bold text-[#2563EB] hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3" /> Add
                </button>
              </form>
            )}
          </div>
          <span className="text-[9px] text-[#94A3B8]">
            Users with other domains cannot be invited unless added to the whitelisted roster above.
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#111C3A]">
                Block Free / Personal Email Providers
              </div>
              <p className="text-[9.5px] text-[#64748B]">
                Prevents invitations to @gmail.com, @yahoo.com, @outlook.com, and public email hosts.
              </p>
            </div>
            <Switch
              checked={policy.accessPolicy.blockPersonalEmailDomains}
              onCheckedChange={(val) =>
                onChange({
                  accessPolicy: {
                    ...policy.accessPolicy,
                    blockPersonalEmailDomains: val,
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#111C3A]">
                Require Verified Email Before First Access
              </div>
              <p className="text-[9.5px] text-[#64748B]">
                Invited users must click confirmation link before gaining access to workspace data.
              </p>
            </div>
            <Switch
              checked={policy.accessPolicy.requireVerifiedEmail}
              onCheckedChange={(val) =>
                onChange({
                  accessPolicy: {
                    ...policy.accessPolicy,
                    requireVerifiedEmail: val,
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: SENSITIVE ACTION PROTECTION */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
            <AlertTriangle className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Sensitive Action Re-authentication Policies</h3>
            <p className="text-[10px] text-[#64748B]">
              Specify which administrative operations strictly require a secondary password prompt.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <div>
              <div className="font-semibold text-[#111C3A]">Remove Team Member</div>
              <div className="text-[9px] text-[#64748B]">Revoking access privileges</div>
            </div>
            <Switch
              checked={policy.sensitiveActionProtection.requireReauthRemoveMember}
              onCheckedChange={(val) =>
                onChange({
                  sensitiveActionProtection: {
                    ...policy.sensitiveActionProtection,
                    requireReauthRemoveMember: val,
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>

          <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <div>
              <div className="font-semibold text-[#111C3A]">Disconnect Channel / Integration</div>
              <div className="text-[9px] text-[#64748B]">Meta, WhatsApp, Google API drops</div>
            </div>
            <Switch
              checked={policy.sensitiveActionProtection.requireReauthDisconnectIntegration}
              onCheckedChange={(val) =>
                onChange({
                  sensitiveActionProtection: {
                    ...policy.sensitiveActionProtection,
                    requireReauthDisconnectIntegration: val,
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>

          <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <div>
              <div className="font-semibold text-[#111C3A]">Modify Billing or Invoices</div>
              <div className="text-[9px] text-[#64748B]">Upgrades, card changes, cancellations</div>
            </div>
            <Switch
              checked={policy.sensitiveActionProtection.requireReauthChangeBilling}
              onCheckedChange={(val) =>
                onChange({
                  sensitiveActionProtection: {
                    ...policy.sensitiveActionProtection,
                    requireReauthChangeBilling: val,
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>

          <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <div>
              <div className="font-semibold text-[#111C3A]">Export Sensitive CRM & Leads</div>
              <div className="text-[9px] text-[#64748B]">Raw bulk phone & email downloads</div>
            </div>
            <Switch
              checked={policy.sensitiveActionProtection.requireReauthExportData}
              onCheckedChange={(val) =>
                onChange({
                  sensitiveActionProtection: {
                    ...policy.sensitiveActionProtection,
                    requireReauthExportData: val,
                  },
                })
              }
              disabled={!capabilities.canManageSecurity}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
