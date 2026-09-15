"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  CheckCircle2,
  Captions,
  Clock3,
  ExternalLink,
  FileVideo,
  Globe2,
  ImagePlus,
  Link2,
  ListPlus,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { THUMBNAIL_LIBRARY } from "../data/mock";
import { CreatePlaylistDialog, ToggleRow } from "../components/dialogs";
import { PageSkeleton } from "../components/states";
import {
  Badge,
  Button,
  Card,
  ChoiceCard,
  FormField,
  InternalBadge,
  Meter,
  Notice,
  SelectMenu,
  TagInput,
  Thumb,
  yt,
} from "../components/ui";
import { useNow } from "../hooks/use-now";
import { useGuardedNavigate, useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { CATEGORIES, DESCRIPTION_MAX, LANGUAGES, TAGS_MAX_CHARS, TIMEZONES, TITLE_MAX, VISIBILITY_LABEL, categoryLabel, languageLabel, ytRoutes } from "../lib/constants";
import { duration, fileSize } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { ContentType, Visibility } from "../types";

const STEPS = ["Upload", "Details", "Audience", "Video elements", "Visibility", "Playlists", "Advanced", "Review"] as const;
type Step = (typeof STEPS)[number];

type UploadState = "idle" | "uploading" | "processing" | "ready" | "error";

interface FileInfo {
  name: string;
  size: number;
  durationSec: number | null;
  progress: number;
  state: UploadState;
}

interface Caption {
  name: string;
  language: string;
}

interface Draft {
  type: ContentType;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  tags: string[];
  categoryId: string;
  language: string;
  madeForKids: boolean | null;
  ageRestricted: boolean;
  captions: Caption[];
  visibility: Visibility;
  publishMode: "now" | "schedule";
  day: string;
  time: string;
  timezone: string;
  playlistIds: string[];
  license: "youtube" | "creativeCommon";
  embeddable: boolean;
  commentsEnabled: boolean;
  commentModeration: "basic" | "strict" | "holdAll";
  recordingDate: string;
  paidPromotion: boolean;
}

export function UploadPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="detail" />;
  return <UploadFlow />;
}

function UploadFlow() {
  const { settings, can, createVideo, playlists } = useYouTube();
  const params = useSearchParams();
  const navigate = useGuardedNavigate();
  const now = useNow();

  const initial = useMemo<Draft>(
    () => ({
      type: params?.get("type") === "short" ? "short" : "video",
      title: "",
      description: settings.defaults.descriptionFooter ? `\n\n${settings.defaults.descriptionFooter}` : "",
      thumbnailUrl: null,
      tags: settings.defaults.tags,
      categoryId: settings.defaults.categoryId,
      language: settings.defaults.language,
      madeForKids: null,
      ageRestricted: false,
      captions: [],
      visibility: settings.defaults.visibility,
      publishMode: params?.get("publish") === "schedule" ? "schedule" : "now",
      day: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      time: "10:00",
      timezone: settings.defaults.timezone,
      playlistIds: settings.defaults.playlistId ? [settings.defaults.playlistId] : [],
      license: settings.defaults.license,
      embeddable: true,
      commentsEnabled: settings.defaults.commentsEnabled,
      commentModeration: "basic",
      recordingDate: "",
      paidPromotion: false,
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
  const [submitting, setSubmitting] = useState<null | "draft" | "publish">(null);
  const [done, setDone] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const dirty = !done && (file !== null || JSON.stringify(draft) !== JSON.stringify(initial));

  const scheduleAt = draft.publishMode === "schedule" ? new Date(`${draft.day}T${draft.time}`) : null;
  const needsApproval = settings.moderation.requireApproval && !can.canPublish.allowed;

  const errors = (() => {
    const e: Partial<Record<Step, string[]>> = {};
    const push = (s: Step, msg: string) => (e[s] = [...(e[s] ?? []), msg]);
    if (!file) push("Upload", "Choose a video file to upload.");
    if (file?.state === "error") push("Upload", "The upload failed. Choose the file again.");
    if (draft.type === "short" && file?.durationSec && file.durationSec > 180) push("Upload", "Shorts can be up to 3 minutes long.");
    if (!draft.title.trim()) push("Details", "Add a title.");
    if (draft.title.length > TITLE_MAX) push("Details", `Title must be ${TITLE_MAX} characters or fewer.`);
    if (/[<>]/.test(draft.title)) push("Details", "Titles can't contain < or >.");
    if (draft.description.length > DESCRIPTION_MAX) push("Details", "Description is too long.");
    if (draft.tags.join(",").length > TAGS_MAX_CHARS) push("Details", `Tags can be ${TAGS_MAX_CHARS} characters in total.`);
    if (draft.madeForKids === null) push("Audience", "Tell YouTube whether this video is made for kids.");
    if (scheduleAt && (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() < now + 15 * 60_000)) push("Visibility", "Schedule at least 15 minutes from now.");
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
    if (errors[step]?.length && step !== "Upload") {
      setShowErrors(true);
      return;
    }
    if (step === "Upload" && !file) {
      setShowErrors(true);
      return;
    }
    const n = STEPS[stepIndex + 1];
    if (n) goTo(n);
  };

  const submit = async (mode: "draft" | "publish", redirect = true) => {
    if (mode === "publish" && blocking.length) {
      goTo("Review");
      setShowErrors(true);
      return false;
    }
    if (mode === "draft" && !draft.title.trim()) {
      goTo("Details");
      setShowErrors(true);
      return false;
    }
    setSubmitting(mode);
    const status = mode === "draft" || needsApproval ? "draft" : draft.publishMode === "schedule" ? "scheduled" : "published";
    const created = await createVideo({
      type: draft.type,
      title: draft.title.trim(),
      description: draft.description.trim(),
      thumbnailUrl: draft.thumbnailUrl ?? THUMBNAIL_LIBRARY[0]!,
      visibility: status === "scheduled" ? "private" : status === "draft" ? "private" : draft.visibility,
      status: status === "published" && file?.state !== "ready" ? "processing" : status,
      scheduledAt: scheduleAt && status !== "published" ? scheduleAt.toISOString() : null,
      durationSec: file?.durationSec ?? 0,
      tags: draft.tags,
      categoryId: draft.categoryId,
      language: draft.language,
      madeForKids: draft.madeForKids ?? false,
      ageRestricted: draft.ageRestricted,
      license: draft.license,
      embeddable: draft.embeddable,
      commentsEnabled: draft.commentsEnabled && !draft.madeForKids,
      paidPromotion: draft.paidPromotion,
      recordingDate: draft.recordingDate ? new Date(draft.recordingDate).toISOString() : null,
      playlistIds: draft.playlistIds,
      approval: mode === "publish" && needsApproval ? "pending" : "none",
    });
    setSubmitting(null);
    if (created) {
      setDone(true);
      if (redirect) navigate(ytRoutes.video(created.id), { force: true });
      return true;
    }
    return false;
  };

  useUnsavedChanges(dirty, () => submit("draft", false), "this upload");

  const primaryLabel = needsApproval ? "Submit for approval" : draft.publishMode === "schedule" ? "Schedule" : draft.visibility === "public" ? "Publish" : `Save as ${VISIBILITY_LABEL[draft.visibility].toLowerCase()}`;
  const primaryGate = !can.canUpload.allowed ? can.canUpload : needsApproval ? can.canUpload : draft.publishMode === "schedule" ? can.canSchedule : can.canPublish;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Back to content" onClick={() => navigate(ytRoutes.content)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold text-[#0F1B3D]">
              {draft.type === "short" ? "Create Short" : "Upload video"}
              {needsApproval && <Badge tone="violet">Requires approval</Badge>}
            </h2>
            <p className="text-[12.5px] text-[#6B7890]">Step {stepIndex + 1} of {STEPS.length} · {step}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(ytRoutes.content)}>Cancel</Button>
          <Button variant="secondary" loading={submitting === "draft"} disabled={submitting !== null} gate={can.canUpload} onClick={() => void submit("draft")}>Save draft</Button>
        </div>
      </div>

      {!can.canUpload.allowed && <Notice tone="amber" title="Uploading is unavailable">{can.canUpload.reason}</Notice>}

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

            {step === "Upload" && <UploadStep file={file} setFile={setFile} type={draft.type} setType={(t) => set("type", t)} />}
            {step === "Details" && <DetailsStep draft={draft} set={set} showErrors={showErrors} />}
            {step === "Audience" && <AudienceStep draft={draft} set={set} />}
            {step === "Video elements" && <ElementsStep draft={draft} set={set} />}
            {step === "Visibility" && <VisibilityStep draft={draft} set={set} needsApproval={needsApproval} />}
            {step === "Playlists" && <PlaylistsStep draft={draft} set={set} />}
            {step === "Advanced" && <AdvancedStep draft={draft} set={set} />}
            {step === "Review" && <ReviewStep draft={draft} file={file} blocking={blocking} goTo={goTo} needsApproval={needsApproval} scheduleAt={scheduleAt} playlistNames={playlists.filter((p) => draft.playlistIds.includes(p.id)).map((p) => p.title)} />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF1F5] px-5 py-3">
            <Button variant="secondary" icon={ArrowLeft} disabled={stepIndex === 0} onClick={() => STEPS[stepIndex - 1] && goTo(STEPS[stepIndex - 1]!)}>Back</Button>
            {step === "Review" ? (
              <Button variant="primary" icon={needsApproval ? Send : draft.publishMode === "schedule" ? Clock3 : Upload} loading={submitting === "publish"} disabled={submitting !== null || blocking.length > 0} disabledReason={`Resolve ${blocking.length} issue${blocking.length === 1 ? "" : "s"} first`} gate={primaryGate} onClick={() => void submit("publish")}>
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
                {draft.thumbnailUrl ? (
                  <Thumb src={draft.thumbnailUrl} vertical={draft.type === "short"} durationSec={file?.durationSec ?? undefined} className="rounded-none" sizes="300px" />
                ) : (
                  <div className={cn("grid place-items-center text-[#98A2B3]", draft.type === "short" ? "aspect-[9/16]" : "aspect-video")}>
                    <FileVideo className="size-8" />
                  </div>
                )}
              </div>
              <div className="space-y-2.5 p-3.5">
                <p className="line-clamp-2 text-[13px] font-semibold text-[#0F1B3D]">{draft.title || "Untitled video"}</p>
                {file ? (
                  <FileProgress file={file} />
                ) : (
                  <p className="text-[12px] text-[#98A2B3]">No file selected</p>
                )}
                <dl className="space-y-1 border-t border-[#EEF1F5] pt-2 text-[12px]">
                  <PreviewRow label="Visibility" value={needsApproval ? "After approval" : draft.publishMode === "schedule" ? "Scheduled" : VISIBILITY_LABEL[draft.visibility]} />
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
    </div>
  );
}

const STEP_HELP: Record<Step, string> = {
  Upload: "Upload the video file. You can keep filling in details while it uploads.",
  Details: "Title, description, thumbnail and tags help viewers find your video.",
  Audience: "YouTube requires every video to declare whether it's made for kids.",
  "Video elements": "Add subtitles. Cards and end screens are finished in YouTube Studio.",
  Visibility: "Choose who can watch and when the video goes live.",
  Playlists: "Add the video to one or more playlists.",
  Advanced: "License, embedding, comments and disclosure settings.",
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

function FileProgress({ file }: { file: FileInfo }) {
  const label = file.state === "uploading" ? `Uploading ${file.progress}%` : file.state === "processing" ? "Processing on YouTube…" : file.state === "ready" ? "Upload complete" : file.state === "error" ? "Upload failed" : "Waiting";
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className={cn("flex items-center gap-1.5 font-medium", file.state === "ready" ? "text-[#067647]" : file.state === "error" ? "text-[#C81E2B]" : "text-[#24324F]")}>
          {file.state === "ready" ? <CheckCircle2 className="size-3.5" /> : file.state === "error" ? <AlertTriangle className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
          {label}
        </span>
        <span className="text-[#98A2B3]">{fileSize(file.size)}</span>
      </div>
      <Meter value={file.state === "processing" || file.state === "ready" ? 100 : file.progress} tone={file.state === "ready" ? "green" : file.state === "error" ? "red" : "blue"} className="mt-1.5" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

type StepProps = { draft: Draft; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void };

function UploadStep({ file, setFile, type, setType }: { file: FileInfo | null; setFile: React.Dispatch<React.SetStateAction<FileInfo | null>>; type: ContentType; setType: (t: ContentType) => void }) {
  const { simulation, simulate } = useYouTube();
  const input = useRef<HTMLInputElement>(null);
  const lastFile = useRef<File | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("That file isn't a video. YouTube accepts MP4, MOV, WebM, AVI and more.");
      return;
    }
    setError(null);
    lastFile.current = f;
    const willFail = simulation.failNextAction;
    if (willFail) simulate.setFailNextAction(false);
    const url = URL.createObjectURL(f);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setFile((cur) => (cur ? { ...cur, durationSec: Number.isFinite(probe.duration) ? Math.round(probe.duration) : null } : cur));
      URL.revokeObjectURL(url);
    };
    probe.src = url;

    setFile({ name: f.name, size: f.size, durationSec: null, progress: 0, state: "uploading" });
    if (timer.current) clearInterval(timer.current);
    // Simulated resumable upload: the backend will stream real progress events.
    timer.current = setInterval(() => {
      setFile((cur) => {
        if (!cur || cur.state !== "uploading") return cur;
        const progress = Math.min(100, cur.progress + 4 + Math.round(Math.random() * 8));
        if (willFail && progress >= 55) {
          if (timer.current) clearInterval(timer.current);
          return { ...cur, progress, state: "error" };
        }
        if (progress >= 100) {
          if (timer.current) clearInterval(timer.current);
          setTimeout(() => setFile((c) => (c ? { ...c, state: "ready" } : c)), 1800);
          return { ...cur, progress: 100, state: "processing" };
        }
        return { ...cur, progress };
      });
    }, 350);
  };

  const cancel = () => {
    if (timer.current) clearInterval(timer.current);
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <ChoiceCard name="upload-type" checked={type === "video"} onSelect={() => setType("video")} icon={FileVideo} title="Video" description="Standard horizontal upload." />
        <ChoiceCard name="upload-type" checked={type === "short"} onSelect={() => setType("short")} icon={FileVideo} title="Short" description="Vertical, up to 3 minutes." />
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
              start(e.dataTransfer.files[0]);
            }}
            className={cn("flex w-full flex-col items-center justify-center rounded-[10px] border-2 border-dashed px-6 py-12 text-center transition", dragging ? "border-[#E5202E] bg-[#FFF8F8]" : "border-[#D0D7E2] bg-[#F8FAFC] hover:border-[#98A2B3]", yt.focus)}
          >
            <span className="grid size-14 place-items-center rounded-sm bg-white text-[#E5202E] shadow-[0_1px_3px_rgba(15,27,61,0.1)]">
              <Upload className="size-6" />
            </span>
            <span className="mt-3 text-[14px] font-semibold text-[#0F1B3D]">Drag and drop a video file</span>
            <span className="mt-1 text-[12.5px] text-[#6B7890]">Your video stays private until you publish.</span>
            <span className={cn("mt-4", "pointer-events-none")}>
              <span className="inline-flex h-9 items-center rounded-sm bg-[#E5202E] px-4 text-[12.5px] font-semibold text-white">Choose file</span>
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              start(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {error && <p role="alert" className="text-[12.5px] font-medium text-[#C81E2B]">{error}</p>}
          <p className="text-[12px] text-[#6B7890]">Unverified channels can upload videos up to 15 minutes. Max file size 256 GB.</p>
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
            <Button size="sm" variant="ghost" icon={file.state === "ready" ? Trash2 : X} onClick={cancel}>{file.state === "ready" ? "Remove" : "Cancel upload"}</Button>
          </div>
          <div className="mt-3"><FileProgress file={file} /></div>
          {file.state === "processing" && <p className="mt-2 text-[12px] text-[#6B7890]">YouTube is processing the file. You can continue with the next steps.</p>}
          {file.state === "error" && (
            <Notice
              tone="red"
              className="mt-3"
              title="Upload interrupted"
              actions={<Button size="sm" variant="primary" icon={RefreshCw} onClick={() => lastFile.current && start(lastFile.current)}>Retry upload</Button>}
            >
              The connection to YouTube dropped at {file.progress}%. Your details are kept — retry to resume.
            </Notice>
          )}
          {file.state === "ready" && type === "short" && file.durationSec !== null && file.durationSec > 180 && (
            <Notice tone="amber" className="mt-3" title="This is longer than a Short">Shorts can be up to 3 minutes. Switch to Video or upload a shorter file.</Notice>
          )}
        </div>
      )}
    </div>
  );
}

function DetailsStep({ draft, set, showErrors }: StepProps & { showErrors: boolean }) {
  const thumbInput = useRef<HTMLInputElement>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
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
        <p className="mb-2 text-[12px] text-[#6B7890]">Upload a custom image or pick from your media library. 1280×720, up to 2 MB.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => thumbInput.current?.click()} className={cn("flex aspect-video flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[#C9D1DC] bg-[#F8FAFC] text-[12px] font-medium text-[#3C4A66] hover:border-[#98A2B3]", yt.focus)}>
            <ImagePlus className="size-4" />
            Upload custom
          </button>
          {THUMBNAIL_LIBRARY.slice(0, 3).map((url) => (
            <button key={url} type="button" aria-pressed={draft.thumbnailUrl === url} onClick={() => set("thumbnailUrl", url)} className={cn("relative rounded-sm ring-offset-2", draft.thumbnailUrl === url ? "ring-2 ring-[#E5202E]" : "hover:ring-2 hover:ring-[#C9D1DC]", yt.focus)}>
              <Thumb src={url} sizes="160px" />
              {draft.thumbnailUrl === url && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-sm bg-[#E5202E] text-white"><Check className="size-3" /></span>}
            </button>
          ))}
        </div>
        {draft.thumbnailUrl && !THUMBNAIL_LIBRARY.slice(0, 3).includes(draft.thumbnailUrl) && (
          <div className="mt-2 flex items-center gap-2">
            <Thumb src={draft.thumbnailUrl} className="w-28" sizes="112px" />
            <Badge tone="green" icon={CheckCircle2}>Custom thumbnail</Badge>
            <Button size="xs" variant="ghost" onClick={() => set("thumbnailUrl", null)}>Remove</Button>
          </div>
        )}
        <input
          ref={thumbInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) return setThumbError("Thumbnails must be 2 MB or smaller.");
            setThumbError(null);
            set("thumbnailUrl", URL.createObjectURL(f));
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
          <SelectMenu label="Language" size="md" fullWidth value={draft.language} onChange={(v) => set("language", v)} options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))} />
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
      <div className="rounded-sm border border-[#E4E9F0]">
        <ToggleRow label="Restrict to viewers over 18" description="Age-restricted videos can't show ads and aren't shown in some sections of YouTube." checked={draft.ageRestricted} disabled={draft.madeForKids === true} onChange={(c) => set("ageRestricted", c)} />
      </div>
    </div>
  );
}

function ElementsStep({ draft, set }: StepProps) {
  const input = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState("en");
  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-[#E4E9F0] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#EFF4FF] text-[#1D4ED8]"><Captions className="size-4" /></span>
            <div>
              <p className="text-[13px] font-semibold text-[#0F1B3D]">Subtitles</p>
              <p className="text-[12px] text-[#6B7890]">Upload .srt or .vtt caption files. Sent to YouTube with the video.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SelectMenu label="Subtitle language" value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))} />
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => input.current?.click()}>Add file</Button>
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept=".srt,.vtt,.sbv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) set("captions", [...draft.captions.filter((c) => c.language !== lang), { name: f.name, language: lang }]);
            e.target.value = "";
          }}
        />
        {draft.captions.length > 0 && (
          <ul className="mt-3 divide-y divide-[#EEF1F5] rounded-sm border border-[#EEF1F5]">
            {draft.captions.map((c) => (
              <li key={c.language} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                <span className="min-w-0 truncate text-[#24324F]">{c.name}</span>
                <span className="flex items-center gap-2">
                  <Badge>{languageLabel(c.language)}</Badge>
                  <Button size="iconSm" variant="ghost" aria-label={`Remove ${c.name}`} onClick={() => set("captions", draft.captions.filter((x) => x.language !== c.language))}><X className="size-3.5" /></Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {[
        { title: "End screen", body: "Promote related videos, playlists or a subscribe button in the last 5–20 seconds." },
        { title: "Cards", body: "Add interactive cards that link to videos, playlists or channels during playback." },
      ].map((item) => (
        <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#E4E9F0] bg-[#F8FAFC] p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]">{item.title} <Badge>YouTube Studio</Badge></p>
            <p className="mt-0.5 text-[12px] text-[#6B7890]">{item.body} The YouTube API doesn&apos;t support editing this, so complete it in YouTube Studio after uploading.</p>
          </div>
          <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.studio} external>Complete in YouTube Studio</Button>
        </div>
      ))}
    </div>
  );
}

function VisibilityStep({ draft, set, needsApproval }: StepProps & { needsApproval: boolean }) {
  const when = new Date(`${draft.day}T${draft.time}`);
  return (
    <div className="space-y-4">
      {needsApproval && (
        <Notice tone="violet" title="This upload needs approval">
          Your role can upload but not publish. After you submit, a reviewer approves it and it&apos;s published with the settings below.
        </Notice>
      )}
      <div className="space-y-2">
        <ChoiceCard name="publish-mode" checked={draft.publishMode === "now"} onSelect={() => set("publishMode", "now")} icon={Upload} title="Save or publish" description="Make the video public, unlisted or private now." />
        {draft.publishMode === "now" && (
          <div className="ml-7 grid gap-2 sm:grid-cols-3">
            {(["public", "unlisted", "private"] as Visibility[]).map((v) => (
              <ChoiceCard key={v} name="vis" checked={draft.visibility === v} onSelect={() => set("visibility", v)} icon={v === "public" ? Globe2 : v === "unlisted" ? Link2 : Lock} title={VISIBILITY_LABEL[v]} description={v === "public" ? "Everyone" : v === "unlisted" ? "Anyone with the link" : "Only you"} />
            ))}
          </div>
        )}
        <ChoiceCard name="publish-mode" checked={draft.publishMode === "schedule"} onSelect={() => set("publishMode", "schedule")} icon={Clock3} title="Schedule" description="Choose a date to make the video public. It stays private until then." />
        {draft.publishMode === "schedule" && (
          <div className="ml-7 grid gap-3 sm:grid-cols-3">
            <FormField label="Date" htmlFor="up-date">
              <input id="up-date" type="date" className={yt.input} value={draft.day} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => set("day", e.target.value)} />
            </FormField>
            <FormField label="Time" htmlFor="up-time">
              <input id="up-time" type="time" className={yt.input} value={draft.time} onChange={(e) => set("time", e.target.value)} />
            </FormField>
            <FormField label="Time zone">
              <SelectMenu label="Time zone" size="md" fullWidth value={draft.timezone} onChange={(v) => set("timezone", v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
            </FormField>
            {!Number.isNaN(when.getTime()) && <p className="text-[12px] text-[#6B7890] sm:col-span-3">Goes public {format(when, "EEEE, MMMM d 'at' h:mm a")} ({draft.timezone}).</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaylistsStep({ draft, set }: StepProps) {
  const { playlists, can } = useYouTube();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-[#6B7890]">{draft.playlistIds.length} selected</p>
        <Button size="sm" variant="secondary" icon={ListPlus} gate={can.canManagePlaylists} onClick={() => setCreateOpen(true)}>Create playlist</Button>
      </div>
      <ul className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
        {playlists.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-[#F8FAFC]">
              <Checkbox checked={draft.playlistIds.includes(p.id)} onCheckedChange={(c) => set("playlistIds", c ? [...draft.playlistIds, p.id] : draft.playlistIds.filter((x) => x !== p.id))} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[#0F1B3D]">{p.title}</span>
                <span className="text-[11.5px] text-[#6B7890]">{VISIBILITY_LABEL[p.visibility]} · {p.videoIds.length} videos</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
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
        <FormField label="Recording date" htmlFor="up-rec">
          <input id="up-rec" type="date" className={yt.input} value={draft.recordingDate} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => set("recordingDate", e.target.value)} />
        </FormField>
        <FormField label="Category">
          <SelectMenu label="Category" size="md" fullWidth value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
        </FormField>
        <FormField label="Comment moderation" aside={<InternalBadge label="Hold rules" hint="Maps to YouTube's comment moderation setting for this video." />}>
          <SelectMenu<Draft["commentModeration"]> label="Comment moderation" size="md" fullWidth disabled={!draft.commentsEnabled || draft.madeForKids === true} value={draft.commentModeration} onChange={(v) => set("commentModeration", v)} options={[{ value: "basic", label: "Basic", description: "Hold potentially inappropriate comments" }, { value: "strict", label: "Strict", description: "Hold a broader range of comments" }, { value: "holdAll", label: "Hold all", description: "Review every comment before it appears" }]} />
        </FormField>
      </div>
      <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
        <ToggleRow label="Allow embedding" description="Let others embed this video on their websites." checked={draft.embeddable} onChange={(c) => set("embeddable", c)} />
        <ToggleRow label="Allow comments" description={draft.madeForKids ? "Comments are always off for made-for-kids videos." : "Viewers can comment on this video."} checked={draft.commentsEnabled && draft.madeForKids !== true} disabled={draft.madeForKids === true} onChange={(c) => set("commentsEnabled", c)} />
        <ToggleRow label="Includes paid promotion" description="Adds a disclosure message when viewers start watching." checked={draft.paidPromotion} onChange={(c) => set("paidPromotion", c)} />
      </div>
    </div>
  );
}

function ReviewStep({
  draft,
  file,
  blocking,
  goTo,
  needsApproval,
  scheduleAt,
  playlistNames,
}: {
  draft: Draft;
  file: FileInfo | null;
  blocking: { step: Step; message: string }[];
  goTo: (s: Step) => void;
  needsApproval: boolean;
  scheduleAt: Date | null;
  playlistNames: string[];
}) {
  const rows: { label: string; value: ReactNode; step: Step }[] = [
    { label: "File", value: file ? `${file.name} · ${fileSize(file.size)}${file.durationSec ? ` · ${duration(file.durationSec)}` : ""}` : <Missing />, step: "Upload" },
    { label: "Title", value: draft.title || <Missing />, step: "Details" },
    { label: "Thumbnail", value: draft.thumbnailUrl ? <Thumb src={draft.thumbnailUrl} className="ml-auto w-24" sizes="96px" /> : "Auto-generated by YouTube", step: "Details" },
    { label: "Category · Language", value: `${categoryLabel(draft.categoryId)} · ${languageLabel(draft.language)}`, step: "Details" },
    { label: "Tags", value: draft.tags.length ? draft.tags.join(", ") : "None", step: "Details" },
    { label: "Audience", value: draft.madeForKids === null ? <Missing /> : `${draft.madeForKids ? "Made for kids" : "Not made for kids"}${draft.ageRestricted ? " · 18+" : ""}`, step: "Audience" },
    { label: "Subtitles", value: draft.captions.length ? draft.captions.map((c) => languageLabel(c.language)).join(", ") : "None", step: "Video elements" },
    {
      label: "Visibility",
      value: needsApproval ? "Submitted for approval, then " + (scheduleAt ? `scheduled for ${format(scheduleAt, "MMM d, h:mm a")}` : VISIBILITY_LABEL[draft.visibility].toLowerCase()) : scheduleAt ? `Scheduled · ${Number.isNaN(scheduleAt.getTime()) ? "invalid date" : format(scheduleAt, "EEE, MMM d 'at' h:mm a")} (${draft.timezone})` : VISIBILITY_LABEL[draft.visibility],
      step: "Visibility",
    },
    { label: "Playlists", value: playlistNames.length ? playlistNames.join(", ") : "None", step: "Playlists" },
    { label: "Advanced", value: `${draft.license === "youtube" ? "Standard license" : "Creative Commons"} · Embedding ${draft.embeddable ? "on" : "off"} · Comments ${draft.commentsEnabled && !draft.madeForKids ? "on" : "off"}${draft.paidPromotion ? " · Paid promotion" : ""}`, step: "Advanced" },
  ];

  return (
    <div className="space-y-4">
      {blocking.length > 0 ? (
        <Notice tone="red" title={`${blocking.length} issue${blocking.length === 1 ? "" : "s"} must be fixed before ${needsApproval ? "submitting" : "publishing"}`}>
          <ul className="mt-1 space-y-0.5">
            {blocking.map((b) => (
              <li key={b.message}>
                <button type="button" onClick={() => goTo(b.step)} className="text-left text-[#1D4ED8] hover:underline">{b.step} — {b.message}</button>
              </li>
            ))}
          </ul>
        </Notice>
      ) : file?.state !== "ready" ? (
        <Notice tone="blue" title="Still processing">You can publish now — YouTube will make the video available as soon as processing finishes.</Notice>
      ) : (
        <Notice tone="blue" icon={CheckCircle2} title="Ready to go">Everything required is filled in.</Notice>
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
