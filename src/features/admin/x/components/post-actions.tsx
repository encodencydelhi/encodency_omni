"use client";

/**
 * One definition of what you can do to a post, shared by the content table,
 * the scheduling queue, the overview cards and the post detail page.
 *
 * Every entry either runs, navigates, opens a dialog, or is disabled with a
 * stated reason — the menu can never contain something inert.
 */

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Copy,
  ExternalLink,
  Eye,
  ListChecks,
  Pencil,
  RotateCcw,
  Send,
  SquarePen,
  Trash2,
  XCircle,
} from "lucide-react";
import { xRoutes } from "../lib/constants";
import { postSummary } from "../lib/format";
import { useX } from "../store/x-store";
import type { XPost } from "../x-data/types";
import { ApprovalDialog, ScheduleDialog, SubmitApprovalDialog } from "./dialogs";
import { ConfirmDialog, type MenuItem } from "./ui";

type Confirm =
  | { kind: "delete"; post: XPost }
  | { kind: "cancel"; post: XPost }
  | { kind: "publish"; post: XPost }
  | { kind: "archive"; post: XPost; archived: boolean }
  | null;

export interface PostActionsApi {
  /** Menu items for a post, ready to hand to <ActionMenu items={...} />. */
  menuItems: (post: XPost, options?: { hideView?: boolean }) => (MenuItem | "separator")[];
  openSchedule: (post: XPost) => void;
  openEdit: (post: XPost) => void;
  openSubmitApproval: (post: XPost) => void;
  openReview: (post: XPost, action: "approved" | "changes_requested" | "rejected") => void;
  confirmPublish: (post: XPost) => void;
  confirmCancel: (post: XPost) => void;
  confirmDelete: (post: XPost) => void;
  retry: (post: XPost) => Promise<boolean>;
  duplicate: (post: XPost) => Promise<void>;
  /** Mount this once per page — it renders every dialog the actions open. */
  dialogs: ReactNode;
}

export function usePostActions(): PostActionsApi {
  const router = useRouter();
  const { account, can, settings, publishNow, cancelSchedule, deletePost, archivePost, retryPost, duplicatePost } = useX();

  const [scheduleTarget, setScheduleTarget] = useState<XPost | null>(null);
  const [submitTarget, setSubmitTarget] = useState<XPost | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ post: XPost; action: "approved" | "changes_requested" | "rejected" } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const openEdit = (post: XPost) => router.push(`${xRoutes.content}?compose=${post.id}`);

  const duplicate = async (post: XPost) => {
    const copy = await duplicatePost(post.id);
    if (copy) router.push(`${xRoutes.content}?compose=${copy.id}`);
  };

  const menuItems: PostActionsApi["menuItems"] = (post, options) => {
    const isDraft = post.status === "draft";
    const isScheduled = post.status === "scheduled";
    const isFailed = post.status === "failed";
    const isPublished = post.status === "published";
    const isArchived = post.status === "archived";
    const editable = isDraft || isScheduled || isFailed;
    const awaitingApproval = settings.approvals.required && post.approval !== "approved" && post.approval !== "none";

    return [
      { label: "View details", icon: Eye, href: xRoutes.post(post.id), hidden: options?.hideView },
      { label: "Open on X", icon: ExternalLink, href: xRoutes.postOnX(account.handle, post.id), external: true, hidden: !isPublished },
      "separator",
      { label: isDraft ? "Edit draft" : "Edit post", icon: Pencil, onSelect: () => openEdit(post), gate: can.canCreatePost, hidden: !editable },
      { label: "Duplicate", icon: Copy, onSelect: () => void duplicate(post), gate: can.canCreatePost, hidden: isArchived },
      {
        label: isScheduled ? "Reschedule" : "Schedule",
        icon: CalendarClock,
        onSelect: () => setScheduleTarget(post),
        gate: can.canSchedulePost,
        hidden: isPublished || isArchived,
        disabledReason: awaitingApproval ? "This post needs approval before it can be scheduled." : undefined,
      },
      {
        label: "Publish now",
        icon: Send,
        onSelect: () => setConfirm({ kind: "publish", post }),
        gate: can.canCreatePost,
        hidden: isPublished || isArchived,
        disabledReason: awaitingApproval ? "This post needs approval before it can be published." : undefined,
      },
      { label: "Retry publishing", icon: RotateCcw, onSelect: () => void retryPost(post.id), gate: can.canCreatePost, hidden: !isFailed },
      "separator",
      {
        label: "Submit for approval",
        icon: ListChecks,
        onSelect: () => setSubmitTarget(post),
        gate: can.canCreatePost,
        hidden: !settings.approvals.required || post.approval === "pending" || isPublished || isArchived,
      },
      {
        label: "Approve",
        icon: ListChecks,
        onSelect: () => setReviewTarget({ post, action: "approved" }),
        gate: can.canApprove,
        hidden: post.approval !== "pending",
      },
      {
        label: "Request changes",
        icon: SquarePen,
        onSelect: () => setReviewTarget({ post, action: "changes_requested" }),
        gate: can.canApprove,
        hidden: post.approval !== "pending",
      },
      "separator",
      {
        label: "Remove from queue",
        icon: XCircle,
        onSelect: () => setConfirm({ kind: "cancel", post }),
        gate: can.canSchedulePost,
        hidden: !isScheduled,
      },
      {
        label: isArchived ? "Restore from archive" : "Archive",
        icon: isArchived ? ArchiveRestore : Archive,
        onSelect: () => setConfirm({ kind: "archive", post, archived: !isArchived }),
        gate: can.canCreatePost,
      },
      {
        label: isPublished ? "Delete from X" : "Delete",
        icon: Trash2,
        danger: true,
        onSelect: () => setConfirm({ kind: "delete", post }),
        gate: isPublished ? can.canDeletePost : can.canCreatePost,
      },
    ];
  };

  const dialogs = (
    <>
      <ScheduleDialog post={scheduleTarget} open={scheduleTarget !== null} onOpenChange={(open) => !open && setScheduleTarget(null)} />
      <SubmitApprovalDialog post={submitTarget} open={submitTarget !== null} onOpenChange={(open) => !open && setSubmitTarget(null)} />
      <ApprovalDialog
        post={reviewTarget?.post ?? null}
        action={reviewTarget?.action ?? "approved"}
        open={reviewTarget !== null}
        onOpenChange={(open) => !open && setReviewTarget(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === "publish"}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive={false}
        title="Publish this post now?"
        description={
          confirm?.kind === "publish" ? (
            <>
              It will go out to {account.handle} immediately and be visible to everyone. “{postSummary(confirm.post.text, 70)}”
            </>
          ) : null
        }
        confirmLabel="Publish now"
        onConfirm={() => (confirm?.kind === "publish" ? publishNow(confirm.post.id) : false)}
      />

      <ConfirmDialog
        open={confirm?.kind === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Remove this post from the queue?"
        description={
          confirm?.kind === "cancel" ? (
            <>
              “{postSummary(confirm.post.text, 70)}” will stop being scheduled and move back to drafts. Nothing is deleted.
            </>
          ) : null
        }
        confirmLabel="Remove from queue"
        onConfirm={() => (confirm?.kind === "cancel" ? cancelSchedule(confirm.post.id) : false)}
      />

      <ConfirmDialog
        open={confirm?.kind === "archive"}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive={false}
        title={confirm?.kind === "archive" && confirm.archived ? "Archive this post?" : "Restore this post?"}
        description={
          confirm?.kind === "archive" ? (
            confirm.archived ? (
              <>
                “{postSummary(confirm.post.text, 70)}” will be hidden from the default content views. It stays live on X — archiving only
                affects OmniPlatform.
              </>
            ) : (
              <>“{postSummary(confirm.post.text, 70)}” will appear in the content views again.</>
            )
          ) : null
        }
        confirmLabel={confirm?.kind === "archive" && confirm.archived ? "Archive" : "Restore"}
        onConfirm={() => (confirm?.kind === "archive" ? archivePost(confirm.post.id, confirm.archived) : false)}
      />

      <ConfirmDialog
        open={confirm?.kind === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "delete" && confirm.post.status === "published" ? "Delete this post from X?" : "Delete this post?"}
        description={
          confirm?.kind === "delete" ? (
            confirm.post.status === "published" ? (
              <>
                This permanently removes the post from X. Replies and reposts of it disappear too, and the engagement it earned can&apos;t be
                recovered.
              </>
            ) : (
              <>This permanently deletes the draft from OmniPlatform. It was never published, so nothing changes on X.</>
            )
          ) : null
        }
        affected={confirm?.kind === "delete" ? [postSummary(confirm.post.text, 90)] : undefined}
        confirmText={confirm?.kind === "delete" && confirm.post.status === "published" ? "delete" : undefined}
        confirmLabel="Delete post"
        onConfirm={() => (confirm?.kind === "delete" ? deletePost(confirm.post.id) : false)}
      />
    </>
  );

  return {
    menuItems,
    openSchedule: setScheduleTarget,
    openEdit,
    openSubmitApproval: setSubmitTarget,
    openReview: (post, action) => setReviewTarget({ post, action }),
    confirmPublish: (post) => setConfirm({ kind: "publish", post }),
    confirmCancel: (post) => setConfirm({ kind: "cancel", post }),
    confirmDelete: (post) => setConfirm({ kind: "delete", post }),
    retry: (post) => retryPost(post.id),
    duplicate,
    dialogs,
  };
}
