import { BellIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserMutations } from "../../data/hooks";

interface NotifyUsersDialogProps {
  userIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

/** Sends a real in-app notification from the platform to the selected people. */
export function NotifyUsersDialog({ userIds, open, onOpenChange, onSent }: NotifyUsersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <NotifyBody userIds={userIds} onClose={() => onOpenChange(false)} onSent={onSent} />}
      </DialogContent>
    </Dialog>
  );
}

function NotifyBody({ userIds, onClose, onSent }: { userIds: string[]; onClose: () => void; onSent?: () => void }) {
  const mutations = useUserMutations();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const ready = title.trim().length > 0 && message.trim().length > 0;

  const send = () => {
    mutations.bulkAction.mutate(
      { action: "notify", userIds, params: { title, message } },
      {
        onSuccess: () => {
          onClose();
          onSent?.();
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-bold flex items-center gap-2">
          <BellIcon className="size-4.5 text-blue-600" />
          <span>Notify {userIds.length === 1 ? "1 user" : `${userIds.length} users`}</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          Appears in each person&apos;s in-app notifications. Deactivated accounts are skipped.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2 text-xs">
        <div className="space-y-1.5">
          <Label htmlFor="notify-title" className="text-xs font-semibold">Title</Label>
          <Input id="notify-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} className="h-8.5 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notify-message" className="text-xs font-semibold">Message</Label>
          <Textarea id="notify-message" value={message} maxLength={1000} rows={4} onChange={(e) => setMessage(e.target.value)} className="text-xs" />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
        <Button type="button" size="sm" className="text-xs" disabled={!ready || mutations.bulkAction.isPending} onClick={send}>
          {mutations.bulkAction.isPending ? "Sending…" : "Send Notification"}
        </Button>
      </DialogFooter>
    </>
  );
}
