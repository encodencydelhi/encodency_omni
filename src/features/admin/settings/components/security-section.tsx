"use client";

import { useState } from "react";
import {
  KeyRound,
  Clock,
  Globe,
  AlertTriangle,
  Plus,
  X,
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
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
              <KeyRound className="size-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Authentication & Two-Factor (2FA)</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold truncate sm:whitespace-normal">
                Enforce multi-factor verification across administrative tiers and standard users.
              </p>
            </div>
          </div>

          {/* Clean Single-Line Timestamp Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] text-[10.5px] text-[#111C3A] font-medium shrink-0 whitespace-nowrap shadow-2xs">
            <Clock className="size-3 text-[#2563EB] shrink-0" />
            <span>Modified {summary.lastSecurityPolicyChange}</span>
            <span className="font-bold text-[#2563EB]">• {summary.lastChangedBy}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-bold text-[#111C3A] flex items-center gap-1.5">
                Require 2FA for Administrators
                <span className="text-[8.5px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                  Recommended
                </span>
              </div>
              <p className="text-[9.5px] text-[#111C3A] font-medium">
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

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-bold text-[#111C3A]">
                Require 2FA for All Organization Members
              </div>
              <p className="text-[9.5px] text-[#111C3A] font-medium">
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

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-bold text-[#111C3A]">
                Sensitive Action Re-authentication
              </div>
              <p className="text-[9.5px] text-[#111C3A] font-medium">
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
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Clock className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Session Lifecycle & Timeouts</h3>
            <p className="text-[10px] text-[#111C3A] font-semibold">
              Controls how long inactive sessions persist before expiring to mitigate device abandonment risks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
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
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value={15}>15 minutes (High Security)</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour (Recommended)</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours (Full working day)</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-medium mt-0.5 block">
              Auto-locks workspace when no keyboard or mouse activity is detected.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
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
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value={12}>12 hours</option>
              <option value={24}>24 hours (1 day)</option>
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-medium mt-0.5 block">
              Forces complete credential re-authentication once max duration elapses.
            </span>
          </div>

          <div className="md:col-span-2 pt-0.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
              <div className="space-y-0.5 pr-2 min-w-0">
                <div className="text-[11.5px] font-bold text-[#111C3A]">
                  Revoke All Active Sessions on Password Change
                </div>
                <p className="text-[9.5px] text-[#111C3A] font-medium">
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
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center shadow-xs shrink-0">
            <Globe className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Access Control & Email Domain Whitelisting</h3>
            <p className="text-[10px] text-[#111C3A] font-semibold">
              Restrict organization invitation eligibility to verified corporate email domains.
            </p>
          </div>
        </div>

        {/* Domain Tag List */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-[#111C3A]">
            Allowed Corporate Email Domains
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-xl min-h-[38px] shadow-2xs">
            {policy.accessPolicy.allowedEmailDomains.map((dom) => (
              <span
                key={dom}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-mono font-bold text-[#111C3A] shadow-2xs"
              >
                {dom}
                {capabilities.canManageSecurity && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(dom)}
                    className="text-[#111C3A] hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
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
                  className="h-7 w-28 px-2 text-[10.5px] font-mono font-bold rounded-md border border-[#CBD5E1] bg-white text-[#111C3A] outline-none focus:border-[#2563EB] shadow-2xs"
                />
                <button
                  type="submit"
                  className="h-7 px-2.5 bg-white border border-[#CBD5E1] rounded-md text-[10px] font-bold text-[#2563EB] hover:bg-blue-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="size-3" /> Add
                </button>
              </form>
            )}
          </div>
          <span className="text-[9.5px] text-[#111C3A] font-medium">
            Users with other domains cannot be invited unless added to the whitelisted roster above.
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-bold text-[#111C3A]">
                Block Free / Personal Email Providers
              </div>
              <p className="text-[9.5px] text-[#111C3A] font-medium">
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

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-2 min-w-0">
              <div className="text-[11.5px] font-bold text-[#111C3A]">
                Require Verified Email Before First Access
              </div>
              <p className="text-[9.5px] text-[#111C3A] font-medium">
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
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <AlertTriangle className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Sensitive Action Re-authentication Policies</h3>
            <p className="text-[10px] text-[#111C3A] font-semibold">
              Specify which administrative operations strictly require a secondary password prompt.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center justify-between p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="font-bold text-[#111C3A] text-[11.5px]">Remove Team Member</div>
              <div className="text-[9.5px] text-[#111C3A] font-medium">Revoking access privileges</div>
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

          <div className="flex items-center justify-between p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="font-bold text-[#111C3A] text-[11.5px]">Disconnect Channel / Integration</div>
              <div className="text-[9.5px] text-[#111C3A] font-medium">Meta, WhatsApp, Google API drops</div>
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

          <div className="flex items-center justify-between p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="font-bold text-[#111C3A] text-[11.5px]">Modify Billing or Invoices</div>
              <div className="text-[9.5px] text-[#111C3A] font-medium">Upgrades, card changes, cancellations</div>
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

          <div className="flex items-center justify-between p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="font-bold text-[#111C3A] text-[11.5px]">Export Sensitive CRM & Leads</div>
              <div className="text-[9.5px] text-[#111C3A] font-medium">Raw bulk phone & email downloads</div>
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
