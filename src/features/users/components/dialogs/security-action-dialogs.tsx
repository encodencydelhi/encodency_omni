import { KeyRoundIcon, LogOutIcon, MailIcon, UnlockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserMutations } from "../../data/hooks";
import type { UserAggregate } from "../../data/types";

interface SecurityDialogProps {
  user: UserAggregate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Require2faDialog({ user, open, onOpenChange }: SecurityDialogProps) {
  const mutations = useUserMutations();
  if (!user) return null;

  const currentEnforced = user.security.twoFactorRequired;

  const handleConfirm = () => {
    mutations.require2FA.mutate(
      {
        userId: user.identity.id,
        enforce: !currentEnforced,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <KeyRoundIcon className="size-4.5 text-blue-600" />
            <span>{currentEnforced ? "Relax 2FA Policy Requirement" : "Require 2FA Policy"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure two-factor authentication requirement for {user.identity.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 text-xs text-slate-600 space-y-2">
          {currentEnforced ? (
            <p>
              Are you sure you want to relax mandatory 2FA for <strong>{user.identity.name}</strong>? The user will no longer be blocked if 2FA is not configured.
            </p>
          ) : (
            <p>
              Are you sure you want to enforce mandatory 2FA for <strong>{user.identity.name}</strong>? If 2FA has not been configured yet, their status will update to <em>Required · Not Configured</em> and they will be prompted on next sign-in.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={mutations.require2FA.isPending}
            onClick={handleConfirm}
            className="text-xs bg-blue-600 hover:bg-blue-700"
          >
            {currentEnforced ? "Relax Requirement" : "Enforce 2FA Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequirePasswordResetDialog({ user, open, onOpenChange }: SecurityDialogProps) {
  const mutations = useUserMutations();
  if (!user) return null;

  const handleConfirm = () => {
    mutations.requirePasswordReset.mutate(user.identity.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MailIcon className="size-4.5 text-amber-600" />
            <span>Require Password Reset</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Mandate password rotation for {user.identity.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 text-xs text-slate-600 space-y-2">
          <p>
            An administrative password reset demand will be issued for <strong>{user.identity.email}</strong>.
            The user will be required to create a new password upon their next sign-in attempt.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={mutations.requirePasswordReset.isPending}
            onClick={handleConfirm}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            Issue Password Reset Demand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RevokeSessionsDialog({
  user,
  sessionId,
  open,
  onOpenChange,
}: SecurityDialogProps & { sessionId?: string }) {
  const mutations = useUserMutations();
  if (!user) return null;

  const handleConfirm = () => {
    if (sessionId) {
      mutations.revokeSession.mutate(
        { userId: user.identity.id, sessionId },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      mutations.revokeAllSessions.mutate(user.identity.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isAll = !sessionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
            <LogOutIcon className="size-4.5" />
            <span>{isAll ? "Revoke All Active Sessions" : "Revoke Active Session"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Invalidate session tokens for {user.identity.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 text-xs text-slate-600 space-y-2">
          <p>
            {isAll
              ? `Are you sure you want to revoke all ${user.activeSessionsCount} active sessions for ${user.identity.name}? The user will be immediately logged out of all devices.`
              : `Are you sure you want to revoke this session? The device will be disconnected immediately.`}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={mutations.revokeSession.isPending || mutations.revokeAllSessions.isPending}
            onClick={handleConfirm}
            className="text-xs"
          >
            {isAll ? "Revoke All Sessions" : "Revoke Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnlockAccountDialog({ user, open, onOpenChange }: SecurityDialogProps) {
  const mutations = useUserMutations();
  if (!user) return null;

  const handleConfirm = () => {
    mutations.unlockAccount.mutate(user.identity.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-600">
            <UnlockIcon className="size-4.5" />
            <span>Unlock User Account</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Clear failed login attempts and restore sign-in ability for {user.identity.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 text-xs text-slate-600 space-y-2">
          <p>
            This account is currently locked due to {user.security.failedLoginAttempts} consecutive failed password entries.
            Unlocking will clear the lock flag and reset the failed attempts counter.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={mutations.unlockAccount.isPending}
            onClick={handleConfirm}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Unlock Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
