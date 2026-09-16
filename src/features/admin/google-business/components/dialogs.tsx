"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ImagePlus,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  Store,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MEDIA_LIBRARY } from "../lib/sample-images";
import { useAttention, useLocationScope, useProfileHealth } from "../data/hooks";
import { ALL_LOCATIONS } from "../data/selectors";
import { useNow } from "../hooks/use-now";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import {
  ATTRIBUTE_GROUPS,
  ATTRIBUTE_GROUP_LABEL,
  DAY_LABELS,
  LIMITS,
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  POST_TYPE_LABEL,
  SEVERITY_LABEL,
  gbRoutes,
} from "../lib/constants";
import { date as fmtDate, dateTime, fileSize, relative, timeLabel } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { AttentionIssue, AttributeValue, IssueSeverity, MediaCategory, MediaItem, PostType, RegularHours, Review, SpecialHour } from "../types";
import {
  Avatar,
  Badge,
  Button,
  ChoiceCard,
  ConfirmDialog,
  EmptyState,
  FormField,
  InternalBadge,
  Meter,
  Notice,
  SelectMenu,
  Stars,
  Thumb,
  gb,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Review reply                                                        */
/* ------------------------------------------------------------------ */

/**
 * Suggestion text is generated locally by OmniPlatform from the review and the
 * location profile. It is always labelled so nobody reads it as a Google feature.
 */
function suggestReply(review: Review, locationTitle: string, signature: string): string {
  const name = review.reviewer.displayName.split(" ")[0] ?? "there";
  const body =
    review.starRating >= 4
      ? `Thank you for the kind words about ${locationTitle}, ${name}. It means a lot to our volunteers, and we hope to see you at the next drive.`
      : review.starRating === 3
        ? `Thank you for the honest feedback, ${name}. We are sorry your visit to ${locationTitle} fell short, and we would like to understand what we can improve - please write to us at profiles@namogange.org.`
        : `We are sorry about your experience at ${locationTitle}, ${name}. This is not the standard we aim for. Please contact us at profiles@namogange.org so we can look into it and put it right.`;
  return signature ? `${body}\n\n${signature}` : body;
}

export function ReviewReplyDrawer({
  reviewId,
  onClose,
}: {
  reviewId: string | null;
  onClose: () => void;
}) {
  const { reviews } = useGbp();
  const review = reviews.find((item) => item.reviewId === reviewId) ?? null;
  if (!review) return null;
  return <ReviewReplyBody key={review.reviewId} review={review} onClose={onClose} />;
}

function ReviewReplyBody({ review, onClose }: { review: Review; onClose: () => void }) {
  const { locations, settings, replyToReview, deleteReviewReply, capabilitiesFor } = useGbp();
  const location = locations.find((item) => item.locationId === review.locationId);
  const can = capabilitiesFor(review.locationId);
  const [text, setText] = useState(review.reply?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [suggested, setSuggested] = useState(false);

  const dirty = text.trim() !== (review.reply?.comment ?? "").trim();
  const tooLong = text.length > 4096;

  const save = async () => {
    if (!text.trim() || tooLong) return false;
    setBusy(true);
    const ok = await replyToReview(review.reviewId, text.trim());
    setBusy(false);
    if (ok) onClose();
    return ok;
  };

  useUnsavedChanges(dirty, save, "this reply");

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !busy && (dirty ? setConfirmClose(true) : onClose())}>
        <SheetContent className="w-full max-w-[540px] sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle className="text-[15px] text-[#202124]">{review.reply ? "Edit reply" : "Reply to review"}</SheetTitle>
            <SheetDescription className="text-[12.5px]">
              Replies appear publicly on Google under the review, signed with your business name.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {!can.canReplyReviews.allowed && <Notice tone="amber" title="Replying is unavailable">{can.canReplyReviews.reason}</Notice>}

            <div className="rounded-lg border border-[#E8EAED] bg-[#F8F9FA] p-3">
              <div className="flex items-start gap-3">
                <Avatar name={review.reviewer.displayName} src={review.reviewer.profilePhotoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <b className="text-[13px] font-medium text-[#202124]">{review.reviewer.displayName}</b>
                    <Stars rating={review.starRating} size={13} />
                    <span className="text-[11.5px] text-[#80868B]">{relative(review.createTime)}</span>
                  </p>
                  <p className="mt-1.5 text-[13px] leading-5 text-[#3C4043]">{review.comment}</p>
                  {review.media.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {review.media.map((url) => (
                        <Thumb key={url} src={url} className="w-20" sizes="80px" />
                      ))}
                    </div>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-[#5F6368]">
                    <MapPin className="size-3" />
                    {location?.profile.title ?? "Location"}
                    {review.policyStatus && <Badge tone="amber">Reported: under review by Google</Badge>}
                  </p>
                </div>
              </div>
            </div>

            <FormField
              label="Your reply"
              htmlFor="reply-text"
              counter={{ value: text.length, max: 4096 }}
              error={tooLong ? "Google limits replies to 4,096 characters." : undefined}
              hint="Replying within 24 hours has the biggest effect on how customers read a negative review."
              aside={
                <Button
                  size="xs"
                  variant="ghost"
                  icon={Wand2}
                  gate={can.canReplyReviews}
                  onClick={() => {
                    setText(suggestReply(review, location?.profile.title ?? "our location", settings.defaults.replySignature));
                    setSuggested(true);
                  }}
                >
                  Suggest reply
                </Button>
              }
            >
              <textarea
                id="reply-text"
                rows={7}
                className={gb.textarea}
                value={text}
                disabled={!can.canReplyReviews.allowed}
                onChange={(event) => setText(event.target.value)}
                placeholder={can.canReplyReviews.allowed ? "Thank the reviewer, answer the specifics and invite them back." : can.canReplyReviews.reason}
              />
            </FormField>

            {suggested && (
              <Notice tone="violet" icon={Sparkles} title={<span className="flex items-center gap-2">Suggested by OmniPlatform <InternalBadge label="AI suggestion" /></span>}>
                This draft was generated by OmniPlatform from the review and your profile - not by Google. Edit it before posting.
              </Notice>
            )}

            {review.reply && (
              <div className="rounded-lg border border-[#E8EAED] p-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#80868B]">Current published reply</p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-[#3C4043]">{review.reply.comment}</p>
                <p className="mt-1.5 text-[11.5px] text-[#80868B]">
                  {review.reply.author} · {dateTime(review.reply.updateTime)}
                </p>
              </div>
            )}
          </SheetBody>
          <SheetFooter className="justify-between">
            <div className="flex gap-2">
              {review.reply && (
                <Button size="sm" variant="ghost" icon={Trash2} gate={can.canDeleteReviewReply} onClick={() => setConfirmDelete(true)} className="text-[#C5221F] hover:bg-[#FCE8E6] hover:text-[#C5221F]">
                  Delete reply
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={ExternalLink} href={location ? gbRoutes.mapsSearch(location.placeId) : gbRoutes.businessProfileManager} external>
                View on Google
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => (dirty ? setConfirmClose(true) : onClose())} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!text.trim() || tooLong || !dirty}
                disabledReason={!text.trim() ? "Write a reply first" : tooLong ? "The reply is too long" : "No changes to save"}
                gate={can.canReplyReviews}
                onClick={() => void save()}
              >
                {review.reply ? "Update reply" : "Post reply"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this reply?"
        description="The reply is removed from Google for everyone. The review itself stays published."
        affected={[`Review by ${review.reviewer.displayName}`, `Reply posted ${fmtDate(review.reply?.updateTime ?? null)}`]}
        confirmLabel="Delete reply"
        onConfirm={async () => {
          const ok = await deleteReviewReply(review.reviewId);
          if (ok) onClose();
          return ok;
        }}
      />
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Discard this reply?"
        description="Your draft reply has not been sent to Google."
        confirmLabel="Discard"
        onConfirm={() => onClose()}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Profile health                                                      */
/* ------------------------------------------------------------------ */

export function ProfileHealthDrawer({ open, onOpenChange, locationId }: { open: boolean; onOpenChange: (open: boolean) => void; locationId: string | null }) {
  const { locations } = useGbp();
  const health = useProfileHealth(locationId);
  const location = locationId ? locations.find((item) => item.locationId === locationId) : null;
  if (!open || !health) return null;
  const sorted = [...health.factors].sort((a, b) => a.score - b.score);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#202124]">
            Profile health <InternalBadge />
          </SheetTitle>
          <SheetDescription className="text-[12.5px]">
            An OmniPlatform score built from your synced profile data. It is not a Google metric and does not affect Google ranking.
            {location ? ` Showing ${location.profile.title}.` : " Averaged across all locations."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border border-[#E8EAED] bg-[#F8F9FA] p-4">
            <ScoreRing score={health.score} />
            <div>
              <p className="text-[13px] font-medium text-[#202124]">{health.score >= 80 ? "Healthy profile" : health.score >= 60 ? "Room to improve" : "Needs attention"}</p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[#5F6368]">Start with the lowest-scoring areas below - they are ordered by impact.</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {sorted.map((factor) => (
              <li key={factor.key} className="rounded-lg border border-[#E8EAED] bg-white p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-[#202124]">{factor.label}</p>
                  <Badge tone={factor.status === "good" ? "green" : factor.status === "warning" ? "amber" : "red"}>{factor.score}/100</Badge>
                </div>
                <Meter value={factor.score} tone={factor.status === "good" ? "green" : factor.status === "warning" ? "amber" : "red"} className="mt-2" />
                <p className="mt-2 text-[12.5px] leading-5 text-[#3C4043]">{factor.explanation}</p>
                {factor.actionLabel && factor.href && (
                  <div className="mt-2 flex justify-end">
                    <Button size="xs" variant="secondary" href={factor.href} external={factor.href.startsWith("http")} onClick={() => onOpenChange(false)}>
                      {factor.actionLabel}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function ScoreRing({ score, size = 96, label = "/100" }: { score: number; size?: number; label?: string }) {
  const stroke = size > 80 ? 8 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 80 ? "#188038" : score >= 60 ? "#F29900" : "#D93025";
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#F1F3F4" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
      </svg>
      <span className="absolute text-center leading-none">
        <b className={cn("font-medium tabular-nums text-[#202124]", size > 80 ? "text-[24px]" : "text-[18px]")}>{score}</b>
        <small className="block text-[10.5px] text-[#80868B]">{label}</small>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

const SEVERITY_TONE: Record<IssueSeverity, "red" | "amber" | "neutral"> = { high: "red", medium: "amber", low: "neutral" };

export function IssueRow({ issue, onNavigate }: { issue: AttentionIssue; onNavigate?: () => void }) {
  return (
    <li className="flex flex-wrap items-start gap-3 border-b border-[#F1F3F4] px-4 py-3 last:border-0">
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", issue.severity === "high" ? "bg-[#FCE8E6] text-[#C5221F]" : issue.severity === "medium" ? "bg-[#FEF7E0] text-[#B06000]" : "bg-[#F1F3F4] text-[#5F6368]")}>
        <TriangleAlert className="size-3.5" />
      </span>
      <div className="min-w-[200px] flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#202124]">
          {issue.title}
          <Badge tone={SEVERITY_TONE[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Badge>
        </p>
        <p className="mt-0.5 text-[12.5px] leading-5 text-[#5F6368]">{issue.description}</p>
      </div>
      <Button size="sm" variant="secondary" href={issue.href} external={issue.href.startsWith("http")} onClick={onNavigate}>
        {issue.actionLabel}
      </Button>
    </li>
  );
}

export function NeedsAttentionDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const issues = useAttention();
  const [severity, setSeverity] = useState<"all" | IssueSeverity>("all");
  if (!open) return null;
  const filtered = severity === "all" ? issues : issues.filter((issue) => issue.severity === severity);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#202124]">
            Needs attention <InternalBadge />
          </SheetTitle>
          <SheetDescription className="text-[12.5px]">Issues OmniPlatform found across your synced Google Business data. Each one links to the screen that fixes it.</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-0">
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            {(["all", "high", "medium", "low"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={severity === value}
                onClick={() => setSeverity(value)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-[12px] font-medium transition",
                  severity === value ? "bg-[#202124] text-white" : "bg-[#F1F3F4] text-[#3C4043] hover:bg-[#E8EAED]",
                  gb.focus,
                )}
              >
                {value === "all" ? `All (${issues.length})` : `${SEVERITY_LABEL[value]} (${issues.filter((issue) => issue.severity === value).length})`}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Nothing needs attention" description="Every location is verified, synced and answered." />
          ) : (
            <ul className="border-t border-[#F1F3F4]">
              {filtered.map((issue) => (
                <IssueRow key={issue.id} issue={issue} onNavigate={() => onOpenChange(false)} />
              ))}
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export function UploadMediaDialog({
  open,
  onOpenChange,
  defaultLocationId,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocationId?: string;
  defaultCategory?: MediaCategory;
}) {
  return open ? <UploadMediaBody onOpenChange={onOpenChange} defaultLocationId={defaultLocationId} defaultCategory={defaultCategory} /> : null;
}

type UploadState = "idle" | "uploading" | "done" | "error";

function UploadMediaBody({
  onOpenChange,
  defaultLocationId,
  defaultCategory,
}: {
  onOpenChange: (open: boolean) => void;
  defaultLocationId?: string;
  defaultCategory?: MediaCategory;
}) {
  const { locations, uploadMedia, capabilitiesFor } = useGbp();
  const { selected } = useLocationScope();
  const firstLocation = defaultLocationId ?? (selected !== ALL_LOCATIONS ? selected : locations[0]?.locationId ?? "");
  const [locationId, setLocationId] = useState(firstLocation);
  const [category, setCategory] = useState<MediaCategory>(defaultCategory ?? "EXTERIOR");
  const [file, setFile] = useState<{ name: string; url: string; size: number; width: number; height: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const can = capabilitiesFor(locationId);

  const accept = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(selectedFile.type)) {
      setError("Google accepts JPG, PNG, WebP images and MP4 video.");
      return;
    }
    if (selectedFile.size > LIMITS.mediaBytes) {
      setError(`Files must be ${fileSize(LIMITS.mediaBytes)} or smaller.`);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(selectedFile);
    const image = new window.Image();
    image.onload = () => {
      if (Math.min(image.width, image.height) < LIMITS.mediaMinPx) {
        setError(`Google requires at least ${LIMITS.mediaMinPx}px on the shortest side. This image is ${image.width}x${image.height}.`);
        setFile(null);
        return;
      }
      setFile({ name: selectedFile.name, url, size: selectedFile.size, width: image.width, height: image.height });
    };
    image.onerror = () => setFile({ name: selectedFile.name, url, size: selectedFile.size, width: 1280, height: 960 });
    image.src = url;
  };

  const start = async () => {
    if (!file) return;
    setState("uploading");
    setProgress(0);
    // Simulated progress; the backend will stream real upload progress.
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        setProgress((value) => {
          const next = Math.min(100, value + 8 + Math.round(Math.random() * 14));
          if (next >= 100) {
            clearInterval(timer);
            resolve();
          }
          return next;
        });
      }, 160);
    });
    const ok = await uploadMedia({
      locationId,
      category,
      sourceUrl: file.url,
      sizeBytes: file.size,
      dimensions: { widthPx: file.width, heightPx: file.height },
    });
    setState(ok ? "done" : "error");
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={(next) => state !== "uploading" && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[560px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">Upload media</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">Photos appear on your Google Business Profile after Google finishes processing them.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          {!can.canManageMedia.allowed && <Notice tone="amber" title="Uploading is unavailable">{can.canManageMedia.reason}</Notice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Location">
              <SelectMenu
                label="Location"
                size="md"
                fullWidth
                value={locationId}
                onChange={setLocationId}
                options={locations.map((item) => ({ value: item.locationId, label: item.profile.title, description: item.profile.address.locality }))}
              />
            </FormField>
            <FormField label="Category" hint="Google shows each category in a different part of the profile.">
              <SelectMenu
                label="Category"
                size="md"
                fullWidth
                value={category}
                onChange={(value) => setCategory(value as MediaCategory)}
                options={MEDIA_CATEGORIES.map((value) => ({ value, label: MEDIA_CATEGORY_LABEL[value] }))}
              />
            </FormField>
          </div>

          {!file ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  accept(event.dataTransfer.files[0]);
                }}
                disabled={!can.canManageMedia.allowed}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition",
                  dragging ? "border-[#1A73E8] bg-[#F8FBFF]" : "border-[#DADCE0] bg-[#F8F9FA] hover:border-[#9AA0A6]",
                  !can.canManageMedia.allowed && "cursor-not-allowed opacity-60",
                  gb.focus,
                )}
              >
                <span className="grid size-12 place-items-center rounded-full bg-white text-[#1A73E8] shadow-[0_1px_3px_rgba(60,64,67,0.2)]">
                  <Upload className="size-5" />
                </span>
                <span className="mt-3 text-[13.5px] font-medium text-[#202124]">Drag and drop a photo or video</span>
                <span className="mt-1 text-[12px] text-[#5F6368]">JPG, PNG, WebP or MP4 · up to {fileSize(LIMITS.mediaBytes)} · at least {LIMITS.mediaMinPx}px</span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4"
                hidden
                onChange={(event) => {
                  accept(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-[#5F6368]">Or pick from your media library</p>
                <div className="grid grid-cols-4 gap-2">
                  {MEDIA_LIBRARY.slice(0, 4).map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setFile({ name: url.split("/").pop() ?? "image", url, size: 820_000, width: 1600, height: 1200 })}
                      className={cn("rounded-md ring-offset-2 hover:ring-2 hover:ring-[#DADCE0]", gb.focus)}
                    >
                      <Thumb src={url} sizes="120px" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-[#E8EAED] p-3">
              <div className="flex items-start gap-3">
                <Thumb src={file.url} className="w-28" sizes="112px" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#202124]">{file.name}</p>
                  <p className="text-[12px] text-[#5F6368]">
                    {fileSize(file.size)} · {file.width}x{file.height}px · {MEDIA_CATEGORY_LABEL[category]}
                  </p>
                  {state === "uploading" && (
                    <div className="mt-2">
                      <Meter value={progress} tone="blue" />
                      <p className="mt-1 text-[11.5px] text-[#5F6368]">Uploading {progress}%</p>
                    </div>
                  )}
                  {state === "error" && <p className="mt-2 text-[12px] font-medium text-[#C5221F]">Upload failed. Try again.</p>}
                </div>
                {state !== "uploading" && (
                  <Button size="xs" variant="ghost" onClick={() => setFile(null)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-[12.5px] font-medium text-[#C5221F]">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={state === "uploading"}>
            Cancel
          </Button>
          <Button variant="primary" icon={ImagePlus} loading={state === "uploading"} disabled={!file} disabledReason="Choose a file first" gate={can.canManageMedia} onClick={() => void start()}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MediaPreviewDialog({ item, onClose, onDelete }: { item: MediaItem | null; onClose: () => void; onDelete: (id: string) => void }) {
  const { locations, capabilitiesFor } = useGbp();
  if (!item) return null;
  const location = locations.find((entry) => entry.locationId === item.locationId);
  const can = capabilitiesFor(item.locationId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[720px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">{MEDIA_CATEGORY_LABEL[item.category]}</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">{location?.profile.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_220px]">
          <Thumb src={item.sourceUrl} className="w-full" sizes="480px" />
          <dl className="text-[12.5px]">
            <div className="flex justify-between border-b border-[#F1F3F4] py-2">
              <dt className="text-[#5F6368]">Uploaded</dt>
              <dd className="font-medium text-[#202124]">{fmtDate(item.createTime)}</dd>
            </div>
            <div className="flex justify-between border-b border-[#F1F3F4] py-2">
              <dt className="text-[#5F6368]">By</dt>
              <dd className="font-medium text-[#202124]">{item.uploadedBy ?? "Google"}</dd>
            </div>
            <div className="flex justify-between border-b border-[#F1F3F4] py-2">
              <dt className="text-[#5F6368]">Size</dt>
              <dd className="font-medium text-[#202124]">{fileSize(item.sizeBytes)}</dd>
            </div>
            <div className="flex justify-between border-b border-[#F1F3F4] py-2">
              <dt className="text-[#5F6368]">Dimensions</dt>
              <dd className="font-medium text-[#202124]">{item.dimensions ? `${item.dimensions.widthPx}x${item.dimensions.heightPx}` : "-"}</dd>
            </div>
            <div className="flex justify-between border-b border-[#F1F3F4] py-2">
              <dt className="text-[#5F6368]">Views</dt>
              <dd className="font-medium text-[#202124]">{item.viewCount === null ? "Not reported" : item.viewCount.toLocaleString("en-IN")}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#5F6368]">Status</dt>
              <dd>
                <Badge tone={item.state === "live" ? "green" : item.state === "processing" ? "amber" : "red"}>
                  {item.state === "live" ? "Live on Google" : item.state === "processing" ? "Processing" : "Rejected"}
                </Badge>
              </dd>
            </div>
            {item.rejectionReason && <p className="mt-2 text-[12px] leading-4 text-[#C5221F]">{item.rejectionReason}</p>}
          </dl>
        </div>
        <DialogFooter className="items-center border-t border-[#E8EAED] px-5 py-3 sm:justify-between">
          <Button size="sm" variant="ghost" icon={ExternalLink} href={location ? gbRoutes.mapsSearch(location.placeId) : gbRoutes.businessProfileManager} external>
            View on Google
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="danger" icon={Trash2} gate={can.canDeleteMedia} onClick={() => onDelete(item.mediaId)}>
              Delete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Post shortcuts                                                      */
/* ------------------------------------------------------------------ */

const POST_TYPES: { value: PostType; description: string }[] = [
  { value: "update", description: "Share news, photos and announcements." },
  { value: "event", description: "Promote something with a start and end date." },
  { value: "offer", description: "Offer with optional coupon code and terms." },
  { value: "cta", description: "Drive one action, like booking or signing up." },
];

/** Asks for the post type, then opens the create flow pre-filled. */
export function CreatePostShortcut({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { selected } = useLocationScope();
  const [type, setType] = useState<PostType>("update");
  if (!open) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[480px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">Create a post</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">Choose the post type Google should publish.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-5 py-4">
          {POST_TYPES.map((option) => (
            <ChoiceCard
              key={option.value}
              name="post-type-shortcut"
              checked={type === option.value}
              onSelect={() => setType(option.value)}
              title={POST_TYPE_LABEL[option.value]}
              description={option.description}
            />
          ))}
        </div>
        <DialogFooter className="border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const params = new URLSearchParams({ type });
              if (selected !== ALL_LOCATIONS) params.set("location", selected);
              onOpenChange(false);
              router.push(`${gbRoutes.postCreate}?${params.toString()}`);
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SchedulePostDialog({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const { posts, schedulePost, can } = useGbp();
  const post = posts.find((item) => item.id === postId) ?? null;
  const now = useNow();
  const [day, setDay] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [busy, setBusy] = useState(false);
  if (!post) return null;

  const when = new Date(`${day}T${time}`);
  const error = Number.isNaN(when.getTime()) ? "Pick a date and time." : when.getTime() < now + 10 * 60_000 ? "Schedule at least 10 minutes from now." : undefined;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">{post.scheduledAt ? "Reschedule post" : "Schedule post"}</DialogTitle>
          <DialogDescription className="line-clamp-1 text-[12.5px] text-[#5F6368]">{post.summary}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <Notice tone="violet" icon={Sparkles} title={<span className="flex items-center gap-2">Scheduling is an OmniPlatform feature <InternalBadge /></span>}>
            The Google API publishes immediately, so OmniPlatform holds the post and publishes it at the time you choose.
          </Notice>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="schedule-date">
              <input id="schedule-date" type="date" className={gb.input} value={day} min={format(new Date(), "yyyy-MM-dd")} onChange={(event) => setDay(event.target.value)} />
            </FormField>
            <FormField label="Time" htmlFor="schedule-time">
              <input id="schedule-time" type="time" className={gb.input} value={time} onChange={(event) => setTime(event.target.value)} />
            </FormField>
          </div>
          {error ? <Notice tone="amber" title={error} /> : <Notice tone="blue" title={`Publishes ${format(when, "EEE, MMM d 'at' h:mm a")}`} />}
        </div>
        <DialogFooter className="border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={CalendarClock}
            loading={busy}
            disabled={Boolean(error)}
            disabledReason={error}
            gate={can.canCreatePosts}
            onClick={async () => {
              setBusy(true);
              const ok = await schedulePost(post.id, when.toISOString());
              setBusy(false);
              if (ok) onClose();
            }}
          >
            {post.scheduledAt ? "Reschedule" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk location actions                                               */
/* ------------------------------------------------------------------ */

export function BulkHoursDialog({ open, onOpenChange, locationIds }: { open: boolean; onOpenChange: (open: boolean) => void; locationIds: string[] }) {
  const { applyBulkHours, locations, can } = useGbp();
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const targets = locations.filter((location) => locationIds.includes(location.locationId));
  const invalid = days.length === 0 || openTime >= closeTime;

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[520px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">Update hours for {locationIds.length} locations</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">This replaces the weekly hours on every selected location.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <FormField label="Open days">
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, index) => {
                const active = days.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDays((prev) => (active ? prev.filter((day) => day !== index) : [...prev, index]))}
                    className={cn("h-8 rounded-lg px-2.5 text-[12px] font-medium transition", active ? "bg-[#1A73E8] text-white" : "bg-[#F1F3F4] text-[#3C4043] hover:bg-[#E8EAED]", gb.focus)}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Opens" htmlFor="bulk-open">
              <input id="bulk-open" type="time" className={gb.input} value={openTime} onChange={(event) => setOpenTime(event.target.value)} />
            </FormField>
            <FormField label="Closes" htmlFor="bulk-close">
              <input id="bulk-close" type="time" className={gb.input} value={closeTime} onChange={(event) => setCloseTime(event.target.value)} />
            </FormField>
          </div>
          {invalid ? (
            <Notice tone="amber" title={days.length === 0 ? "Choose at least one open day." : "Closing time must be after opening time."} />
          ) : (
            <Notice tone="blue" title={`${days.length} days, ${timeLabel(openTime)} to ${timeLabel(closeTime)}`}>
              Applies to: {targets.map((location) => location.profile.title).join(", ")}
            </Notice>
          )}
        </div>
        <DialogFooter className="border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={invalid}
            disabledReason="Fix the highlighted fields"
            gate={can.canEditProfile}
            onClick={async () => {
              setBusy(true);
              const hours: RegularHours = { periods: days.map((day) => ({ day, open: openTime, close: closeTime })), open24: [] };
              const ok = await applyBulkHours(locationIds, hours);
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Apply to {locationIds.length} locations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkSpecialHoursDialog({ open, onOpenChange, locationIds }: { open: boolean; onOpenChange: (open: boolean) => void; locationIds: string[] }) {
  const { applyBulkSpecialHours, can } = useGbp();
  const [label, setLabel] = useState("");
  const [day, setDay] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [closed, setClosed] = useState(true);
  const [openTime, setOpenTime] = useState("10:00");
  const [closeTime, setCloseTime] = useState("14:00");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const invalid = !label.trim() || (!closed && openTime >= closeTime);

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[480px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">Apply special hours</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">Holiday hours for {locationIds.length} selected locations.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <FormField label="Occasion" required htmlFor="special-label">
            <input id="special-label" className={gb.input} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Diwali" />
          </FormField>
          <FormField label="Date" htmlFor="special-date">
            <input id="special-date" type="date" className={gb.input} value={day} min={format(new Date(), "yyyy-MM-dd")} onChange={(event) => setDay(event.target.value)} />
          </FormField>
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-[#3C4043]">
            <Checkbox checked={closed} onCheckedChange={(value) => setClosed(Boolean(value))} aria-label="Closed all day" />
            Closed all day
          </label>
          {!closed && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Opens" htmlFor="special-open">
                <input id="special-open" type="time" className={gb.input} value={openTime} onChange={(event) => setOpenTime(event.target.value)} />
              </FormField>
              <FormField label="Closes" htmlFor="special-close">
                <input id="special-close" type="time" className={gb.input} value={closeTime} onChange={(event) => setCloseTime(event.target.value)} />
              </FormField>
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={invalid}
            disabledReason={!label.trim() ? "Name the occasion" : "Closing time must be after opening time"}
            gate={can.canEditProfile}
            onClick={async () => {
              setBusy(true);
              const special: SpecialHour = {
                id: "temp",
                date: new Date(day).toISOString(),
                label: label.trim(),
                closed,
                open: closed ? undefined : openTime,
                close: closed ? undefined : closeTime,
              };
              const ok = await applyBulkSpecialHours(locationIds, special);
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkAttributesDialog({ open, onOpenChange, locationIds }: { open: boolean; onOpenChange: (open: boolean) => void; locationIds: string[] }) {
  const { attributeDefinitions, applyBulkAttributes, can } = useGbp();
  const [values, setValues] = useState<Record<string, AttributeValue>>({});
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const editable = attributeDefinitions.filter((definition) => !definition.readOnly && definition.valueType === "BOOL");
  const chosen = Object.keys(values).length;

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[520px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">Add common attributes</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">
            Selected attributes are switched on for {locationIds.length} locations. Attributes you leave untouched are not changed.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[360px] space-y-4 overflow-y-auto px-5 py-4">
          {ATTRIBUTE_GROUPS.map((group) => {
            const groupAttributes = editable.filter((definition) => definition.group === group);
            if (!groupAttributes.length) return null;
            return (
              <div key={group}>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#80868B]">{ATTRIBUTE_GROUP_LABEL[group]}</p>
                <div className="space-y-1">
                  {groupAttributes.map((definition) => (
                    <label key={definition.attributeId} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-[#3C4043] hover:bg-[#F8F9FA]">
                      <Checkbox
                        checked={values[definition.attributeId] === true}
                        onCheckedChange={(checked) =>
                          setValues((prev) => {
                            const next = { ...prev };
                            if (checked) next[definition.attributeId] = true;
                            else delete next[definition.attributeId];
                            return next;
                          })
                        }
                        aria-label={definition.displayName}
                      />
                      {definition.displayName}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={chosen === 0}
            disabledReason="Choose at least one attribute"
            gate={can.canEditProfile}
            onClick={async () => {
              setBusy(true);
              const ok = await applyBulkAttributes(locationIds, values);
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Apply {chosen} to {locationIds.length} locations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Connect location                                                    */
/* ------------------------------------------------------------------ */

export function ConnectLocationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { syncLocations, can } = useGbp();
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[480px] gap-0 p-0">
        <DialogHeader className="border-b border-[#E8EAED] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#202124]">Add a location</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5F6368]">
            New locations are created and verified in Google Business Profile, then pulled into OmniPlatform on the next sync.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 px-5 py-4 text-[12.5px] text-[#3C4043]">
          {[
            "Create the location in Google Business Profile and complete verification.",
            "Make sure it belongs to the connected account (profiles@namogange.org).",
            "Run a sync here to pull it into OmniPlatform.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#E8F0FE] text-[11px] font-medium text-[#1967D2]">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <DialogFooter className="items-center border-t border-[#E8EAED] px-5 py-3 sm:justify-between">
          <Button size="sm" variant="ghost" icon={ExternalLink} href={gbRoutes.businessProfileManager} external>
            Open Business Profile Manager
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              Close
            </Button>
            <Button
              variant="primary"
              loading={busy}
              gate={can.canSyncLocations}
              onClick={async () => {
                setBusy(true);
                const ok = await syncLocations();
                setBusy(false);
                if (ok) onOpenChange(false);
              }}
            >
              Sync now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success(`Exported ${rows.length - 1} rows`, { description: filename });
}

/** Small shared shell used by empty list bodies inside cards. */
export function ListEmpty({ icon, title, description, action }: { icon: typeof Store; title: string; description: string; action?: React.ReactNode }) {
  return <EmptyState compact icon={icon} title={title} description={description} action={action} />;
}

export const DIALOG_ICONS = { Clock3, MessageSquare, Star, CheckCircle2 };

export function LocationLink({ locationId, children }: { locationId: string; children: React.ReactNode }) {
  return (
    <Link href={gbRoutes.location(locationId)} className="text-[#1A73E8] hover:underline">
      {children}
    </Link>
  );
}

export function useSortedLocations() {
  const { locations } = useGbp();
  return useMemo(() => [...locations].sort((a, b) => a.profile.title.localeCompare(b.profile.title)), [locations]);
}
