"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/components/auth-provider";
import { userProfileApi } from "@/features/auth/services/user-profile-api";
import { userAvatarApi, USER_AVATAR_LIMITS } from "@/features/auth/services/user-avatar-api";
import { ApiError } from "@/types/api";
import { getInitials } from "@/lib/utils/format";

/** Lets any signed-in person set their name, phone, and profile avatar across the platform. */
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
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!USER_AVATAR_LIMITS.mimeTypes.includes(file.type as any)) {
      toast.error("Please choose a PNG, JPEG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > USER_AVATAR_LIMITS.maxBytes) {
      toast.error("Image must be smaller than 2 MB.");
      e.target.value = "";
      return;
    }

    setAvatarLoading(true);
    try {
      await userAvatarApi.upload(file);
      await refreshUser();
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "Failed to upload avatar.");
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    try {
      await userAvatarApi.remove();
      await refreshUser();
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "Failed to remove avatar.");
    } finally {
      setAvatarLoading(false);
    }
  };

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
        <DialogDescription>Update your avatar and personal details shown across the platform.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 text-sm">
        {/* Avatar preview and actions */}
        <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/40">
          <div className="relative shrink-0">
            <Avatar className="size-16 border-2 border-background shadow-xs">
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={name || "User"} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                {getInitials(name || user?.email || "U")}
              </AvatarFallback>
            </Avatar>
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="size-5 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold text-foreground">Profile Picture</p>
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG or WebP (max 2 MB).
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept={USER_AVATAR_LIMITS.mimeTypes.join(",")}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarLoading}
                className="h-7 text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3" />
                {user?.avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {user?.avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={avatarLoading}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

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
