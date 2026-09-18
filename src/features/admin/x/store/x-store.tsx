"use client";

/**
 * Session state for the X workspace.
 *
 * The store is the source of truth while the tab is open. It never touches the
 * mock data directly — every read and write goes through the repository, so
 * attaching the real backend is a one-file change.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { addMinutes, differenceInMinutes, parseISO } from "date-fns";
import { toast } from "sonner";
import { evaluateCapabilities } from "../x-data/capability-provider";
import {
  XServiceError,
  getXRepository,
  type PostDraft,
  type UploadInput,
  type XRepository,
} from "../x-data/repository";
import { xRoutes } from "../lib/constants";
import { postSummary } from "../lib/format";
import type {
  ActivityEvent,
  ApprovalEvent,
  AudienceData,
  AudienceMember,
  Campaign,
  CapabilityMap,
  ConnectionInfo,
  ConnectionState,
  ISODate,
  InternalNote,
  Priority,
  TeamMember,
  WorkspaceNotification,
  WorkspaceRole,
  XAccount,
  XPermission,
  XMedia,
  XMention,
  XPost,
  XScope,
  XSettings,
  XSnapshot,
} from "../x-data/types";

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** What the composer hands back — shared by "save draft", "schedule" and "publish". */
export interface ComposerSubmission {
  text: string;
  thread: string[];
  type: XPost["type"];
  media: XMedia[];
  poll: XPost["poll"];
  linkUrl: string | null;
  campaignId: string | null;
  internalTags: string[];
  ownerId: string;
  intent: "draft" | "schedule" | "publish" | "submit_approval";
  scheduledAt: string | null;
  /** Set when editing an existing draft rather than creating a new post. */
  editingId?: string;
}

interface Simulation {
  failNextAction: boolean;
  loading: boolean;
  loadError: boolean;
}

/** Per-account internal metadata, keyed by handle so it follows a person across lists. */
interface AudienceMeta {
  internalTags: string[];
  note: string;
  ownerId: string | null;
  lists: string[];
}

export interface GuardRegistration {
  dirty: boolean;
  save?: () => Promise<boolean>;
  label?: string;
}

interface PerformOptions {
  pending: string;
  success: string;
  /** Reads and OmniPlatform-only writes still work on an expired token. */
  requiresX?: boolean;
  retry?: () => void;
}

interface XStore {
  ready: boolean;
  /** Set when the repository could not be reached at all (mock mode off). */
  serviceError: XServiceError | null;
  repository: XRepository;

  account: XAccount;
  connection: ConnectionInfo;
  scopes: XScope[];
  posts: XPost[];
  mentions: XMention[];
  audience: AudienceData;
  settings: XSettings;
  team: TeamMember[];
  campaigns: Campaign[];
  approvals: ApprovalEvent[];
  activity: ActivityEvent[];
  notifications: WorkspaceNotification[];

  role: WorkspaceRole;
  currentUser: TeamMember;
  can: CapabilityMap;
  simulation: Simulation;

  memberName: (id: string | null) => string;
  campaignName: (id: string | null) => string;
  audienceMeta: (handle: string) => AudienceMeta;

  /* Content */
  submitPost: (input: ComposerSubmission) => Promise<XPost | null>;
  updatePost: (id: string, patch: Partial<XPost>, summary?: string) => Promise<boolean>;
  duplicatePost: (id: string) => Promise<XPost | null>;
  publishNow: (id: string) => Promise<boolean>;
  schedulePost: (id: string, at: ISODate) => Promise<boolean>;
  cancelSchedule: (id: string) => Promise<boolean>;
  retryPost: (id: string) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  archivePost: (id: string, archived: boolean) => Promise<boolean>;
  submitForApproval: (id: string, note?: string) => Promise<boolean>;
  reviewApproval: (id: string, action: "approved" | "changes_requested" | "rejected", note?: string) => Promise<boolean>;
  uploadMedia: (input: UploadInput, onProgress: (percent: number) => void) => Promise<XMedia>;

  /* Mentions */
  replyToMention: (id: string, text: string, resolveAfter: boolean) => Promise<boolean>;
  setMentionStatus: (id: string, status: XMention["status"]) => Promise<boolean>;
  assignMention: (id: string, assigneeId: string | null) => Promise<boolean>;
  setMentionPriority: (id: string, priority: Priority) => Promise<boolean>;
  addMentionNote: (id: string, text: string) => Promise<boolean>;

  /* Audience */
  updateAudienceMeta: (handle: string, patch: Partial<AudienceMeta>, summary: string) => Promise<boolean>;

  /* Connection & settings */
  syncNow: () => Promise<boolean>;
  reconnect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  updateSettings: (patch: Partial<XSettings>, summary?: string) => Promise<boolean>;
  retryLoad: () => void;

  /* Notifications */
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  /* Mock-mode preview controls */
  simulate: {
    setConnectionState: (state: ConnectionState) => void;
    toggleScope: (scope: XScope, granted: boolean) => void;
    setRole: (role: WorkspaceRole) => void;
    setFailNextAction: (fail: boolean) => void;
    setLoading: (loading: boolean) => void;
    setLoadError: (failed: boolean) => void;
  };

  registerGuard: (guard: GuardRegistration | null) => void;
  guardRef: React.RefObject<GuardRegistration | null>;
}

const StoreContext = createContext<XStore | null>(null);

const EMPTY_META: AudienceMeta = { internalTags: [], note: "", ownerId: null, lists: [] };

/* Stable empties, so a missing snapshot doesn't churn hook dependencies. */
const EMPTY_TEAM: TeamMember[] = [];
const EMPTY_PERMISSIONS: XPermission[] = [];
const EMPTY_SCOPES: XScope[] = [];

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function XProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => getXRepository(), []);
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<XSnapshot | null>(null);
  const [serviceError, setServiceError] = useState<XServiceError | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("owner");
  const [audienceMetaMap, setAudienceMetaMap] = useState<Record<string, AudienceMeta>>({});
  const [simulation, setSimulation] = useState<Simulation>({ failNextAction: false, loading: false, loadError: false });
  const [reloadToken, setReloadToken] = useState(0);
  const guardRef = useRef<GuardRegistration | null>(null);

  /* ---- Load ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    repository
      .loadSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setServiceError(
          error instanceof XServiceError
            ? error
            : new XServiceError("network", "Couldn't load your X data.", "Check your connection and try again."),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [repository, reloadToken]);

  // Clearing here rather than inside the effect keeps the reset in an event
  // handler, where a synchronous setState is safe.
  const retryLoad = useCallback(() => {
    setSimulation((s) => ({ ...s, loadError: false }));
    setSnapshot(null);
    setServiceError(null);
    setReloadToken((t) => t + 1);
  }, []);

  /* ---- Derived ---------------------------------------------------- */

  // Memoised rather than re-defaulted inline, so downstream hooks don't see a
  // brand-new array identity on every render.
  const team = useMemo(() => snapshot?.team ?? EMPTY_TEAM, [snapshot?.team]);
  const settings = snapshot?.settings ?? null;

  const currentUser = useMemo(
    () => team.find((m) => m.role === role) ?? team[0] ?? { id: "u-unknown", name: "You", handle: "@you", email: "", role },
    [team, role],
  );

  const permissions = useMemo(() => settings?.rolePermissions[role] ?? EMPTY_PERMISSIONS, [settings, role]);

  const can = useMemo(
    () =>
      evaluateCapabilities({
        connection: snapshot?.connection.state ?? "disconnected",
        scopes: snapshot?.scopes ?? EMPTY_SCOPES,
        permissions,
      }),
    [snapshot?.connection.state, snapshot?.scopes, permissions],
  );

  // Latest values reachable from stable callbacks without re-creating them.
  const live = useRef({ snapshot, simulation, currentUser });
  useLayoutEffect(() => {
    live.current = { snapshot, simulation, currentUser };
  });

  const patchSnapshot = useCallback((apply: (current: XSnapshot) => XSnapshot) => {
    setSnapshot((current) => (current ? apply(current) : current));
  }, []);

  const log = useCallback(
    (event: Omit<ActivityEvent, "id" | "at" | "actor" | "source"> & { source?: ActivityEvent["source"]; actor?: string }) => {
      patchSnapshot((current) => ({
        ...current,
        activity: [
          {
            id: uid("ac"),
            at: nowIso(),
            actor: event.actor ?? live.current.currentUser.name,
            source: event.source ?? "OmniPlatform",
            ...event,
          },
          ...current.activity,
        ],
      }));
    },
    [patchSnapshot],
  );

  const notify = useCallback(
    (notification: Omit<WorkspaceNotification, "id" | "at" | "read">) => {
      patchSnapshot((current) => ({
        ...current,
        notifications: [{ id: uid("n"), at: nowIso(), read: false, ...notification }, ...current.notifications],
      }));
    },
    [patchSnapshot],
  );

  /**
   * Runs a mutation with pending → success / failure feedback. State only
   * changes after the repository confirms, so a failed call never leaves the
   * UI claiming something happened that did not.
   */
  const perform = useCallback(
    async (options: PerformOptions, run: () => Promise<void>): Promise<boolean> => {
      const state = live.current.snapshot?.connection.state ?? "disconnected";
      const requiresX = options.requiresX ?? true;

      if (state === "disconnected") {
        toast.error("No X account connected", {
          description: "Connect an account before making changes.",
          action: { label: "Connect", onClick: () => router.push(`${xRoutes.settings}#connection`) },
        });
        return false;
      }
      if (requiresX && (state === "token_expired" || state === "needs_reconnect")) {
        toast.error("X connection needs reconnecting", {
          description: "Nothing was sent to X. Reconnect the account and try again.",
          action: { label: "Reconnect", onClick: () => router.push(`${xRoutes.settings}#connection`) },
        });
        return false;
      }
      if (requiresX && state === "rate_limited") {
        toast.error("X rate limit reached", {
          description: "Try again once the current window resets.",
        });
        return false;
      }

      const toastId = toast.loading(options.pending);

      if (live.current.simulation.failNextAction) {
        setSimulation((s) => ({ ...s, failNextAction: false }));
        await new Promise((resolve) => setTimeout(resolve, 700));
        toast.error("Couldn't complete the action", {
          id: toastId,
          description: "X didn't respond in time. Nothing was changed.",
          action: options.retry ? { label: "Try again", onClick: options.retry } : undefined,
        });
        return false;
      }

      try {
        await run();
        toast.success(options.success, { id: toastId });
        return true;
      } catch (error) {
        const failure =
          error instanceof XServiceError
            ? error
            : new XServiceError("network", "Something went wrong.", "Nothing was changed. Try again in a moment.");
        toast.error(failure.message, {
          id: toastId,
          description: failure.hint,
          action: options.retry ? { label: "Try again", onClick: options.retry } : undefined,
        });
        return false;
      }
    },
    [router],
  );

  /* ---------------------------------------------------------------- */
  /* Content                                                           */
  /* ---------------------------------------------------------------- */

  const updatePostState = useCallback(
    (id: string, patch: Partial<XPost>) => {
      patchSnapshot((current) => ({
        ...current,
        posts: current.posts.map((post) => (post.id === id ? { ...post, ...patch } : post)),
      }));
    },
    [patchSnapshot],
  );

  const submitPost = useCallback<XStore["submitPost"]>(
    async (input) => {
      const status =
        input.intent === "publish" ? "published" : input.intent === "schedule" ? "scheduled" : "draft";
      const approval =
        input.intent === "submit_approval"
          ? ("pending" as const)
          : input.intent === "draft"
            ? ("none" as const)
            : ("approved" as const);

      const draft: PostDraft = {
        text: input.text,
        thread: input.thread,
        type: input.type,
        media: input.media,
        poll: input.poll,
        linkUrl: input.linkUrl,
        campaignId: input.campaignId,
        internalTags: input.internalTags,
        ownerId: input.ownerId,
        approval,
        status,
        scheduledAt: input.scheduledAt,
      };

      const verb =
        input.intent === "publish"
          ? "Published"
          : input.intent === "schedule"
            ? "Scheduled"
            : input.intent === "submit_approval"
              ? "Submitted for approval"
              : "Saved draft";

      let created: XPost | null = null;

      const ok = await perform(
        {
          pending: input.intent === "publish" ? "Publishing to X…" : "Saving…",
          // Saving a draft is entirely OmniPlatform's — it must work offline.
          requiresX: input.intent === "publish",
          success: `${verb}${input.text.trim() ? `: “${postSummary(input.text, 44)}”` : ""}`,
        },
        async () => {
          if (input.editingId) {
            const patch = await repository.updatePost(input.editingId, {
              text: draft.text,
              thread: draft.thread,
              type: draft.type,
              media: draft.media,
              poll: draft.poll,
              linkUrl: draft.linkUrl,
              campaignId: draft.campaignId,
              internalTags: draft.internalTags,
              ownerId: draft.ownerId,
              approval,
              status,
              scheduledAt: draft.scheduledAt,
              failure: null,
            });
            const existing = live.current.snapshot?.posts.find((p) => p.id === input.editingId);
            if (existing) created = { ...existing, ...patch } as XPost;
            updatePostState(input.editingId, patch);
          } else {
            const post = await repository.createPost(draft);
            created = post;
            patchSnapshot((current) => ({ ...current, posts: [post, ...current.posts] }));
          }

          const target = created;
          if (!target) return;

          if (input.intent === "submit_approval") {
            patchSnapshot((current) => ({
              ...current,
              approvals: [
                ...current.approvals,
                { id: uid("ap"), postId: target.id, action: "submitted", actor: live.current.currentUser.name, at: nowIso() },
              ],
            }));
            notify({
              kind: "approval_requested",
              title: "Approval requested",
              body: `${live.current.currentUser.name} submitted “${postSummary(target.text, 40)}”.`,
              href: xRoutes.post(target.id),
            });
          }

          log({
            action:
              input.intent === "publish"
                ? "post_published"
                : input.intent === "schedule"
                  ? "post_scheduled"
                  : input.editingId
                    ? "post_edited"
                    : "post_created",
            summary: verb,
            entity: { type: "post", id: target.id, label: postSummary(target.text, 48) },
          });

          if (input.intent === "publish") {
            notify({
              kind: "post_published",
              title: "Post published",
              body: postSummary(target.text, 60),
              href: xRoutes.post(target.id),
            });
          }
        },
      );

      return ok ? created : null;
    },
    [perform, repository, patchSnapshot, updatePostState, log, notify],
  );

  const updatePost = useCallback<XStore["updatePost"]>(
    async (id, patch, summary = "Post updated") => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform({ pending: "Saving…", success: summary, requiresX: before.status === "published" }, async () => {
        const applied = await repository.updatePost(id, patch);
        updatePostState(id, applied);
        log({ action: "post_edited", summary, entity: { type: "post", id, label: postSummary(before.text, 48) } });
      });
    },
    [perform, repository, updatePostState, log],
  );

  const duplicatePost = useCallback<XStore["duplicatePost"]>(
    async (id) => {
      const source = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!source) return null;
      let copy: XPost | null = null;
      const ok = await perform(
        { pending: "Duplicating…", success: "Duplicated as a draft", requiresX: false },
        async () => {
          const post = await repository.createPost({
            text: source.text,
            thread: source.thread,
            type: source.type,
            media: source.media,
            poll: source.poll ? { ...source.poll, votes: null, endsAt: null } : null,
            linkUrl: source.linkUrl,
            campaignId: source.campaignId,
            internalTags: source.internalTags,
            ownerId: live.current.currentUser.id,
            approval: "none",
            status: "draft",
            scheduledAt: null,
          });
          copy = post;
          patchSnapshot((current) => ({ ...current, posts: [post, ...current.posts] }));
          log({
            action: "post_created",
            summary: "Duplicated a post",
            entity: { type: "post", id: post.id, label: postSummary(post.text, 48) },
          });
        },
      );
      return ok ? copy : null;
    },
    [perform, repository, patchSnapshot, log],
  );

  const publishNow = useCallback<XStore["publishNow"]>(
    async (id) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform({ pending: "Publishing to X…", success: "Published to X" }, async () => {
        updatePostState(id, { status: "publishing" });
        const result = await repository.publishPost(before);
        // X issues a new id at publish time, so the row is replaced rather than patched.
        patchSnapshot((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === id
              ? { ...post, id: result.id, status: "published", publishedAt: result.publishedAt, scheduledAt: null, failure: null, updatedAt: nowIso() }
              : post,
          ),
        }));
        log({ action: "post_published", summary: "Published to X", entity: { type: "post", id: result.id, label: postSummary(before.text, 48) } });
        notify({ kind: "post_published", title: "Post published", body: postSummary(before.text, 60), href: xRoutes.post(result.id) });
      });
    },
    [perform, repository, updatePostState, patchSnapshot, log, notify],
  );

  const schedulePost = useCallback<XStore["schedulePost"]>(
    async (id, at) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform(
        { pending: "Scheduling…", success: before.scheduledAt ? "Post rescheduled" : "Post scheduled", requiresX: false },
        async () => {
          const patch = await repository.schedulePost(before, at);
          updatePostState(id, patch);
          log({
            action: "post_scheduled",
            summary: before.scheduledAt ? "Rescheduled" : "Scheduled",
            entity: { type: "post", id, label: postSummary(before.text, 48) },
          });
        },
      );
    },
    [perform, repository, updatePostState, log],
  );

  const cancelSchedule = useCallback<XStore["cancelSchedule"]>(
    async (id) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform({ pending: "Removing from the queue…", success: "Moved back to drafts", requiresX: false }, async () => {
        const patch = await repository.updatePost(id, { status: "draft", scheduledAt: null });
        updatePostState(id, patch);
        log({ action: "post_edited", summary: "Cancelled the scheduled post", entity: { type: "post", id, label: postSummary(before.text, 48) } });
      });
    },
    [perform, repository, updatePostState, log],
  );

  // The toast's "Try again" runs the same mutation, so it reaches the latest
  // version of the callback through a ref rather than referencing itself.
  const retryPostRef = useRef<XStore["retryPost"]>(async () => false);

  const retryPost = useCallback<XStore["retryPost"]>(
    async (id) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform(
        { pending: "Retrying…", success: "Published to X", retry: () => void retryPostRef.current(id) },
        async () => {
          updatePostState(id, { status: "publishing" });
          try {
            const result = await repository.retryPost(before);
            patchSnapshot((current) => ({
              ...current,
              posts: current.posts.map((post) =>
                post.id === id
                  ? { ...post, id: result.id, status: "published", publishedAt: result.publishedAt, failure: null, updatedAt: nowIso() }
                  : post,
              ),
            }));
            log({ action: "post_retried", summary: "Retry succeeded", entity: { type: "post", id: result.id, label: postSummary(before.text, 48) } });
          } catch (error) {
            // Put the row back into `failed` with the new reason and a bumped count.
            const failure = error instanceof XServiceError ? error : null;
            updatePostState(id, {
              status: "failed",
              failure: {
                code: before.failure?.code ?? "validation",
                message: failure?.message ?? "The retry didn't go through.",
                hint: failure?.hint ?? "Try again in a moment.",
                at: nowIso(),
                retryCount: (before.failure?.retryCount ?? 0) + 1,
                lastAttemptAt: nowIso(),
              },
            });
            log({ action: "post_retried", summary: "Retry failed", entity: { type: "post", id, label: postSummary(before.text, 48) } });
            throw error;
          }
        },
      );
    },
    [perform, repository, updatePostState, patchSnapshot, log],
  );

  useEffect(() => {
    retryPostRef.current = retryPost;
  }, [retryPost]);

  const deletePost = useCallback<XStore["deletePost"]>(
    async (id) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      const label = postSummary(before.text, 44);
      return perform(
        { pending: "Deleting…", success: `Deleted “${label}”`, requiresX: before.status === "published" },
        async () => {
          await repository.deletePost(before);
          patchSnapshot((current) => ({ ...current, posts: current.posts.filter((post) => post.id !== id) }));
          log({ action: "post_deleted", summary: before.status === "published" ? "Deleted from X" : "Deleted draft", entity: { type: "post", id, label } });
        },
      );
    },
    [perform, repository, patchSnapshot, log],
  );

  const archivePost = useCallback<XStore["archivePost"]>(
    async (id, archived) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform(
        { pending: archived ? "Archiving…" : "Restoring…", success: archived ? "Archived" : "Restored", requiresX: false },
        async () => {
          // Archive is OmniPlatform-only; the post is untouched on X.
          const patch = await repository.updatePost(id, {
            status: archived ? "archived" : before.publishedAt ? "published" : "draft",
            archivedAt: archived ? nowIso() : null,
          });
          updatePostState(id, patch);
          log({ action: "post_edited", summary: archived ? "Archived in OmniPlatform" : "Restored from archive", entity: { type: "post", id, label: postSummary(before.text, 48) } });
        },
      );
    },
    [perform, repository, updatePostState, log],
  );

  const submitForApproval = useCallback<XStore["submitForApproval"]>(
    async (id, note) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      return perform({ pending: "Submitting…", success: "Sent for approval", requiresX: false }, async () => {
        await repository.updatePost(id, { approval: "pending" });
        updatePostState(id, { approval: "pending" });
        patchSnapshot((current) => ({
          ...current,
          approvals: [...current.approvals, { id: uid("ap"), postId: id, action: "submitted", actor: live.current.currentUser.name, note, at: nowIso() }],
        }));
        log({ action: "approval", summary: "Submitted for approval", entity: { type: "post", id, label: postSummary(before.text, 48) } });
        notify({
          kind: "approval_requested",
          title: "Approval requested",
          body: `${live.current.currentUser.name} submitted “${postSummary(before.text, 40)}”.`,
          href: xRoutes.post(id),
        });
      });
    },
    [perform, repository, updatePostState, patchSnapshot, log, notify],
  );

  const reviewApproval = useCallback<XStore["reviewApproval"]>(
    async (id, action, note) => {
      const before = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!before) return false;
      const label = action === "approved" ? "Approved" : action === "rejected" ? "Rejected" : "Changes requested";
      return perform({ pending: "Saving your decision…", success: label, requiresX: false }, async () => {
        await repository.updatePost(id, { approval: action });
        updatePostState(id, { approval: action });
        patchSnapshot((current) => ({
          ...current,
          approvals: [...current.approvals, { id: uid("ap"), postId: id, action, actor: live.current.currentUser.name, note, at: nowIso() }],
        }));
        log({ action: "approval", summary: label, entity: { type: "post", id, label: postSummary(before.text, 48) } });
      });
    },
    [perform, repository, updatePostState, patchSnapshot, log],
  );

  const uploadMedia = useCallback<XStore["uploadMedia"]>(
    (input, onProgress) => repository.uploadMedia(input, onProgress),
    [repository],
  );

  /* ---------------------------------------------------------------- */
  /* Mentions                                                          */
  /* ---------------------------------------------------------------- */

  const updateMentionState = useCallback(
    (id: string, patch: Partial<XMention>) => {
      patchSnapshot((current) => ({
        ...current,
        mentions: current.mentions.map((mention) => (mention.id === id ? { ...mention, ...patch } : mention)),
      }));
    },
    [patchSnapshot],
  );

  const replyToMention = useCallback<XStore["replyToMention"]>(
    async (id, text, resolveAfter) => {
      const before = live.current.snapshot?.mentions.find((m) => m.id === id);
      if (!before) return false;
      return perform(
        { pending: "Sending reply…", success: resolveAfter ? "Reply sent and conversation resolved" : "Reply sent" },
        async () => {
          const message = await repository.sendReply(before, text);
          updateMentionState(id, {
            conversation: [...before.conversation, message],
            status: resolveAfter ? "resolved" : "replied",
            repliedAt: before.repliedAt ?? message.at,
            responseMinutes: before.responseMinutes ?? differenceInMinutes(parseISO(message.at), parseISO(before.at)),
          });
          log({ action: "reply_sent", summary: `Replied to ${before.user.handle}`, entity: { type: "mention", id, label: postSummary(before.text, 48) } });
          if (resolveAfter) {
            log({ action: "mention_resolved", summary: "Marked resolved", entity: { type: "mention", id, label: postSummary(before.text, 48) } });
          }
        },
      );
    },
    [perform, repository, updateMentionState, log],
  );

  const setMentionStatus = useCallback<XStore["setMentionStatus"]>(
    async (id, status) => {
      const before = live.current.snapshot?.mentions.find((m) => m.id === id);
      if (!before) return false;
      const label =
        status === "resolved" ? "Marked resolved" : status === "ignored" ? "Ignored" : status === "unanswered" ? "Reopened" : "Marked replied";
      return perform({ pending: "Updating…", success: label, requiresX: false }, async () => {
        updateMentionState(id, { status });
        log({ action: "mention_resolved", summary: label, entity: { type: "mention", id, label: postSummary(before.text, 48) } });
      });
    },
    [perform, updateMentionState, log],
  );

  const assignMention = useCallback<XStore["assignMention"]>(
    async (id, assigneeId) => {
      const before = live.current.snapshot?.mentions.find((m) => m.id === id);
      if (!before) return false;
      const name = live.current.snapshot?.team.find((m) => m.id === assigneeId)?.name;
      return perform(
        { pending: "Assigning…", success: assigneeId ? `Assigned to ${name}` : "Unassigned", requiresX: false },
        async () => {
          updateMentionState(id, { assigneeId });
          log({
            action: "owner_assigned",
            summary: assigneeId ? `Assigned to ${name}` : "Removed the assignee",
            entity: { type: "mention", id, label: postSummary(before.text, 48) },
          });
        },
      );
    },
    [perform, updateMentionState, log],
  );

  const setMentionPriority = useCallback<XStore["setMentionPriority"]>(
    async (id, priority) => {
      const before = live.current.snapshot?.mentions.find((m) => m.id === id);
      if (!before) return false;
      return perform({ pending: "Updating priority…", success: `Priority set to ${priority}`, requiresX: false }, async () => {
        updateMentionState(id, { priority });
        log({ action: "priority_changed", summary: `Priority set to ${priority}`, entity: { type: "mention", id, label: postSummary(before.text, 48) } });
      });
    },
    [perform, updateMentionState, log],
  );

  const addMentionNote = useCallback<XStore["addMentionNote"]>(
    async (id, text) => {
      const before = live.current.snapshot?.mentions.find((m) => m.id === id);
      if (!before) return false;
      return perform({ pending: "Saving note…", success: "Note saved", requiresX: false }, async () => {
        const note: InternalNote = { id: uid("note"), author: live.current.currentUser.name, text, at: nowIso() };
        updateMentionState(id, { notes: [...before.notes, note] });
      });
    },
    [perform, updateMentionState],
  );

  /* ---------------------------------------------------------------- */
  /* Audience                                                          */
  /* ---------------------------------------------------------------- */

  const audienceMeta = useCallback((handle: string) => audienceMetaMap[handle] ?? EMPTY_META, [audienceMetaMap]);

  const updateAudienceMeta = useCallback<XStore["updateAudienceMeta"]>(
    async (handle, patch, summary) =>
      perform({ pending: "Saving…", success: summary, requiresX: false }, async () => {
        setAudienceMetaMap((current) => ({ ...current, [handle]: { ...(current[handle] ?? EMPTY_META), ...patch } }));
        log({ action: "owner_assigned", summary, entity: { type: "audience", label: handle } });
      }),
    [perform, log],
  );

  /* ---------------------------------------------------------------- */
  /* Connection & settings                                             */
  /* ---------------------------------------------------------------- */

  const syncNow = useCallback<XStore["syncNow"]>(async () => {
    const previous = live.current.snapshot?.connection.state ?? "connected";
    patchSnapshot((current) => ({ ...current, connection: { ...current.connection, state: "syncing" } }));
    const ok = await perform({ pending: "Syncing with X…", success: "Sync completed", requiresX: false }, async () => {
      const connection = await repository.sync();
      patchSnapshot((current) => ({ ...current, connection }));
      log({ action: "connection_refreshed", summary: "Manual sync completed", entity: { type: "account", label: "@NamoGangeTrust" }, source: "X sync" });
    });
    if (!ok) {
      patchSnapshot((current) => ({
        ...current,
        connection: {
          ...current.connection,
          state: previous === "syncing" || previous === "connected" ? "sync_failed" : previous,
          lastError: "X didn't return account data on the last attempt.",
        },
      }));
      notify({ kind: "sync_failed", title: "Sync failed", body: "The last sync with X didn't complete.", href: `${xRoutes.settings}#sync` });
    }
    return ok;
  }, [perform, repository, patchSnapshot, log, notify]);

  const reconnect = useCallback<XStore["reconnect"]>(async () => {
    const toastId = toast.loading("Waiting for X authorisation…");
    try {
      const { connection, scopes } = await repository.connect();
      patchSnapshot((current) => ({ ...current, connection, scopes }));
      log({ action: "connection_refreshed", summary: "Reconnected the X account with all permissions", entity: { type: "account", label: "@NamoGangeTrust" } });
      toast.success("X reconnected", { id: toastId, description: "All permissions granted. Data is up to date." });
      return true;
    } catch (error) {
      const failure = error instanceof XServiceError ? error : null;
      toast.error(failure?.message ?? "Couldn't reconnect", { id: toastId, description: failure?.hint ?? "Try again in a moment." });
      return false;
    }
  }, [repository, patchSnapshot, log]);

  const disconnect = useCallback<XStore["disconnect"]>(async () => {
    const toastId = toast.loading("Disconnecting account…");
    try {
      const connection = await repository.disconnect();
      patchSnapshot((current) => ({ ...current, connection }));
      log({ action: "connection_refreshed", summary: "Disconnected the X account", entity: { type: "account", label: "@NamoGangeTrust" } });
      toast.success("X account disconnected", { id: toastId, description: "Synced data is kept for 30 days." });
      return true;
    } catch {
      toast.error("Couldn't disconnect", { id: toastId, description: "Try again in a moment." });
      return false;
    }
  }, [repository, patchSnapshot, log]);

  const updateSettings = useCallback<XStore["updateSettings"]>(
    async (patch, summary = "Settings saved") =>
      perform({ pending: "Saving settings…", success: summary, requiresX: false }, async () => {
        await repository.saveSettings(patch);
        patchSnapshot((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
        log({ action: "settings_updated", summary, entity: { type: "settings", label: "X settings" } });
      }),
    [perform, repository, patchSnapshot, log],
  );

  /* ---------------------------------------------------------------- */
  /* Notifications & simulation                                        */
  /* ---------------------------------------------------------------- */

  const markNotificationRead = useCallback(
    (id: string) => {
      patchSnapshot((current) => ({
        ...current,
        notifications: current.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    },
    [patchSnapshot],
  );

  const markAllNotificationsRead = useCallback(() => {
    patchSnapshot((current) => ({ ...current, notifications: current.notifications.map((n) => ({ ...n, read: true })) }));
  }, [patchSnapshot]);

  const simulate = useMemo<XStore["simulate"]>(
    () => ({
      setConnectionState: (state) => {
        patchSnapshot((current) => ({
          ...current,
          connection: {
            ...current.connection,
            state,
            rateLimitResetAt: state === "rate_limited" ? addMinutes(new Date(), 11).toISOString() : null,
            lastError: state === "sync_failed" ? "X returned 503 on the last sync attempt." : null,
          },
        }));
        if (state === "token_expired") {
          notify({ kind: "connection_issue", title: "X connection expired", body: "Reconnect to resume publishing and syncing.", href: `${xRoutes.settings}#connection` });
        }
        if (state === "rate_limited") {
          notify({ kind: "rate_limit", title: "Rate limit reached", body: "Writes are paused until the window resets.", href: `${xRoutes.settings}#sync` });
        }
      },
      toggleScope: (scope, granted) => {
        patchSnapshot((current) => ({
          ...current,
          scopes: granted ? [...new Set([...current.scopes, scope])] : current.scopes.filter((s) => s !== scope),
          connection:
            granted || current.connection.state !== "connected"
              ? current.connection
              : { ...current.connection, state: "missing_permission" },
        }));
      },
      setRole,
      setFailNextAction: (failNextAction) => setSimulation((s) => ({ ...s, failNextAction })),
      setLoading: (loading) => setSimulation((s) => ({ ...s, loading })),
      setLoadError: (loadError) => setSimulation((s) => ({ ...s, loadError })),
    }),
    [patchSnapshot, notify],
  );

  const registerGuard = useCallback((guard: GuardRegistration | null) => {
    guardRef.current = guard;
  }, []);

  const memberName = useCallback(
    (id: string | null) => (id ? (team.find((m) => m.id === id)?.name ?? "Unknown") : "Unassigned"),
    [team],
  );

  const campaignName = useCallback(
    (id: string | null) => (id ? (snapshot?.campaigns.find((c) => c.id === id)?.name ?? "Unknown campaign") : "No campaign"),
    [snapshot?.campaigns],
  );

  /* ---------------------------------------------------------------- */

  // Until the snapshot lands the tree still needs a store, so the placeholder
  // takes its place. Building both through one expression keeps `guardRef` out
  // of conditional render paths.
  const base: Omit<XStore, "guardRef" | "registerGuard"> =
    snapshot && settings
      ? {
    ready: !simulation.loading,
    serviceError,
    repository,
    account: snapshot.account,
    connection: snapshot.connection,
    scopes: snapshot.scopes,
    posts: snapshot.posts,
    mentions: snapshot.mentions,
    audience: snapshot.audience,
    settings,
    team: snapshot.team,
    campaigns: snapshot.campaigns,
    approvals: snapshot.approvals,
    activity: snapshot.activity,
    notifications: snapshot.notifications,
    role,
    currentUser,
    can,
    simulation,
    memberName,
    campaignName,
    audienceMeta,
    submitPost,
    updatePost,
    duplicatePost,
    publishNow,
    schedulePost,
    cancelSchedule,
    retryPost,
    deletePost,
    archivePost,
    submitForApproval,
    reviewApproval,
    uploadMedia,
    replyToMention,
    setMentionStatus,
    assignMention,
    setMentionPriority,
    addMentionNote,
    updateAudienceMeta,
    syncNow,
    reconnect,
    disconnect,
    updateSettings,
    retryLoad,
    markNotificationRead,
    markAllNotificationsRead,
    simulate,
        }
      : makeLoadingStore(repository, serviceError, retryLoad, simulate, simulation);

  const value: XStore = { ...base, guardRef, registerGuard };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Loading placeholder store                                           */
/* ------------------------------------------------------------------ */

const EMPTY_ACCOUNT: XAccount = {
  id: "",
  name: "",
  handle: "@",
  avatarUrl: "",
  bannerUrl: "",
  bio: "",
  location: "",
  website: "",
  verified: "none",
  protected: false,
  joinedAt: new Date().toISOString(),
  followers: 0,
  following: 0,
  posts: 0,
  listed: 0,
  authorisedBy: "",
};

const DENIED = { allowed: false, reason: "Still loading your X data.", fix: "wait" as const };

/**
 * While the snapshot loads (or after it fails) the tree still needs a store.
 * Every mutation is a no-op and every capability is denied, so nothing can act
 * on data that is not there.
 */
function makeLoadingStore(
  repository: XRepository,
  serviceError: XServiceError | null,
  retryLoad: () => void,
  simulate: XStore["simulate"],
  simulation: Simulation,
): Omit<XStore, "guardRef" | "registerGuard"> {
  const no = async () => false;
  const none = async () => null;
  return {
    ready: false,
    serviceError,
    repository,
    account: EMPTY_ACCOUNT,
    connection: {
      state: "connected",
      lastSyncedAt: new Date().toISOString(),
      nextSyncAt: new Date().toISOString(),
      rateLimitResetAt: null,
      requestsUsed: 0,
      requestsLimit: 1,
      lastError: null,
    },
    scopes: [],
    posts: [],
    mentions: [],
    audience: {
      followerSeries: [],
      recentFollowers: [],
      topEngaging: [],
      frequentMentioners: [],
      activity: [],
      byDay: [],
      geography: null,
      followerSplit: [],
      profileVisits: 0,
      previousProfileVisits: 0,
      engagedFollowers: 0,
      previousEngagedFollowers: 0,
    },
    settings: {
      sync: { auto: true, frequency: "hourly", includeContent: true, includeMentions: true, includeAudience: true, includeAnalytics: true },
      publishing: { timezone: "UTC", defaultCampaignId: null, defaultTags: [], urlTracking: { enabled: false, source: "", medium: "" }, defaultTime: "09:00", minimumGapMinutes: 30 },
      notifications: {
        newMention: { inApp: false, email: false, slack: false },
        highPriorityMention: { inApp: false, email: false, slack: false },
        failedPost: { inApp: false, email: false, slack: false },
        publishingFailure: { inApp: false, email: false, slack: false },
        connectionIssue: { inApp: false, email: false, slack: false },
        dailySummary: { inApp: false, email: false, slack: false },
      },
      rolePermissions: { owner: [], manager: [], editor: [], contributor: [], analyst: [] },
      contentRules: { brandVoice: "", blockedWords: [], requiredTags: [], requireAltText: false, maxMedia: 4, requireTrackedLinks: false, blockShorteners: false },
      approvals: { required: false, reviewerIds: [], publisherIds: [] },
    },
    team: [],
    campaigns: [],
    approvals: [],
    activity: [],
    notifications: [],
    role: "owner",
    currentUser: { id: "", name: "", handle: "@", email: "", role: "owner" },
    can: {
      canReadProfile: DENIED,
      canReadPosts: DENIED,
      canCreatePost: DENIED,
      canDeletePost: DENIED,
      canReadMentions: DENIED,
      canReplyMention: DENIED,
      canReadAudience: DENIED,
      canReadAnalytics: DENIED,
      canSchedulePost: DENIED,
      canManageConnection: DENIED,
      canApprove: DENIED,
      canManageSettings: DENIED,
    },
    simulation,
    memberName: () => "Unassigned",
    campaignName: () => "No campaign",
    audienceMeta: () => EMPTY_META,
    submitPost: none,
    updatePost: no,
    duplicatePost: none,
    publishNow: no,
    schedulePost: no,
    cancelSchedule: no,
    retryPost: no,
    deletePost: no,
    archivePost: no,
    submitForApproval: no,
    reviewApproval: no,
    uploadMedia: () => Promise.reject(new XServiceError("service_unavailable", "Still loading.", "Try again in a moment.")),
    replyToMention: no,
    setMentionStatus: no,
    assignMention: no,
    setMentionPriority: no,
    addMentionNote: no,
    updateAudienceMeta: no,
    syncNow: no,
    reconnect: no,
    disconnect: no,
    updateSettings: no,
    retryLoad,
    markNotificationRead: () => {},
    markAllNotificationsRead: () => {},
    simulate,
  };
}

export function useX() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useX must be used inside <XProvider>");
  return context;
}

export type { AudienceMember, AudienceMeta };
