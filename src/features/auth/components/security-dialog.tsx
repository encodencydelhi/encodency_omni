"use client";

import {
  KeyRoundIcon,
  LaptopIcon,
  Loader2Icon,
  LogOutIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ReplaceTotpDialog } from "@/features/auth/components/replace-totp-dialog";
import { authService } from "@/features/auth/services/auth-service";
import { TOTP_LENGTH, recoveryCodeSchema, totpSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import type { OwnSessionItem } from "@/types/domain/auth";
import { AuthErrorMessage } from "./auth-message";

function describeFailure(caught: unknown, fallback: string): string {
  if (ApiError.isApiError(caught) && caught.status === 401) return fallback;
  return ApiError.isApiError(caught) ? caught.message : fallback;
}

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface SecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Self-service account security for any signed-in user: change password,
 * manage own sessions, and manage two-factor (replace / disable / rotate
 * recovery codes). Opened from the profile menus of both shells.
 */
export function SecurityDialog({ open, onOpenChange }: SecurityDialogProps) {
  const { user, logout } = useAuth();
  const totpEnabled = user?.totpEnabled ?? false;
  const [tab, setTab] = useState("two-factor");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) setTab("two-factor");
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Security</DialogTitle>
            <DialogDescription>
              Manage your password, active sessions and two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="two-factor" className="flex-1">
                <ShieldCheckIcon aria-hidden />
                Two-factor
              </TabsTrigger>
              <TabsTrigger value="password" className="flex-1">
                <KeyRoundIcon aria-hidden />
                Password
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex-1">
                <LaptopIcon aria-hidden />
                Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="two-factor">
              <TwoFactorTab
                enabled={totpEnabled}
                onReplace={() => setReplaceOpen(true)}
                onDisable={() => setDisableOpen(true)}
              />
            </TabsContent>

            <TabsContent value="password">
              <ChangePasswordTab />
            </TabsContent>

            <TabsContent value="sessions">
              <SessionsTab
                onChanged={() => {
                  /* refetch happens inside the tab */
                }}
                onLogoutAll={() => setLogoutAllOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ReplaceTotpDialog open={replaceOpen} onOpenChange={setReplaceOpen} />

      <DisableTotpDialog open={disableOpen} onOpenChange={setDisableOpen} />

      <AlertDialog open={logoutAllOpen} onOpenChange={setLogoutAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
            <AlertDialogDescription>
              This ends every active session, including this one. You will need to sign in again with your password and authenticator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <LogoutAllAction onDone={() => setLogoutAllOpen(false)} onSuccess={() => { setLogoutAllOpen(false); onOpenChange(false); void logout(); }} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LogoutAllAction({ onDone, onSuccess }: { onDone: () => void; onSuccess: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await authService.logoutAll();
          toast.success("Signed out everywhere.");
          onSuccess();
        } catch (err) {
          toast.error(ApiError.isApiError(err) ? err.message : "Could not sign out everywhere.");
          onDone();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <LogOutIcon aria-hidden />}
      Sign out everywhere
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Two-factor                                                          */
/* ------------------------------------------------------------------ */

function TwoFactorTab({
  enabled,
  onReplace,
  onDisable,
}: {
  enabled: boolean;
  onReplace: () => void;
  onDisable: () => void;
}) {
  const [regenOpen, setRegenOpen] = useState(false);
  return (
    <div className="space-y-4 py-1">
      <div className="flex items-start gap-3 rounded-sm border border-border bg-card p-3">
        <ShieldCheckIcon className={`mt-0.5 size-4 shrink-0 ${enabled ? "text-emerald-600" : "text-amber-600"}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {enabled ? "Two-factor authentication is on" : "Two-factor authentication is off"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {enabled
              ? "Every sign-in requires a code from your authenticator app (or a recovery code)."
              : "You will be asked to set up an authenticator at your next sign-in — two-factor is required."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <Button type="button" variant="outline" onClick={onReplace}>
              <RefreshCcwIcon aria-hidden />
              Replace authenticator
            </Button>
            <Button type="button" variant="outline" onClick={() => setRegenOpen(true)}>
              <KeyRoundIcon aria-hidden />
              New recovery codes
            </Button>
            <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" onClick={onDisable}>
              <ShieldOffIcon aria-hidden />
              Turn off authenticator
            </Button>
          </>
        ) : null}
      </div>

      <RegenerateRecoveryCodesDialog open={regenOpen} onOpenChange={setRegenOpen} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Disable TOTP                                                        */
/* ------------------------------------------------------------------ */

function DisableTotpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [digits, setDigits] = useState<string[]>(Array.from({ length: TOTP_LENGTH }, () => ""));
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMode("totp");
      setDigits(Array.from({ length: TOTP_LENGTH }, () => ""));
      setRecoveryCode("");
      setError("");
    }
    onOpenChange(next);
  };

  const submit = async () => {
    setError("");
    let authorization: { code: string } | { recoveryCode: string };
    if (mode === "totp") {
      const parsed = totpSchema.safeParse({ code: digits.join("") });
      if (!parsed.success) {
        setError("Please enter the complete 6-digit code.");
        return;
      }
      authorization = { code: parsed.data.code };
    } else {
      const parsed = recoveryCodeSchema.safeParse({ code: recoveryCode });
      if (!parsed.success) {
        setError("Please enter a recovery code.");
        return;
      }
      authorization = { recoveryCode: parsed.data.code };
    }
    setIsPending(true);
    try {
      await authService.disableTotp(authorization);
      await refreshUser();
      toast.success("Authenticator turned off. You will set up a new one at your next sign-in.");
      onOpenChange(false);
    } catch (caught) {
      setError(
        describeFailure(
          caught,
          mode === "totp" ? "That code was not accepted. Wait for a new code and try again." : "That recovery code was not accepted. Each code works only once.",
        ),
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Turn off authenticator</DialogTitle>
          <DialogDescription>
            Confirm with your current authenticator (or a recovery code). Two-factor is required, so your next sign-in will ask you to set up a new authenticator. Other sessions are signed out.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-1 rounded-sm border border-border bg-muted p-1" role="tablist" aria-label="Authorisation method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "totp"}
              onClick={() => { setMode("totp"); setError(""); setDigits(Array.from({ length: TOTP_LENGTH }, () => "")); setRecoveryCode(""); }}
              disabled={isPending}
              className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-semibold transition ${mode === "totp" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Authenticator code
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "recovery"}
              onClick={() => { setMode("recovery"); setError(""); setDigits(Array.from({ length: TOTP_LENGTH }, () => "")); setRecoveryCode(""); }}
              disabled={isPending}
              className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-semibold transition ${mode === "recovery" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Recovery code
            </button>
          </div>

          {mode === "totp" ? (
            <div className="grid grid-cols-6 gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={`Digit ${index + 1}`}
                  maxLength={1}
                  value={digit}
                  disabled={isPending}
                  onChange={(event) => {
                    if (!/^\d?$/.test(event.target.value)) return;
                    setDigits((current) => { const next = [...current]; next[index] = event.target.value; return next; });
                    if (event.target.value && index < TOTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
                  }}
                  onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus(); }}
                  className="h-11 w-full min-w-0 rounded-sm border border-input bg-card text-center text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                />
              ))}
            </div>
          ) : (
            <Input
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
              disabled={isPending}
              aria-label="Recovery code"
              className="font-mono tracking-wider"
            />
          )}

          {error ? <AuthErrorMessage message={error} /> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => void submit()}>
              {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : <ShieldOffIcon aria-hidden />}
              Turn off
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Regenerate recovery codes                                           */
/* ------------------------------------------------------------------ */

function RegenerateRecoveryCodesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [digits, setDigits] = useState<string[]>(Array.from({ length: TOTP_LENGTH }, () => ""));
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDigits(Array.from({ length: TOTP_LENGTH }, () => ""));
      setCodes(null);
      setSaved(false);
      setError("");
    }
    onOpenChange(next);
  };

  const authorize = async () => {
    setError("");
    const parsed = totpSchema.safeParse({ code: digits.join("") });
    if (!parsed.success) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setIsPending(true);
    try {
      const result = await authService.regenerateRecoveryCodes(parsed.data.code);
      setCodes(result.recoveryCodes);
      setDigits(Array.from({ length: TOTP_LENGTH }, () => ""));
      toast.success("New recovery codes issued. Previous codes no longer work.");
    } catch (caught) {
      setError(describeFailure(caught, "That code was not accepted. Wait for a new code and try again."));
      setDigits(Array.from({ length: TOTP_LENGTH }, () => ""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{codes ? "Your new recovery codes" : "Generate new recovery codes"}</DialogTitle>
          <DialogDescription>
            {codes
              ? "These are shown only this once. Your previous recovery codes no longer work."
              : "Confirm with a code from your authenticator. Your current recovery codes will stop working."}
          </DialogDescription>
        </DialogHeader>

        {codes === null ? (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={`Digit ${index + 1}`}
                  maxLength={1}
                  value={digit}
                  disabled={isPending}
                  onChange={(event) => {
                    if (!/^\d?$/.test(event.target.value)) return;
                    setDigits((current) => { const next = [...current]; next[index] = event.target.value; return next; });
                    if (event.target.value && index < TOTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
                  }}
                  onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus(); }}
                  className="h-11 w-full min-w-0 rounded-sm border border-input bg-card text-center text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                />
              ))}
            </div>
            {error ? <AuthErrorMessage message={error} /> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" disabled={isPending} onClick={() => void authorize()}>
                {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : <KeyRoundIcon aria-hidden />}
                Generate
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-sm border border-border bg-card p-3 font-mono text-sm text-foreground sm:grid-cols-2">
              {codes.map((code) => (
                <li key={code} className="select-all tracking-wider">{code}</li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
              I have saved my recovery codes somewhere safe.
            </label>
            <div className="flex justify-end">
              <Button type="button" disabled={!saved} onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Change password                                                     */
/* ------------------------------------------------------------------ */

function ChangePasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setIsPending(true);
    try {
      const result = await authService.changePassword({ currentPassword, newPassword });
      toast.success(
        result.revokedSessions > 0
          ? `Password changed. ${result.revokedSessions} other session${result.revokedSessions === 1 ? "" : "s"} signed out.`
          : "Password changed.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError(
        ApiError.isApiError(caught) && caught.status === 401
          ? "The current password is not correct."
          : ApiError.isApiError(caught)
            ? caught.message
            : "Could not change the password.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={isPending}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={isPending}
          required
          minLength={8}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <Input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isPending}
          required
        />
      </div>
      {error ? <AuthErrorMessage message={error} /> : null}
      <p className="text-[11px] leading-4 text-muted-foreground">
        Changing your password signs out every other device. This session stays signed in.
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !currentPassword || newPassword.length < 8 || !confirmPassword}>
          {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : <KeyRoundIcon aria-hidden />}
          Change password
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function SessionsTab({ onChanged, onLogoutAll }: { onChanged: () => void; onLogoutAll: () => void }) {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<OwnSessionItem[] | null>(null);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await authService.listSessions();
        if (cancelled) return;
        setSessions(result.items);
        setError("");
      } catch (caught) {
        if (cancelled) return;
        setError(ApiError.isApiError(caught) ? caught.message : "Could not load your sessions.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const revoke = async (session: OwnSessionItem) => {
    setRevokingId(session.id);
    try {
      if (session.current) {
        // Revoking the current session is a full sign-out: the provider clears local state and navigates.
        await logout();
        return;
      }
      await authService.revokeSession(session.id);
      toast.success("Session ended.");
      setSessions((current) => current?.filter((s) => s.id !== session.id) ?? null);
      onChanged();
    } catch (caught) {
      toast.error(ApiError.isApiError(caught) ? caught.message : "Could not end that session.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-3 py-1">
      {error ? <AuthErrorMessage message={error} /> : null}
      {sessions === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading your sessions…</p>
      ) : null}
      {sessions !== null ? (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-start gap-3 p-3">
              <LaptopIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {session.browser} on {session.device}
                  {session.current ? <span className="ml-2 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">This device</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {session.ipAddress ?? "Unknown IP"} · Last active {timeAgoShort(session.lastSeenAt)} · Expires {timeAgoShort(session.expiresAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-600 hover:text-red-700"
                disabled={revokingId === session.id}
                onClick={() => void revoke(session)}
              >
                {revokingId === session.id ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
                {session.current ? "Sign out" : "End"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" onClick={onLogoutAll}>
          <LogOutIcon aria-hidden />
          Sign out everywhere
        </Button>
      </div>
    </div>
  );
}
