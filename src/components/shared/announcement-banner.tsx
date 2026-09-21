import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { cn } from "@/lib/utils/cn";

interface AnnouncementBannerProps {
  title: string;
  message: string;
  /** "active" reads as a warning; anything else as information. */
  status: "active" | "upcoming";
  /** Already formatted, e.g. "13 Sep 2026, 08:30 PM UTC to 10:30 PM UTC". */
  window?: string;
  audience?: string;
  onDismiss?: () => void;
  children?: ReactNode;
  className?: string;
}

/**
 * The one platform announcement banner: used live in the application shell and
 * in the Global Settings preview, so a preview can never drift from what people see.
 * It is built on the shared AlertBanner and only informs - it says nothing about
 * whether any part of the platform is actually unavailable.
 */
export function AnnouncementBanner({ title, message, status, window, audience, onDismiss, children, className }: AnnouncementBannerProps) {
  return (
    <AlertBanner
      tone={status === "active" ? "warning" : "info"}
      title={title}
      className={cn("rounded-sm", className)}
      action={
        onDismiss ? (
          <button type="button" onClick={onDismiss} aria-label="Dismiss announcement" className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground">
            <XIcon className="size-4" />
          </button>
        ) : undefined
      }
    >
      <p>{message}</p>
      {window || audience ? (
        <p className="mt-0.5 text-2xs">
          {status === "active" ? "In progress" : "Upcoming"}
          {window ? `: ${window}` : ""}
          {audience ? ` - for ${audience}` : ""}
        </p>
      ) : null}
      {children}
    </AlertBanner>
  );
}
