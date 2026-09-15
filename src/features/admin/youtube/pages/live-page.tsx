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
  Globe2,
  ImagePlus,
  Link2,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  Square,
  Trash2,
  UsersRound,
  Video as VideoIcon,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { THUMBNAIL_LIBRARY } from "../data/mock";
import { ToggleRow } from "../components/dialogs";
import { CapabilityState, PageSkeleton } from "../components/states";
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
  Thumb,
  UnderlineTabs,
  VisibilityLabel,
  buttonClass,
  yt,
  type Tone,
} from "../components/ui";
import { useQueryState } from "../hooks/use-query-state";
import { useNow } from "../hooks/use-now";
import { useGuardedNavigate, useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { TIMEZONES, VISIBILITY_LABEL, YT_MOCK_MODE, ytRoutes } from "../lib/constants";
import { compact, dateTime, duration, full, relative } from "../lib/format";
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

export function LivePage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="table" />;
  return <Live />;
}

function Live() {
  const { liveEvents, can, features, deleteLiveEvent, startLiveEvent, endLiveEvent } = useYouTube();
  const { values, set } = useQueryState(useMemo(() => ({ tab: "", setup: "" }), []));
  const liveNow = liveEvents.filter((e) => e.lifecycle === "live");
  const tab = (values.tab || (liveNow.length ? "live" : "upcoming")) as LiveTab;
  const [editing, setEditing] = useState<LiveEvent | null>(null);
  const [deleting, setDeleting] = useState<LiveEvent | null>(null);
  const [starting, setStarting] = useState<LiveEvent | null>(null);
  const [ending, setEnding] = useState<LiveEvent | null>(null);

  const lists = {
    upcoming: liveEvents.filter((e) => e.lifecycle === "upcoming").sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
    live: liveNow,
    completed: liveEvents.filter((e) => e.lifecycle === "completed").sort((a, b) => (b.actualEnd ?? "").localeCompare(a.actualEnd ?? "")),
  };
  const setupEvent = liveEvents.find((e) => e.id === values.setup) ?? null;

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
            { value: "upcoming", label: "Upcoming", count: lists.upcoming.length },
            { value: "live", label: "Live now", count: lists.live.length, icon: lists.live.length ? CircleDot : undefined },
            { value: "completed", label: "Completed", count: lists.completed.length },
          ]}
        />
      </div>

      {tab === "upcoming" &&
        (lists.upcoming.length === 0 ? (
          <Card><EmptyState icon={Radio} title="No live events scheduled" description="Schedule your first live stream so viewers can set reminders." action={<Button variant="primary" icon={Plus} gate={can.canGoLive} href={ytRoutes.liveCreate}>Schedule a live stream</Button>} /></Card>
        ) : (
          <Card>
            <ul className="divide-y divide-[#EEF1F5]">
              {lists.upcoming.map((e) => {
                const h = HEALTH[e.health];
                const ready = e.health === "receiving" || e.health === "healthy";
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap">
                    <Thumb src={e.thumbnailUrl} className="w-[120px]" sizes="120px" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#0F1B3D]">{e.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#6B7890]">
                        <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{format(parseISO(e.scheduledStart), "EEE, MMM d · h:mm a")}</span>
                        <span className="text-[#98A2B3]">({relative(e.scheduledStart)})</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <VisibilityLabel visibility={e.visibility} className="text-[12px]" />
                        <Badge tone={h.tone} dot>{h.label}</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button size="sm" variant="secondary" icon={Settings2} onClick={() => set({ setup: e.id })}>View setup</Button>
                      <Button size="sm" variant="primary" icon={Play} gate={can.canGoLive} disabled={!ready} disabledReason="Start sending video from your encoder first — open View setup for the stream key." onClick={() => setStarting(e)}>Go live</Button>
                      <ActionMenu
                        label={`Actions for ${e.title}`}
                        trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>}
                        items={[
                          { label: "Edit", icon: Pencil, onSelect: () => setEditing(e), gate: can.canGoLive },
                          { label: "View setup", icon: Settings2, onSelect: () => set({ setup: e.id }) },
                          { label: "Open in YouTube Studio", icon: ExternalLink, href: ytRoutes.studio, external: true },
                          "separator",
                          { label: "Delete", icon: Trash2, danger: true, onSelect: () => setDeleting(e), gate: can.canGoLive },
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
        (lists.live.length === 0 ? (
          <Card><EmptyState icon={Radio} title="You're not live right now" description="When a broadcast starts it appears here with real-time viewers and chat." action={lists.upcoming[0] ? <Button variant="secondary" onClick={() => set({ tab: "upcoming" })}>View upcoming events</Button> : undefined} /></Card>
        ) : (
          lists.live.map((e) => <LiveNowCard key={e.id} event={e} onEnd={() => setEnding(e)} onSetup={() => set({ setup: e.id })} />)
        ))}

      {tab === "completed" &&
        (lists.completed.length === 0 ? (
          <Card><EmptyState icon={VideoIcon} title="No completed streams" description="Replays and stream stats appear here after a broadcast ends." /></Card>
        ) : (
          <Card>
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                    <th className="border-b border-[#E4E9F0] bg-[#F8FAFC] px-4 py-2">Stream</th>
                    <th className="border-b border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-right">Duration</th>
                    <th className="border-b border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-right">Peak viewers</th>
                    <th className="border-b border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-right">Views</th>
                    <th className="border-b border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-right">Chat messages</th>
                    <th className="border-b border-[#E4E9F0] bg-[#F8FAFC] px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lists.completed.map((e) => (
                    <tr key={e.id} className="hover:bg-[#F8FAFC]">
                      <td className="border-b border-[#EEF1F5] px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Thumb src={e.thumbnailUrl} className="w-[88px]" sizes="88px" />
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-semibold text-[#0F1B3D]">{e.title}</p>
                            <p className="text-[11.5px] text-[#6B7890]">{dateTime(e.actualStart)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-[#EEF1F5] px-3 text-right text-[12.5px] tabular-nums text-[#3C4A66]">{e.actualStart && e.actualEnd ? duration(differenceInSeconds(parseISO(e.actualEnd), parseISO(e.actualStart))) : "—"}</td>
                      <td className="border-b border-[#EEF1F5] px-3 text-right text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{full(e.peakViewers)}</td>
                      <td className="border-b border-[#EEF1F5] px-3 text-right text-[12.5px] tabular-nums text-[#3C4A66]">{compact(e.totalViews)}</td>
                      <td className="border-b border-[#EEF1F5] px-3 text-right text-[12.5px] tabular-nums text-[#3C4A66]">{full(e.chatMessages)}</td>
                      <td className="border-b border-[#EEF1F5] px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {e.replayVideoId ? (
                            <>
                              <Button size="xs" variant="secondary" icon={VideoIcon} href={ytRoutes.video(e.replayVideoId)}>Replay</Button>
                              <Button size="xs" variant="ghost" icon={BarChart3} gate={can.canViewAnalytics} href={`${ytRoutes.video(e.replayVideoId)}?tab=analytics`}>Analytics</Button>
                            </>
                          ) : (
                            <Button size="xs" variant="secondary" icon={VideoIcon} disabled disabledReason="The replay is still processing on YouTube, or DVR recording was off.">Replay</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#EEF1F5] md:hidden">
              {lists.completed.map((e) => (
                <li key={e.id} className="flex gap-3 px-3 py-3">
                  <Thumb src={e.thumbnailUrl} className="w-[96px]" sizes="96px" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[12.5px] font-semibold text-[#0F1B3D]">{e.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#6B7890]">{dateTime(e.actualStart)}</p>
                    <p className="mt-1 text-[11.5px] text-[#3C4A66]">Peak {full(e.peakViewers)} · {compact(e.totalViews)} views · {full(e.chatMessages)} chats</p>
                    <div className="mt-2 flex gap-1.5">
                      {e.replayVideoId ? (
                        <>
                          <Button size="xs" variant="secondary" icon={VideoIcon} href={ytRoutes.video(e.replayVideoId)}>Replay</Button>
                          <Button size="xs" variant="ghost" icon={BarChart3} gate={can.canViewAnalytics} href={`${ytRoutes.video(e.replayVideoId)}?tab=analytics`}>Analytics</Button>
                        </>
                      ) : (
                        <Button size="xs" variant="secondary" icon={VideoIcon} disabled disabledReason="The replay is still processing on YouTube, or DVR recording was off.">Replay</Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}

      <SetupDrawer event={setupEvent} onClose={() => set({ setup: "" })} onGoLive={(e) => setStarting(e)} />
      <EditLiveDialog event={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title ?? ""}”?`}
        description="The scheduled broadcast is removed from YouTube. Viewers who set a reminder won't be notified."
        affected={deleting ? [`Scheduled for ${dateTime(deleting.scheduledStart)}`, "The stream key for this event stops working"] : []}
        confirmLabel="Delete live event"
        onConfirm={() => (deleting ? deleteLiveEvent(deleting.id) : false)}
      />
      <ConfirmDialog
        open={starting !== null}
        onOpenChange={(o) => !o && setStarting(null)}
        destructive={false}
        title={`Go live with “${starting?.title ?? ""}”?`}
        description="Your stream becomes visible to viewers immediately. Subscribers with notifications on will be alerted."
        affected={starting ? [`Visibility: ${VISIBILITY_LABEL[starting.visibility]}`, `Chat: ${starting.enableChat ? "On" : "Off"} · DVR: ${starting.enableDvr ? "On" : "Off"}`] : []}
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
        affected={ending ? [`${full(ending.concurrentViewers)} people are watching now`, "Live chat closes"] : []}
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
  const [now, setNow] = useState(() => Date.now());
  const [viewers, setViewers] = useState(event.concurrentViewers ?? 0);
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setViewers((v) => Math.max(0, v + Math.round((Math.random() - 0.42) * 40)));
    }, 3000);
    return () => clearInterval(t);
  }, []);
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
            { label: "Watching now", value: full(viewers), icon: UsersRound },
            { label: "Peak viewers", value: full(Math.max(event.peakViewers ?? 0, viewers)), icon: BarChart3 },
            { label: "Chat messages", value: full(event.chatMessages), icon: MessageSquare },
            { label: "Stream health", value: "Healthy", icon: Wifi },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11.5px] text-[#6B7890]"><s.icon className="size-3.5" />{s.label}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[#0F1B3D]">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.studio} external>Open in YouTube Studio</Button>
            <Button size="sm" variant="secondary" icon={Settings2} onClick={onSetup}>Stream setup</Button>
          </div>
          <Button size="sm" variant="dangerSolid" icon={Square} gate={can.canGoLive} onClick={onEnd}>End stream</Button>
        </div>
      </Card>
      <LiveChat event={event} className="xl:col-span-4" />
    </div>
  );
}

const SEED_CHAT = [
  { author: "Ananya Iyer", text: "Watching from Pune! 🙌" },
  { author: "Rohan Das", text: "How many volunteers joined today?" },
  { author: "Meera Nair", text: "The ghat looks so much cleaner already" },
  { author: "Sanjay Kumar", text: "Great work team 👏" },
];

function LiveChat({ event, className }: { event: LiveEvent; className?: string }) {
  const { channel, can } = useYouTube();
  const [messages, setMessages] = useState(SEED_CHAT.map((m, i) => ({ ...m, id: String(i), owner: false })));
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (!event.enableChat) {
    return (
      <Card className={className}>
        <CardHeader title="Live chat" />
        <EmptyState compact icon={MessageSquare} title="Chat is turned off" description="Enable live chat for this broadcast in YouTube Studio." action={<Button size="sm" variant="secondary" icon={ExternalLink} href={ytRoutes.studio} external>Open YouTube Studio</Button>} />
      </Card>
    );
  }

  return (
    <Card className={cn("flex h-[520px] flex-col", className)}>
      <CardHeader title="Live chat" description="Top chat" actions={<Button size="xs" variant="ghost" icon={ExternalLink} href={ytRoutes.studio} external>Pop out</Button>} />
      <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto border-y border-[#EEF1F5] px-4 py-3">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <Avatar name={m.author} src={m.owner ? channel.avatarUrl : undefined} className="size-6 text-[9px]" />
            <p className="min-w-0 text-[12.5px] leading-5 text-[#24324F]">
              <b className={cn("mr-1.5 font-semibold", m.owner ? "rounded bg-[#FFF3C4] px-1 text-[#7A5B00]" : "text-[#6B7890]")}>{m.author}</b>
              {m.text}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-center gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setMessages((prev) => [...prev, { id: String(Date.now()), author: channel.title, text: text.trim(), owner: true }]);
          setText("");
        }}
      >
        <label htmlFor="live-chat" className="sr-only">Chat as {channel.title}</label>
        <input id="live-chat" className={yt.input} value={text} onChange={(e) => setText(e.target.value)} placeholder={can.canReplyComments.allowed ? `Chat as ${channel.title}…` : "You can't post in chat"} disabled={!can.canReplyComments.allowed} maxLength={200} />
        <Button type="submit" size="icon" variant="primary" aria-label="Send message" gate={can.canReplyComments} disabled={!text.trim()} className="size-9"><Send className="size-4" /></Button>
      </form>
    </Card>
  );
}

function SetupDrawer({ event, onClose, onGoLive }: { event: LiveEvent | null; onClose: () => void; onGoLive: (e: LiveEvent) => void }) {
  const { can, updateLiveEvent, resetStreamKey } = useYouTube();
  const [confirmReset, setConfirmReset] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const step = event ? HEALTH_STEPS.indexOf(event.health) : 0;

  const simulateEncoder = async () => {
    if (!event) return;
    setSimulating(true);
    await updateLiveEvent(event.id, { health: "receiving" });
    setTimeout(() => {
      void updateLiveEvent(event.id, { health: "healthy" }).finally(() => setSimulating(false));
    }, 1200);
  };

  return (
    <Sheet open={event !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="text-[15px] text-[#0F1B3D]">Stream setup</SheetTitle>
          <SheetDescription className="line-clamp-1 text-[12.5px]">{event?.title}</SheetDescription>
        </SheetHeader>
        {event && (
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
              <SecretField label="Stream URL" value={event.ingestUrl} masked={false} />
              {can.canGoLive.allowed ? (
                <SecretField label="Stream key" value={event.streamKey} />
              ) : (
                <Notice tone="amber" title="Stream key hidden">{can.canGoLive.reason}</Notice>
              )}
              <p className="text-[12px] leading-5 text-[#6B7890]">Paste these into OBS, Streamlabs or your hardware encoder. Never share the stream key — anyone with it can stream to your channel.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={RefreshCw} gate={can.canGoLive} disabled={event.lifecycle === "live"} disabledReason="You can't reset the key while live" onClick={() => setConfirmReset(true)}>Reset stream key</Button>
                {YT_MOCK_MODE && event.health === "waiting" && (
                  <Button size="sm" variant="ghost" icon={Wifi} loading={simulating} onClick={() => void simulateEncoder()}>Simulate encoder connection</Button>
                )}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#E4E9F0]">
              <div className="flex items-center justify-between px-3.5 py-3">
                <span className="text-[13px] font-semibold text-[#0F1B3D]">Latency</span>
                <SelectMenu<LiveEvent["latency"]> label="Latency" value={event.latency} disabled={!can.canGoLive.allowed || event.lifecycle === "live"} onChange={(v) => void updateLiveEvent(event.id, { latency: v })} options={[{ value: "normal", label: "Normal", description: "Best quality" }, { value: "low", label: "Low latency" }, { value: "ultraLow", label: "Ultra-low", description: "No 1440p/4K" }]} />
              </div>
              <div className="border-t border-[#EEF1F5]"><ToggleRow label="DVR" description="Let viewers rewind while you're live." checked={event.enableDvr} disabled={!can.canGoLive.allowed || event.lifecycle === "live"} onChange={(c) => void updateLiveEvent(event.id, { enableDvr: c })} /></div>
              <div className="border-t border-[#EEF1F5]"><ToggleRow label="Live chat" checked={event.enableChat} disabled={!can.canGoLive.allowed} onChange={(c) => void updateLiveEvent(event.id, { enableChat: c })} /></div>
            </div>

            {event.lifecycle === "upcoming" && (
              <Button variant="primary" icon={Play} className="w-full" gate={can.canGoLive} disabled={!(event.health === "receiving" || event.health === "healthy")} disabledReason="Waiting for your encoder to connect" onClick={() => onGoLive(event)}>Go live</Button>
            )}
          </SheetBody>
        )}
      </SheetContent>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the stream key?"
        description="The current key stops working immediately. You'll need to paste the new key into your encoder."
        confirmLabel="Reset key"
        onConfirm={() => (event ? resetStreamKey(event.id) : false)}
      />
    </Sheet>
  );
}

function EditLiveDialog({ event, onClose }: { event: LiveEvent | null; onClose: () => void }) {
  return event ? <EditLiveBody key={event.id} event={event} onClose={onClose} /> : null;
}

function EditLiveBody({ event, onClose }: { event: LiveEvent; onClose: () => void }) {
  const { updateLiveEvent, can } = useYouTube();
  const now = useNow();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [day, setDay] = useState(() => format(parseISO(event.scheduledStart), "yyyy-MM-dd"));
  const [time, setTime] = useState(() => format(parseISO(event.scheduledStart), "HH:mm"));
  const [visibility, setVisibility] = useState<Visibility>(event.visibility);
  const [busy, setBusy] = useState(false);

  const when = new Date(`${day}T${time}`);
  const dirty = title !== event.title || description !== event.description || visibility !== event.visibility || (Number.isNaN(when.getTime()) ? "" : when.toISOString()) !== event.scheduledStart;
  const error = !title.trim() ? "Title is required." : Number.isNaN(when.getTime()) || when.getTime() < now ? "Choose a future start time." : undefined;

  const save = async () => {
    if (error) return false;
    setBusy(true);
    const ok = await updateLiveEvent(event.id, { title: title.trim(), description, visibility, scheduledStart: when.toISOString() });
    setBusy(false);
    if (ok) onClose();
    return ok;
  };
  useUnsavedChanges(dirty && !error, save, "this live event");

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[500px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Edit live event</DialogTitle>
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
            <SelectMenu<Visibility> label="Visibility" size="md" fullWidth value={visibility} onChange={setVisibility} options={(["public", "unlisted", "private"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))} />
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

const CREATE_STEPS = ["Live details", "Stream settings", "Schedule", "Thumbnail", "Visibility", "Review"] as const;
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
  const { createLiveEvent, settings } = useYouTube();
  const navigate = useGuardedNavigate();
  const initial = useMemo(
    () => ({
      title: "",
      description: "",
      latency: "low" as LiveEvent["latency"],
      enableDvr: true,
      enableChat: true,
      day: format(addDays(new Date(), 2), "yyyy-MM-dd"),
      time: "18:00",
      timezone: settings.defaults.timezone,
      thumbnailUrl: THUMBNAIL_LIBRARY[4] ?? THUMBNAIL_LIBRARY[0]!,
      visibility: "public" as Visibility,
    }),
    [settings.defaults.timezone],
  );
  const [form, setForm] = useState(initial);
  const now = useNow();
  const [step, setStep] = useState<CreateStep>("Live details");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const when = new Date(`${form.day}T${form.time}`);
  const errors: Partial<Record<CreateStep, string>> = {
    "Live details": !form.title.trim() ? "Add a title for the stream." : form.title.length > 100 ? "Title must be 100 characters or fewer." : undefined,
    Schedule: Number.isNaN(when.getTime()) || when.getTime() < now + 5 * 60_000 ? "Schedule at least 5 minutes from now." : undefined,
  };
  const blocking = (Object.entries(errors).filter(([, e]) => e) as [CreateStep, string][]);
  const idx = CREATE_STEPS.indexOf(step);
  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);

  const create = async () => {
    if (blocking.length) {
      setTouched(true);
      setStep(blocking[0]![0]);
      return false;
    }
    setBusy(true);
    const event = await createLiveEvent({ title: form.title.trim(), description: form.description, thumbnailUrl: form.thumbnailUrl, scheduledStart: when.toISOString(), visibility: form.visibility, latency: form.latency, enableDvr: form.enableDvr, enableChat: form.enableChat });
    setBusy(false);
    if (event) {
      setDone(true);
      navigate(`${ytRoutes.live}?tab=upcoming&setup=${event.id}`, { force: true });
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
        <Button variant="ghost" onClick={() => navigate(ytRoutes.live)}>Cancel</Button>
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
                <Notice tone="blue" title="Stream key">A reusable stream key and URL are generated when you create the event. You&apos;ll see them in Stream setup.</Notice>
                <FormField label="Latency">
                  <SelectMenu<LiveEvent["latency"]> label="Latency" size="md" fullWidth value={form.latency} onChange={(v) => set("latency", v)} options={[{ value: "normal", label: "Normal latency", description: "Best playback quality" }, { value: "low", label: "Low latency", description: "Good for viewer interaction" }, { value: "ultraLow", label: "Ultra-low latency", description: "Real-time interaction; no 1440p or 4K" }]} />
                </FormField>
                <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
                  <ToggleRow label="Enable DVR" description="Viewers can pause and rewind while you're live." checked={form.enableDvr} onChange={(c) => set("enableDvr", c)} />
                  <ToggleRow label="Enable live chat" description="Viewers can chat during the stream." checked={form.enableChat} onChange={(c) => set("enableChat", c)} />
                </div>
              </>
            )}
            {step === "Schedule" && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Date" htmlFor="lc-date"><input id="lc-date" type="date" className={yt.input} value={form.day} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => set("day", e.target.value)} /></FormField>
                  <FormField label="Time" htmlFor="lc-time"><input id="lc-time" type="time" className={yt.input} value={form.time} onChange={(e) => set("time", e.target.value)} /></FormField>
                  <FormField label="Time zone"><SelectMenu label="Time zone" size="md" fullWidth value={form.timezone} onChange={(v) => set("timezone", v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} /></FormField>
                </div>
                {errors.Schedule ? <Notice tone="amber" title={errors.Schedule} /> : <Notice tone="blue" title={`Starts ${format(when, "EEEE, MMM d 'at' h:mm a")}`}>Viewers can set a reminder from the watch page. You can go live any time once your encoder connects.</Notice>}
              </>
            )}
            {step === "Thumbnail" && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button type="button" onClick={() => input.current?.click()} className={cn("flex aspect-video flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[#C9D1DC] bg-[#F8FAFC] text-[12px] font-medium text-[#3C4A66] hover:border-[#98A2B3]", yt.focus)}>
                    <ImagePlus className="size-4" />Upload
                  </button>
                  {THUMBNAIL_LIBRARY.slice(0, 7).map((url) => (
                    <button key={url} type="button" aria-pressed={form.thumbnailUrl === url} onClick={() => set("thumbnailUrl", url)} className={cn("relative rounded-sm ring-offset-2", form.thumbnailUrl === url ? "ring-2 ring-[#E5202E]" : "hover:ring-2 hover:ring-[#C9D1DC]", yt.focus)}>
                      <Thumb src={url} sizes="160px" />
                    </button>
                  ))}
                </div>
                <input
                  ref={input}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) return setThumbError("Thumbnails must be 2 MB or smaller.");
                    setThumbError(null);
                    set("thumbnailUrl", URL.createObjectURL(file));
                  }}
                />
                {thumbError ? <p role="alert" className="text-[12px] font-medium text-[#C81E2B]">{thumbError}</p> : <p className="text-[12px] text-[#6B7890]">1280×720 recommended · JPG, PNG or WebP · up to 2 MB.</p>}
              </>
            )}
            {step === "Visibility" && (
              <div className="space-y-2">
                <ChoiceCard name="lc-vis" checked={form.visibility === "public"} onSelect={() => set("visibility", "public")} icon={Globe2} title="Public" description="Anyone can find and watch." />
                <ChoiceCard name="lc-vis" checked={form.visibility === "unlisted"} onSelect={() => set("visibility", "unlisted")} icon={Link2} title="Unlisted" description="Only people with the link can watch." />
                <ChoiceCard name="lc-vis" checked={form.visibility === "private"} onSelect={() => set("visibility", "private")} icon={Lock} title="Private" description="Only you and people you invite." />
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
                    ["Starts", Number.isNaN(when.getTime()) ? "—" : `${format(when, "EEE, MMM d · h:mm a")} (${form.timezone})`, "Schedule"],
                    ["Visibility", VISIBILITY_LABEL[form.visibility], "Visibility"],
                    ["Latency", form.latency === "ultraLow" ? "Ultra-low" : form.latency === "low" ? "Low" : "Normal", "Stream settings"],
                    ["DVR · Chat", `${form.enableDvr ? "On" : "Off"} · ${form.enableChat ? "On" : "Off"}`, "Stream settings"],
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
            <Button variant="secondary" icon={ArrowLeft} disabled={idx === 0} onClick={() => setStep(CREATE_STEPS[idx - 1]!)}>Back</Button>
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
          <Thumb src={form.thumbnailUrl} className="rounded-none" sizes="320px" />
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
