"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle2, Clock, Info, Loader2, Mail, MessageCircle, RotateCcw, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/types/api";
import { formatRelative } from "@/features/admin/website/data/selectors";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { useNotificationRouting, type DeliveryChannel, type NotificationDeliveryItem, type NotificationRouteEvent } from "../settings-data/notification-routes";

const GROUPS = [
  { key: "operational", label: "Operational & Service Health", desc: "Failed posts, disconnected channels, servers & domains, competitor changes, website alerts and automation" },
  { key: "collaboration", label: "Team Collaboration & Support", desc: "Draft reviews, published videos, website reports and support tickets" },
  { key: "account", label: "Account & Announcements", desc: "Invitations and messages from the platform team" },
] as const;

const STATUS: Record<NotificationDeliveryItem["status"], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  sent: { label: "Sent", cls: "bg-[#ECFDF5] text-[#047857] ring-[#A7F3D0]", icon: CheckCircle2 },
  queued: { label: "Waiting", cls: "bg-[#EFF6FF] text-[#1D4ED8] ring-[#BFDBFE]", icon: Clock },
  sending: { label: "Sending", cls: "bg-[#EFF6FF] text-[#1D4ED8] ring-[#BFDBFE]", icon: Loader2 },
  failed: { label: "Failed", cls: "bg-[#FEF2F2] text-[#B91C1C] ring-[#FECACA]", icon: XCircle },
  skipped: { label: "Not sent", cls: "bg-[#F1F5F9] text-[#475569] ring-[#E2E8F0]", icon: Info },
};

const errorText = (e: unknown, fallback: string) => (ApiError.isApiError(e) ? e.message : fallback);

function ChannelHead({ dot, label }: { dot: string; label: string }) {
  return (
    <th className="w-[92px] min-w-[84px] whitespace-nowrap px-1.5 py-2 text-center">
      <div className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[10.5px] font-semibold text-[#0F172A] shadow-2xs">
        <span className={`size-2 rounded-full ${dot}`} /> {label}
      </div>
    </th>
  );
}

export function NotificationsSection() {
  const { capabilities } = useSettingsCapability();
  const canEdit = capabilities.canManageNotifications;
  const { routes, deliveries, save } = useNotificationRouting();
  const [draft, setDraft] = useState<Record<string, Record<DeliveryChannel, boolean>>>({});

  const events = routes.data?.events ?? [];
  const value = (e: NotificationRouteEvent, c: DeliveryChannel) => draft[e.key]?.[c] ?? e[c];
  const changed = events.filter((e) => draft[e.key] && (draft[e.key]!.email !== e.email || draft[e.key]!.whatsapp !== e.whatsapp));
  const toggle = (e: NotificationRouteEvent, c: DeliveryChannel, v: boolean) => setDraft((d) => ({ ...d, [e.key]: { email: value(e, "email"), whatsapp: value(e, "whatsapp"), [c]: v } }));
  const submit = () =>
    save.mutate(
      changed.map((e) => ({ event: e.key, email: value(e, "email"), whatsapp: value(e, "whatsapp") })),
      {
        onSuccess: () => {
          setDraft({});
          toast.success("Notification channels saved");
        },
        onError: (err) => toast.error(errorText(err, "Could not save the notification channels")),
      },
    );

  const week = deliveries.data?.lastWeek ?? {};
  const whatsappReady = routes.data?.whatsappReady ?? false;

  return (
    <div className="space-y-2">
      <section className="space-y-2 rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-xs transition-all hover:border-[#CBD5E1]">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-xs">
              <Bell className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Organization Notification Matrix</h3>
              <p className="text-[10.5px] font-normal leading-relaxed text-[#64748B]">
                Every notification appears in the bell. Choose which ones are also sent by e-mail or WhatsApp to the person they are for.
              </p>
            </div>
          </div>
          {changed.length ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDraft({})} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
                <RotateCcw className="size-3.5" /> Undo
              </button>
              <button type="button" onClick={submit} disabled={save.isPending} className="inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null} Save {changed.length} change{changed.length > 1 ? "s" : ""}
              </button>
            </div>
          ) : null}
        </div>

        {routes.isLoading ? (
          <p className="flex items-center gap-2 px-1 py-4 text-[11.5px] text-[#64748B]"><Loader2 className="size-4 animate-spin" /> Loading notification channels…</p>
        ) : routes.error ? (
          <p className="px-1 py-4 text-[11.5px] text-[#B91C1C]">{errorText(routes.error, "Notification channels could not be loaded.")}</p>
        ) : (
          <div className="space-y-2">
            {!routes.data?.emailReady ? <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#92400E]">E-mail is not set up on this server, so e-mail notifications are recorded as “Not sent”.</p> : null}
            {GROUPS.map((group) => {
              const rows = events.filter((e) => e.group === group.key);
              if (!rows.length) return null;
              return (
                <div key={group.key} className="space-y-1.5">
                  <div className="px-1">
                    <h4 className="text-[12px] font-bold text-[#1E293B]">{group.label}</h4>
                    <p className="text-[10px] font-normal text-[#64748B]">{group.desc}</p>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[#CBD5E1] bg-[#F8FAFD] shadow-2xs">
                    <table className="w-full min-w-[500px] text-left">
                      <thead className="border-b border-[#CBD5E1] bg-[#F8FAFD]">
                        <tr className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">
                          <th className="min-w-[220px] px-3.5 py-2.5">Event</th>
                          <ChannelHead dot="bg-blue-500" label="Bell" />
                          <ChannelHead dot="bg-indigo-500" label="Email" />
                          <ChannelHead dot="bg-emerald-500" label="WhatsApp" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] bg-white">
                        {rows.map((e) => {
                          const note = e.notes.email ?? (!whatsappReady ? null : e.notes.whatsapp) ?? null;
                          return (
                            <tr key={e.key} className="transition-colors hover:bg-slate-50/70">
                              <td className="min-w-[220px] px-3.5 py-2.5">
                                <div className="text-[11.5px] font-bold leading-tight text-[#1E293B]">{e.title}</div>
                                <p className="mt-0.5 text-[9.5px] font-normal leading-snug text-[#64748B]">{e.description}</p>
                                {note ? <p className="mt-0.5 flex items-start gap-1 text-[9.5px] leading-snug text-[#92400E]"><Info className="mt-px size-3 shrink-0" />{note}</p> : null}
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <div className="flex items-center justify-center" title="Every notification appears in the bell">
                                  <Switch checked disabled aria-label={`${e.title}: bell (always on)`} />
                                </div>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <div className="flex items-center justify-center" title={e.locked.includes("email") ? e.notes.email : undefined}>
                                  <Switch checked={value(e, "email")} onCheckedChange={(v) => toggle(e, "email", v)} disabled={!canEdit || e.locked.includes("email")} aria-label={`${e.title}: e-mail`} />
                                </div>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <div className="flex items-center justify-center" title={whatsappReady ? "Sent to the number in each person’s profile" : "WhatsApp is not set up on this server yet."}>
                                  <Switch checked={value(e, "whatsapp")} onCheckedChange={(v) => toggle(e, "whatsapp", v)} disabled={!canEdit || !whatsappReady || e.locked.includes("whatsapp")} aria-label={`${e.title}: WhatsApp`} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <p className="flex items-start gap-1.5 px-1 text-[10.5px] text-[#64748B]">
              <MessageCircle className="mt-px size-3.5 shrink-0 text-[#10B981]" />
              {whatsappReady
                ? "WhatsApp messages go to the phone number each person saved in My Profile (avatar menu, top right). People without a number get the bell and e-mail only."
                : "WhatsApp is not set up on this server yet, so the WhatsApp switches are off."}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white shadow-xs">
              <Mail className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Recent E-Mail & WhatsApp Deliveries</h3>
              <p className="text-[10.5px] font-normal text-[#64748B]">What was sent, to whom, and whether it went through. Failed sends are retried up to three times.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10.5px]">
            {(["sent", "failed", "skipped", "queued"] as const).map((s) => (
              <span key={s} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ring-1 ring-inset ${STATUS[s].cls}`}>
                {week[s] ?? 0} {STATUS[s].label.toLowerCase()}
              </span>
            ))}
            <span className="self-center text-[#94A3B8]">last 7 days</span>
          </div>
        </div>
        {deliveries.isLoading ? (
          <p className="flex items-center gap-2 px-1 py-3 text-[11.5px] text-[#64748B]"><Loader2 className="size-4 animate-spin" /> Loading deliveries…</p>
        ) : deliveries.error ? (
          <p className="px-1 py-3 text-[11.5px] text-[#B91C1C]">{errorText(deliveries.error, "Deliveries could not be loaded.")}</p>
        ) : deliveries.data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[11px]">
              <thead className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="px-2 py-1.5">When</th>
                  <th className="px-2 py-1.5">Notification</th>
                  <th className="px-2 py-1.5">To</th>
                  <th className="px-2 py-1.5">Channel</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {deliveries.data.items.map((d) => {
                  const st = STATUS[d.status];
                  return (
                    <tr key={d.id} className="align-top">
                      <td className="whitespace-nowrap px-2 py-1.5 text-[#64748B]">{formatRelative(d.sentAt ?? d.createdAt)}</td>
                      <td className="px-2 py-1.5 font-medium text-[#1E293B]">{d.title}</td>
                      <td className="px-2 py-1.5 normal-case text-[#475569]" title={d.recipientEmail}>{d.recipient}</td>
                      <td className="px-2 py-1.5 text-[#475569]">{d.channel === "email" ? "E-mail" : "WhatsApp"}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${st.cls}`}>
                          <st.icon className={`size-3 ${d.status === "sending" ? "animate-spin" : ""}`} /> {st.label}
                        </span>
                        {d.error ? <p className="mt-0.5 max-w-[320px] text-[10px] leading-snug text-[#94A3B8]">{d.error}</p> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-1 py-3 text-[11.5px] text-[#64748B]">Nothing has been sent by e-mail or WhatsApp yet. Deliveries appear here as soon as a notification goes out.</p>
        )}
      </section>
    </div>
  );
}
