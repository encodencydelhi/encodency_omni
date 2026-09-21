"use client";

import { useState } from "react";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { formatUtc } from "../data/formatting";
import { useMaintenanceBanner } from "../data/hooks";
import { AUDIENCE_OPTIONS } from "../data/registry";

const STORAGE_KEY = "omni.global-settings.dismissed-announcement.v1";

export function audienceLabels(audience: readonly string[]): string {
  return audience.map((item) => AUDIENCE_OPTIONS.find((option) => option.value === item)?.label ?? item.replace(/_/g, " ")).join(", ").toLowerCase();
}

/**
 * Shows the configured maintenance announcement in the Super Admin shell.
 * The shell is used by platform staff, so it honours the "platform staff"
 * audience only. The banner is information: it never blocks anything.
 */
export function MaintenanceBannerHost() {
  const banner = useMaintenanceBanner("platform_staff");
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  if (!banner) return null;
  const id = `${banner.title}|${banner.startsAt}|${banner.endsAt}`;
  if (dismissed === id) return null;

  return (
    <div className="px-4 pt-3 sm:px-5 xl:px-6" data-testid="maintenance-banner">
      <AnnouncementBanner
        title={banner.title}
        message={banner.message}
        status={banner.status}
        window={`${formatUtc(banner.startsAt)} to ${formatUtc(banner.endsAt)}`}
        audience={audienceLabels(banner.audience)}
        onDismiss={
          banner.dismissible
            ? () => {
                setDismissed(id);
                try {
                  window.sessionStorage.setItem(STORAGE_KEY, id);
                } catch {
                  // Dismissal then lasts only until reload.
                }
              }
            : undefined
        }
      >
        {banner.statusPageUrl ? (
          <p className="mt-0.5 text-2xs">
            <a href={banner.statusPageUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Status Page</a>
          </p>
        ) : null}
      </AnnouncementBanner>
    </div>
  );
}
