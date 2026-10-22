import type { ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";

interface PreviewBannerProps {
  /** What this module is, e.g. "Notifications". */
  module: string;
  /** What is saved and what is not connected yet. Plain words, no jargon. */
  children: ReactNode;
  className?: string;
}

/**
 * Marks a module whose screens and stored records work, but whose real engine behind them is not
 * built yet. Shown at the top of the module so nobody mistakes saved settings for live behaviour.
 */
export function PreviewBanner({ module, children, className }: PreviewBannerProps) {
  return (
    <AlertBanner tone="warning" title={`${module} is a preview`} className={className}>
      {children}
    </AlertBanner>
  );
}
