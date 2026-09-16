"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ImagePlus,
  MapPin,
  MessageSquare,
  MousePointerClick,
  Send,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { MEDIA_LIBRARY } from "../lib/sample-images";
import { useLocationScope } from "../data/hooks";
import { ALL_LOCATIONS } from "../data/selectors";
import { useNow } from "../hooks/use-now";
import { useGuardedNavigate, useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { CTA_LABEL, LIMITS, POST_TYPE_LABEL, gbRoutes } from "../lib/constants";
import { useGbp } from "../store/gbp-store";
import type { CtaType, PostState, PostType } from "../types";
import {
  Badge,
  Button,
  Card,
  ChoiceCard,
  FormField,
  InternalBadge,
  Notice,
  SelectMenu,
  Thumb,
  gb,
} from "../components/ui";

const STEPS = ["Post type", "Content", "Media", "Call to action", "Schedule", "Review"] as const;
type Step = (typeof STEPS)[number];

interface Draft {
  type: PostType;
  locationIds: string[];
  summary: string;
  media: string[];
  ctaEnabled: boolean;
  ctaType: CtaType;
  ctaUrl: string;
  eventTitle: string;
  eventStart: string;
  eventEnd: string;
  couponCode: string;
  redeemUrl: string;
  terms: string;
  publishMode: "now" | "schedule" | "draft";
  day: string;
  time: string;
}

const CTA_OPTIONS: CtaType[] = ["BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP", "CALL"];

export function PostCreatePage() {
  const { status, locations, settings, can, posts } = useGbp();
  const params = useSearchParams();
  const { selected } = useLocationScope();
  const navigate = useGuardedNavigate();
  const { createPost, updatePost } = useGbp();
  const now = useNow();
  const fileInput = useRef<HTMLInputElement>(null);

  const sourcePost = useMemo(() => {
    const id = params?.get("edit") ?? params?.get("duplicate");
    return id ? posts.find((post) => post.id === id) ?? null : null;
  }, [params, posts]);
  const isEdit = Boolean(params?.get("edit")) && sourcePost !== null;

  const initial = useMemo<Draft>(() => {
    const typeParam = params?.get("type");
    const locationParam = params?.get("location");
    const defaultLocations = sourcePost
      ? sourcePost.locationIds
      : locationParam
        ? [locationParam]
        : selected !== ALL_LOCATIONS
          ? [selected]
          : settings.defaults.postLocationScope === "all"
            ? locations.map((location) => location.locationId)
            : [];
    return {
      type: (sourcePost?.type ?? (typeParam as PostType) ?? "update") satisfies PostType,
      locationIds: defaultLocations,
      summary: sourcePost?.summary ?? "",
      media: sourcePost?.media ?? [],
      ctaEnabled: Boolean(sourcePost?.cta),
      ctaType: sourcePost?.cta?.actionType ?? settings.defaults.postCta,
      ctaUrl: sourcePost?.cta?.url ?? "",
      eventTitle: sourcePost?.event?.title ?? "",
      eventStart: format(sourcePost?.event ? new Date(sourcePost.event.startDate) : addDays(new Date(), 7), "yyyy-MM-dd"),
      eventEnd: format(sourcePost?.event ? new Date(sourcePost.event.endDate) : addDays(new Date(), 7), "yyyy-MM-dd"),
      couponCode: sourcePost?.offer?.couponCode ?? "",
      redeemUrl: sourcePost?.offer?.redeemOnlineUrl ?? "",
      terms: sourcePost?.offer?.termsConditions ?? "",
      publishMode: "now",
      day: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      time: "10:00",
    };
    // Defaults are read once when the flow opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState<Step>(params?.get("type") ? "Content" : "Post type");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState<PostState | null>(null);
  const [done, setDone] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));
  const dirty = !done && JSON.stringify(draft) !== JSON.stringify(initial);
  const scheduleAt = draft.publishMode === "schedule" ? new Date(`${draft.day}T${draft.time}`) : null;
  const needsApproval = settings.defaults.requireApproval && !can.canPublishPosts.allowed;

  const errors: Partial<Record<Step, string[]>> = {};
  const push = (target: Step, message: string) => {
    errors[target] = [...(errors[target] ?? []), message];
  };
  if (draft.locationIds.length === 0) push("Post type", "Choose at least one location.");
  if (!draft.summary.trim()) push("Content", "Add the post text.");
  if (draft.summary.length > LIMITS.postSummary) push("Content", `Google allows ${LIMITS.postSummary.toLocaleString()} characters.`);
  if (draft.type === "event" || draft.type === "offer") {
    if (!draft.eventTitle.trim()) push("Content", draft.type === "event" ? "Add an event title." : "Add an offer title.");
    if (new Date(draft.eventEnd) < new Date(draft.eventStart)) push("Content", "The end date cannot be before the start date.");
  }
  if (draft.type === "offer" && draft.terms.length > LIMITS.offerTerms) push("Content", "Terms are too long.");
  if (draft.ctaEnabled && draft.ctaType !== "CALL") {
    if (!draft.ctaUrl.trim()) push("Call to action", "Add the link the button should open.");
    else if (!/^https?:\/\/.+\..+/.test(draft.ctaUrl.trim())) push("Call to action", "Enter a full URL, including https://");
  }
  if (draft.type === "cta" && !draft.ctaEnabled) push("Call to action", "A call-to-action post needs a button.");
  if (scheduleAt && (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() < now + 10 * 60_000)) push("Schedule", "Schedule at least 10 minutes from now.");

  const blocking = Object.entries(errors).flatMap(([target, messages]) => (messages ?? []).map((message) => ({ step: target as Step, message })));
  const stepIndex = STEPS.indexOf(step);

  const goTo = (target: Step) => {
    setStep(target);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (mode: "draft" | "publish", redirect = true) => {
    if (mode === "publish" && blocking.length) {
      setShowErrors(true);
      goTo(blocking[0]!.step);
      return false;
    }
    if (mode === "draft" && !draft.summary.trim()) {
      setShowErrors(true);
      goTo("Content");
      return false;
    }
    const state: PostState =
      mode === "draft" || draft.publishMode === "draft"
        ? "draft"
        : needsApproval
          ? "pending_approval"
          : draft.publishMode === "schedule"
            ? "scheduled"
            : "published";
    setSubmitting(state);
    const payload = {
      locationIds: draft.locationIds,
      type: draft.type,
      summary: draft.summary.trim(),
      media: draft.media,
      cta: draft.ctaEnabled ? { actionType: draft.ctaType, url: draft.ctaType === "CALL" ? "" : draft.ctaUrl.trim() } : null,
      event:
        draft.type === "event" || draft.type === "offer"
          ? { title: draft.eventTitle.trim(), startDate: new Date(draft.eventStart).toISOString(), endDate: new Date(draft.eventEnd).toISOString() }
          : null,
      offer: draft.type === "offer" ? { couponCode: draft.couponCode.trim(), redeemOnlineUrl: draft.redeemUrl.trim(), termsConditions: draft.terms.trim() } : null,
      scheduledAt: scheduleAt && state !== "published" ? scheduleAt.toISOString() : null,
      state,
    };

    // Editing patches the existing post; everything else creates a new one.
    if (isEdit && sourcePost) {
      const ok = await updatePost(sourcePost.id, payload, "Post updated");
      setSubmitting(null);
      if (ok) {
        setDone(true);
        if (redirect) navigate(`${gbRoutes.posts}?post=${sourcePost.id}`, { force: true });
      }
      return ok;
    }

    const created = await createPost(payload);
    setSubmitting(null);
    if (created) {
      setDone(true);
      if (redirect) navigate(`${gbRoutes.posts}?post=${created.id}`, { force: true });
      return true;
    }
    return false;
  };

  useUnsavedChanges(dirty, () => submit("draft", false), "this post");

  if (status !== "ready") return null;

  const primaryLabel = needsApproval ? "Submit for approval" : draft.publishMode === "schedule" ? "Schedule post" : "Publish now";
  const primaryGate = needsApproval ? can.canCreatePosts : draft.publishMode === "schedule" ? can.canCreatePosts : can.canPublishPosts;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Back to posts" onClick={() => navigate(gbRoutes.posts)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] font-medium text-[#202124]">
              {isEdit ? "Edit post" : `Create ${POST_TYPE_LABEL[draft.type].toLowerCase()} post`}
              {needsApproval && <Badge tone="violet">Needs approval</Badge>}
            </h2>
            <p className="text-[12.5px] text-[#5F6368]">
              Step {stepIndex + 1} of {STEPS.length} · {step}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(gbRoutes.posts)}>
            Cancel
          </Button>
          <Button variant="secondary" loading={submitting === "draft"} disabled={submitting !== null} gate={can.canCreatePosts} onClick={() => void submit("draft")}>
            Save draft
          </Button>
        </div>
      </div>

      {!can.canCreatePosts.allowed && <Notice tone="amber" title="Creating posts is unavailable">{can.canCreatePosts.reason}</Notice>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        <Card className="h-fit p-2 lg:sticky lg:top-[76px]">
          <ol className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col" aria-label="Post steps">
            {STEPS.map((item, index) => {
              const hasError = showErrors && Boolean(errors[item]?.length);
              const complete = index < stepIndex && !errors[item]?.length;
              const current = item === step;
              return (
                <li key={item} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(item)}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition",
                      current ? "bg-[#E8F0FE] text-[#1967D2]" : "text-[#3C4043] hover:bg-[#F8F9FA]",
                      gb.focus,
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold",
                        hasError ? "bg-[#FCE8E6] text-[#C5221F]" : complete ? "bg-[#188038] text-white" : current ? "bg-[#1A73E8] text-white" : "bg-[#F1F3F4] text-[#5F6368]",
                      )}
                    >
                      {hasError ? "!" : complete ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="whitespace-nowrap">{item}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="min-w-0">
          <div className="border-b border-[#E8EAED] px-5 py-3.5">
            <h3 className="text-[14.5px] font-medium text-[#202124]">{step}</h3>
            <p className="text-[12.5px] text-[#5F6368]">{STEP_HELP[step]}</p>
          </div>
          <div className="space-y-1 px-5 py-4">
            {showErrors && errors[step]?.length ? (
              <Notice tone="red" title="Fix these before continuing">
                <ul className="list-disc pl-4">
                  {errors[step]!.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}

            {step === "Post type" && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["update", "event", "offer", "cta"] as PostType[]).map((type) => (
                    <ChoiceCard
                      key={type}
                      name="post-type"
                      checked={draft.type === type}
                      onSelect={() => set("type", type)}
                      title={POST_TYPE_LABEL[type]}
                      description={TYPE_HELP[type]}
                    />
                  ))}
                </div>
                <FormField label="Locations" required hint="Google publishes a separate post per location. Posting to many locations uses more API quota.">
                  <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border border-[#DADCE0] p-1.5">
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-[#3C4043] hover:bg-[#F8F9FA]">
                      <Checkbox
                        checked={draft.locationIds.length === locations.length}
                        onCheckedChange={(checked) => set("locationIds", checked ? locations.map((location) => location.locationId) : [])}
                        aria-label="All locations"
                      />
                      All locations ({locations.length})
                    </label>
                    {locations.map((location) => {
                      const blocked = location.verification !== "verified";
                      return (
                        <label
                          key={location.locationId}
                          className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-[#3C4043] hover:bg-[#F8F9FA]", blocked && "cursor-not-allowed opacity-60")}
                        >
                          <Checkbox
                            checked={draft.locationIds.includes(location.locationId)}
                            disabled={blocked}
                            onCheckedChange={(checked) =>
                              set("locationIds", checked ? [...draft.locationIds, location.locationId] : draft.locationIds.filter((id) => id !== location.locationId))
                            }
                            aria-label={location.profile.title}
                          />
                          <span className="min-w-0 flex-1 truncate">{location.profile.title}</span>
                          {blocked && <Badge tone="amber">Not verified</Badge>}
                        </label>
                      );
                    })}
                  </div>
                </FormField>
              </>
            )}

            {step === "Content" && (
              <>
                {(draft.type === "event" || draft.type === "offer") && (
                  <>
                    <FormField label={draft.type === "event" ? "Event title" : "Offer title"} required htmlFor="event-title" counter={{ value: draft.eventTitle.length, max: LIMITS.postTitle }}>
                      <input id="event-title" className={gb.input} value={draft.eventTitle} onChange={(event) => set("eventTitle", event.target.value)} placeholder={draft.type === "event" ? "e.g. Assi Ghat Clean-up Drive" : "e.g. Monsoon donation drive"} />
                    </FormField>
                    <div className="grid gap-1 sm:grid-cols-2">
                      <FormField label="Starts" htmlFor="event-start">
                        <input id="event-start" type="date" className={gb.input} value={draft.eventStart} onChange={(event) => set("eventStart", event.target.value)} />
                      </FormField>
                      <FormField label="Ends" htmlFor="event-end">
                        <input id="event-end" type="date" className={gb.input} value={draft.eventEnd} onChange={(event) => set("eventEnd", event.target.value)} />
                      </FormField>
                    </div>
                  </>
                )}
                <FormField
                  label="Post text"
                  required
                  htmlFor="post-summary"
                  counter={{ value: draft.summary.length, max: LIMITS.postSummary }}
                  hint="The first 150 characters show before the More button on Google."
                >
                  <textarea id="post-summary" rows={7} className={gb.textarea} value={draft.summary} onChange={(event) => set("summary", event.target.value)} placeholder="What do you want customers to know?" />
                </FormField>
                {draft.type === "offer" && (
                  <>
                    <div className="grid gap-1 sm:grid-cols-2">
                      <FormField label="Coupon code" htmlFor="coupon-code" hint="Optional.">
                        <input id="coupon-code" className={gb.input} value={draft.couponCode} onChange={(event) => set("couponCode", event.target.value)} placeholder="GANGA80G" />
                      </FormField>
                      <FormField label="Redeem link" htmlFor="redeem-url" hint="Optional.">
                        <input id="redeem-url" className={gb.input} value={draft.redeemUrl} onChange={(event) => set("redeemUrl", event.target.value)} placeholder="https://" />
                      </FormField>
                    </div>
                    <FormField label="Terms and conditions" htmlFor="offer-terms" counter={{ value: draft.terms.length, max: LIMITS.offerTerms }}>
                      <textarea id="offer-terms" rows={3} className={gb.textarea} value={draft.terms} onChange={(event) => set("terms", event.target.value)} />
                    </FormField>
                  </>
                )}
              </>
            )}

            {step === "Media" && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button type="button" onClick={() => fileInput.current?.click()} className={cn("flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#DADCE0] bg-[#F8F9FA] text-[12px] font-medium text-[#3C4043] hover:border-[#9AA0A6]", gb.focus)}>
                    <ImagePlus className="size-4" />
                    Upload
                  </button>
                  {MEDIA_LIBRARY.slice(0, 7).map((url) => {
                    const chosen = draft.media.includes(url);
                    return (
                      <button
                        key={url}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => set("media", chosen ? draft.media.filter((item) => item !== url) : [...draft.media, url])}
                        className={cn("relative rounded-md ring-offset-2", chosen ? "ring-2 ring-[#1A73E8]" : "hover:ring-2 hover:ring-[#DADCE0]", gb.focus)}
                      >
                        <Thumb src={url} sizes="160px" />
                        {chosen && (
                          <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-[#1A73E8] text-white">
                            <Check className="size-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) set("media", [...draft.media, URL.createObjectURL(file)]);
                  }}
                />
                <p className="text-[12px] text-[#5F6368]">Google shows one photo per post. Landscape images of at least 720x540 look best.</p>
                {draft.media.length > 1 && <Notice tone="amber" title="Only the first photo is published">Google uses a single image per post. The rest stay in OmniPlatform for reference.</Notice>}
              </>
            )}

            {step === "Call to action" && (
              <>
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-[#202124]">
                  <Checkbox checked={draft.ctaEnabled} onCheckedChange={(checked) => set("ctaEnabled", Boolean(checked))} aria-label="Add a button" />
                  Add a button to this post
                </label>
                {draft.ctaEnabled && (
                  <>
                    <FormField label="Button">
                      <SelectMenu<CtaType>
                        label="Button type"
                        size="md"
                        fullWidth
                        value={draft.ctaType}
                        onChange={(value) => set("ctaType", value)}
                        options={CTA_OPTIONS.map((value) => ({ value, label: CTA_LABEL[value] }))}
                      />
                    </FormField>
                    {draft.ctaType === "CALL" ? (
                      <Notice tone="blue" title="Call button uses your profile phone number">Google dials the primary phone number on the location profile.</Notice>
                    ) : (
                      <FormField label="Button link" required htmlFor="cta-url" hint="Must be a full URL, for example https://namogange.org/volunteer">
                        <input id="cta-url" className={gb.input} value={draft.ctaUrl} onChange={(event) => set("ctaUrl", event.target.value)} placeholder="https://" />
                      </FormField>
                    )}
                  </>
                )}
              </>
            )}

            {step === "Schedule" && (
              <>
                <Notice tone="violet" icon={Sparkles} title={<span className="flex items-center gap-2">Scheduling is an OmniPlatform feature <InternalBadge /></span>}>
                  The Google API publishes immediately, so OmniPlatform holds scheduled posts and publishes them at the chosen time.
                </Notice>
                {needsApproval && (
                  <Notice tone="amber" title="This post needs approval first">
                    Your role can create posts but not publish them. After you submit, a reviewer approves and it publishes with these settings.
                  </Notice>
                )}
                <div className="space-y-2">
                  <ChoiceCard name="publish-mode" checked={draft.publishMode === "now"} onSelect={() => set("publishMode", "now")} icon={Send} title="Publish now" description="Goes live on Google as soon as you confirm." />
                  <ChoiceCard name="publish-mode" checked={draft.publishMode === "schedule"} onSelect={() => set("publishMode", "schedule")} icon={CalendarClock} title="Schedule" description="OmniPlatform publishes it at the time you choose." />
                  {draft.publishMode === "schedule" && (
                    <div className="ml-7 grid gap-1 sm:grid-cols-2">
                      <FormField label="Date" htmlFor="post-date">
                        <input id="post-date" type="date" className={gb.input} value={draft.day} min={format(new Date(), "yyyy-MM-dd")} onChange={(event) => set("day", event.target.value)} />
                      </FormField>
                      <FormField label="Time" htmlFor="post-time">
                        <input id="post-time" type="time" className={gb.input} value={draft.time} onChange={(event) => set("time", event.target.value)} />
                      </FormField>
                    </div>
                  )}
                  <ChoiceCard name="publish-mode" checked={draft.publishMode === "draft"} onSelect={() => set("publishMode", "draft")} icon={MessageSquare} title="Keep as draft" description="Save in OmniPlatform without sending anything to Google." />
                </div>
              </>
            )}

            {step === "Review" && (
              <>
                {blocking.length > 0 ? (
                  <Notice tone="red" title={`${blocking.length} issue${blocking.length === 1 ? "" : "s"} to fix before publishing`}>
                    <ul className="mt-1 space-y-0.5">
                      {blocking.map((issue) => (
                        <li key={issue.message}>
                          <button type="button" onClick={() => goTo(issue.step)} className="text-left text-[#1A73E8] hover:underline">
                            {issue.step} - {issue.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Notice>
                ) : (
                  <Notice tone="green" icon={CheckCircle2} title="Ready to publish" />
                )}
                <dl className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
                  {(
                    [
                      ["Type", POST_TYPE_LABEL[draft.type], "Post type"],
                      ["Locations", draft.locationIds.length ? `${draft.locationIds.length} selected` : "None", "Post type"],
                      ["Text", draft.summary ? `${draft.summary.slice(0, 80)}${draft.summary.length > 80 ? "..." : ""}` : "Required", "Content"],
                      ["Photo", draft.media.length ? `${draft.media.length} selected` : "None", "Media"],
                      ["Button", draft.ctaEnabled ? `${CTA_LABEL[draft.ctaType]}${draft.ctaType === "CALL" ? "" : ` - ${draft.ctaUrl || "missing link"}`}` : "None", "Call to action"],
                      [
                        "Publishing",
                        needsApproval
                          ? "Submitted for approval"
                          : draft.publishMode === "schedule"
                            ? scheduleAt && !Number.isNaN(scheduleAt.getTime())
                              ? `Scheduled for ${format(scheduleAt, "EEE, MMM d 'at' h:mm a")}`
                              : "Invalid schedule"
                            : draft.publishMode === "draft"
                              ? "Saved as draft"
                              : "Publish now",
                        "Schedule",
                      ],
                    ] as [string, string, Step][]
                  ).map(([label, value, target]) => (
                    <div key={label} className="flex items-center gap-1 px-3.5 py-2.5">
                      <dt className="w-28 shrink-0 text-[12px] text-[#5F6368]">{label}</dt>
                      <dd className="min-w-0 flex-1 break-words text-[12.5px] font-medium text-[#202124]">{value}</dd>
                      <Button size="xs" variant="link" onClick={() => goTo(target)} aria-label={`Edit ${label}`}>
                        Edit
                      </Button>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E8EAED] px-5 py-3">
            <Button variant="secondary" icon={ArrowLeft} disabled={stepIndex === 0} onClick={() => STEPS[stepIndex - 1] && goTo(STEPS[stepIndex - 1]!)}>
              Back
            </Button>
            {step === "Review" ? (
              <Button
                variant="primary"
                icon={needsApproval ? Send : draft.publishMode === "schedule" ? CalendarClock : Send}
                loading={submitting !== null && submitting !== "draft"}
                disabled={submitting !== null || blocking.length > 0}
                disabledReason={`Resolve ${blocking.length} issue${blocking.length === 1 ? "" : "s"} first`}
                gate={primaryGate}
                onClick={() => void submit("publish")}
              >
                {draft.publishMode === "draft" ? "Save draft" : primaryLabel}
              </Button>
            ) : (
              <Button
                variant="primary"
                iconRight={ArrowRight}
                onClick={() => {
                  if (errors[step]?.length) return setShowErrors(true);
                  const next = STEPS[stepIndex + 1];
                  if (next) goTo(next);
                }}
              >
                Next
              </Button>
            )}
          </div>
        </Card>

        <aside className="hidden xl:block">
          <div className="sticky top-[76px] space-y-1">
            <Card className="overflow-hidden">
              <div className="border-b border-[#E8EAED] px-3.5 py-2.5">
                <p className="text-[12px] font-medium text-[#5F6368]">Preview</p>
              </div>
              {draft.media[0] ? <Thumb src={draft.media[0]} className="w-full rounded-none" sizes="300px" /> : <div className="grid aspect-[4/3] place-items-center bg-[#F1F3F4] text-[#80868B]"><MessageSquare className="size-7" /></div>}
              <div className="space-y-2 p-3.5">
                <Badge tone="neutral">{POST_TYPE_LABEL[draft.type]}</Badge>
                {draft.eventTitle && <p className="text-[13px] font-medium text-[#202124]">{draft.eventTitle}</p>}
                <p className="line-clamp-4 text-[12.5px] leading-5 text-[#3C4043]">{draft.summary || "Your post text will appear here."}</p>
                {draft.ctaEnabled && (
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#1A73E8]">
                    <MousePointerClick className="size-3.5" />
                    {CTA_LABEL[draft.ctaType]}
                  </p>
                )}
                {draft.couponCode && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[#3C4043]">
                    <Tag className="size-3.5" />
                    {draft.couponCode}
                  </p>
                )}
                <p className="flex items-center gap-1.5 border-t border-[#F1F3F4] pt-2 text-[11.5px] text-[#5F6368]">
                  <MapPin className="size-3" />
                  {draft.locationIds.length === 0 ? "No locations selected" : draft.locationIds.length === 1 ? locations.find((location) => location.locationId === draft.locationIds[0])?.profile.title : `${draft.locationIds.length} locations`}
                </p>
              </div>
            </Card>
            {blocking.length > 0 && (
              <Card className="p-3.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#202124]">
                  <X className="size-3.5 text-[#C5221F]" />
                  {blocking.length} to resolve
                </p>
                <ul className="mt-2 space-y-1">
                  {blocking.slice(0, 4).map((issue) => (
                    <li key={issue.message}>
                      <button type="button" onClick={() => goTo(issue.step)} className="text-left text-[12px] text-[#1A73E8] hover:underline">
                        {issue.step}: {issue.message}
                      </button>
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
  "Post type": "Choose what kind of post Google should publish, and where.",
  Content: "The text customers read on your profile.",
  Media: "One photo appears with the post on Search and Maps.",
  "Call to action": "Optional button that links customers to the next step.",
  Schedule: "Publish now, schedule it, or keep it as a draft.",
  Review: "Check everything before it goes to Google.",
};

const TYPE_HELP: Record<PostType, string> = {
  update: "News and announcements. Visible for seven days.",
  event: "Has a start and end date, shown until it ends.",
  offer: "Promotion with optional coupon code and terms.",
  cta: "One clear action, such as booking or signing up.",
};
