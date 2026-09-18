"use client";

/**
 * The post composer. Mounted once by the workspace and driven entirely by the
 * URL, so any control anywhere can open it:
 *
 *   ?compose=new                  new single post
 *   ?compose=new&mode=thread      new thread
 *   ?compose=new&mode=poll        new poll
 *   ?compose=new&intent=schedule  opens with the schedule panel expanded
 *   ?compose=<postId>             edit an existing draft, scheduled or failed post
 */

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  GripVertical,
  Hash,
  ImagePlus,
  Link2,
  ListChecks,
  Loader2,
  MessageSquare,
  Gauge as PollIcon,
  Plus,
  Send,
  Smile,
  Trash2,
  Upload,
  X as XIcon,
} from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import {
  ALT_TEXT_MAX,
  POLL_DURATIONS,
  POLL_MAX_OPTIONS,
  POLL_OPTION_MAX,
  POST_MAX,
  THREAD_MAX_PARTS,
  xRoutes,
} from "../lib/constants";
import { countCharacters, firstUrl } from "../lib/format";
import { validateDraft, type ValidationIssue } from "../x-data/selectors";
import { useX, type ComposerSubmission } from "../store/x-store";
import type { PostType, XMedia, XPost } from "../x-data/types";
import { PostPreview } from "./post-preview";
import {
  Badge,
  Button,
  FormField,
  InternalBadge,
  SelectMenu,
  Segmented,
  TagInput,
  buttonClass,
  x,
} from "./ui";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="p-6 text-center text-[12px] text-[#98A2B3]">Loading emoji…</div>,
});

type Mode = "single" | "thread" | "poll";

interface DraftState {
  text: string;
  thread: string[];
  mode: Mode;
  media: XMedia[];
  pollOptions: string[];
  pollDuration: number;
  linkUrl: string;
  campaignId: string;
  internalTags: string[];
  ownerId: string;
  scheduledAt: string;
}

const EMPTY: DraftState = {
  text: "",
  thread: [],
  mode: "single",
  media: [],
  pollOptions: ["", ""],
  pollDuration: 1440,
  linkUrl: "",
  campaignId: "",
  internalTags: [],
  ownerId: "",
  scheduledAt: "",
};

/** `datetime-local` wants `yyyy-MM-ddTHH:mm` in local time, not an ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function draftFromPost(post: XPost): DraftState {
  return {
    text: post.poll ? post.poll.question : post.text,
    thread: post.thread,
    mode: post.type === "thread" ? "thread" : post.type === "poll" ? "poll" : "single",
    media: post.media,
    pollOptions: post.poll?.options.length ? post.poll.options : ["", ""],
    pollDuration: post.poll?.durationMinutes ?? 1440,
    linkUrl: post.linkUrl ?? "",
    campaignId: post.campaignId ?? "",
    internalTags: post.internalTags,
    ownerId: post.ownerId,
    scheduledAt: toLocalInput(post.scheduledAt),
  };
}

export function Composer() {
  const params = useSearchParams();
  const { ready } = useX();
  const composeParam = params?.get("compose") ?? null;
  // Waiting for the store matters: the initial draft seeds its owner and
  // defaults from it, and useState would otherwise freeze the empty values.
  if (!composeParam || !ready) return null;
  // Remounting per target resets all local state cleanly.
  return <ComposerBody key={composeParam} target={composeParam} />;
}

function ComposerBody({ target }: { target: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { posts, campaigns, team, settings, currentUser, can, submitPost, uploadMedia, account } = useX();

  const editing = target === "new" ? null : (posts.find((post) => post.id === target) ?? null);
  const initialMode = (params?.get("mode") as Mode | null) ?? null;
  const openWithSchedule = params?.get("intent") === "schedule";

  const initial = useMemo<DraftState>(() => {
    if (editing) return draftFromPost(editing);
    return {
      ...EMPTY,
      mode: initialMode ?? "single",
      ownerId: currentUser.id,
      campaignId: settings.publishing.defaultCampaignId ?? "",
      internalTags: settings.publishing.defaultTags,
      scheduledAt: openWithSchedule ? toLocalInput(defaultScheduleSlot(settings.publishing.defaultTime)) : "",
    };
  }, [editing, initialMode, currentUser.id, settings.publishing, openWithSchedule]);

  const [draft, setDraft] = useState<DraftState>(initial);
  const [showSchedule, setShowSchedule] = useState(openWithSchedule || Boolean(initial.scheduledAt));
  const [busy, setBusy] = useState<"draft" | "schedule" | "publish" | "approval" | null>(null);
  const [touched, setTouched] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const dirty = touched && JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChanges(dirty, undefined, "this post");

  const patch = useCallback((next: Partial<DraftState>) => {
    setTouched(true);
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  const close = useCallback(() => {
    const next = new URLSearchParams(params?.toString());
    ["compose", "mode", "intent"].forEach((key) => next.delete(key));
    const query = next.toString();
    router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname, { scroll: false });
  }, [params, router]);

  /* ---- Derived -------------------------------------------------- */

  const postType = useMemo<PostType>(() => {
    if (draft.mode === "thread") return "thread";
    if (draft.mode === "poll") return "poll";
    if (draft.media.some((item) => item.kind === "video")) return "video";
    if (draft.media.length > 0) return "image";
    if (draft.linkUrl || firstUrl(draft.text)) return "link";
    return "text";
  }, [draft]);

  const issues = useMemo(
    () =>
      validateDraft(
        {
          text: draft.text,
          thread: draft.mode === "thread" ? draft.thread : [],
          mode: draft.mode,
          poll: draft.mode === "poll" ? { question: draft.text, options: draft.pollOptions } : null,
          media: draft.media.map((item) => ({ state: item.state, altText: item.altText })),
          scheduledAt: showSchedule ? fromLocalInput(draft.scheduledAt) : null,
          linkUrl: draft.linkUrl || null,
        },
        settings,
        POST_MAX,
      ),
    [draft, showSchedule, settings],
  );

  const issueFor = (field: ValidationIssue["field"], index?: number) =>
    issues.find((issue) => issue.field === field && (index === undefined || issue.index === index))?.message;

  const blocking = issues.length > 0;
  const approvalRequired = settings.approvals.required && !can.canApprove.allowed;

  /* ---- Submit --------------------------------------------------- */

  const submit = async (intent: ComposerSubmission["intent"]) => {
    if (blocking) {
      setTouched(true);
      return;
    }
    setBusy(intent === "submit_approval" ? "approval" : intent === "publish" ? "publish" : intent === "schedule" ? "schedule" : "draft");
    const result = await submitPost({
      text: draft.mode === "poll" ? draft.text : draft.text,
      thread: draft.mode === "thread" ? draft.thread : [],
      type: postType,
      media: draft.media,
      poll:
        draft.mode === "poll"
          ? {
              question: draft.text,
              options: draft.pollOptions.map((option) => option.trim()).filter(Boolean),
              durationMinutes: draft.pollDuration,
              votes: null,
              endsAt: null,
            }
          : null,
      linkUrl: draft.linkUrl || firstUrl(draft.text),
      campaignId: draft.campaignId || null,
      internalTags: draft.internalTags,
      ownerId: draft.ownerId || currentUser.id,
      intent,
      scheduledAt: intent === "schedule" ? fromLocalInput(draft.scheduledAt) : null,
      editingId: editing?.id,
    });
    setBusy(null);
    if (result) {
      setTouched(false);
      close();
      // Land the user where the post now lives.
      if (intent === "schedule") router.push(`${xRoutes.scheduling}?view=queue`);
      else if (intent === "publish") router.push(xRoutes.post(result.id));
    }
  };

  /* ---- Media ---------------------------------------------------- */

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, settings.contentRules.maxMedia - draft.media.length);
    for (const file of list) {
      const kind = file.type.startsWith("video") ? "video" : file.type === "image/gif" ? "gif" : "image";
      const previewUrl = URL.createObjectURL(file);
      const tempId = `tmp-${Math.random().toString(36).slice(2, 9)}`;
      const placeholder: XMedia = { id: tempId, kind, url: previewUrl, altText: "", state: "uploading", progress: 0 };
      setTouched(true);
      setDraft((current) => ({ ...current, media: [...current.media, placeholder] }));

      const setState = (update: Partial<XMedia>) =>
        setDraft((current) => ({ ...current, media: current.media.map((item) => (item.id === tempId ? { ...item, ...update } : item)) }));

      try {
        const uploaded = await uploadMedia({ name: file.name, size: file.size, kind, previewUrl }, (progress) =>
          setState({ progress, state: progress >= 100 ? "processing" : "uploading" }),
        );
        setState({ ...uploaded, id: tempId });
      } catch {
        setState({ state: "failed", error: "Upload failed. Check the file and try again." });
      }
    }
  };

  const insertEmoji = (emoji: EmojiClickData) => {
    const field = textRef.current;
    if (!field) {
      patch({ text: draft.text + emoji.emoji });
      return;
    }
    const start = field.selectionStart ?? draft.text.length;
    const end = field.selectionEnd ?? start;
    const next = `${draft.text.slice(0, start)}${emoji.emoji}${draft.text.slice(end)}`;
    patch({ text: next });
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + emoji.emoji.length, start + emoji.emoji.length);
    });
  };

  /* ---- Render --------------------------------------------------- */

  const title = editing ? "Edit post" : draft.mode === "thread" ? "New thread" : draft.mode === "poll" ? "New poll" : "New post";
  const canPublish = can.canCreatePost.allowed && !approvalRequired;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && close()}>
      <DialogContent
        showClose={false}
        className="flex h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:h-[min(880px,calc(100dvh-32px))] sm:max-w-[1120px] sm:rounded-[12px] sm:border"
        onInteractOutside={(event) => {
          // Losing a half-written post to a stray click is unforgivable.
          if (dirty) event.preventDefault();
        }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F5] px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#0F1B3D]">
              {title}
              {editing && <Badge tone="neutral">{editing.status}</Badge>}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[12px] text-[#6B7890]">
              Publishing to{" "}
              <b className="font-semibold text-[#24324F]">
                {account.name} {account.handle}
              </b>
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Segmented<Mode>
              label="Post format"
              value={draft.mode}
              onChange={(mode) => patch({ mode, thread: mode === "thread" && draft.thread.length === 0 ? [""] : draft.thread })}
              items={[
                { value: "single", label: "Post", icon: MessageSquare },
                { value: "thread", label: "Thread", icon: ListChecks },
                { value: "poll", label: "Poll", icon: PollIcon },
              ]}
            />
            <Button size="icon" variant="ghost" aria-label="Close composer" onClick={close} disabled={Boolean(busy)}>
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_364px]">
          <div className="scrollbar-thin min-h-0 overflow-y-auto px-4 py-4">
            <div className="mx-auto max-w-[640px] space-y-4">
              {approvalRequired && (
                <div className="flex items-start gap-2.5 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] px-3 py-2.5">
                  <ListChecks className="mt-0.5 size-4 shrink-0 text-[#6D28D9]" />
                  <p className="text-[12px] leading-4 text-[#3C4A66]">
                    <b className="font-semibold text-[#0F1B3D]">Approval required.</b> Your workspace requires a reviewer to approve content
                    before it goes out, so this post will be submitted rather than published directly.{" "}
                    <InternalBadge hint="Approval workflow is an OmniPlatform feature. X has no equivalent." />
                  </p>
                </div>
              )}

              {/* Main text */}
              <FormField
                label={draft.mode === "poll" ? "Question" : draft.mode === "thread" ? "Post 1" : "Post"}
                htmlFor="x-composer-text"
                required
                counter={{ value: countCharacters(draft.text), max: POST_MAX }}
                error={touched ? (issueFor("text") ?? issueFor("poll")) : undefined}
                hint={
                  draft.mode === "poll"
                    ? "On X the poll question is the post text itself."
                    : "Links always count as 23 characters, however long they are."
                }
              >
                <textarea
                  id="x-composer-text"
                  ref={textRef}
                  value={draft.text}
                  onChange={(event) => patch({ text: event.target.value })}
                  rows={draft.mode === "thread" ? 4 : 6}
                  placeholder={draft.mode === "poll" ? "What do you want to ask?" : "What's happening?"}
                  className={cn(x.textarea, "resize-y text-[14px] leading-relaxed")}
                />
              </FormField>

              {/* Text tools */}
              <div className="-mt-2 flex flex-wrap items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Insert emoji" className={buttonClass("secondary", "sm")}>
                      <Smile className="size-3.5" />
                      Emoji
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto border-[#E4E9F0] p-0">
                    <EmojiPicker onEmojiClick={insertEmoji} width={320} height={380} searchDisabled={false} skinTonesDisabled lazyLoadEmojis />
                  </PopoverContent>
                </Popover>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={Hash}
                  onClick={() => {
                    const tags = settings.contentRules.requiredTags.map((tag) => `#${tag}`).join(" ");
                    patch({ text: `${draft.text.trimEnd()}${draft.text ? "\n\n" : ""}${tags || "#"}` });
                    textRef.current?.focus();
                  }}
                >
                  {settings.contentRules.requiredTags.length ? "Add required tags" : "Hashtag"}
                </Button>

                <label className={cn(buttonClass("secondary", "sm"), "cursor-pointer")}>
                  <ImagePlus className="size-3.5" />
                  Add media
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="sr-only"
                    disabled={draft.media.length >= settings.contentRules.maxMedia}
                    onChange={(event) => {
                      if (event.target.files) void addFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>

                <Button
                  size="sm"
                  variant={showSchedule ? "primary" : "secondary"}
                  icon={CalendarClock}
                  gate={can.canSchedulePost}
                  onClick={() => {
                    const next = !showSchedule;
                    setShowSchedule(next);
                    if (next && !draft.scheduledAt) patch({ scheduledAt: toLocalInput(defaultScheduleSlot(settings.publishing.defaultTime)) });
                  }}
                >
                  Schedule
                </Button>
              </div>

              {/* Thread parts */}
              {draft.mode === "thread" && (
                <ThreadEditor
                  parts={draft.thread}
                  onChange={(thread) => patch({ thread })}
                  issueFor={(index) => (touched ? issueFor("thread", index) : undefined)}
                />
              )}

              {/* Poll */}
              {draft.mode === "poll" && (
                <PollEditor
                  options={draft.pollOptions}
                  duration={draft.pollDuration}
                  onOptions={(pollOptions) => patch({ pollOptions })}
                  onDuration={(pollDuration) => patch({ pollDuration })}
                  issueFor={(index) => (touched ? issueFor("poll", index) : undefined)}
                />
              )}

              {/* Media */}
              <MediaEditor
                media={draft.media}
                max={settings.contentRules.maxMedia}
                requireAltText={settings.contentRules.requireAltText}
                error={touched ? issueFor("media") : undefined}
                onAdd={addFiles}
                onRemove={(id) => patch({ media: draft.media.filter((item) => item.id !== id) })}
                onAlt={(id, altText) => patch({ media: draft.media.map((item) => (item.id === id ? { ...item, altText } : item)) })}
                onMove={(id, direction) => {
                  const index = draft.media.findIndex((item) => item.id === id);
                  const next = index + direction;
                  if (index < 0 || next < 0 || next >= draft.media.length) return;
                  const reordered = [...draft.media];
                  const [moved] = reordered.splice(index, 1);
                  reordered.splice(next, 0, moved!);
                  patch({ media: reordered });
                }}
                onRetry={(id) => {
                  patch({ media: draft.media.map((item) => (item.id === id ? { ...item, state: "uploading", progress: 0, error: undefined } : item)) });
                  // Nothing to re-read from disk here, so the mock upload re-runs from the preview URL.
                  const item = draft.media.find((media) => media.id === id);
                  if (item) void addFiles([new File([], item.url)]);
                }}
              />

              {/* Schedule */}
              {showSchedule && (
                <div className="rounded-sm border border-[#D5E1FD] bg-[#F5F8FF] p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <FormField
                      label="Publish at"
                      htmlFor="x-composer-schedule"
                      className="min-w-[220px] flex-1"
                      error={touched ? issueFor("schedule") : undefined}
                      hint={`Times are in ${settings.publishing.timezone}.`}
                    >
                      <input
                        id="x-composer-schedule"
                        type="datetime-local"
                        value={draft.scheduledAt}
                        onChange={(event) => patch({ scheduledAt: event.target.value })}
                        className={x.input}
                      />
                    </FormField>
                    <Button size="sm" variant="ghost" onClick={() => { setShowSchedule(false); patch({ scheduledAt: "" }); }}>
                      Remove schedule
                    </Button>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#6B7890]">
                    <InternalBadge label="OmniPlatform scheduler" hint="OmniPlatform holds the post and publishes it to X at this time. X has no native scheduling for this API." />
                    Held here until it publishes to X.
                  </p>
                </div>
              )}

              {/* Internal metadata */}
              <div className="rounded-sm border border-[#E4E9F0] bg-[#FAFBFD] p-3">
                <p className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold text-[#24324F]">
                  Internal details
                  <InternalBadge hint="Campaign, tags and owner are OmniPlatform fields. They're never sent to X." />
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Campaign">
                    <SelectMenu
                      label="Campaign"
                      fullWidth
                      size="md"
                      value={draft.campaignId}
                      onChange={(campaignId) => patch({ campaignId })}
                      placeholder="No campaign"
                      options={[{ value: "", label: "No campaign" }, ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))]}
                    />
                  </FormField>
                  <FormField label="Owner">
                    <SelectMenu
                      label="Owner"
                      fullWidth
                      size="md"
                      value={draft.ownerId}
                      onChange={(ownerId) => patch({ ownerId })}
                      options={team.map((member) => ({ value: member.id, label: member.name, description: member.role }))}
                    />
                  </FormField>
                  <FormField label="Internal tags" className="sm:col-span-2" hint="Used for filtering and reporting inside OmniPlatform.">
                    <TagInput value={draft.internalTags} onChange={(internalTags) => patch({ internalTags })} />
                  </FormField>
                  <FormField
                    label="Tracked link"
                    className="sm:col-span-2"
                    error={touched ? issueFor("link") : undefined}
                    hint={
                      settings.publishing.urlTracking.enabled
                        ? `UTM parameters (source=${settings.publishing.urlTracking.source}) are appended on publish.`
                        : "URL tracking is off. Turn it on in Publishing settings to attribute clicks."
                    }
                  >
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]" />
                      <input
                        value={draft.linkUrl}
                        onChange={(event) => patch({ linkUrl: event.target.value })}
                        placeholder="https://namogange.org/…"
                        className={cn(x.input, "pl-8")}
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <aside className="scrollbar-thin min-h-0 overflow-y-auto border-t border-[#EEF1F5] bg-[#F8FAFC] px-4 py-4 lg:border-l lg:border-t-0">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Preview</p>
            <PostPreview
              account={account}
              text={draft.text}
              thread={draft.mode === "thread" ? draft.thread : []}
              media={draft.media}
              poll={draft.mode === "poll" ? { question: draft.text, options: draft.pollOptions, durationMinutes: draft.pollDuration, votes: null, endsAt: null } : null}
            />

            {touched && issues.length > 0 && (
              <div className="mt-3 rounded-sm border border-[#FBD5D9] bg-[#FEF6F7] p-3" role="alert">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C81E2B]">
                  <AlertTriangle className="size-3.5" />
                  {issues.length} thing{issues.length === 1 ? "" : "s"} to fix
                </p>
                <ul className="mt-1.5 space-y-1 text-[11.5px] leading-4 text-[#3C4A66]">
                  {/* Several issues can share a field and index, so the position keeps keys unique. */}
                  {issues.slice(0, 5).map((issue, index) => (
                    <li key={`${issue.field}-${issue.index ?? "none"}-${index}`} className="flex gap-1.5">
                      <span className="mt-1.5 size-1 shrink-0 rounded-sm bg-[#C81E2B]" />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {touched && issues.length === 0 && (
              <p className="mt-3 flex items-center gap-1.5 rounded-sm border border-[#C6EFD9] bg-[#F4FCF8] px-3 py-2 text-[12px] font-medium text-[#067647]">
                <CheckCircle2 className="size-3.5" />
                Ready to go out.
              </p>
            )}

            {settings.contentRules.brandVoice && (
              <div className="mt-3 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] p-3">
                <p className="flex items-center gap-2 text-[11.5px] font-semibold text-[#6D28D9]">
                  Brand voice
                  <InternalBadge hint="Set by your workspace in Content rules." />
                </p>
                <p className="mt-1 text-[11.5px] leading-4 text-[#3C4A66]">{settings.contentRules.brandVoice}</p>
              </div>
            )}
          </aside>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF1F5] bg-white px-4 py-3">
          <p className="text-[11.5px] text-[#6B7890]">
            {editing ? "Editing an existing post" : "New post"} · <b className="font-semibold text-[#24324F]">{postType}</b>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={close} disabled={Boolean(busy)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              loading={busy === "draft"}
              disabled={Boolean(busy)}
              gate={can.canCreatePost}
              onClick={() => void submit("draft")}
            >
              Save draft
            </Button>
            {approvalRequired ? (
              <Button
                variant="primary"
                icon={ListChecks}
                loading={busy === "approval"}
                disabled={Boolean(busy)}
                gate={can.canCreatePost}
                onClick={() => void submit("submit_approval")}
              >
                Submit for approval
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  icon={CalendarClock}
                  loading={busy === "schedule"}
                  disabled={Boolean(busy) || !showSchedule}
                  disabledReason={!showSchedule ? "Turn on Schedule and pick a date first." : undefined}
                  gate={can.canSchedulePost}
                  onClick={() => void submit("schedule")}
                >
                  Schedule
                </Button>
                <Button
                  variant="primary"
                  icon={Send}
                  loading={busy === "publish"}
                  disabled={Boolean(busy)}
                  gate={canPublish ? can.canCreatePost : can.canCreatePost}
                  onClick={() => void submit("publish")}
                >
                  Publish now
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Tomorrow at the workspace's default posting time. */
function defaultScheduleSlot(defaultTime: string): string {
  const [hours = 9, minutes = 0] = defaultTime.split(":").map(Number);
  const date = addDays(new Date(), 1);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

/* ------------------------------------------------------------------ */
/* Thread                                                              */
/* ------------------------------------------------------------------ */

function ThreadEditor({
  parts,
  onChange,
  issueFor,
}: {
  parts: string[];
  onChange: (parts: string[]) => void;
  issueFor: (index: number) => string | undefined;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= parts.length) return;
    const reordered = [...parts];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved!);
    onChange(reordered);
  };

  return (
    <div className="space-y-2.5">
      {parts.map((part, index) => (
        <div key={index} className="rounded-sm border border-[#E4E9F0] bg-white p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#24324F]">
              <GripVertical className="size-3.5 text-[#C9D1DC]" />
              Post {index + 2}
            </span>
            <span className="flex items-center gap-1">
              <span className={cn("mr-1 text-[11px] tabular-nums", countCharacters(part) > POST_MAX ? "font-semibold text-[#C81E2B]" : "text-[#98A2B3]")}>
                {countCharacters(part)}/{POST_MAX}
              </span>
              <Button size="iconSm" variant="ghost" aria-label={`Move post ${index + 2} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                <span aria-hidden="true">↑</span>
              </Button>
              <Button size="iconSm" variant="ghost" aria-label={`Move post ${index + 2} down`} disabled={index === parts.length - 1} onClick={() => move(index, 1)}>
                <span aria-hidden="true">↓</span>
              </Button>
              <Button
                size="iconSm"
                variant="ghost"
                aria-label={`Delete post ${index + 2}`}
                onClick={() => onChange(parts.filter((_, i) => i !== index))}
                className="text-[#C81E2B] hover:bg-[#FEF1F2]"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </span>
          </div>
          <textarea
            value={part}
            onChange={(event) => onChange(parts.map((item, i) => (i === index ? event.target.value : item)))}
            rows={3}
            placeholder={`Continue the thread…`}
            aria-label={`Thread post ${index + 2}`}
            className={cn(x.textarea, "resize-y")}
          />
          {issueFor(index) && (
            <p role="alert" className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-[#C81E2B]">
              <AlertTriangle className="size-3" />
              {issueFor(index)}
            </p>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        icon={Plus}
        disabled={parts.length + 1 >= THREAD_MAX_PARTS}
        disabledReason={`A thread can hold up to ${THREAD_MAX_PARTS} posts.`}
        onClick={() => onChange([...parts, ""])}
      >
        Add post to thread
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Poll                                                                */
/* ------------------------------------------------------------------ */

function PollEditor({
  options,
  duration,
  onOptions,
  onDuration,
  issueFor,
}: {
  options: string[];
  duration: number;
  onOptions: (options: string[]) => void;
  onDuration: (duration: number) => void;
  issueFor: (index: number) => string | undefined;
}) {
  return (
    <div className="rounded-sm border border-[#E4E9F0] bg-white p-3">
      <p className="mb-2.5 text-[12px] font-semibold text-[#24324F]">Poll choices</p>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index}>
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-[12px] font-semibold text-[#98A2B3]">{index + 1}</span>
              <input
                value={option}
                maxLength={POLL_OPTION_MAX}
                onChange={(event) => onOptions(options.map((item, i) => (i === index ? event.target.value : item)))}
                placeholder={index < 2 ? `Choice ${index + 1} (required)` : `Choice ${index + 1} (optional)`}
                aria-label={`Poll choice ${index + 1}`}
                className={x.input}
              />
              <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-[#98A2B3]">
                {option.length}/{POLL_OPTION_MAX}
              </span>
              <Button
                size="iconSm"
                variant="ghost"
                aria-label={`Remove choice ${index + 1}`}
                disabled={options.length <= 2}
                disabledReason="A poll needs at least two choices."
                onClick={() => onOptions(options.filter((_, i) => i !== index))}
                className="text-[#C81E2B] hover:bg-[#FEF1F2]"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {issueFor(index) && (
              <p role="alert" className="ml-7 mt-1 text-[11.5px] font-medium text-[#C81E2B]">
                {issueFor(index)}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          disabled={options.length >= POLL_MAX_OPTIONS}
          disabledReason={`X polls allow up to ${POLL_MAX_OPTIONS} choices.`}
          onClick={() => onOptions([...options, ""])}
        >
          Add choice
        </Button>
        <label className="flex items-center gap-2 text-[12px] text-[#6B7890]">
          Runs for
          <SelectMenu
            label="Poll duration"
            value={String(duration)}
            onChange={(value) => onDuration(Number(value))}
            options={POLL_DURATIONS.map((item) => ({ value: String(item.value), label: item.label }))}
          />
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

function MediaEditor({
  media,
  max,
  requireAltText,
  error,
  onAdd,
  onRemove,
  onAlt,
  onMove,
  onRetry,
}: {
  media: XMedia[];
  max: number;
  requireAltText: boolean;
  error?: string;
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onAlt: (id: string, altText: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRetry: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  if (media.length === 0) {
    return (
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) onAdd(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-sm border border-dashed px-4 py-6 text-center transition",
          dragging ? "border-[#2563EB] bg-[#F5F8FF]" : "border-[#DCE2EA] bg-[#FAFBFD]",
        )}
      >
        <Upload className={cn("mx-auto size-5", dragging ? "text-[#2563EB]" : "text-[#98A2B3]")} />
        <p className="mt-2 text-[12.5px] font-medium text-[#24324F]">Drag images or a video here</p>
        <p className="mt-0.5 text-[11.5px] text-[#6B7890]">
          Up to {max} attachments{requireAltText ? " · alt text required by your content rules" : ""}
        </p>
        <label className={cn(buttonClass("secondary", "sm"), "mt-2.5 cursor-pointer")}>
          Browse files
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) onAdd(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-[11.5px] font-medium text-[#C81E2B]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold text-[#24324F]">
        Media <span className="font-normal text-[#98A2B3]">({media.length}/{max})</span>
      </p>
      {media.map((item, index) => (
        <div key={item.id} className="flex gap-3 rounded-sm border border-[#E4E9F0] bg-white p-2.5">
          <span className="relative size-[72px] shrink-0 overflow-hidden rounded-sm bg-[#E9EDF3]">
            {/* Local object URLs, so a plain img is correct here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" className="size-full object-cover" />
            {item.state !== "ready" && (
              <span className="absolute inset-0 grid place-items-center bg-[#0F1B3D]/55 text-white">
                {item.state === "failed" ? <AlertTriangle className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
              </span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#24324F]">
                {item.kind === "video" ? "Video" : item.kind === "gif" ? "GIF" : "Image"}
                {item.state === "uploading" && <Badge tone="blue">Uploading {item.progress}%</Badge>}
                {item.state === "processing" && <Badge tone="amber">Processing</Badge>}
                {item.state === "ready" && <Badge tone="green">Ready</Badge>}
                {item.state === "failed" && <Badge tone="red">Failed</Badge>}
              </span>
              <span className="flex items-center gap-0.5">
                <Button size="iconSm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => onMove(item.id, -1)}>
                  <span aria-hidden="true">↑</span>
                </Button>
                <Button size="iconSm" variant="ghost" aria-label="Move down" disabled={index === media.length - 1} onClick={() => onMove(item.id, 1)}>
                  <span aria-hidden="true">↓</span>
                </Button>
                <Button size="iconSm" variant="ghost" aria-label="Remove attachment" onClick={() => onRemove(item.id)} className="text-[#C81E2B] hover:bg-[#FEF1F2]">
                  <Trash2 className="size-3.5" />
                </Button>
              </span>
            </div>

            {item.state === "uploading" && (
              <span className="mt-1.5 block h-1 overflow-hidden rounded-sm bg-[#EEF1F5]">
                <span className="block h-full rounded-sm bg-[#2563EB] transition-[width]" style={{ width: `${item.progress}%` }} />
              </span>
            )}

            {item.state === "failed" ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <p className="text-[11.5px] text-[#C81E2B]">{item.error ?? "Upload failed."}</p>
                <Button size="xs" variant="secondary" onClick={() => onRetry(item.id)}>
                  Retry upload
                </Button>
              </div>
            ) : (
              <input
                value={item.altText}
                maxLength={ALT_TEXT_MAX}
                onChange={(event) => onAlt(item.id, event.target.value)}
                placeholder={requireAltText ? "Describe this image (required)" : "Describe this image (recommended)"}
                aria-label="Alt text"
                className={cn(x.input, "mt-1.5 h-8 text-[12px]", requireAltText && !item.altText.trim() && item.state === "ready" && "border-[#FBD5D9]")}
              />
            )}
          </div>
        </div>
      ))}
      {media.length < max && (
        <label className={cn(buttonClass("secondary", "sm"), "cursor-pointer")}>
          <Plus className="size-3.5" />
          Add another
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) onAdd(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-[11.5px] font-medium text-[#C81E2B]">
          {error}
        </p>
      )}
    </div>
  );
}
