"use client";

import { AlertTriangleIcon, LockIcon, RefreshCwIcon, WifiOffIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/types/api";

interface ErrorPresentation {
  icon: LucideIcon;
  title: string;
  description: string;
  canRetry: boolean;
}

/** Maps a transport failure onto language an operator can act on. */
function describe(error: unknown): ErrorPresentation {
  if (ApiError.isApiError(error)) {
    switch (error.code) {
      case "FORBIDDEN":
      case "UNAUTHORIZED":
        return {
          icon: LockIcon,
          title: "You do not have access to this data",
          description: "Your role does not include permission for this module. Ask a Super Admin to grant it.",
          canRetry: false,
        };
      case "NOT_FOUND":
        return {
          icon: AlertTriangleIcon,
          title: "Not found",
          description: "The record you are looking for no longer exists or has been moved.",
          canRetry: false,
        };
      case "NETWORK_ERROR":
        return {
          icon: WifiOffIcon,
          title: "Cannot reach the platform API",
          description: "The request did not complete. Check your connection and try again.",
          canRetry: true,
        };
      case "SERVICE_UNAVAILABLE":
        return {
          icon: AlertTriangleIcon,
          title: "Service temporarily unavailable",
          description: "The platform API is not responding. This is usually brief.",
          canRetry: true,
        };
      default:
        return {
          icon: AlertTriangleIcon,
          title: "Something went wrong",
          description: error.message,
          canRetry: true,
        };
    }
  }

  return {
    icon: AlertTriangleIcon,
    title: "Something went wrong",
    description: "An unexpected error occurred while loading this data.",
    canRetry: true,
  };
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { icon: Icon, title, description, canRetry } = describe(error);

  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-danger-subtle text-danger">
          <Icon className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mx-auto max-w-sm text-[0.8125rem] text-muted-foreground">{description}</p>
        </div>
        {canRetry && onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
            <RefreshCwIcon />
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
