"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import { nativeScopeHeaders } from "./native-api";
import { Badge, Field, Panel } from "./ui";

/**
 * WhatsApp voice calls. The audio runs here in the browser (WebRTC, microphone permission needed); Media360 only passes the
 * session description to WhatsApp and records the call. Customers call the business number; calling a customer needs
 * the customer's permission first.
 */
interface CallRow { id: string; direction: "USER_INITIATED" | "BUSINESS_INITIATED"; status: string; contactId: string | null; fromWaId: string | null; callerName: string | null; startedAt: string | null; endedAt: string | null; durationSeconds: number | null; errorCode: string | null; createdAt: string; offerSdp?: string | null; answerSdp?: string | null }
interface ContactOption { id: string; name: string; phone: string; consent: boolean; suppressed?: boolean }

const root = "/integrations/whatsapp/v2/calls";
const call = <T,>(scope: string, method: "GET" | "POST" | "PUT", path: string, body?: unknown, query?: Record<string, string>) => apiClient.request<T>({ method, path: root + path, body, query, headers: nativeScopeHeaders(scope) });
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : error instanceof Error ? error.message : "Something went wrong. Please try again.");
const FALLBACK_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

/** Resolves once the browser has gathered its network candidates (or after 4 seconds), so the SDP is complete. */
function gathered(pc: RTCPeerConnection) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timer = setTimeout(resolve, 4000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(timer); resolve(); } });
  });
}

export function NativeCalls({ scope, contacts }: { scope: string; contacts: ContactOption[] }) {
  const queryClient = useQueryClient();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  // STUN/TURN servers from the platform; TURN lets calls connect behind strict office/mobile networks.
  const ice = useQuery({ queryKey: ["whatsapp-calls", scope, "ice"], queryFn: () => call<{ iceServers: RTCIceServer[]; relay: boolean }>(scope, "GET", "/ice-servers"), staleTime: 30 * 60_000, retry: false });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const media = {
    start: async () => {
      const local = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = local;
      const peer = new RTCPeerConnection({ iceServers: ice.data?.iceServers?.length ? ice.data.iceServers : FALLBACK_ICE });
      local.getTracks().forEach((track) => peer.addTrack(track, local));
      peer.ontrack = (event) => { const element = audioRef.current; if (element) { element.srcObject = event.streams[0] ?? null; void element.play().catch(() => undefined); } };
      pcRef.current = peer;
      return peer;
    },
    stop: () => { pcRef.current?.close(); pcRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; },
  };
  useEffect(() => () => { pcRef.current?.close(); streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [contactId, setContactId] = useState("");
  const [permission, setPermission] = useState<string | null>(null);
  const open = useQuery({ queryKey: ["whatsapp-calls", scope, "open"], queryFn: () => call<{ items: CallRow[] }>(scope, "GET", "", undefined, { view: "open" }), refetchInterval: 3000 });
  const history = useQuery({ queryKey: ["whatsapp-calls", scope, "all"], queryFn: () => call<{ items: CallRow[] }>(scope, "GET", "", undefined, { view: "all" }), refetchInterval: 15_000 });
  const settings = useQuery({ queryKey: ["whatsapp-calls", scope, "settings"], queryFn: () => call<{ enabled: boolean; callbackPermission: boolean }>(scope, "GET", "/settings"), retry: false });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["whatsapp-calls", scope] });
  const toggle = useMutation({ mutationFn: (enabled: boolean) => call(scope, "PUT", "/settings", { enabled, callbackPermission: true }), onSuccess: () => { toast.success("Calling settings sent to WhatsApp. It can take a while to show in WhatsApp."); refresh(); }, onError: (error) => toast.error(message(error)) });

  const ringing = open.data?.items.find((row) => row.direction === "USER_INITIATED" && row.status === "RINGING" && row.offerSdp);
  const current = open.data?.items.find((row) => row.id === activeCall);
  // A call we joined that is no longer open has ended on the other side.
  const onCall = Boolean(activeCall && current);
  const answerSdp = current?.direction === "BUSINESS_INITIATED" ? current.answerSdp : null;

  // For a call we placed: apply WhatsApp's answer as soon as it arrives.
  useEffect(() => {
    const peer = pcRef.current;
    if (!peer || !answerSdp || peer.remoteDescription) return;
    void peer.setRemoteDescription({ type: "answer", sdp: answerSdp }).catch((error) => toast.error(message(error)));
  }, [answerSdp]);
  // Release the microphone once the call is gone.
  useEffect(() => {
    if (activeCall && open.data && !current) { pcRef.current?.close(); pcRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
  }, [activeCall, open.data, current]);

  const answer = async (row: CallRow) => {
    try {
      const peer = await media.start();
      await peer.setRemoteDescription({ type: "offer", sdp: row.offerSdp ?? "" });
      await peer.setLocalDescription(await peer.createAnswer());
      await gathered(peer);
      await call(scope, "POST", `/${row.id}/accept`, { sdp: peer.localDescription?.sdp ?? "" });
      setActiveCall(row.id);
    } catch (error) { media.stop(); toast.error(message(error)); }
    refresh();
  };
  const decline = async (row: CallRow) => { try { await call(scope, "POST", `/${row.id}/reject`); } catch (error) { toast.error(message(error)); } refresh(); };
  const hangUp = async () => { if (activeCall) { try { await call(scope, "POST", `/${activeCall}/terminate`); } catch (error) { toast.error(message(error)); } } media.stop(); setActiveCall(null); refresh(); };
  const dial = async () => {
    try {
      const peer = await media.start();
      await peer.setLocalDescription(await peer.createOffer({ offerToReceiveAudio: true }));
      await gathered(peer);
      const created = await call<CallRow>(scope, "POST", "/outbound", { contactId, sdp: peer.localDescription?.sdp ?? "" });
      setActiveCall(created.id);
    } catch (error) { media.stop(); toast.error(message(error)); }
    refresh();
  };
  const ask = async () => { try { await call(scope, "POST", "/permission-requests", { contactId, body: "May we call you on WhatsApp about your request?" }); toast.success("Permission request sent. The customer chooses in WhatsApp."); } catch (error) { toast.error(message(error)); } };
  const check = async () => { try { const result = await call<{ status: string; canCall: boolean | null }>(scope, "GET", `/permissions/${contactId}`); setPermission(`${result.status.replace("_", " ")}${result.canCall === false ? " · cannot call right now" : ""}`); } catch (error) { toast.error(message(error)); } };
  const eligible = contacts.filter((contact) => contact.consent && !contact.suppressed);

  return (
    <div className="space-y-3">
      <audio ref={audioRef} autoPlay className="hidden" />
      {ringing && !onCall && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-900">Incoming WhatsApp call from {ringing.callerName || ringing.fromWaId || "a customer"}</p>
          <div className="flex gap-2"><Button type="button" onClick={() => void answer(ringing)}>Answer</Button><Button type="button" variant="outline" onClick={() => void decline(ringing)}>Decline</Button></div>
        </div>
      )}
      {onCall && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm">
          <p className="font-semibold text-blue-900">On a call · {current?.status ?? "CONNECTING"}</p>
          <Button type="button" variant="outline" onClick={() => void hangUp()}>Hang Up</Button>
        </div>
      )}
      <Panel title="Calling" actions={<Badge>{settings.data ? (settings.data.enabled ? "Enabled" : "Off") : "—"}</Badge>}>
        <p className="mb-2 text-xs text-slate-500">Customers can call this WhatsApp number while this page is open; you answer here with your microphone. Meta requires a messaging limit of 2,000 or more to turn calling on.</p>
        {ice.data && !ice.data.relay && <p className="mb-2 text-[11px] text-amber-700">No call relay (TURN) server is set up on the platform, so calls may not connect on some office or mobile networks.</p>}
        {settings.isError ? <p className="text-xs text-slate-500">Calling settings need the Admin or Owner role, or calling is not available for this number yet.</p> : (
          <Button type="button" variant="outline" disabled={!settings.data || toggle.isPending} onClick={() => toggle.mutate(!settings.data?.enabled)}>{settings.data?.enabled ? "Turn Calling Off" : "Turn Calling On"}</Button>
        )}
      </Panel>
      <Panel title="Call A Customer">
        <p className="mb-2 text-xs text-slate-500">WhatsApp lets you call a customer only after they give permission. Ask first (inside the 24-hour window), then call.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Customer"><select value={contactId} onChange={(event) => { setContactId(event.target.value); setPermission(null); }} className="h-9 rounded-md border border-slate-200 px-2 text-sm"><option value="">Choose a contact…</option>{eligible.map((contact) => <option key={contact.id} value={contact.id}>{contact.name || contact.phone} · {contact.phone}</option>)}</select></Field>
          <Button type="button" variant="outline" disabled={!contactId} onClick={() => void ask()}>Ask Permission</Button>
          <Button type="button" variant="outline" disabled={!contactId} onClick={() => void check()}>Check Permission</Button>
          <Button type="button" disabled={!contactId || onCall} onClick={() => void dial()}>Call</Button>
          {permission && <span className="text-xs font-semibold text-slate-700">Permission: {permission}</span>}
        </div>
      </Panel>
      <Panel title="Call History" actions={<Badge>{history.data?.items.length ?? 0}</Badge>}>
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] uppercase text-slate-500"><tr><th className="py-1">When</th><th>Who</th><th>Direction</th><th>Result</th><th>Length</th></tr></thead>
          <tbody>
            {history.data?.items.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="py-1">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                <td>{row.callerName || row.fromWaId || "—"}</td>
                <td>{row.direction === "USER_INITIATED" ? "Incoming" : "Outgoing"}</td>
                <td className={row.status === "MISSED" || row.status === "FAILED" ? "font-semibold text-red-700" : ""}>{row.status.toLowerCase()}{row.errorCode ? ` · ${row.errorCode}` : ""}</td>
                <td>{row.durationSeconds ? `${Math.floor(row.durationSeconds / 60)}:${String(row.durationSeconds % 60).padStart(2, "0")}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
