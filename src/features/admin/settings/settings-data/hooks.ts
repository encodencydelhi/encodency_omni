"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AllSettingsState, SettingsSectionId, NotificationChannel } from "./types";
import { SettingsRepository } from "./repository";

export function useSettings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Saved canonical state
  const [savedState, setSavedState] = useState<AllSettingsState | null>(null);

  // Working draft state
  const [draftState, setDraftState] = useState<AllSettingsState | null>(null);

  // Active section
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("organization");

  // Navigation guard state
  const [pendingSection, setPendingSection] = useState<SettingsSectionId | null>(null);
  const [guardDialogOpen, setGuardDialogOpen] = useState<boolean>(false);

  // Saving indicator
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SettingsRepository.getSettings();
      setSavedState(JSON.parse(JSON.stringify(data)));
      setDraftState(JSON.parse(JSON.stringify(data)));
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setError(err?.message || "Unable to load organization settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Dirty detection per section
  const isSectionDirty = useCallback(
    (section: SettingsSectionId): boolean => {
      if (!savedState || !draftState) return false;
      switch (section) {
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
    },
    [savedState, draftState]
  );

  const isCurrentSectionDirty = useMemo(() => {
    return isSectionDirty(activeSection);
  }, [isSectionDirty, activeSection]);

  const hasAnyUnsavedChanges = useMemo(() => {
    if (!savedState || !draftState) return false;
    return (
      isSectionDirty("organization") ||
      isSectionDirty("workspace") ||
      isSectionDirty("branding") ||
      isSectionDirty("notifications") ||
      isSectionDirty("security") ||
      isSectionDirty("preferences") ||
      isSectionDirty("data-privacy")
    );
  }, [savedState, draftState, isSectionDirty]);

  // Section switcher with guard
  const requestSectionChange = (target: SettingsSectionId) => {
    if (target === activeSection) return;
    if (isCurrentSectionDirty) {
      setPendingSection(target);
      setGuardDialogOpen(true);
    } else {
      setActiveSection(target);
    }
  };

  const confirmDiscardAndNavigate = () => {
    if (savedState && pendingSection) {
      setDraftState(JSON.parse(JSON.stringify(savedState)));
      setActiveSection(pendingSection);
      setPendingSection(null);
      setGuardDialogOpen(false);
      toast.info("Unsaved changes discarded.");
    }
  };

  const confirmSaveAndNavigate = async () => {
    if (pendingSection) {
      const success = await saveChanges();
      if (success) {
        setActiveSection(pendingSection);
        setPendingSection(null);
        setGuardDialogOpen(false);
      }
    }
  };

  const cancelNavigation = () => {
    setPendingSection(null);
    setGuardDialogOpen(false);
  };

  // Discard current section changes
  const discardChanges = () => {
    if (!savedState || !draftState) return;
    const secKey = activeSection === "data-privacy" ? "dataPrivacy" : activeSection;
    if (secKey !== "audit" && secKey !== "danger" && secKey in savedState) {
      setDraftState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [secKey]: JSON.parse(JSON.stringify((savedState as any)[secKey])),
        };
      });
    }
    toast.info("Changes discarded.");
  };

  // Save changes
  const saveChanges = async (): Promise<boolean> => {
    if (!draftState) return false;
    try {
      setIsSaving(true);
      let activityNote: { action: string; section: SettingsSectionId; setting: string } | undefined;

      switch (activeSection) {
        case "organization":
          activityNote = { action: "Updated organization profile", section: "organization", setting: "Profile Details" };
          break;
        case "workspace":
          activityNote = { action: "Updated workspace defaults", section: "workspace", setting: "Workspace Config" };
          break;
        case "branding":
          activityNote = { action: "Updated branding settings & assets", section: "branding", setting: "Visual Brand Identity" };
          break;
        case "notifications":
          activityNote = { action: "Updated notification channel matrix", section: "notifications", setting: "Channel Matrix" };
          break;
        case "security":
          activityNote = { action: "Updated organization security policies", section: "security", setting: "Security Policy" };
          break;
        case "preferences":
          activityNote = { action: "Updated workspace preferences & formats", section: "preferences", setting: "User Preferences" };
          break;
        case "data-privacy":
          activityNote = { action: "Updated data retention & privacy policies", section: "data-privacy", setting: "Privacy Policy" };
          break;
      }

      const updated = await SettingsRepository.saveSettings(draftState, activityNote);
      setSavedState(JSON.parse(JSON.stringify(updated)));
      setDraftState(JSON.parse(JSON.stringify(updated)));
      toast.success("Settings saved successfully.");
      return true;
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      toast.error(err?.message || "Failed to save settings.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Section-specific updaters
  const updateOrganization = (partial: Partial<AllSettingsState["organization"]>) => {
    setDraftState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        organization: {
          ...prev.organization,
          ...partial,
          address: partial.address ? { ...prev.organization.address, ...partial.address } : prev.organization.address,
        },
      };
    });
  };

  const updateWorkspace = (partial: Partial<AllSettingsState["workspace"]>) => {
    setDraftState((prev) => {
      if (!prev) return null;
      return { ...prev, workspace: { ...prev.workspace, ...partial } };
    });
  };

  const updateBranding = (partial: Partial<AllSettingsState["branding"]>) => {
    setDraftState((prev) => {
      if (!prev) return null;
      return { ...prev, branding: { ...prev.branding, ...partial } };
    });
  };

  const updateNotificationItem = (id: string, channel: NotificationChannel, value: boolean) => {
    setDraftState((prev) => {
      if (!prev) return null;
      const updatedList = prev.notifications.map((item) => {
        if (item.id === id) {
          return { ...item, [channel]: value };
        }
        return item;
      });
      return { ...prev, notifications: updatedList };
    });
  };

  const updateSecurity = (partial: Partial<AllSettingsState["security"]>) => {
    setDraftState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        security: {
          ...prev.security,
          ...partial,
          authentication: partial.authentication ? { ...prev.security.authentication, ...partial.authentication } : prev.security.authentication,
          sessionPolicy: partial.sessionPolicy ? { ...prev.security.sessionPolicy, ...partial.sessionPolicy } : prev.security.sessionPolicy,
          accessPolicy: partial.accessPolicy ? { ...prev.security.accessPolicy, ...partial.accessPolicy } : prev.security.accessPolicy,
          sensitiveActionProtection: partial.sensitiveActionProtection
            ? { ...prev.security.sensitiveActionProtection, ...partial.sensitiveActionProtection }
            : prev.security.sensitiveActionProtection,
        },
      };
    });
  };

  const updatePreferences = (partial: Partial<AllSettingsState["preferences"]>) => {
    setDraftState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          ...partial,
          locale: partial.locale ? { ...prev.preferences.locale, ...partial.locale } : prev.preferences.locale,
          tables: partial.tables ? { ...prev.preferences.tables, ...partial.tables } : prev.preferences.tables,
          exports: partial.exports ? { ...prev.preferences.exports, ...partial.exports } : prev.preferences.exports,
        },
      };
    });
  };

  const updateDataPrivacy = (partial: Partial<AllSettingsState["dataPrivacy"]>) => {
    setDraftState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        dataPrivacy: {
          ...prev.dataPrivacy,
          ...partial,
          retention: partial.retention ? { ...prev.dataPrivacy.retention, ...partial.retention } : prev.dataPrivacy.retention,
          privacy: partial.privacy ? { ...prev.dataPrivacy.privacy, ...partial.privacy } : prev.dataPrivacy.privacy,
        },
      };
    });
  };

  const handleResetPreferences = async () => {
    try {
      const resetVals = await SettingsRepository.resetPreferences();
      setDraftState((prev) => (prev ? { ...prev, preferences: resetVals } : null));
      setSavedState((prev) => (prev ? { ...prev, preferences: resetVals } : null));
      toast.success("Workspace preferences reset to default.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset preferences.");
    }
  };

  const handleRequestExport = async (categories: string[]) => {
    try {
      const req = await SettingsRepository.requestExport(categories);
      await fetchSettings();
      toast.success("Data export initiated. You will be notified when the download is ready.");
      return req;
    } catch (err: any) {
      toast.error(err?.message || "Failed to request export.");
      throw err;
    }
  };

  const handleTransferOwnership = async (newOwnerName: string, newOwnerEmail: string) => {
    try {
      await SettingsRepository.transferOwnership(newOwnerName, newOwnerEmail);
      await fetchSettings();
      toast.success(`Organization ownership transferred to ${newOwnerName}.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer ownership.");
      throw err;
    }
  };

  const handleDeactivate = async () => {
    try {
      await SettingsRepository.deactivateOrganization();
      toast.warning("Organization scheduled for deactivation.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate organization.");
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      await SettingsRepository.deleteOrganization();
      toast.error("Organization deleted. Redirecting...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete organization.");
    }
  };

  return {
    loading,
    error,
    savedState,
    draftState,
    activeSection,
    requestSectionChange,
    setActiveSection,
    isCurrentSectionDirty,
    hasAnyUnsavedChanges,
    isSaving,
    saveChanges,
    discardChanges,
    // guard dialog
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
    refetch: fetchSettings,
  };
}
