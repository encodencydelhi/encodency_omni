"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  CheckCircle2,
  Clock3,
  FileVideo,
  Globe2,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { mediaApi, MEDIA_LIMITS } from "@/features/admin/content/live/media-api";
import { youtubeKeys } from "@/lib/query/keys";
import { CreatePlaylistDialog, ToggleRow } from "../components/dialogs";
import { Checkbox } from "@/components/ui/checkbox";
import { PageSkeleton } from "../components/states";
import { Badge, Button, Card, ChoiceCard, FormField, Meter, Notice, SelectMenu, Skeleton, TagInput, Thumb, yt } from "../components/ui";
import { useUploadQuery } from "../data/hooks";
import { useNow } from "../hooks/use-now";
import { useGuardedNavigate, useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { describeYouTubeReason } from "../live/youtube-errors";
import type { YouTubePrivacy, YouTubePublishTarget, YouTubeUploadResponse } from "../live/youtube-dto";
import { CATEGORIES, DESCRIPTION_MAX, LANGUAGES, TAGS_MAX_CHARS, TITLE_MAX, VISIBILITY_LABEL, categoryLabel, languageLabel, ytRoutes } from "../lib/constants";
import { duration, fileSize } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { ContentType, Visibility } from "../types";

const STEPS = ["Upload", "Details", "Audience", "Visibility", "Playlists", "Advanced", "Review"] as const;
type Step = (typeof STEPS)[number];

/** library: adding the file to the media library; ready: in the library; error: library upload failed. */
type LibraryState = "idle" | "library" | "ready" | "error";

interface FileInfo {
  name: string;
  size: number;
  durationSec: number | null;
  state: LibraryState;
  assetId: string | null;
  message?: string;
}

type ThumbChoice = { kind: "file"; file: File; preview: string } | { kind: "asset"; assetId: string; preview: string };

interface Draft {
  type: ContentType;
  title: string;
  description: string;
  thumbnail: ThumbChoice | null;
  tags: string[];
  categoryId: string;
  language: string;
  madeForKids: boolean | null;
  visibility: Visibility;
  publishMode: "now" | "schedule";
  day: string;
  time: string;
  playlistIds: string[];
  license: "youtube" | "creativeCommon";
  embeddable: boolean;
}

/** Phases after "Publish"/"Save" is pressed. */
type Phase = "idle" | "preparing" | "uploading" | "finishing" | "failed";

const MB = 1024 * 1024;
const THUMB_TYPES = ["image/jpeg", "image/png"];
const THUMB_MAX = 2 * MB;

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  } catch {
    return "Local time";
  }
};

export function UploadPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="detail" />;
  return <UploadFlow />;
}

function UploadFlow() {
  const { can, playlists, uploadMedia, startUpload, finishUpload, addToPlaylists } = useYouTube();
  const params = useSearchParams();
  const navigate = useGuardedNavigate();
  const now = useNow();

  const initial = useMemo<Draft>(
    () => ({
      type: params?.get("type") === "short" ? "short" : "video",
      title: "",
      description: "",
      thumbnail: null,
      tags: [],
      categoryId: "22",
      language: "",
      madeForKids: null,
      // Never public by default.
      visibility: "private",
      publishMode: params?.get("publish") === "schedule" ? "schedule" : "now",
      day: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      time: "10:00",
      playlistIds: [],
      license: "youtube",
      embeddable: true,
    }),
    // Defaults are read once when the flow opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [draft, setDraft] = useState<Draft>(initial);
  const [file, setFile] = useState<FileInfo | null>(null);
  const [step, setStep] = useState<Step>("Upload");
  const [visited, setVisited] = useState<Set<Step>>(new Set(["Upload"]));
  const [showErrors, setShowErrors] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [attemptNo, setAttemptNo] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const submitting = useRef(false);
  const finishing = useRef(false);
  const [kind, setKind] = useState<"draft" | "publish">("publish");
  const fileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const dirty = !done && (file !== null || JSON.stringify({ ...draft, thumbnail: draft.thumbnail?.preview ?? null }) !== JSON.stringify({ ...initial, thumbnail: null }));

  const scheduleAt = draft.publishMode === "schedule" ? new Date(`${draft.day}T${draft.time}`) : null;
  const target: YouTubePublishTarget = draft.visibility === "unlisted" ? "unlisted" : "public";

  const errors = (() => {
    const e: Partial<Record<Step, string[]>> = {};
    const push = (s: Step, msg: string) => (e[s] = [...(e[s] ?? []), msg]);
    if (!file) push("Upload", "Choose a video file to upload.");
    else if (file.state === "library") push("Upload", "The file is still being added to the media library.");
    else if (file.state === "error") push("Upload", file.message ?? "The file couldn't be added. Choose it again.");
    if (!draft.title.trim()) push("Details", "Add a title.");
    if (draft.title.length > TITLE_MAX) push("Details", `Title must be ${TITLE_MAX} characters or fewer.`);
    if (/[<>]/.test(draft.title)) push("Details", "Titles can't contain < or >.");
    if (draft.description.length > DESCRIPTION_MAX) push("Details", "Description is too long.");
    if (/[<>]/.test(draft.description)) push("Details", "Descriptions can't contain < or >.");
    if (draft.tags.join(",").length > TAGS_MAX_CHARS) push("Details", `Tags can be ${TAGS_MAX_CHARS} characters in total.`);
    if (draft.tags.some((t) => /[<>,]/.test(t))) push("Details", "Tags can't contain <, > or commas.");
    if (draft.madeForKids === null) push("Audience", "Tell YouTube whether this video is made for kids.");
    if (scheduleAt && (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() < now + 15 * 60_000)) push("Visibility", "Schedule at least 15 minutes from now.");
    if (draft.publishMode === "schedule" && draft.visibility === "private") push("Visibility", "Choose Public or Unlisted for the scheduled publish.");
    return e;
  })();

  const blocking = Object.entries(errors).flatMap(([s, msgs]) => msgs!.map((m) => ({ step: s as Step, message: m })));
  const stepIndex = STEPS.indexOf(step);

  const goTo = (target: Step) => {
    setStep(target);
    setVisited((v) => new Set([...v, target]));
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (errors[step]?.length) {
      setShowErrors(true);
      return;
    }
    const n = STEPS[stepIndex + 1];
    if (n) goTo(n);
  };

  /* ---- 1. the file goes into the media library as soon as it is chosen ---- */

  const chooseFile = async (f: File | undefined) => {
    if (!f) return;
    const info: FileInfo = { name: f.name, size: f.size, durationSec: null, state: "library", assetId: null };
    if (!(MEDIA_LIMITS.video.mimeTypes as readonly string[]).includes(f.type)) {
      setFile({ ...info, state: "error", message: "Use an MP4 or MOV (H.264) file." });
      return;
    }
    if (f.size > MEDIA_LIMITS.video.maxBytes) {
      setFile({ ...info, state: "error", message: `Videos from the media library can be at most ${fileSize(MEDIA_LIMITS.video.maxBytes)}.` });
      return;
    }
    fileRef.current = f;
    setFile(info);
    const url = URL.createObjectURL(f);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setFile((cur) => (cur && cur.name === f.name ? { ...cur, durationSec: Number.isFinite(probe.duration) ? Math.round(probe.duration) : null } : cur));
      URL.revokeObjectURL(url);
    };
    probe.src = url;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await uploadMedia(f, controller.signal);
    if (controller.signal.aborted) return;
    setFile((cur) => (cur && cur.name === f.name ? (result ? { ...cur, state: "ready", assetId: result.assetId } : { ...cur, state: "error", message: "The file couldn't be added to the media library." }) : cur));
  };

  const removeFile = () => {
    abortRef.current?.abort();
    fileRef.current = null;
    setFile(null);
  };

  /* ---- 2. create the YouTube upload (always private; publishing is a separate step) ---- */

  const submit = async (submitKind: "draft" | "publish", redirect = true) => {
    if (submitting.current) return false;
    if (submitKind === "publish" && blocking.length) {
      goTo("Review");
      setShowErrors(true);
      return false;
    }
    if (submitKind === "draft" && (!draft.title.trim() || !file?.assetId)) {
      goTo(!file?.assetId ? "Upload" : "Details");
      setShowErrors(true);
      return false;
    }
    submitting.current = true;
    setKind(submitKind);
    setFailure(null);
    setPhase("preparing");

    let thumbnailAssetId: string | undefined;
    if (draft.thumbnail?.kind === "asset") thumbnailAssetId = draft.thumbnail.assetId;
    if (draft.thumbnail?.kind === "file") {
      const uploaded = await uploadMedia(draft.thumbnail.file);
      if (!uploaded) {
        submitting.current = false;
        setPhase("failed");
        setFailure("The thumbnail couldn't be added to the media library.");
        return false;
      }
      thumbnailAssetId = uploaded.assetId;
    }

    const body = {
      assetId: file!.assetId!,
      title: draft.title.trim(),
      description: draft.description.trim(),
      tags: draft.tags,
      categoryId: draft.categoryId,
      privacyStatus: "private" as YouTubePrivacy,
      madeForKids: draft.madeForKids ?? false,
      ...(draft.language ? { defaultLanguage: draft.language } : {}),
      embeddable: draft.embeddable,
      license: draft.license,
      ...(thumbnailAssetId ? { thumbnailAssetId } : {}),
    };
    // The same Idempotency-Key is reused while this exact input is retried, so a double click or a retry never uploads twice.
    const fingerprint = JSON.stringify({ ...body, attemptNo });
    const upload = await startUpload(body, fingerprint);
    submitting.current = false;
    if (!upload) {
      setPhase("failed");
      setFailure("YouTube didn't accept the upload. Check the message above and try again.");
      return false;
    }
    finishing.current = false;
    setUploadId(upload.uploadId);
    setPhase("uploading");
    if (!redirect) setDone(true);
    return true;
  };

  /* ---- 3. poll the job; once a video id exists, publish / schedule / add to playlists ---- */

  const job = useUploadQuery(uploadId);
  const upload: YouTubeUploadResponse | undefined = job.data;

  // The job's own state decides what is shown: a failed job is "failed", a job that has a video id is being finished.
  const failedByJob = phase === "uploading" && upload?.status === "FAILED";
  const shownPhase: Phase = failedByJob ? "failed" : phase === "uploading" && upload?.videoId ? "finishing" : phase;
  const shownFailure = failedByJob ? describeYouTubeReason(upload?.failure?.code).message : failure;
  const videoId = phase === "uploading" ? upload?.videoId ?? null : null;

  useEffect(() => {
    if (!videoId || finishing.current) return;
    finishing.current = true;
    void (async () => {
      let ok = true;
      if (kind === "publish") {
        if (draft.publishMode === "schedule" && scheduleAt) ok = await finishUpload(videoId, { kind: "schedule", target, scheduledAtIso: scheduleAt.toISOString() });
        else if (draft.visibility !== "private") ok = await finishUpload(videoId, { kind: "publish", target });
      }
      if (draft.playlistIds.length) ok = (await addToPlaylists([videoId], draft.playlistIds)) && ok;
      setDone(true);
      // The video exists on YouTube now (even if a follow-up step failed): open it so the person can see its state.
      navigate(ytRoutes.video(videoId), { force: true });
      if (!ok) setFailure("The video was uploaded, but a follow-up step needs attention. It's open now so you can retry it.");
    })();
    // The finishing step runs once per upload, with the draft as it was when the video id appeared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const retry = () => {
    setAttemptNo((n) => n + 1);
    setUploadId(null);
    setPhase("idle");
    setFailure(null);
  };

  useUnsavedChanges(dirty && shownPhase === "idle", () => submit("draft", false), "this upload");

  const busy = shownPhase === "preparing" || shownPhase === "uploading" || shownPhase === "finishing";
  const primaryLabel = draft.publishMode === "schedule" ? "Schedule" : draft.visibility === "public" ? "Publish" : draft.visibility === "unlisted" ? "Publish as unlisted" : "Upload as private";
  const primaryGate = !can.canUpload.allowed ? can.canUpload : draft.publishMode === "schedule" ? can.canSchedule : draft.visibility !== "private" ? can.canPublish : can.canUpload;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Back to content" onClick={() => navigate(ytRoutes.content)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold text-[#0F1B3D]">{draft.type === "short" ? "Create Short" : "Upload video"}</h2>
            <p className="text-[12.5px] text-[#6B7890]">Step {stepIndex + 1} of {STEPS.length} · {step}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => navigate(ytRoutes.content)}>Cancel</Button>
          <Button variant="secondary" loading={busy && kind === "draft"} disabled={busy} gate={can.canUpload} onClick={() => void submit("draft")}>Save as private draft</Button>
        </div>
      </div>

      {!can.canUpload.allowed && <Notice tone="amber" title="Uploading is unavailable">{can.canUpload.reason}</Notice>}
      {shownFailure && shownPhase === "failed" && (
        <Notice tone="red" title="The upload didn't complete" actions={<Button size="sm" variant="primary" icon={RefreshCw} onClick={retry}>Try again</Button>}>
          {shownFailure}
        </Notice>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <Card className="h-fit p-2 lg:sticky lg:top-[76px]">
          <ol className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Upload steps">
            {STEPS.map((s, i) => {
              const hasError = Boolean(errors[s]?.length) && visited.has(s) && s !== step;
              const complete = visited.has(s) && !errors[s]?.length && i < stepIndex;
              const current = s === step;
              return (
                <li key={s} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(s)}
                    aria-current={current ? "step" : undefined}
                    className={cn("flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[12.5px] font-medium transition", current ? "bg-[#FEF1F2] text-[#0F1B3D]" : "text-[#3C4A66] hover:bg-[#F8FAFC]", yt.focus)}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-sm text-[10.5px] font-bold",
                        hasError ? "bg-[#FEF1F2] text-[#C81E2B] ring-1 ring-[#FBD5D9]" : complete ? "bg-[#12B76A] text-white" : current ? "bg-[#E5202E] text-white" : "bg-[#F1F4F8] text-[#6B7890]",
                      )}
                    >
                      {hasError ? "!" : complete ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap">{s}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="min-w-0">
          <div className="border-b border-[#EEF1F5] px-5 py-3.5">
            <h3 className="text-[14.5px] font-semibold text-[#0F1B3D]">{step}</h3>
            <p className="text-[12.5px] text-[#6B7890]">{STEP_HELP[step]}</p>
          </div>
          <div className="space-y-4 px-5 py-4">
            {showErrors && errors[step]?.length ? (
              <Notice tone="red" title="Fix these before continuing">
                <ul className="list-disc pl-4">{errors[step]!.map((m) => <li key={m}>{m}</li>)}</ul>
              </Notice>
            ) : null}

            {step === "Upload" && <UploadStep file={file} onChoose={(f) => void chooseFile(f)} onRemove={removeFile} type={draft.type} setType={(t) => set("type", t)} />}
            {step === "Details" && <DetailsStep draft={draft} set={set} showErrors={showErrors} />}
            {step === "Audience" && <AudienceStep draft={draft} set={set} />}
            {step === "Visibility" && <VisibilityStep draft={draft} set={set} />}
            {step === "Playlists" && <PlaylistsStep draft={draft} set={set} />}
            {step === "Advanced" && <AdvancedStep draft={draft} set={set} />}
            {step === "Review" && <ReviewStep draft={draft} file={file} blocking={blocking} goTo={goTo} scheduleAt={scheduleAt} playlistNames={playlists.filter((p) => draft.playlistIds.includes(p.id)).map((p) => p.title)} />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF1F5] px-5 py-3">
            <Button variant="secondary" icon={ArrowLeft} disabled={stepIndex === 0 || busy} onClick={() => STEPS[stepIndex - 1] && goTo(STEPS[stepIndex - 1]!)}>Back</Button>
            {step === "Review" ? (
              <Button variant="primary" icon={draft.publishMode === "schedule" ? Clock3 : Upload} loading={busy && kind === "publish"} disabled={busy || blocking.length > 0} disabledReason={busy ? "Upload in progress" : `Resolve ${blocking.length} issue${blocking.length === 1 ? "" : "s"} first`} gate={primaryGate} onClick={() => void submit("publish")}>
                {primaryLabel}
              </Button>
            ) : (
              <Button variant="primary" iconRight={ArrowRight} onClick={next}>Next</Button>
            )}
          </div>
        </Card>

        <aside className="hidden xl:block">
          <div className="sticky top-[76px] space-y-1">
            <Card className="overflow-hidden">
              <div className={cn("bg-[#0F1B3D]", draft.type === "short" ? "mx-auto w-[60%] py-2" : "")}>
                {draft.thumbnail ? (
                  <Thumb src={draft.thumbnail.preview} vertical={draft.type === "short"} durationSec={file?.durationSec ?? undefined} className="rounded-none" sizes="300px" />
                ) : (
                  <div className={cn("grid place-items-center text-[#98A2B3]", draft.type === "short" ? "aspect-[9/16]" : "aspect-video")}>
                    <FileVideo className="size-8" />
                  </div>
                )}
              </div>
              <div className="space-y-2.5 p-3.5">
                <p className="line-clamp-2 text-[13px] font-semibold text-[#0F1B3D]">{draft.title || "Untitled video"}</p>
                {shownPhase !== "idle" ? <UploadProgress phase={shownPhase} upload={upload} /> : file ? <FileProgress file={file} /> : <p className="text-[12px] text-[#98A2B3]">No file selected</p>}
                <dl className="space-y-1 border-t border-[#EEF1F5] pt-2 text-[12px]">
                  <PreviewRow label="Visibility" value={draft.publishMode === "schedule" ? "Scheduled" : VISIBILITY_LABEL[draft.visibility]} />
                  <PreviewRow label="Audience" value={draft.madeForKids === null ? "Not set" : draft.madeForKids ? "Made for kids" : "Not made for kids"} />
                  <PreviewRow label="Playlists" value={draft.playlistIds.length ? String(draft.playlistIds.length) : "None"} />
                </dl>
              </div>
            </Card>
            {blocking.length > 0 && (
              <Card className="p-3.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]"><AlertTriangle className="size-3.5 text-[#B54708]" />{blocking.length} to resolve before publishing</p>
                <ul className="mt-2 space-y-1">
                  {blocking.slice(0, 4).map((b) => (
                    <li key={b.message}>
                      <button type="button" onClick={() => goTo(b.step)} className="text-left text-[12px] text-[#2563EB] hover:underline">{b.step}: {b.message}</button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </aside>
      </div>

      {busy && (
        <Card className="p-4" aria-live="polite">
          <UploadProgress phase={shownPhase} upload={upload} />
          <p className="mt-2 text-[12px] text-[#6B7890]">Keep this page open until the video is created on YouTube. Processing continues on YouTube afterwards.</p>
        </Card>
      )}
    </div>
  );
}

const STEP_HELP: Record<Step, string> = {
  Upload: "Choose the video file. It's added to your media library first, then sent to YouTube.",
  Details: "Title, description, thumbnail and tags help viewers find your video.",
  Audience: "YouTube requires every video to declare whether it's made for kids.",
  Visibility: "Uploads always start private. Choose who can watch and when the video goes live.",
  Playlists: "Add the video to one or more playlists once it's on YouTube.",
  Advanced: "License and embedding. Other options are managed in YouTube Studio.",
  Review: "Check everything before it's sent to YouTube.",
};

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#6B7890]">{label}</dt>
      <dd className="font-medium text-[#0F1B3D]">{value}</dd>
    </div>
  );
}

/** Progress of the file on its way into the media library. */
function FileProgress({ file }: { file: FileInfo }) {
  const label = file.state === "library" ? "Adding to media library…" : file.state === "ready" ? "Ready to send to YouTube" : file.state === "error" ? "Couldn't be added" : "Waiting";
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className={cn("flex items-center gap-1.5 font-medium", file.state === "ready" ? "text-[#067647]" : file.state === "error" ? "text-[#C81E2B]" : "text-[#24324F]")}>
          {file.state === "ready" ? <CheckCircle2 className="size-3.5" /> : file.state === "error" ? <AlertTriangle className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
          {label}
        </span>
        <span className="text-[#98A2B3]">{fileSize(file.size)}</span>
      </div>
      <Meter value={file.state === "ready" ? 100 : file.state === "library" ? 35 : 0} tone={file.state === "ready" ? "green" : file.state === "error" ? "red" : "blue"} className="mt-1.5" />
    </div>
  );
}

/** Progress of the YouTube upload job (bytes delivered, then YouTube's own processing). */
function UploadProgress({ phase, upload }: { phase: Phase; upload: YouTubeUploadResponse | undefined }) {
  let label = "Preparing the upload…";
  let percent = 5;
  let tone: "blue" | "green" | "red" = "blue";
  if (phase === "failed") {
    label = "Upload failed";
    tone = "red";
    percent = upload?.progress.percent ?? 0;
  } else if (upload) {
    percent = upload.progress.percent;
    if (upload.status === "INTERRUPTED") label = "Connection to YouTube interrupted — resuming automatically";
    else if (upload.status === "QUEUED") label = "Queued";
    else if (upload.status === "UPLOADING") label = `Uploading to YouTube ${Math.round(upload.progress.percent)}%`;
    else if (upload.processingStatus === "PROCESSING") {
      label = "Uploaded — YouTube is processing";
      percent = 100;
    } else if (upload.processingStatus === "READY") {
      label = "Uploaded and processed";
      percent = 100;
      tone = "green";
    } else {
      label = "Uploaded";
      percent = 100;
    }
    if (phase === "finishing") label = "Applying visibility and playlists…";
  }
  return (
    <div role="status">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className={cn("flex items-center gap-1.5 font-medium", tone === "red" ? "text-[#C81E2B]" : tone === "green" ? "text-[#067647]" : "text-[#24324F]")}>
          {tone === "red" ? <AlertTriangle className="size-3.5" /> : tone === "green" ? <CheckCircle2 className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
          {label}
        </span>
      </div>
      <Meter value={percent} tone={tone} className="mt-1.5" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

type StepProps = { draft: Draft; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void };

function UploadStep({ file, onChoose, onRemove, type, setType }: { file: FileInfo | null; onChoose: (f: File | undefined) => void; onRemove: () => void; type: ContentType; setType: (t: ContentType) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const limitText = `MP4 or MOV (H.264), up to ${fileSize(MEDIA_LIMITS.video.maxBytes)} and ${Math.round(MEDIA_LIMITS.video.maxDurationMs / 1000 / 60)} minutes (media library limits).`;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <ChoiceCard name="upload-type" checked={type === "video"} onSelect={() => setType("video")} icon={FileVideo} title="Video" description="Standard horizontal upload." />
        <ChoiceCard name="upload-type" checked={type === "short"} onSelect={() => setType("short")} icon={FileVideo} title="Short" description="Vertical, up to 60 seconds. YouTube decides from the file." />
      </div>

      {!file ? (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onChoose(e.dataTransfer.files[0]);
            }}
            className={cn("flex w-full flex-col items-center justify-center rounded-[10px] border-2 border-dashed px-6 py-12 text-center transition", dragging ? "border-[#E5202E] bg-[#FFF8F8]" : "border-[#D0D7E2] bg-[#F8FAFC] hover:border-[#98A2B3]", yt.focus)}
          >
            <span className="grid size-14 place-items-center rounded-sm bg-white text-[#E5202E] shadow-[0_1px_3px_rgba(15,27,61,0.1)]">
              <Upload className="size-6" />
            </span>
            <span className="mt-3 text-[14px] font-semibold text-[#0F1B3D]">Drag and drop a video file</span>
            <span className="mt-1 text-[12.5px] text-[#6B7890]">Your video stays private until you publish it.</span>
            <span className="pointer-events-none mt-4">
              <span className="inline-flex h-9 items-center rounded-sm bg-[#E5202E] px-4 text-[12.5px] font-semibold text-white">Choose file</span>
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/quicktime"
            hidden
            onChange={(e) => {
              onChoose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="text-[12px] text-[#6B7890]">{limitText}</p>
        </>
      ) : (
        <div className="rounded-[10px] border border-[#E4E9F0] p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#FEF1F2] text-[#E5202E]"><FileVideo className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#0F1B3D]">{file.name}</p>
              <p className="text-[12px] text-[#6B7890]">
                {fileSize(file.size)} · {file.durationSec !== null ? duration(file.durationSec) : "Reading duration…"}
              </p>
            </div>
            <Button size="sm" variant="ghost" icon={file.state === "ready" ? Trash2 : X} onClick={onRemove}>{file.state === "ready" ? "Remove" : "Cancel"}</Button>
          </div>
          <div className="mt-3"><FileProgress file={file} /></div>
          {file.state === "ready" && <p className="mt-2 text-[12px] text-[#6B7890]">The file is in your media library. You can keep filling in the details.</p>}
          {file.state === "error" && (
            <Notice tone="red" className="mt-3" title="This file can't be used" actions={<Button size="sm" variant="primary" icon={RefreshCw} onClick={onRemove}>Choose another file</Button>}>
              {file.message ?? "The file couldn't be added to the media library."} {limitText}
            </Notice>
          )}
          {file.state === "ready" && type === "short" && file.durationSec !== null && file.durationSec > 60 && (
            <Notice tone="amber" className="mt-3" title="This is longer than a Short">YouTube treats vertical videos of up to 60 seconds as Shorts. Switch to Video or upload a shorter file.</Notice>
          )}
        </div>
      )}
    </div>
  );
}

function DetailsStep({ draft, set, showErrors }: StepProps & { showErrors: boolean }) {
  const thumbInput = useRef<HTMLInputElement>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const { scope } = useYouTube();
  const library = useQuery({
    queryKey: scope ? youtubeKeys.mediaImages(scope) : ["youtube", "none", "media-images"],
    queryFn: () => mediaApi.list(scope!.companyId, scope!.clientId, { kind: "IMAGE", limit: 24 }),
    enabled: scope !== null,
    staleTime: 60_000,
  });
  const suggestions = (library.data?.items ?? []).filter((a) => THUMB_TYPES.includes(a.mimeType) && a.bytes <= THUMB_MAX).slice(0, 3);

  return (
    <div className="space-y-4">
      <FormField label="Title" required htmlFor="up-title" counter={{ value: draft.title.length, max: TITLE_MAX }} error={showErrors && !draft.title.trim() ? "Add a title." : draft.title.length > TITLE_MAX ? `Keep the title under ${TITLE_MAX} characters.` : undefined} hint="Front-load the most important words — long titles get truncated.">
        <input id="up-title" autoFocus className={yt.input} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Add a title that describes your video" />
      </FormField>
      <FormField label="Description" htmlFor="up-desc" counter={{ value: draft.description.length, max: DESCRIPTION_MAX }} hint="Add timestamps (0:00 Intro) to create chapters automatically.">
        <textarea id="up-desc" rows={7} className={yt.textarea} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Tell viewers about your video" />
      </FormField>

      <div>
        <p className="mb-1.5 text-[12.5px] font-semibold text-[#24324F]">Thumbnail</p>
        <p className="mb-2 text-[12px] text-[#6B7890]">Upload a custom image or pick one from your media library. JPG or PNG, up to 2 MB. Without one, YouTube picks a frame.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => thumbInput.current?.click()} className={cn("flex aspect-video flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[#C9D1DC] bg-[#F8FAFC] text-[12px] font-medium text-[#3C4A66] hover:border-[#98A2B3]", yt.focus)}>
            <ImagePlus className="size-4" />
            Upload custom
          </button>
          {library.isPending && scope ? <Skeleton className="aspect-video w-full" /> : null}
          {suggestions.map((a) => {
            const chosen = draft.thumbnail?.kind === "asset" && draft.thumbnail.assetId === a.id;
            return (
              <button key={a.id} type="button" aria-pressed={chosen} onClick={() => set("thumbnail", { kind: "asset", assetId: a.id, preview: a.url })} className={cn("relative rounded-sm ring-offset-2", chosen ? "ring-2 ring-[#E5202E]" : "hover:ring-2 hover:ring-[#C9D1DC]", yt.focus)}>
                <Thumb src={a.url} sizes="160px" />
                {chosen && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-sm bg-[#E5202E] text-white"><Check className="size-3" /></span>}
              </button>
            );
          })}
        </div>
        {draft.thumbnail?.kind === "file" && (
          <div className="mt-2 flex items-center gap-2">
            <Thumb src={draft.thumbnail.preview} className="w-28" sizes="112px" />
            <Badge tone="green" icon={CheckCircle2}>Custom thumbnail</Badge>
            <Button size="xs" variant="ghost" onClick={() => set("thumbnail", null)}>Remove</Button>
          </div>
        )}
        <input
          ref={thumbInput}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (!THUMB_TYPES.includes(f.type)) return setThumbError("Use a JPG or PNG image.");
            if (f.size > THUMB_MAX) return setThumbError("Thumbnails must be 2 MB or smaller.");
            setThumbError(null);
            set("thumbnail", { kind: "file", file: f, preview: URL.createObjectURL(f) });
          }}
        />
        {thumbError && <p role="alert" className="mt-1 text-[12px] font-medium text-[#C81E2B]">{thumbError}</p>}
      </div>

      <FormField label="Tags" htmlFor="up-tags" counter={{ value: draft.tags.join(",").length, max: TAGS_MAX_CHARS }} hint="Useful for commonly misspelled words and related terms.">
        <TagInput id="up-tags" value={draft.tags} onChange={(t) => set("tags", t)} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Category">
          <SelectMenu label="Category" size="md" fullWidth value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
        </FormField>
        <FormField label="Video language">
          <SelectMenu label="Language" size="md" fullWidth value={draft.language} onChange={(v) => set("language", v)} options={[{ value: "", label: "Not set" }, ...LANGUAGES.map((l) => ({ value: l.id, label: l.label }))]} />
        </FormField>
      </div>
    </div>
  );
}

function AudienceStep({ draft, set }: StepProps) {
  return (
    <div className="space-y-4">
      <Notice tone="blue" title="Required by law">
        Regardless of location, you&apos;re legally required to comply with the Children&apos;s Online Privacy Protection Act (COPPA) and other laws.
      </Notice>
      <div className="space-y-2" role="radiogroup" aria-label="Made for kids">
        <ChoiceCard name="kids" checked={draft.madeForKids === true} onSelect={() => set("madeForKids", true)} icon={Baby} title="Yes, it's made for kids" description="Comments, notifications and personalised ads are turned off." />
        <ChoiceCard name="kids" checked={draft.madeForKids === false} onSelect={() => set("madeForKids", false)} icon={UsersRound} title="No, it's not made for kids" />
      </div>
    </div>
  );
}

function VisibilityStep({ draft, set }: StepProps) {
  const when = new Date(`${draft.day}T${draft.time}`);
  const zone = browserZone();
  return (
    <div className="space-y-4">
      <Notice tone="blue" title="Uploads start private">The video is uploaded as private first. Publishing or scheduling happens after YouTube has the file.</Notice>
      <div className="space-y-2">
        <ChoiceCard name="publish-mode" checked={draft.publishMode === "now"} onSelect={() => set("publishMode", "now")} icon={Upload} title="Save or publish" description="Keep it private, or make it public or unlisted once uploaded." />
        {draft.publishMode === "now" && (
          <div className="ml-7 grid gap-2 sm:grid-cols-3">
            {(["private", "unlisted", "public"] as Visibility[]).map((v) => (
              <ChoiceCard key={v} name="vis" checked={draft.visibility === v} onSelect={() => set("visibility", v)} icon={v === "public" ? Globe2 : v === "unlisted" ? Link2 : Lock} title={VISIBILITY_LABEL[v]} description={v === "public" ? "Everyone" : v === "unlisted" ? "Anyone with the link" : "Only you"} />
            ))}
          </div>
        )}
        <ChoiceCard name="publish-mode" checked={draft.publishMode === "schedule"} onSelect={() => { set("publishMode", "schedule"); if (draft.visibility === "private") set("visibility", "public"); }} icon={Clock3} title="Schedule" description="Choose a date to publish. It stays private until then." />
        {draft.publishMode === "schedule" && (
          <div className="ml-7 grid gap-3 sm:grid-cols-3">
            <FormField label="Date" htmlFor="up-date">
              <input id="up-date" type="date" className={yt.input} value={draft.day} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => set("day", e.target.value)} />
            </FormField>
            <FormField label="Time" htmlFor="up-time">
              <input id="up-time" type="time" className={yt.input} value={draft.time} onChange={(e) => set("time", e.target.value)} />
            </FormField>
            <FormField label="Time zone">
              <SelectMenu label="Time zone" size="md" fullWidth disabled value={zone} onChange={() => undefined} options={[{ value: zone, label: zone }]} />
            </FormField>
            <div className="sm:col-span-3">
              <FormField label="Visibility when published">
                <SelectMenu<"public" | "unlisted"> label="Visibility when published" size="md" fullWidth value={draft.visibility === "unlisted" ? "unlisted" : "public"} onChange={(v) => set("visibility", v)} options={[{ value: "public", label: "Public" }, { value: "unlisted", label: "Unlisted" }]} />
              </FormField>
            </div>
            {!Number.isNaN(when.getTime()) && <p className="text-[12px] text-[#6B7890] sm:col-span-3">Goes {draft.visibility === "unlisted" ? "unlisted" : "public"} {format(when, "EEEE, MMMM d 'at' h:mm a")} ({zone}).</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaylistsStep({ draft, set }: StepProps) {
  const { playlists, playlistsState, can } = useYouTube();
  const [createOpen, setCreateOpen] = useState(false);
  const owned = playlists.filter((p) => !p.system);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-[#6B7890]">{draft.playlistIds.length} selected</p>
        <Button size="sm" variant="secondary" icon={Upload} gate={can.canManagePlaylists} onClick={() => setCreateOpen(true)}>Create playlist</Button>
      </div>
      {playlistsState.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : owned.length === 0 ? (
        <p className="rounded-[10px] border border-[#E4E9F0] px-4 py-6 text-center text-[12.5px] text-[#6B7890]">You don&apos;t own any playlists yet. Create one, then select it here.</p>
      ) : (
        <ul className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
          {owned.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-[#F8FAFC]">
                <Checkbox checked={draft.playlistIds.includes(p.id)} onCheckedChange={(c) => set("playlistIds", c ? [...draft.playlistIds, p.id] : draft.playlistIds.filter((x) => x !== p.id))} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[#0F1B3D]">{p.title}</span>
                  <span className="text-[11.5px] text-[#6B7890]">{VISIBILITY_LABEL[p.visibility]}{p.itemCount !== null ? ` · ${p.itemCount} videos` : ""}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(p) => set("playlistIds", [...draft.playlistIds, p.id])} />
    </div>
  );
}

function AdvancedStep({ draft, set }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="License">
          <SelectMenu<Draft["license"]> label="License" size="md" fullWidth value={draft.license} onChange={(v) => set("license", v)} options={[{ value: "youtube", label: "Standard YouTube License" }, { value: "creativeCommon", label: "Creative Commons – Attribution" }]} />
        </FormField>
      </div>
      <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
        <ToggleRow label="Allow embedding" description="Let others embed this video on their websites." checked={draft.embeddable} onChange={(c) => set("embeddable", c)} />
      </div>
    </div>
  );
}

function ReviewStep({
  draft,
  file,
  blocking,
  goTo,
  scheduleAt,
  playlistNames,
}: {
  draft: Draft;
  file: FileInfo | null;
  blocking: { step: Step; message: string }[];
  goTo: (s: Step) => void;
  scheduleAt: Date | null;
  playlistNames: string[];
}) {
  const zone = browserZone();
  const rows: { label: string; value: ReactNode; step: Step }[] = [
    { label: "File", value: file ? `${file.name} · ${fileSize(file.size)}${file.durationSec ? ` · ${duration(file.durationSec)}` : ""}` : <Missing />, step: "Upload" },
    { label: "Title", value: draft.title || <Missing />, step: "Details" },
    { label: "Thumbnail", value: draft.thumbnail ? <Thumb src={draft.thumbnail.preview} className="ml-auto w-24" sizes="96px" /> : "Chosen by YouTube", step: "Details" },
    { label: "Category · Language", value: `${categoryLabel(draft.categoryId)} · ${draft.language ? languageLabel(draft.language) : "Not set"}`, step: "Details" },
    { label: "Tags", value: draft.tags.length ? draft.tags.join(", ") : "None", step: "Details" },
    { label: "Audience", value: draft.madeForKids === null ? <Missing /> : draft.madeForKids ? "Made for kids" : "Not made for kids", step: "Audience" },
    {
      label: "Visibility",
      value: scheduleAt ? `Private until ${Number.isNaN(scheduleAt.getTime()) ? "an invalid date" : format(scheduleAt, "EEE, MMM d 'at' h:mm a")} (${zone}), then ${draft.visibility === "unlisted" ? "unlisted" : "public"}` : VISIBILITY_LABEL[draft.visibility],
      step: "Visibility",
    },
    { label: "Playlists", value: playlistNames.length ? playlistNames.join(", ") : "None", step: "Playlists" },
    { label: "Advanced", value: `${draft.license === "youtube" ? "Standard license" : "Creative Commons"} · Embedding ${draft.embeddable ? "on" : "off"}`, step: "Advanced" },
  ];

  return (
    <div className="space-y-4">
      {blocking.length > 0 ? (
        <Notice tone="red" title={`${blocking.length} issue${blocking.length === 1 ? "" : "s"} must be fixed before publishing`}>
          <ul className="mt-1 space-y-0.5">
            {blocking.map((b) => (
              <li key={b.message}>
                <button type="button" onClick={() => goTo(b.step)} className="text-left text-[#1D4ED8] hover:underline">{b.step} — {b.message}</button>
              </li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice tone="blue" icon={CheckCircle2} title="Ready to send to YouTube">The video is uploaded as private first; YouTube may need a few minutes to process it before it can be published.</Notice>
      )}
      <dl className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4 px-3.5 py-2.5">
            <dt className="w-36 shrink-0 text-[12px] text-[#6B7890]">{row.label}</dt>
            <dd className="min-w-0 flex-1 break-words text-right text-[12.5px] font-medium text-[#0F1B3D]">{row.value}</dd>
            <Button size="xs" variant="link" onClick={() => goTo(row.step)} aria-label={`Edit ${row.label}`}>Edit</Button>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Missing() {
  return <span className="font-medium text-[#C81E2B]">Required</span>;
}
