"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { setDisplayPreferences, type DisplayPreferences } from "@/lib/utils/format";

export const DISPLAY_PREFERENCES_EVENT = "omni:display-preferences-changed";

export interface PreferencesResponse {
  /** What this person sees: their own choices where they made one, the platform's regional defaults for the rest. */
  preferences: DisplayPreferences;
  /** False until the person chose something themselves. */
  stored: boolean;
  /** Display settings that come straight from Global Settings > Localization. */
  display?: Pick<DisplayPreferences, "numberLocale" | "currencyDisplay" | "firstDayOfWeek">;
}

export const preferencesApi = {
  get: () => apiClient.request<PreferencesResponse>({ method: "GET", path: "/users/me/preferences" }),
  save: (body: Partial<DisplayPreferences>) => apiClient.request<PreferencesResponse>({ method: "PATCH", path: "/users/me/preferences", body }),
};

/** Applies saved preferences to the formatters and tells the shells to re-render their page. */
export function applyPreferences(res: PreferencesResponse) {
  // An older backend sends no platform defaults: then only a person's own saved choices apply, as before.
  const next = res.display ? { ...res.preferences, ...res.display } : res.stored ? res.preferences : null;
  const changed = setDisplayPreferences(next);
  if (changed && typeof window !== "undefined") window.dispatchEvent(new Event(DISPLAY_PREFERENCES_EVENT));
}

/**
 * Loads the signed-in user's display preferences once per page load and returns a number that changes whenever they
 * change, so a shell can key its page on it and redraw every date and number in the new format.
 */
export function useDisplayPreferencesVersion(enabled: boolean) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(DISPLAY_PREFERENCES_EVENT, bump);
    return () => window.removeEventListener(DISPLAY_PREFERENCES_EVENT, bump);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    preferencesApi
      .get()
      .then((res) => {
        if (!cancelled) applyPreferences(res);
      })
      .catch(() => {
        // Preferences are a nicety: if they cannot be read, the standard formats stay.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return version;
}
