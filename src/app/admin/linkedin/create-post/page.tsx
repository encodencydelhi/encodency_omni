"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, FileText, ImageIcon, Loader2, Send, Video } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { draftsApi, type DraftRecord } from "@/features/admin/content/live/drafts-api";
import { schedulingApi, describeScheduleError, describeScheduleWarning, type PublishTarget } from "@/features/admin/content/live/scheduling-api";
import { useLinkedInOverview, linkedinProvider } from "@/features/admin/channels/live/linkedin-hooks";

const LINKEDIN_CHANNEL = "LINKEDIN_ORGANIZATION" as const;
const MIN_SCHEDULE_DELAY_MS = 2 * 60 * 1000;

const unsupportedFormats = [
  { label: "Image", icon: ImageIcon },
  { label: "Video", icon: Video },
  { label: "Document", icon: FileText },
  { label: "Poll", icon: FileText },
  { label: "Event", icon: CalendarClock },
  { label: "Occasion", icon: CheckCircle2 },
];

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDatetimeToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Choose a valid schedule time.");
  return parsed.toISOString();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "LinkedIn action failed.";
}

export default function LinkedInCreatePostPage() {
  const router = useRouter();
  const { companyId, clientId, isReady } = useTenancyContext();
  const overviewQuery = useLinkedInOverview(companyId || "", clientId || "", isReady && Boolean(companyId) && Boolean(clientId));
  const linkedinStatus = linkedinProvider(overviewQuery.data);
  const mappedResources = linkedinStatus?.resources.filter((resource) => resource.resourceType === LINKEDIN_CHANNEL) ?? [];
  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(() => toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)));
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const selectedResourceMappingId = selectedMappingId || mappedResources[0]?.mappingId || "";
  const connected = linkedinStatus?.state === "connected" || linkedinStatus?.status === "CONNECTED" || linkedinStatus?.status === "MAPPED";
  const reconnectRequired = Boolean(linkedinStatus?.reconnectRequired || linkedinStatus?.health === "expired" || linkedinStatus?.health === "revoked");
  const plainContent = content.trim();
  const characterCount = plainContent.length;
  let validationMessage: string | null = null;
  if (!companyId || !clientId) validationMessage = "Select a company and client before publishing.";
  else if (!connected) validationMessage = "Connect LinkedIn before creating a post.";
  else if (reconnectRequired) validationMessage = "Your LinkedIn connection needs to be renewed.";
  else if (!selectedResourceMappingId) validationMessage = "Map a LinkedIn Company Page before publishing.";
  else if (!plainContent) validationMessage = "Write text content before saving or scheduling.";
  else if (characterCount > 3000) validationMessage = "LinkedIn text posts are limited to 3,000 characters.";

  async function createDraft(): Promise<DraftRecord> {
    if (!companyId || !clientId) throw new Error("Company and client context are required.");
    return draftsApi.create(companyId, clientId, {
      title: title.trim() || "LinkedIn text post",
      content: plainContent,
      variants: { [LINKEDIN_CHANNEL]: { content: plainContent } },
      assetIds: [],
    });
  }

  async function resolvePublishableTarget(draft: DraftRecord): Promise<PublishTarget> {
    if (!companyId || !clientId) throw new Error("Company and client context are required.");
    const variant = draft.variants.find((item) => item.channel === LINKEDIN_CHANNEL);
    if (!variant) throw new Error("LinkedIn draft variant was not created.");
    const targets = await schedulingApi.targets(companyId, clientId, draft.id, variant.id);
    const target = targets.items.find((item) => item.resourceMappingId === selectedResourceMappingId);
    if (!target) throw new Error("Selected LinkedIn Company Page is no longer available for this client.");
    if (!target.publishable) {
      if (target.reason === "integration_reconnect_required") throw new Error("Your LinkedIn connection needs to be renewed.");
      throw new Error("This LinkedIn Company Page is not publishable right now.");
    }
    return target;
  }

  async function saveDraftOnly() {
    if (validationMessage && plainContent.length === 0) {
      toast.error(validationMessage);
      return;
    }
    try {
      setIsSaving(true);
      await createDraft();
      toast.success("LinkedIn draft saved", { description: "Saved as a real tenant-scoped content draft." });
      router.push("/admin/linkedin");
    } catch (error) {
      toast.error("Could not save LinkedIn draft", { description: errorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  async function schedulePost(mode: "now" | "later") {
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    try {
      setIsScheduling(true);
      if (!companyId || !clientId) throw new Error("Company and client context are required.");
      const draft = await createDraft();
      const variant = draft.variants.find((item) => item.channel === LINKEDIN_CHANNEL);
      if (!variant) throw new Error("LinkedIn draft variant was not created.");
      const target = await resolvePublishableTarget(draft);
      const requestedTime = mode === "now" ? new Date(Date.now() + MIN_SCHEDULE_DELAY_MS + 15_000).toISOString() : localDatetimeToIso(scheduledFor);
      const scheduled = await schedulingApi.schedule(companyId, clientId, draft.id, variant.id, {
        resourceMappingId: target.resourceMappingId,
        scheduledFor: requestedTime,
        expectedDraftRevision: draft.revision,
      });
      const warningText = scheduled.warnings.map(describeScheduleWarning).join(" ");
      toast.success(mode === "now" ? "LinkedIn publishing queued" : "LinkedIn post scheduled", {
        description: warningText || `Status: ${scheduled.status}. Provider success will be shown only after LinkedIn confirms publishing.`,
      });
      router.push("/admin/linkedin");
    } catch (error) {
      toast.error("LinkedIn post was not scheduled", { description: describeScheduleError(error) });
    } finally {
      setIsScheduling(false);
    }
  }

  const busy = isSaving || isScheduling;

  return (
    <div className="pb-8">
      <div className="-mx-4 -mt-5 mb-4 border-b border-slate-200 bg-white px-4 py-3 shadow-xs sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/linkedin")} className="grid size-8 place-items-center rounded-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Back to LinkedIn">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Create LinkedIn Text Post</h1>
              <p className="text-[11px] font-medium text-slate-500">Uses OmniPlatform drafts and scheduled publishing for LinkedIn Organization pages.</p>
            </div>
          </div>
          <span className="rounded-sm border border-blue-100 bg-blue-50 px-2 py-1 text-[10.5px] font-bold text-[#0A66C2]">Text only</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-3">
          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Publishing target</h2>
                <p className="mt-1 text-[11px] text-slate-500">Select a mapped LinkedIn Company Page for this client.</p>
              </div>
              {overviewQuery.isLoading && <Loader2 className="size-4 animate-spin text-[#0A66C2]" />}
            </div>
            {!connected ? (
              <StatusBox tone="amber" title="LinkedIn is not connected" body="Connect LinkedIn from the channel page before creating a live post." />
            ) : reconnectRequired ? (
              <StatusBox tone="red" title="Reconnect required" body="Your LinkedIn token is expired or revoked. Reconnect LinkedIn before scheduling." />
            ) : mappedResources.length === 0 ? (
              <StatusBox tone="amber" title="No LinkedIn Company Page mapped" body="Discover and map a Company Page before organization publishing is available." />
            ) : (
              <select value={selectedResourceMappingId} onChange={(event) => setSelectedMappingId(event.target.value)} className="h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800">
                {mappedResources.map((resource) => (
                  <option key={resource.mappingId} value={resource.mappingId}>{resource.externalResourceId}</option>
                ))}
              </select>
            )}
          </section>

          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700">Draft title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} className="mt-1 h-9 w-full rounded-sm border border-slate-200 px-3 text-sm" placeholder="Optional internal title" />
            <label className="mt-4 block text-xs font-bold text-slate-700">Post text</label>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={10} maxLength={3000} className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[#0A66C2]" placeholder="Write the LinkedIn organization post text..." />
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className={characterCount > 3000 ? "font-bold text-red-600" : "text-slate-500"}>{characterCount} / 3,000</span>
              <span className="text-slate-400">Provider success appears after LinkedIn confirms the scheduled publish.</span>
            </div>
          </section>

          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Unsupported formats</h2>
            <p className="mt-1 text-[11px] text-slate-500">This LinkedIn integration currently supports text-only organization posts.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unsupportedFormats.map(({ label, icon: Icon }) => (
                <button key={label} disabled className="flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-400">
                  <Icon className="size-4" />
                  <span>{label}</span>
                  <span className="ml-auto text-[9px] uppercase">Not supported</span>
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-3">
          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Actions</h2>
            {validationMessage && <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800"><AlertTriangle className="mr-1 inline size-3.5" />{validationMessage}</div>}
            <button onClick={saveDraftOnly} disabled={busy || !plainContent} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} Save Draft
            </button>
            <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={scheduleForLater} onChange={(event) => setScheduleForLater(event.target.checked)} className="size-4 accent-[#0A66C2]" />
              Schedule for later
            </label>
            {scheduleForLater && <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="mt-2 h-9 w-full rounded-sm border border-slate-200 px-2 text-xs font-semibold" />}
            <button onClick={() => void schedulePost(scheduleForLater ? "later" : "now")} disabled={busy || Boolean(validationMessage)} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-[#0A66C2] text-xs font-bold text-white hover:bg-[#084e96] disabled:opacity-50">
              {isScheduling ? <Loader2 className="size-3.5 animate-spin" /> : scheduleForLater ? <CalendarClock className="size-3.5" /> : <Send className="size-3.5" />}
              {scheduleForLater ? "Schedule" : "Queue Publish"}
            </button>
          </section>

          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Truthful status</h2>
            <dl className="mt-3 space-y-2 text-[11px]">
              <Row label="Connection" value={reconnectRequired ? "Reconnect required" : connected ? "Connected" : "Not connected"} />
              <Row label="Page" value={mappedResources.length ? "Mapped" : "Not mapped"} />
              <Row label="Supported" value="Text only" />
              <Row label="Data mode" value="No demo publish simulation" />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-slate-800">{value}</dd></div>;
}

function StatusBox({ title, body, tone }: { title: string; body: string; tone: "amber" | "red" }) {
  const classes = tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-sm border p-3 ${classes}`}><p className="text-xs font-bold">{title}</p><p className="mt-1 text-[11px] leading-5">{body}</p></div>;
}
