"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { automationApi } from "../../data/automation-api";
import { AutomationSettingsState, DEFAULT_AUTOMATION_SETTINGS } from "../../data/settings-types";

export function useAutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettingsState>(DEFAULT_AUTOMATION_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AutomationSettingsState>(DEFAULT_AUTOMATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    automationApi.getSettings()
      .then((data) => {
        if (!mounted) return;
        setSettings(data);
        setSavedSettings(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (mounted) setLoadError(err instanceof Error ? err.message : "Automation settings could not be loaded.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => { setIsLoading(true); setReloadKey((k) => k + 1); }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  const updateSection = useCallback(<K extends keyof AutomationSettingsState>(
    section: K,
    updates: Partial<AutomationSettingsState[K]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      const updated = await automationApi.updateSettings(settings);
      setSettings(updated);
      setSavedSettings(updated);
      toast.success("Automation settings saved successfully!", {
        description: "All workflows, routing rules, and safety controls have been updated.",
      });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  /** Saves one section's fields immediately, keeping any other unsaved edits on screen. */
  const applyNow = useCallback(async <K extends keyof AutomationSettingsState>(section: K, updates: Partial<AutomationSettingsState[K]>) => {
    try {
      const nextSection = { ...(savedSettings[section] as object), ...(updates as object) };
      const updated = await automationApi.updateSettings({ [section]: nextSection } as Partial<AutomationSettingsState>);
      setSavedSettings(updated);
      setSettings((prev) => ({ ...prev, meta: updated.meta, [section]: { ...(prev[section] as object), ...(updates as object) } }));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the change.");
      return false;
    }
  }, [savedSettings]);

  const discardChanges = useCallback(() => {
    setSettings(JSON.parse(JSON.stringify(savedSettings)));
    toast.info("Unsaved changes discarded.");
  }, [savedSettings]);

  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await automationApi.resetSettings();
      setSettings(res);
      setSavedSettings(res);
      toast.success("Settings reset to defaults successfully.");
    } catch (err) {
      toast.error("Failed to reset settings.");
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Compute reactive configuration health score
  const healthCalculation = useMemo(() => {
    let score = 0;
    const checks: Array<{ label: string; passed: boolean }> = [];

    // Check 1: General setup
    const generalValid = !!settings.general.timezone && settings.general.allowedChannels.length > 0;
    checks.push({ label: "Core general settings configured", passed: generalValid });
    if (generalValid) score += 20;

    // Check 2: Execution rules
    const executionValid = settings.execution.maxConcurrentRunsPerClient > 0 && settings.execution.globalRateLimiterRps > 0;
    checks.push({ label: "Concurrency & rate limits set", passed: executionValid });
    if (executionValid) score += 15;

    // Check 3: Retry & DLQ
    const retryValid = settings.retry.maxRetryAttempts > 0 && !!settings.retry.escalationAction;
    checks.push({ label: "Retry policy & DLQ configured", passed: retryValid });
    if (retryValid) score += 15;

    // Check 4: Notifications
    const notifValid = settings.notifications.enableInAppAlerts || settings.notifications.enableEmailAlerts || settings.notifications.enableWhatsAppAlerts;
    checks.push({ label: "Alert channels active", passed: notifValid });
    if (notifValid) score += 15;

    // Check 5: Business hours
    const bhValid = settings.businessHours.enabled;
    checks.push({ label: "Business hours & DND enabled", passed: bhValid });
    if (bhValid) score += 15;

    // Check 6: Safety controls
    const safetyValid = settings.safety.circuitBreakerEnabled && settings.safety.maskPiiInLogs;
    checks.push({ label: "Circuit breaker & PII masking enabled", passed: safetyValid });
    if (safetyValid) score += 20;

    return {
      score,
      rating: score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs Review",
      color: score >= 85 ? "#10B981" : score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444",
      checks,
    };
  }, [settings]);

  return {
    settings,
    savedSettings,
    isLoading,
    loadError,
    reload,
    isSaving,
    isDirty,
    updateSection,
    applyNow,
    saveSettings,
    discardChanges,
    resetToDefaults,
    health: healthCalculation,
  };
}
