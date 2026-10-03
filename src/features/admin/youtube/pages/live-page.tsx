"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInSeconds, format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CircleDot,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Link2,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Radio,
  Send,
  Settings2,
  Square,
  Trash2,
  Video as VideoIcon,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleRow } from "../components/dialogs";
import { CapabilityState, ErrorState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ChoiceCard,
  ConfirmDialog,
  EmptyState,
  FormField,
  Notice,
  PageTitle,
  SecretField,
  SelectMenu,
  Skeleton,
  Thumb,
  UnderlineTabs,
  VisibilityLabel,
  buttonClass,
  yt,
  type Tone,
} from "../components/ui";
import { useLiveBroadcasts, useLiveChat, useLiveStreams } from "../data/hooks";
import { toLiveEvent } from "../data/mappers";
import { useQueryState } from "../hooks/use-query-state";
import { useNow } from "../hooks/use-now";
import { useGuardedNavigate, useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { describeYouTubeError, isLiveNotEnabled } from "../live/youtube-errors";
import type { YouTubeLiveStreamCredentialsDto, YouTubeLiveStreamDto } from "../live/youtube-dto";
import { VISIBILITY_LABEL, ytRoutes } from "../lib/constants";
import { dateTime, duration, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { LiveEvent, StreamHealth, Visibility } from "../types";

type LiveTab = "upcoming" | "live" | "completed";

const HEALTH: Record<StreamHealth, { label: string; tone: Tone; description: string }> = {
  waiting: { label: "Waiting for stream", tone: "neutral", description: "Start streaming from your encoder using the stream key." },
  receiving: { label: "Receiving data", tone: "blue", description: "YouTube is receiving your stream. Checking quality…" },
  healthy: { label: "Healthy", tone: "green", description: "Stream is healthy and ready to go live." },
  live: { label: "Live", tone: "red", description: "Your broadcast is live on YouTube." },
  ended: { label: "Ended", tone: "neutral", description: "The broadcast has ended." },
};

const HEALTH_STEPS: StreamHealth[] = ["waiting", "receiving", "healthy", "live", "ended"];

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  } catch {
    return "Local time";
  }
};

/** The three broadcast lists + the streams they are bound to. `live_not_enabled` is a capability state, not an error. */
function useLiveEvents() {
  const { connection, features, markLiveNotEnabled } = useYouTube();
  const usable = connection.state === "connected" || connection.state === "syncing";
  const enabled = usable && features.liveStreamingEnabled;
  const upcoming = useLiveBroadcasts("upcoming", enabled);
  const active = useLiveBroadcasts("active", enabled);
  const completed = useLiveBroadcasts("completed", enabled);
  const streams = useLiveStreams(enabled);

  const notEnabled = [upcoming.error, active.error, completed.error].some((e) => e && isLiveNotEnabled(e));
  useEffect(() => {
    if (notEnabled) markLiveNotEnabled();
  }, [notEnabled, markLiveNotEnabled]);

  const streamById = useMemo(() => new Map((streams.data?.items ?? []).map((s) => [s.streamId, s])), [streams.data]);
  const map = (q: typeof upcoming): LiveEvent[] => (q.data?.pages.flatMap((p) => p.items).map((b) => toLiveEvent(b, b.streamId ? streamById.get(b.streamId) : undefined)) ?? []);
  const events = {
    upcoming: useMemo(() => map(upcoming).sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "")), [upcoming.data, streamById]), // eslint-disable-line react-hooks/exhaustive-deps
    live: useMemo(() => map(active), [active.data, streamById]), // eslint-disable-line react-hooks/exhaustive-deps
    completed: useMemo(() => map(completed).sort((a, b) => (b.actualEnd ?? "").localeCompare(a.actualEnd ?? "")), [completed.data, streamById]), // eslint-disable-line react-hooks/exhaustive-deps
  };
  const firstError = [upcoming.error, active.error, completed.error].find((e) => e && !isLiveNotEnabled(e));
  return {
    events,
    streamById,
    enabled,
    isLoading: enabled && (upcoming.isPending || active.isPending || completed.isPending),
    error: firstError ? describeYouTubeError(firstError) : null,
    refetch: () => {
      void upcoming.refetch();
      void active.refetch();
      void completed.refetch();
      void streams.refetch();
    },
    hasMoreCompleted: Boolean(completed.hasNextPage),
    loadMoreCompleted: () => void completed.fetchNextPage(),
    loadingMoreCompleted: completed.isFetchingNextPage,
  };
}

export function LivePage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="table" />;
  return <Live />;
}

function Live() {
  const { can, features, startLiveEvent, endLiveEvent } = useYouTube();
  const data = useLiveEvents();
  const { events } = data;
  const { values, set } = useQueryState(useMemo(() => ({ tab: "", setup: "" }), []));
  const tab = (values.tab || (events.live.length ? "live" : "upcoming")) as LiveTab;
  const [editing, setEditing] = useState<LiveEvent | null>(null);
  const [starting, setStarting] = useState<LiveEvent | null>(null);
  const [ending, setEnding] = useState<LiveEvent | null>(null);

  const all = [...events.upcoming, ...events.live, ...events.completed];
  const setupEvent = all.find((e) => e.id === values.setup) ?? null;

  if (!features.liveStreamingEnabled) {
    return (
      <div className="space-y-1">
        <PageTitle title="Live" description="Schedule, run and review live streams." />
        <Card><CapabilityState capability={can.canGoLive} title="Live streaming isn't enabled" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <PageTitle
        title="Live"
        description="Schedule, run and review live streams."
        actions={<Button variant="primary" icon={Plus} gate={can.canGoLive} href={ytRoutes.liveCreate}>Create live event</Button>}
      />

      <div className="border-b border-[#E4E9F0]">
        <UnderlineTabs<LiveTab>
          label="Live streams"
          value={tab}
          onChange={(v) => set({ tab: v })}
          items={[
            { value: "upcoming", label: "Upcoming", count: data.isLoading ? undefined : events.upcoming.length },
            { value: "live", label: "Live now", count: data.isLoading ? undefined : events.live.length, icon: events.live.length ? CircleDot : undefined },
            { value: "completed", label: "Completed", count: data.isLoading ? undefined : events.completed.length },
          ]}
        />
      </div>

      {data.isLoading ? (
        <Card className="space-y-3 p-4" aria-busy="true" aria-label="Loading live events">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</Card>
      ) : data.error ? (
        <Card><ErrorState error={data.error} onRetry={data.refetch} title="Live events couldn't load" /></Card>
      ) : (
        <>
          {tab === "upcoming" &&
            (events.upcoming.length === 0 ? (
              <Card><EmptyState icon={Radio} title="No live events scheduled" description="Schedule your first live stream so viewers can set reminders." action={<Button variant="primary" icon={Plus} gate={can.canGoLive} href={ytRoutes.liveCreate}>Schedule a live stream</Button>} /></Card>
            ) : (
              <Card>
                <ul className="divide-y divide-[#EEF1F5]">
                  {events.upcoming.map((e) => {
                    const h = HEALTH[e.health];
                    const ready = e.health === "receiving" || e.health === "healthy";
                    return (
                      <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap">
                        <Thumb src={e.thumbnailUrl} className="w-[120px]" sizes="120px" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#0F1B3D]">{e.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#6B7890]">
                            {e.scheduledStart ? (
                              <>
                                <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{format(parseISO(e.scheduledStart), "EEE, MMM d · h:mm a")}</span>
                                <span className="text-[#98A2B3]">({relative(e.scheduledStart)})</span>
                              </>
                            ) : (
                              <span>No start time</span>
                            )}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <VisibilityLabel visibility={e.visibility} className="text-[12px]" />
                            <Badge tone={h.tone} dot>{h.label}</Badge>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button size="sm" variant="secondary" icon={Settings2} onClick={() => set({ setup: e.id })}>View setup</Button>
                          <Button size="sm" variant="primary" icon={Play} gate={can.canTransitionLive} disabled={!ready} disabledReason="Start sending video from your encoder first — open View setup for the stream key." onClick={() => setStarting(e)}>Go live</Button>
                          <ActionMenu
                            label={`Actions for ${e.title}`}
                            trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>}
                            items={[
                              { label: "Edit", icon: Pencil, onSelect: () => setEditing(e), gate: can.canGoLive },
                              { label: "View setup", icon: Settings2, onSelect: () => set({ setup: e.id }) },
                              { label: "Open in YouTube Studio", icon: ExternalLink, href: ytRoutes.studio, external: true },
                              "separator",
                              { label: "Delete in YouTube Studio", icon: Trash2, danger: true, href: ytRoutes.studio, external: true },
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}

          {tab === "live" &&
            (events.live.length === 0 ? (
              <Card><EmptyState icon={Radio} title="You're not live right now" description="When a broadcast starts it appears here with live chat." action={events.upcoming[0] ? <Button variant="secondary" onClick={() => set({ tab: "upcoming" })}>View upcoming events</Button> : undefined} /></Card>
            ) : (
              events.live.map((e) => <LiveNowCard key={e.id} event={e} onEnd={() => setEnding(e)} onSetup={() => set({ setup: e.id })} />)
            ))}

          {tab === "completed" &&
            (events.completed.length === 0 ? (
              <Card><EmptyState icon={VideoIcon} title="No completed streams" description="Replays appear here after a broadcast ends." /></Card>
            ) : (
              <Card>
                <ul className="divide-y divide-[#EEF1F5]">
                  {events.completed.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap">
                      <Thumb src={e.thumbnailUrl} className="w-[96px]" sizes="96px" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[12.5px] font-semibold text-[#0F1B3D]">{e.title}</p>
                        <p className="mt-0.5 text-[11.5px] text-[#6B7890]">
                          {dateTime(e.actualStart)}
                          {e.actualStart && e.actualEnd ? ` · ${duration(differenceInSeconds(parseISO(e.actualEnd), parseISO(e.actualStart)))}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {e.replayVideoId ? (
                          <>
                            <Button size="xs" variant="secondary" icon={VideoIcon} href={ytRoutes.video(e.replayVideoId)}>Replay</Button>
                            <Button size="xs" variant="ghost" icon={BarChart3} gate={can.canViewAnalytics} href={`${ytRoutes.video(e.replayVideoId)}?tab=analytics`}>Analytics</Button>
                          </>
                        ) : (
                          <Button size="xs" variant="secondary" icon={VideoIcon} disabled disabledReason="The replay is still processing on YouTube, or recording was off.">Replay</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {data.hasMoreCompleted && (
                  <div className="flex justify-center border-t border-[#EEF1F5] py-2.5"><Button size="sm" variant="secondary" loading={data.loadingMoreCompleted} onClick={data.loadMoreCompleted}>Load more</Button></div>
                )}
                <p className="border-t border-[#EEF1F5] px-4 py-2 text-[11.5px] text-[#98A2B3]">Peak viewers, view counts and chat totals aren&apos;t reported by YouTube&apos;s API; open the replay&apos;s analytics for its views.</p>
              </Card>
            ))}
        </>
      )}

      <SetupDrawer event={setupEvent} stream={setupEvent?.streamId ? data.streamById.get(setupEvent.streamId) : undefined} onClose={() => set({ setup: "" })} onGoLive={(e) => setStarting(e)} />
      <EditLiveDialog event={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={starting !== null}
        onOpenChange={(o) => !o && setStarting(null)}
        destructive={false}
        title={`Go live with “${starting?.title ?? ""}”?`}
        description="Your stream becomes visible to its audience immediately. Subscribers with notifications on may be alerted."
        affected={starting ? [`Visibility: ${VISIBILITY_LABEL[starting.visibility]}`, `Chat: ${starting.enableChat ? "On" : "Off"}`] : []}
        confirmLabel="Go live"
        onConfirm={async () => {
          if (!starting) return false;
          const ok = await startLiveEvent(starting.id);
          if (ok) set({ tab: "live", setup: "" });
          return ok;
        }}
      />
      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(o) => !o && setEnding(null)}
        title={`End “${ending?.title ?? ""}”?`}
        description="The broadcast stops for all viewers and can't be resumed. The replay will be processed and saved to your channel."
        affected={ending ? ["Live chat closes"] : []}
        confirmLabel="End stream"
        onConfirm={async () => {
          if (!ending) return false;
          const ok = await endLiveEvent(ending.id);
          if (ok) set({ tab: "completed" });
          return ok;
        }}
      />
    </div>
  );
}

function LiveNowCard({ event, onEnd, onSetup }: { event: LiveEvent; onEnd: () => void; onSetup: () => void }) {
  const { can } = useYouTube();
  const now = useNow();
  const elapsed = event.actualStart ? Math.max(0, Math.round((now - parseISO(event.actualStart).getTime()) / 1000)) : 0;

  return (
    <div className="grid gap-1 xl:grid-cols-12">
      <Card className="overflow-hidden xl:col-span-8">
        <div className="relative">
          <Thumb src={event.thumbnailUrl} className="rounded-none" sizes="900px" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/70 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-[#E5202E] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <span className="size-1.5 animate-pulse rounded-sm bg-white" /> Live
          </span>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2 text-white">
            <p className="text-[16px] font-semibold drop-shadow">{event.title}</p>
            <span className="rounded-sm bg-black/40 px-2 py-0.5 font-mono text-[12px]">{duration(elapsed)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#EEF1F5] sm:grid-cols-4">
          {[
            { label: "Started", value: event.actualStart ? relative(event.actualStart) : "—", icon: Clock3 },
            { label: "Visibility", value: VISIBILITY_LABEL[event.visibility], icon: Eye },
            { label: "Live chat", value: event.enableChat ? "On" : "Off", icon: MessageSquare },
            { label: "Stream health", value: HEALTH[event.health].label, icon: Wifi },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11.5px] text-[#6B7890]"><s.icon className="size-3.5" />{s.label}</p>
              <p className="mt-0.5 text-[16px] font-semibold text-[#0F1B3D]">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.studio} external>Open in YouTube Studio</Button>
            <Button size="sm" variant="secondary" icon={Settings2} onClick={onSetup}>Stream Setup</Button>
          </div>
          <Button size="sm" variant="dangerSolid" icon={Square} gate={can.canTransitionLive} onClick={onEnd}>End stream</Button>
        </div>
      </Card>
      <LiveChat event={event} className="xl:col-span-4" />
    </div>
  );
}

function LiveChat({ event, className }: { event: LiveEvent; className?: string }) {
  const { channel, can, sendLiveChat } = useYouTube();
  const chat = useLiveChat(event.id, event.enableChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = chat.data?.items ?? [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (!event.enableChat) {
    return (
      <Card className={className}>
        <CardHeader title="Live Chat" />
        <EmptyState compact icon={MessageSquare} title="Chat is turned off" description="Enable live chat for this broadcast in YouTube Studio." action={<Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.studio} external>Open YouTube Studio</Button>} />
      </Card>
    );
  }

  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    const ok = await sendLiveChat(event.id, value);
    setBusy(false);
    if (ok) setText("");
  };

  return (
    <Card className={cn("flex h-[520px] flex-col", className)}>
      <CardHeader title="Live Chat" description="Updates every few seconds" actions={<Button size="xs" variant="ghost" icon={ExternalLink} href={ytRoutes.studio} external>Pop out</Button>} />
      <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto border-y border-[#EEF1F5] px-4 py-3">
        {chat.isPending ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : chat.error ? (
          <ErrorState compact error={describeYouTubeError(chat.error)} onRetry={() => void chat.refetch()} />
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-[#98A2B3]">No chat messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.messageId} className="flex gap-2">
              <Avatar name={m.authorDisplayName ?? "Viewer"} src={m.authorProfileImageUrl && /^https:\/\//i.test(m.authorProfileImageUrl) ? m.authorProfileImageUrl : undefined} className="size-6 text-[9px]" />
              <p className="min-w-0 text-[12.5px] leading-5 text-[#24324F]">
                <b className={cn("mr-1.5 font-semibold", m.isChatOwner ? "rounded bg-[#FFF3C4] px-1 text-[#7A5B00]" : "text-[#6B7890]")}>{m.authorDisplayName ?? "Viewer"}</b>
                {m.message}
              </p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-center gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="live-chat" className="sr-only">Chat as {channel.title}</label>
        <input id="live-chat" className={yt.input} value={text} onChange={(e) => setText(e.target.value)} placeholder={can.canReplyComments.allowed ? `Chat as ${channel.title}…` : "You can't post in chat"} disabled={!can.canReplyComments.allowed || busy} maxLength={200} />
        <Button type="submit" size="icon" variant="primary" aria-label="Send message" loading={busy} gate={can.canReplyComments} disabled={!text.trim()} className="size-9"><Send className="size-4" /></Button>
      </form>
    </Card>
  );
}

function SetupDrawer({ event, stream, onClose, onGoLive }: { event: LiveEvent | null; stream: YouTubeLiveStreamDto | undefined; onClose: () => void; onGoLive: (e: LiveEvent) => void }) {
  return (
    <Sheet open={event !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="text-[15px] text-[#0F1B3D]">Stream Setup</SheetTitle>
          <SheetDescription className="line-clamp-1 text-[12.5px]">{event?.title}</SheetDescription>
        </SheetHeader>
        {event && <SetupBody key={event.id} event={event} stream={stream} onGoLive={onGoLive} />}
      </SheetContent>
    </Sheet>
  );
}

/** The key lives only in this component's state: cleared on hide, after two minutes, and when the drawer closes. */
const CREDENTIAL_VISIBLE_MS = 120_000;

function SetupBody({ event, stream, onGoLive }: { event: LiveEvent; stream: YouTubeLiveStreamDto | undefined; onGoLive: (e: LiveEvent) => void }) {
  const { can, revealStreamCredentials, attachStream } = useYouTube();
  const [credentials, setCredentials] = useState<YouTubeLiveStreamCredentialsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const step = HEALTH_STEPS.indexOf(event.health);

  useEffect(() => {
    if (!credentials) return;
    const t = setTimeout(() => setCredentials(null), CREDENTIAL_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [credentials]);

  const reveal = async () => {
    if (!event.streamId || loading) return;
    setLoading(true);
    const result = await revealStreamCredentials(event.streamId);
    setLoading(false);
    if (result) setCredentials(result);
  };

  return (
    <SheetBody className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Connection status</p>
        <ol className="flex items-center gap-1" aria-label="Stream status">
          {HEALTH_STEPS.map((h, i) => (
            <li key={h} className="flex flex-1 flex-col items-center gap-1 text-center">
              <span className={cn("grid size-6 place-items-center rounded-sm text-[10px] font-bold", i < step ? "bg-[#12B76A] text-white" : i === step ? (h === "live" ? "bg-[#E5202E] text-white" : "bg-[#0F1B3D] text-white") : "bg-[#F1F4F8] text-[#98A2B3]")}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn("text-[10.5px] leading-tight", i === step ? "font-semibold text-[#0F1B3D]" : "text-[#98A2B3]")}>{HEALTH[h].label.replace(" for stream", "")}</span>
            </li>
          ))}
        </ol>
        <Notice tone={event.health === "healthy" ? "blue" : "neutral"} className="mt-3" title={HEALTH[event.health].label}>{HEALTH[event.health].description}</Notice>
      </div>

      <div className="space-y-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Encoder settings</p>
        {!event.streamId ? (
          <Notice tone="amber" title="No stream is attached" actions={<Button size="sm" variant="primary" loading={attaching} gate={can.canGoLive} onClick={async () => { if (attaching) return; setAttaching(true); await attachStream(event.id, event.title); setAttaching(false); }}>Create & attach stream</Button>}>
            This event has no encoder connection yet. Creating one makes a reusable stream on your channel.
          </Notice>
        ) : credentials ? (
          <>
            <SecretField label="Stream URL" value={credentials.ingestionAddress ?? credentials.rtmpsIngestionAddress ?? ""} masked={false} />
            <SecretField label="Stream key" value={credentials.streamName ?? ""} />
            <Button size="sm" variant="ghost" icon={EyeOff} onClick={() => setCredentials(null)}>Hide encoder settings</Button>
          </>
        ) : can.canViewStreamKey.allowed ? (
          <Button size="sm" variant="secondary" icon={Eye} loading={loading} onClick={() => void reveal()}>Reveal stream URL and key</Button>
        ) : (
          <Notice tone="amber" title="Stream key hidden">{can.canViewStreamKey.reason}</Notice>
        )}
        <p className="text-[12px] leading-5 text-[#6B7890]">Paste these into OBS, Streamlabs or your hardware encoder. Never share the stream key — anyone with it can stream to your channel. It&apos;s fetched only when you ask and is never saved by OmniPlatform.</p>
      </div>

      <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
        <ToggleRow label="DVR" description="Chosen when the event was created." checked={event.enableDvr === true} disabled onChange={() => undefined} />
        <ToggleRow label="Live chat" description="Reported by YouTube for this broadcast." checked={event.enableChat} disabled onChange={() => undefined} />
      </div>

      {event.lifecycle === "upcoming" && (
        <Button variant="primary" icon={Play} className="w-full" gate={can.canTransitionLive} disabled={!(event.health === "receiving" || event.health === "healthy")} disabledReason="Waiting for your encoder to connect" onClick={() => onGoLive(event)}>Go live</Button>
      )}
      {stream && stream.health === "bad" && <Notice tone="amber" title="Stream health is poor">YouTube reports problems with the incoming video. Check your encoder settings.</Notice>}
    </SheetBody>
  );
}

function EditLiveDialog({ event, onClose }: { event: LiveEvent | null; onClose: () => void }) {
  return event ? <EditLiveBody key={event.id} event={event} onClose={onClose} /> : null;
}

function EditLiveBody({ event, onClose }: { event: LiveEvent; onClose: () => void }) {
  const { updateLiveEvent, can } = useYouTube();
  const now = useNow();
  const start = event.scheduledStart ? parseISO(event.scheduledStart) : addDays(new Date(), 1);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [day, setDay] = useState(() => format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(() => format(start, "HH:mm"));
  const [visibility, setVisibility] = useState<Visibility>(event.visibility);
  const [busy, setBusy] = useState(false);

  const when = new Date(`${day}T${time}`);
  const whenIso = Number.isNaN(when.getTime()) ? "" : when.toISOString();
  const startChanged = whenIso !== "" && whenIso !== (event.scheduledStart ? parseISO(event.scheduledStart).toISOString() : "");
  const dirty = title !== event.title || description !== event.description || visibility !== event.visibility || startChanged;
  const error = !title.trim() ? "Title is required." : startChanged && (Number.isNaN(when.getTime()) || when.getTime() < now) ? "Choose a future start time." : undefined;

  const save = async () => {
    if (error || busy) return false;
    setBusy(true);
    const ok = await updateLiveEvent(event.id, {
      ...(title.trim() !== event.title ? { title: title.trim() } : {}),
      ...(description !== event.description ? { description } : {}),
      ...(startChanged ? { scheduledStart: whenIso } : {}),
      ...(visibility !== event.visibility ? { visibility } : {}),
    });
    setBusy(false);
    if (ok) onClose();
    return ok;
  };
  useUnsavedChanges(dirty && !error, save, "this live event");

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[500px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Edit Live Event</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">Updates the scheduled broadcast on YouTube.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <FormField label="Title" required htmlFor="le-title" counter={{ value: title.length, max: 100 }}>
            <input id="le-title" className={yt.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="le-desc">
            <textarea id="le-desc" rows={3} className={yt.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="le-date"><input id="le-date" type="date" className={yt.input} value={day} onChange={(e) => setDay(e.target.value)} /></FormField>
            <FormField label="Time" htmlFor="le-time"><input id="le-time" type="time" className={yt.input} value={time} onChange={(e) => setTime(e.target.value)} /></FormField>
          </div>
          <FormField label="Visibility">
            <SelectMenu<Visibility> label="Visibility" size="md" fullWidth value={visibility} onChange={setVisibility} options={(["private", "unlisted", "public"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))} />
          </FormField>
          {error && <p role="alert" className="text-[12px] font-medium text-[#C81E2B]">{error}</p>}
        </div>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!dirty || Boolean(error)} disabledReason={error ?? "Make a change to save"} gate={can.canGoLive} onClick={() => void save()}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Create live                                                         */
/* ------------------------------------------------------------------ */

const CREATE_STEPS = ["Live details", "Stream settings", "Schedule", "Visibility", "Review"] as const;
type CreateStep = (typeof CREATE_STEPS)[number];

export function LiveCreatePage() {
  const { ready, can, features } = useYouTube();
  if (!ready) return <PageSkeleton variant="detail" />;
  if (!can.canGoLive.allowed || !features.liveStreamingEnabled) {
    return (
      <div className="space-y-1">
        <Link href={ytRoutes.live} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#6B7890] hover:text-[#0F1B3D]"><ArrowLeft className="size-3.5" />Live</Link>
        <Card><CapabilityState capability={can.canGoLive} title="You can't create live events" /></Card>
      </div>
    );
  }
  return <LiveCreate />;
}

function LiveCreate() {
  const { createLiveEvent } = useYouTube();
  const navigate = useGuardedNavigate();
  const initial = useMemo(
    () => ({
      title: "",
      description: "",
      enableDvr: true,
      madeForKids: false,
      day: format(addDays(new Date(), 2), "yyyy-MM-dd"),
      time: "18:00",
      // Private unless the person chooses otherwise.
      visibility: "private" as Visibility,
    }),
    [],
  );
  const [form, setForm] = useState(initial);
  const now = useNow();
  const [step, setStep] = useState<CreateStep>("Live details");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const zone = browserZone();

  const when = new Date(`${form.day}T${form.time}`);
  const errors: Partial<Record<CreateStep, string>> = {
    "Live details": !form.title.trim() ? "Add a title for the stream." : form.title.length > 100 ? "Title must be 100 characters or fewer." : /[<>]/.test(form.title) ? "Titles can't contain < or >." : undefined,
    Schedule: Number.isNaN(when.getTime()) || when.getTime() < now + 5 * 60_000 ? "Schedule at least 5 minutes from now." : undefined,
  };
  const blocking = (Object.entries(errors).filter(([, e]) => e) as [CreateStep, string][]);
  const idx = CREATE_STEPS.indexOf(step);
  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);

  const create = async () => {
    if (busy) return false;
    if (blocking.length) {
      setTouched(true);
      setStep(blocking[0]![0]);
      return false;
    }
    setBusy(true);
    const event = await createLiveEvent({ title: form.title.trim(), description: form.description, scheduledStart: when.toISOString(), visibility: form.visibility, enableDvr: form.enableDvr, madeForKids: form.madeForKids });
    setBusy(false);
    if (event) {
      setDone(true);
      navigate(`${ytRoutes.live}?tab=upcoming&setup=${event.broadcastId}`, { force: true });
      return true;
    }
    return false;
  };

  useUnsavedChanges(dirty, create, "this live event");

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Back to live" onClick={() => navigate(ytRoutes.live)}><ArrowLeft className="size-4" /></Button>
          <div>
            <h2 className="text-[17px] font-semibold text-[#0F1B3D]">Create live event</h2>
            <p className="text-[12.5px] text-[#6B7890]">Step {idx + 1} of {CREATE_STEPS.length} · {step}</p>
          </div>
        </div>
        <Button variant="ghost" disabled={busy} onClick={() => navigate(ytRoutes.live)}>Cancel</Button>
      </div>

      <Card className="scrollbar-thin overflow-x-auto p-2">
        <ol className="flex min-w-max gap-1">
          {CREATE_STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" onClick={() => setStep(s)} aria-current={s === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-sm px-3 py-1.5 text-[12.5px] font-medium", s === step ? "bg-[#FEF1F2] text-[#0F1B3D]" : "text-[#6B7890] hover:bg-[#F8FAFC]", yt.focus)}>
                <span className={cn("grid size-5 place-items-center rounded-sm text-[10.5px] font-bold", touched && errors[s] ? "bg-[#FEF1F2] text-[#C81E2B] ring-1 ring-[#FBD5D9]" : i < idx ? "bg-[#12B76A] text-white" : s === step ? "bg-[#E5202E] text-white" : "bg-[#F1F4F8] text-[#6B7890]")}>
                  {touched && errors[s] ? "!" : i < idx ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="space-y-4 px-5 py-4">
            {step === "Live details" && (
              <>
                <FormField label="Title" required htmlFor="lc-title" counter={{ value: form.title.length, max: 100 }} error={touched ? errors["Live details"] : undefined}>
                  <input id="lc-title" autoFocus className={yt.input} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Live Q&A with our river scientists" />
                </FormField>
                <FormField label="Description" htmlFor="lc-desc" counter={{ value: form.description.length, max: 5000 }}>
                  <textarea id="lc-desc" rows={6} className={yt.textarea} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Tell viewers what the stream is about" />
                </FormField>
              </>
            )}
            {step === "Stream settings" && (
              <>
                <Notice tone="blue" title="Stream key">A reusable stream is created and attached when you create the event. Its URL and key are shown in Stream setup, only when you ask for them.</Notice>
                <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
                  <ToggleRow label="Enable DVR" description="Viewers can pause and rewind while you're live." checked={form.enableDvr} onChange={(c) => set("enableDvr", c)} />
                  <ToggleRow label="Made for kids" description="Required by COPPA. Turns off comments and live chat features for kids' content." checked={form.madeForKids} onChange={(c) => set("madeForKids", c)} />
                </div>
              </>
            )}
            {step === "Schedule" && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Date" htmlFor="lc-date"><input id="lc-date" type="date" className={yt.input} value={form.day} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => set("day", e.target.value)} /></FormField>
                  <FormField label="Time" htmlFor="lc-time"><input id="lc-time" type="time" className={yt.input} value={form.time} onChange={(e) => set("time", e.target.value)} /></FormField>
                  <FormField label="Time zone"><SelectMenu label="Time zone" size="md" fullWidth disabled value={zone} onChange={() => undefined} options={[{ value: zone, label: zone }]} /></FormField>
                </div>
                {errors.Schedule ? <Notice tone="amber" title={errors.Schedule} /> : <Notice tone="blue" title={`Starts ${format(when, "EEEE, MMM d 'at' h:mm a")}`}>Viewers can set a reminder from the watch page. You can go live any time once your encoder connects.</Notice>}
              </>
            )}
            {step === "Visibility" && (
              <div className="space-y-2">
                <ChoiceCard name="lc-vis" checked={form.visibility === "private"} onSelect={() => set("visibility", "private")} icon={Lock} title="Private" description="Only you and people you invite." />
                <ChoiceCard name="lc-vis" checked={form.visibility === "unlisted"} onSelect={() => set("visibility", "unlisted")} icon={Link2} title="Unlisted" description="Only people with the link can watch." />
                <ChoiceCard name="lc-vis" checked={form.visibility === "public"} onSelect={() => set("visibility", "public")} icon={Globe2} title="Public" description="Anyone can find and watch." />
              </div>
            )}
            {step === "Review" && (
              <>
                {blocking.length > 0 ? (
                  <Notice tone="red" title="Fix these before creating the event">
                    <ul>{blocking.map(([s, e]) => <li key={s}><button type="button" className="text-[#1D4ED8] hover:underline" onClick={() => setStep(s)}>{s} — {e}</button></li>)}</ul>
                  </Notice>
                ) : (
                  <Notice tone="blue" title="Ready to schedule" />
                )}
                <dl className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
                  {([
                    ["Title", form.title || "—", "Live details"],
                    ["Starts", Number.isNaN(when.getTime()) ? "—" : `${format(when, "EEE, MMM d · h:mm a")} (${zone})`, "Schedule"],
                    ["Visibility", VISIBILITY_LABEL[form.visibility], "Visibility"],
                    ["DVR · Made for kids", `${form.enableDvr ? "DVR on" : "DVR off"} · ${form.madeForKids ? "For kids" : "Not for kids"}`, "Stream settings"],
                  ] as [string, string, CreateStep][]).map(([label, value, s]) => (
                    <div key={label} className="flex items-center gap-3 px-3.5 py-2.5">
                      <dt className="w-28 shrink-0 text-[12px] text-[#6B7890]">{label}</dt>
                      <dd className="min-w-0 flex-1 text-right text-[12.5px] font-medium text-[#0F1B3D]">{value}</dd>
                      <Button size="xs" variant="link" onClick={() => setStep(s)}>Edit</Button>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[#EEF1F5] px-5 py-3">
            <Button variant="secondary" icon={ArrowLeft} disabled={idx === 0 || busy} onClick={() => setStep(CREATE_STEPS[idx - 1]!)}>Back</Button>
            {step === "Review" ? (
              <Button variant="primary" icon={Radio} loading={busy} disabled={blocking.length > 0} disabledReason="Resolve the issues above" onClick={() => void create()}>Create live event</Button>
            ) : (
              <Button
                variant="primary"
                iconRight={ArrowRight}
                onClick={() => {
                  if (errors[step]) return setTouched(true);
                  setStep(CREATE_STEPS[idx + 1]!);
                }}
              >
                Next
              </Button>
            )}
          </div>
        </Card>
        <Card className="hidden h-fit overflow-hidden xl:block">
          <div className="grid aspect-video place-items-center bg-[#F1F4F8] text-[#98A2B3]"><Radio className="size-8" /></div>
          <div className="space-y-1.5 p-3.5">
            <Badge tone="blue" icon={Clock3}>Upcoming</Badge>
            <p className="line-clamp-2 text-[13px] font-semibold text-[#0F1B3D]">{form.title || "Untitled live stream"}</p>
            <p className="text-[12px] text-[#6B7890]">{Number.isNaN(when.getTime()) ? "No start time" : `Scheduled for ${format(when, "MMM d, h:mm a")}`}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
