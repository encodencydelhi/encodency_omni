"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import { nativeScopeHeaders } from "./native-api";
import { Badge, Field, Panel } from "./ui";

/**
 * WhatsApp Groups (needs an Official Business Account). Create a group, share its invite link (people join only by the
 * link), approve join requests, send messages and read replies. Results from Meta arrive by webhook.
 */
interface GroupRow { id: string; subject: string; description: string | null; status: string; inviteLink: string | null; participantCount: number; joinApprovalMode: string; errorCode: string | null; createdAt: string }
interface GroupMessage { id: string; direction: "INBOUND" | "OUTBOUND"; body: string; fromName: string | null; createdAt: string }
interface JoinRequest { joinRequestId: string; userId: string | null; waId: string | null; username: string | null }

const root = "/integrations/whatsapp/v2/groups";
const call = <T,>(scope: string, method: "GET" | "POST" | "DELETE", path: string, body?: unknown) => apiClient.request<T>({ method, path: root + path, body, headers: nativeScopeHeaders(scope) });
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : "Something went wrong. Please try again.");

function GroupDetail({ scope, group, onChanged }: { scope: string; group: GroupRow; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const messages = useQuery({ queryKey: ["whatsapp-groups", scope, group.id, "messages"], queryFn: () => call<{ items: GroupMessage[] }>(scope, "GET", `/${group.id}/messages`), refetchInterval: 15_000 });
  const requests = useQuery({ queryKey: ["whatsapp-groups", scope, group.id, "requests"], queryFn: () => call<{ items: JoinRequest[] }>(scope, "GET", `/${group.id}/join-requests`), enabled: group.status === "ACTIVE" && group.joinApprovalMode === "approval_required" });
  const send = useMutation({ mutationFn: () => call(scope, "POST", `/${group.id}/messages`, { body: text.trim() }), onSuccess: () => { setText(""); void queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", scope, group.id] }); }, onError: (error) => toast.error(message(error)) });
  const reset = useMutation({ mutationFn: () => call(scope, "POST", `/${group.id}/invite-link/reset`), onSuccess: () => { toast.success("New invite link created. The old link no longer works."); onChanged(); }, onError: (error) => toast.error(message(error)) });
  const decide = useMutation({ mutationFn: (input: { id: string; decision: "approve" | "reject" }) => call(scope, "POST", `/${group.id}/join-requests`, { joinRequestIds: [input.id], decision: input.decision }), onSuccess: () => void requests.refetch(), onError: (error) => toast.error(message(error)) });
  const remove = useMutation({ mutationFn: () => call(scope, "DELETE", `/${group.id}`), onSuccess: () => { toast.success("Group deleted."); onChanged(); }, onError: (error) => toast.error(message(error)) });
  return (
    <Panel title={group.subject} actions={<Badge>{group.status}</Badge>}>
      {group.status === "CREATING" && <p className="text-xs text-slate-500">Waiting for WhatsApp to confirm the group…</p>}
      {group.status === "FAILED" && <p className="text-xs font-semibold text-red-700">WhatsApp could not create this group: {group.errorCode}</p>}
      {group.status === "SUSPENDED" && <p className="text-xs font-semibold text-red-700">WhatsApp has suspended this group.</p>}
      {group.inviteLink && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold">Invite Link:</span>
          <code className="rounded bg-slate-100 px-1.5 py-0.5">{group.inviteLink}</code>
          <Button type="button" size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(group.inviteLink ?? ""); toast.success("Invite link copied."); }}>Copy</Button>
          <Button type="button" size="sm" variant="outline" disabled={reset.isPending} onClick={() => reset.mutate()}>New Link</Button>
          <span className="text-slate-500">{group.participantCount} joined · People can join only by this link.</span>
        </div>
      )}
      {requests.data?.items.length ? (
        <div className="mb-3 space-y-1 text-xs">
          <p className="font-semibold">Join Requests</p>
          {requests.data.items.map((request) => (
            <div key={request.joinRequestId} className="flex items-center gap-2">
              <span>{request.username || request.waId || request.userId}</span>
              <Button type="button" size="sm" onClick={() => decide.mutate({ id: request.joinRequestId, decision: "approve" })}>Approve</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => decide.mutate({ id: request.joinRequestId, decision: "reject" })}>Reject</Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-slate-100 p-2 text-xs">
        {messages.data?.items.length === 0 && <p className="text-slate-500">No messages yet.</p>}
        {[...(messages.data?.items ?? [])].reverse().map((item) => (
          <p key={item.id} className={item.direction === "OUTBOUND" ? "text-right" : ""}>
            <span className={item.direction === "OUTBOUND" ? "inline-block rounded bg-emerald-50 px-2 py-1" : "inline-block rounded bg-slate-100 px-2 py-1"}>{item.direction === "INBOUND" && <strong>{item.fromName || "Member"}: </strong>}{item.body}</span>
          </p>
        ))}
      </div>
      {group.status === "ACTIVE" && (
        <div className="mt-2 flex gap-2">
          <Input value={text} onChange={(event) => setText(event.target.value)} maxLength={4096} placeholder="Message the group" />
          <Button type="button" disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>Send</Button>
        </div>
      )}
      {group.status !== "DELETED" && <div className="mt-3 text-right"><Button type="button" size="sm" variant="outline" disabled={remove.isPending} onClick={() => { if (window.confirm("Delete this group? Everyone, including the business, is removed.")) remove.mutate(); }}>Delete Group</Button></div>}
    </Panel>
  );
}

export function NativeGroups({ scope }: { scope: string }) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [approval, setApproval] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const groups = useQuery({ queryKey: ["whatsapp-groups", scope], queryFn: () => call<{ items: GroupRow[] }>(scope, "GET", ""), refetchInterval: 15_000 });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", scope] });
  const create = useMutation({ mutationFn: () => call<GroupRow>(scope, "POST", "", { subject: subject.trim(), joinApprovalMode: approval ? "approval_required" : "auto_approve" }), onSuccess: (group) => { toast.success("Group requested. WhatsApp confirms it in a moment."); setSubject(""); setSelected(group.id); refresh(); }, onError: (error) => toast.error(message(error)) });
  const active = groups.data?.items.find((group) => group.id === selected) ?? groups.data?.items[0];
  return (
    <div className="space-y-3">
      <Panel title="New Group">
        <p className="mb-2 text-xs text-slate-500">Needs an Official Business Account. Groups are small (WhatsApp limits the number of members) and are best for support or VIP circles, not broadcasts.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Group Name"><Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={128} className="w-64" /></Field>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><input type="checkbox" checked={approval} onChange={(event) => setApproval(event.target.checked)} /> Approve each join request</label>
          <Button type="button" disabled={!subject.trim() || create.isPending} onClick={() => create.mutate()}>Create Group</Button>
        </div>
      </Panel>
      {groups.isError && <p className="text-xs font-semibold text-red-700">{message(groups.error)}</p>}
      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <Panel title="Groups" actions={<Badge>{groups.data?.items.length ?? 0}</Badge>}>
          <ul className="space-y-1 text-xs">
            {groups.data?.items.length === 0 && <li className="text-slate-500">No groups yet.</li>}
            {groups.data?.items.map((group) => <li key={group.id}><button type="button" onClick={() => setSelected(group.id)} className={`w-full rounded px-2 py-1 text-left ${active?.id === group.id ? "bg-emerald-50 font-semibold" : "hover:bg-slate-50"}`}>{group.subject}<span className="ms-1 text-[10px] text-slate-500">{group.status}</span></button></li>)}
          </ul>
        </Panel>
        {active ? <GroupDetail key={active.id} scope={scope} group={active} onChanged={refresh} /> : <div />}
      </div>
    </div>
  );
}
