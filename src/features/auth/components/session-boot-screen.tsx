import { EnCodencyLogo } from "@/components/layout/brand-mark";

/**
 * Shown while the session is being restored. It mirrors the shell's chrome so
 * the transition into the panel does not flash a blank page.
 */
export function SessionBootScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <EnCodencyLogo height={44} priority />
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Restoring your session
        </div>
      </div>
    </div>
  );
}
