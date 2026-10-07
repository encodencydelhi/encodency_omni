"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/components/auth-provider";
import { userProfileApi } from "@/features/auth/services/user-profile-api";
import { ApiError } from "@/types/api";

/** Lets any signed-in person set the name (and phone) that is shown across the platform. */
export function MyProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <Body onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user && user.name !== user.email ? user.name : "");
  const [phone, setPhone] = useState((user as { phone?: string | null } | null)?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await userProfileApi.updateMe({ name: name.trim(), phone: phone.trim() || null });
      await refreshUser();
      toast.success("Profile updated.");
      onClose();
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>My Profile</DialogTitle>
        <DialogDescription>This name appears in the top bar, team lists and activity.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2 text-sm">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Your full name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={user?.email ?? ""} disabled readOnly />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">Phone (optional)</Label>
          <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={saving || name.trim().length < 1} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </>
  );
}
