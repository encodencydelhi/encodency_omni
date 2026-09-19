import { SaveIcon, UserCogIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useUnsavedGuard } from "../../hooks/use-unsaved-guard";
import { useUserMutations } from "../../data/hooks";
import type { UserAggregate } from "../../data/types";

interface EditUserIdentityDrawerProps {
  user: UserAggregate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserIdentityDrawer({
  user,
  open,
  onOpenChange,
}: EditUserIdentityDrawerProps) {
  const mutations = useUserMutations();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.identity.name);
      setPhone(user.identity.phone ?? "");
      setAvatarUrl(user.identity.avatarUrl ?? "");
      setTheme(user.identity.themePreference ?? "system");
      setNotifications(user.identity.notificationsEnabled ?? true);
    }
  }, [user]);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      name.trim() !== user.identity.name ||
      (phone.trim() || null) !== (user.identity.phone ?? null) ||
      (avatarUrl.trim() || null) !== (user.identity.avatarUrl ?? null) ||
      theme !== (user.identity.themePreference ?? "system") ||
      notifications !== (user.identity.notificationsEnabled ?? true)
    );
  }, [user, name, phone, avatarUrl, theme, notifications]);

  const { requestClose, guardDialog } = useUnsavedGuard({
    dirty,
    onDiscard: () => onOpenChange(false),
    label: "user identity changes",
  });

  if (!user) return null;

  const handleSave = () => {
    mutations.updateUserIdentity.mutate(
      {
        userId: user.identity.id,
        name: name.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        themePreference: theme,
        notificationsEnabled: notifications,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border bg-slate-50/60 dark:bg-slate-900">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <UserCogIcon className="size-4.5 text-blue-600" />
              <span className="text-blue-600">Edit User Identity</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-white">
              Update personal identity attributes and system preferences for {user.identity.name}.
            </SheetDescription>
          </SheetHeader>

        <SheetBody className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-semibold">
              Full Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email-readonly" className="text-xs font-semibold">
              Email Address <span className="text-slate-400 font-normal">(Primary Identity Key)</span>
            </Label>
            <Input
              id="edit-email-readonly"
              value={user.identity.email}
              readOnly
              disabled
              className="h-8.5 text-xs bg-slate-100 text-slate-500"
            />
            <p className="text-xs text-slate-400">
              Email address changes require a multi-party identity verification workflow and cannot be altered directly.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="text-xs font-semibold">
              Phone Number
            </Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="h-8.5 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-avatar" className="text-xs font-semibold">
              Avatar Image URL
            </Label>
            <Input
              id="edit-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="h-8.5 text-xs"
            />
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <span className="font-semibold text-slate-800 block">
              Display & Delivery Preferences
            </span>

            <div className="space-y-1.5">
              <Label htmlFor="theme-select" className="text-xs">
                Interface Color Scheme
              </Label>
              <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                <SelectTrigger id="theme-select" className="h-8.5 text-xs">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Synchronized</SelectItem>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label htmlFor="notif-toggle" className="text-xs font-semibold cursor-pointer">
                  Security & Operational Notifications
                </Label>
                <p className="text-xs text-slate-400">
                  Allow tenant alerts and password notifications to be sent to this user.
                </p>
              </div>
              <Switch
                id="notif-toggle"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </div>
        </SheetBody>

        <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestClose}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!name.trim() || mutations.updateUserIdentity.isPending}
            onClick={handleSave}
            className="text-xs gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <SaveIcon className="size-3.5" />
            <span>Save Profile</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    {guardDialog}
    </>
  );
}
