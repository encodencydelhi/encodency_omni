"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
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
import { SecuritySection } from "./components/security-section";
import { PreferencesSection } from "./components/preferences-section";
import { DataPrivacySection } from "./components/data-privacy-section";
import { AuditActivitySection } from "./components/audit-activity-section";
import { DangerZoneSection } from "./components/danger-zone-section";

export function CompanySettingsPage() {
  return (
    <CapabilityProvider>
      <CompanySettingsInner />
    </CapabilityProvider>
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
        {/* Header Skeleton */}
        <div className="h-14 bg-white rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-3 w-64 bg-slate-100 rounded"></div>
          </div>
          <div className="h-6 w-40 bg-slate-100 rounded"></div>
        </div>

        {/* Main Grid Skeleton */}
        <div className="flex flex-col md:flex-row gap-2 items-start">
          <div className="w-full md:w-[210px] h-[360px] bg-white rounded-xl border border-[#E2E8F0]"></div>
          <div className="flex-1 h-[480px] bg-white rounded-xl border border-[#E2E8F0] w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !draftState) {
    return (
      <div className="p-4 text-center bg-white rounded-xl border border-red-200 space-y-2 max-w-lg mx-auto my-4">
        <div className="size-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="size-5" />
        </div>
        <h3 className="text-[14px] font-bold text-[#111C3A]">Settings Service Unavailable</h3>
        <p className="text-[11px] text-[#64748B]">{error || "Could not retrieve organization settings."}</p>
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
      {/* PAGE HEADER */}
      <header className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold text-[#111C3A] tracking-tight">Settings</h1>
            <span className="text-[9.5px] font-semibold text-[#10B981] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Organization Admin
            </span>
          </div>
          <p className="text-[10px] text-[#64748B]">
            Manage organization details, workspace defaults, branding, notifications, security and preferences.
          </p>
        </div>

        {/* Right-Side Status Badges */}
        <div className="flex items-center gap-1.5 self-start md:self-center">
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-[11px]">
            <Building2 className="size-3.5 text-[#2563EB]" />
            <span className="text-[#64748B] text-[10px]">Org:</span>
            <span className="font-bold text-[#111C3A] text-[10.5px]">{draftState.organization.displayName}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-[11px]">
            <span className="size-1.5 rounded-full bg-[#10B981]"></span>
            <span className="text-[#64748B] text-[10px]">Client:</span>
            <span className="font-bold text-[#111C3A] text-[10.5px]">{draftState.workspace.primaryClient}</span>
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
        <aside className="w-full lg:w-[240px] shrink-0 space-y-2">
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
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-1 text-[11px]">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Quick Admin Links</span>
            <div className="space-y-0.5">
              <Link
                href="/admin/projects"
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#2563EB] font-medium transition-colors"
              >
                <span>Clients Directory</span>
                <ExternalLink className="size-3 text-slate-400" />
              </Link>
              <Link
                href="/admin/team"
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#2563EB] font-medium transition-colors"
              >
                <span>Team Members & Invites</span>
                <ExternalLink className="size-3 text-slate-400" />
              </Link>
              <Link
                href="/admin/roles"
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#2563EB] font-medium transition-colors"
              >
                <span>Roles & Permissions</span>
                <ExternalLink className="size-3 text-slate-400" />
              </Link>
              <Link
                href="/admin/integrations"
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#2563EB] font-medium transition-colors"
              >
                <span>Channel Integrations</span>
                <ExternalLink className="size-3 text-slate-400" />
              </Link>
              <Link
                href="/admin/billing"
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#2563EB] font-medium transition-colors"
              >
                <span>Billing & Subscription</span>
                <ExternalLink className="size-3 text-slate-400" />
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
