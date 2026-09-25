"use client";

import Link from "next/link";
import {
  Building2,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  Users,
  ShieldCheck,
  CreditCard,
  Share2,
  FolderKanban,
} from "lucide-react";
import { CapabilityProvider } from "./settings-data/capability-provider";
import { useSettings } from "./settings-data/hooks";
import { SettingsNav } from "./components/settings-nav";
import { UnsavedChangesBar } from "./components/unsaved-changes-bar";
import { NavigationGuardDialog } from "./components/navigation-guard-dialog";
import {
  OrganizationCompletenessPanel,
  SecurityHealthPanel,
  BrandingGuidelinesPanel,
  QuickActivityPanel,
} from "./components/context-panels";
import { OrganizationSection } from "./components/organization-section";
import { WorkspaceSection } from "./components/workspace-section";
import { BrandingSection } from "./components/branding-section";
import { NotificationsSection } from "./components/notifications-section";
import { Suspense } from "react";
import { SecuritySection } from "./components/security-section";
import { PreferencesSection } from "./components/preferences-section";
import { DataPrivacySection } from "./components/data-privacy-section";
import { AuditActivitySection } from "./components/audit-activity-section";
import { DangerZoneSection } from "./components/danger-zone-section";

export function CompanySettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2 pb-12 animate-pulse">
          <div className="h-14 bg-white rounded-xl border border-[#DDE4ED] p-3 flex items-center justify-between" />
        </div>
      }
    >
      <CapabilityProvider>
        <CompanySettingsInner />
      </CapabilityProvider>
    </Suspense>
  );
}

function CompanySettingsInner() {
  const {
    loading,
    error,
    savedState,
    draftState,
    activeSection,
    requestSectionChange,
    isCurrentSectionDirty,
    isSaving,
    saveChanges,
    discardChanges,
    // guard
    guardDialogOpen,
    pendingSection,
    confirmDiscardAndNavigate,
    confirmSaveAndNavigate,
    cancelNavigation,
    // updaters
    updateOrganization,
    updateWorkspace,
    updateBranding,
    updateNotificationItem,
    updateSecurity,
    updatePreferences,
    updateDataPrivacy,
    handleResetPreferences,
    handleRequestExport,
    handleTransferOwnership,
    handleDeactivate,
    handleDeleteOrganization,
    refetch,
  } = useSettings();

  if (loading) {
    return (
      <div className="space-y-2 pb-12 animate-pulse">
        <div className="h-14 bg-white rounded-xl border border-[#DDE4ED] p-3 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-3 w-64 bg-slate-100 rounded"></div>
          </div>
          <div className="h-6 w-40 bg-slate-100 rounded"></div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 items-start">
          <div className="w-full md:w-[210px] h-[360px] bg-white rounded-xl border border-[#DDE4ED]"></div>
          <div className="flex-1 h-[480px] bg-white rounded-xl border border-[#DDE4ED] w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !draftState) {
    return (
      <div className="p-4 text-center bg-white rounded-xl border border-red-200 space-y-2 max-w-lg mx-auto my-4 shadow-sm">
        <div className="size-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="size-5" />
        </div>
        <h3 className="text-[14px] font-bold text-[#0F172A]">Settings Service Unavailable</h3>
        <p className="text-[11.5px] text-[#64748B] font-normal">{error || "Could not retrieve organization settings."}</p>
        <button
          type="button"
          onClick={refetch}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-[11px] font-bold shadow-2xs hover:bg-blue-600 cursor-pointer inline-flex items-center gap-1.5"
        >
          <RotateCcw className="size-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  const isSectionDirty = (secId: string) => {
    if (!savedState || !draftState) return false;
    switch (secId) {
      case "organization":
        return JSON.stringify(savedState.organization) !== JSON.stringify(draftState.organization);
      case "workspace":
        return JSON.stringify(savedState.workspace) !== JSON.stringify(draftState.workspace);
      case "branding":
        return JSON.stringify(savedState.branding) !== JSON.stringify(draftState.branding);
      case "notifications":
        return JSON.stringify(savedState.notifications) !== JSON.stringify(draftState.notifications);
      case "security":
        return JSON.stringify(savedState.security) !== JSON.stringify(draftState.security);
      case "preferences":
        return JSON.stringify(savedState.preferences) !== JSON.stringify(draftState.preferences);
      case "data-privacy":
        return (
          JSON.stringify(savedState.dataPrivacy.retention) !== JSON.stringify(draftState.dataPrivacy.retention) ||
          JSON.stringify(savedState.dataPrivacy.privacy) !== JSON.stringify(draftState.dataPrivacy.privacy)
        );
      default:
        return false;
    }
  };

  return (
    <div className="space-y-2 pb-16">
      {/* PAGE HEADER: ELEGANT OMNIPLATFORM STYLE */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-xl border border-[#DDE4ED] p-3 shadow-xs">
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">Management / Workspace</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-[20px] font-bold tracking-tight text-[#0F172A]">Organization Settings</h1>
            <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Organization Admin
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] font-normal text-[#64748B] leading-relaxed">
            Manage organizational identity, security policies, workspace defaults, branding, and team preferences.
          </p>
        </div>

        {/* Executive Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center shrink-0">
          <div className="flex items-center gap-1.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg px-2.5 py-1 text-[11px] shadow-2xs">
            <Building2 className="size-3.5 text-[#2563EB]" />
            <span className="text-[#64748B] font-medium text-[10.5px]">Org:</span>
            <span className="font-semibold text-[#0F172A] text-[10.5px]">{draftState.organization.displayName}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg px-2.5 py-1 text-[11px] shadow-2xs">
            <span className="size-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-[#64748B] font-medium text-[10.5px]">Tier:</span>
            <span className="font-semibold text-[#0F172A] text-[10.5px]">Enterprise</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg px-2.5 py-1 text-[11px] shadow-2xs">
            <span className="text-[#64748B] font-medium text-[10.5px]">Client:</span>
            <span className="font-semibold text-[#0F172A] text-[10.5px]">{draftState.workspace.primaryClient}</span>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN / 2-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-2 items-start">
        {/* Left: Compact Settings Navigation */}
        <SettingsNav
          activeSection={activeSection}
          onSelectSection={requestSectionChange}
          isSectionDirty={isSectionDirty}
        />

        {/* Center: Main Settings Content */}
        <main className="flex-1 min-w-0 w-full space-y-2">
          {activeSection === "organization" && (
            <OrganizationSection
              data={draftState.organization}
              onChange={updateOrganization}
            />
          )}

          {activeSection === "workspace" && (
            <WorkspaceSection
              data={draftState.workspace}
              onChange={updateWorkspace}
            />
          )}

          {activeSection === "branding" && (
            <BrandingSection
              data={draftState.branding}
              onChange={updateBranding}
            />
          )}

          {activeSection === "notifications" && (
            <NotificationsSection
              items={draftState.notifications}
              onToggle={updateNotificationItem}
            />
          )}

          {activeSection === "security" && (
            <SecuritySection
              policy={draftState.security}
              summary={draftState.securitySummary}
              onChange={updateSecurity}
            />
          )}

          {activeSection === "preferences" && (
            <PreferencesSection
              data={draftState.preferences}
              onChange={updatePreferences}
            />
          )}

          {activeSection === "data-privacy" && (
            <DataPrivacySection
              data={draftState.dataPrivacy}
              onChange={updateDataPrivacy}
              onRequestExport={handleRequestExport}
            />
          )}

          {activeSection === "audit" && (
            <AuditActivitySection activities={draftState.activity} />
          )}

          {activeSection === "danger" && (
            <DangerZoneSection
              currentOwner={draftState.organization.metadata.owner}
              orgName={draftState.organization.name}
              onResetPreferences={handleResetPreferences}
              onTransferOwnership={handleTransferOwnership}
              onDeactivate={handleDeactivate}
              onDelete={handleDeleteOrganization}
            />
          )}
        </main>

        {/* Right: Optional Context Panel (Appears conditionally where useful) */}
        <aside className="w-full lg:w-[330px] xl:w-[350px] shrink-0 space-y-2">
          {activeSection === "organization" && (
            <OrganizationCompletenessPanel profile={draftState.organization} />
          )}

          {activeSection === "security" && (
            <SecurityHealthPanel
              policy={draftState.security}
              summary={draftState.securitySummary}
            />
          )}

          {activeSection === "branding" && <BrandingGuidelinesPanel />}

          {(activeSection === "audit" || activeSection === "workspace") && (
            <QuickActivityPanel activities={draftState.activity} />
          )}

          {/* Persistent Quick Links card */}
          <div className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-1.5 text-[11px] hover:border-[#CBD5E1] transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-[#F1F5F9]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Quick Admin Links</span>
              <span className="text-[8.5px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">Direct Access</span>
            </div>

            <div className="space-y-1">
              <Link
                href="/admin/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] hover:bg-white hover:border-blue-400 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-6 rounded-md bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <FolderKanban className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E293B] group-hover:text-[#2563EB] truncate transition-colors">
                    Clients Directory
                  </span>
                </div>
                <ExternalLink className="size-3 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
              </Link>

              <Link
                href="/admin/team"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] hover:bg-white hover:border-blue-400 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-6 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <Users className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E293B] group-hover:text-[#2563EB] truncate transition-colors">
                    Team Members & Invites
                  </span>
                </div>
                <ExternalLink className="size-3 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
              </Link>

              <Link
                href="/admin/roles"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] hover:bg-white hover:border-blue-400 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-6 rounded-md bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <ShieldCheck className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E293B] group-hover:text-[#2563EB] truncate transition-colors">
                    Roles & Permissions
                  </span>
                </div>
                <ExternalLink className="size-3 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
              </Link>

              <Link
                href="/admin/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] hover:bg-white hover:border-blue-400 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-6 rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <Share2 className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E293B] group-hover:text-[#2563EB] truncate transition-colors">
                    Channel Integrations
                  </span>
                </div>
                <ExternalLink className="size-3 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
              </Link>

              <Link
                href="/admin/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] hover:bg-white hover:border-blue-400 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-6 rounded-md bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <CreditCard className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E293B] group-hover:text-[#2563EB] truncate transition-colors">
                    Billing & Subscription
                  </span>
                </div>
                <ExternalLink className="size-3 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky Unsaved Changes Action Bar */}
      {isCurrentSectionDirty && (
        <UnsavedChangesBar
          sectionId={activeSection}
          isSaving={isSaving}
          onSave={saveChanges}
          onDiscard={discardChanges}
        />
      )}

      {/* Protective Navigation Guard Modal */}
      <NavigationGuardDialog
        open={guardDialogOpen}
        targetSection={pendingSection}
        isSaving={isSaving}
        onStay={cancelNavigation}
        onDiscard={confirmDiscardAndNavigate}
        onSaveAndLeave={confirmSaveAndNavigate}
      />
    </div>
  );
}
