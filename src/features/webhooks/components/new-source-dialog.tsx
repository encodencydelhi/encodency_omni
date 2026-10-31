/**
 * Media360 - Super Admin Webhooks Module
 * Creates an incoming source: a signed receiver URL for an outside system (a website form, Zapier, another product).
 * The signing secret is returned once, so it stays in this dialog until the person confirms they saved it.
 */

"use client";

import { CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copyOneTimeSecret } from "../data/copy-secret";
import { useWebhookMutation } from "../data/hooks";
import { webhooksRepository } from "../data/repository";
import type { CreateSourceInput, IncomingSource } from "../data/types";
import { Mono, Notice } from "./kit";
import { useWebhookData } from "./webhooks-context";

const EVENT_HELP: Record<string, string> = {
  "lead.created": "Creates a CRM lead for a client of the chosen company.",
  "contact.created": "Adds a CRM contact (a person, not a sales lead) for a client of the chosen company.",
};
const SENDER_LABEL = /^[a-z0-9][a-z0-9_-]{1,59}$/;

export function NewSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { snapshot, environment } = useWebhookData();
  const processed = snapshot.inbox?.processedEventTypes ?? [];
  const [name, setName] = useState("");
  const [sender, setSender] = useState("");
  const [companyId, setCompanyId] = useState("");
  // `null` = untouched: every event type a processor handles starts ticked (the list arrives with the snapshot).
  const [picked, setPicked] = useState<string[] | null>(null);
  const events = picked ?? processed;
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ source: IncomingSource; secret: string } | null>(null);
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);

  const create = useWebhookMutation(environment, (input: CreateSourceInput) => webhooksRepository.createSource(environment, input));
  const nameError = touched && !name.trim() ? "Give the source a name." : null;
  const senderError = touched && !SENDER_LABEL.test(sender) ? "Use 2-60 lowercase letters, digits, - or _ (for example website-form)." : null;
  const companyError = touched && !companyId ? "Choose the company this source belongs to." : null;
  const eventsError = touched && events.length === 0 ? "Choose at least one event type." : null;
  // Only rendered after the person pressed Create, so this never runs during server rendering.
  const receiverUrl = created?.source.receiverPath ? new URL(created.source.receiverPath, window.location.origin).toString() : "";

  function finish() {
    setName(""); setSender(""); setCompanyId(""); setPicked(null); setTouched(false); setError(null); setCreated(null); setCopied(null);
    onOpenChange(false);
  }

  async function submit() {
    setTouched(true);
    if (!name.trim() || !SENDER_LABEL.test(sender) || !companyId || events.length === 0) return;
    setError(null);
    try {
      setCreated(await create.mutateAsync({ name: name.trim(), providerId: sender, companyId, supportedEventTypes: events }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The source could not be created.");
    }
  }

  async function copy(kind: "url" | "secret", value: string) {
    try {
      await copyOneTimeSecret(value);
      setCopied(kind);
    } catch {
      toast.error("Copy failed. Select the text in the box and copy it by hand.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) onOpenChange(true); else if (!created && !create.isPending) finish(); }}>
      <DialogContent
        className="max-w-lg"
        showClose={!created}
        onInteractOutside={(event) => { if (created || create.isPending) event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (created || create.isPending) event.preventDefault(); }}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Source created</DialogTitle>
              <DialogDescription>Give the sender the URL and the signing secret. The secret is shown only once and cannot be recovered; if it is lost, rotate it.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Receiver URL</Label>
                <code className="block select-all break-all rounded-sm border border-border bg-surface-sunken px-3 py-2 font-mono text-[0.8125rem]">{receiverUrl || created.source.receiverPath}</code>
                <Button variant="outline" size="sm" onClick={() => void copy("url", receiverUrl || created.source.receiverPath || "")}>{copied === "url" ? <CheckIcon /> : <CopyIcon />}{copied === "url" ? "Copied" : "Copy URL"}</Button>
              </div>
              <div className="space-y-1.5">
                <Label>Signing secret</Label>
                <code className="block select-all break-all rounded-sm border border-border bg-surface-sunken px-3 py-2 font-mono text-[0.8125rem]" data-testid="new-source-secret">{created.secret}</code>
                <Button variant="outline" size="sm" onClick={() => void copy("secret", created.secret)}>{copied === "secret" ? <CheckIcon /> : <CopyIcon />}{copied === "secret" ? "Copied" : "Copy secret"}</Button>
              </div>
              <Notice tone="info" title="How the sender signs">
                POST a JSON body of at most 64 KB with the header <Mono>X-Omni-Signature: sha256=&lt;HMAC-SHA256 of the raw body, keyed with the secret&gt;</Mono> and an event <Mono>id</Mono> in the body. The same id sent twice is processed once.
              </Notice>
            </div>
            <DialogFooter><Button onClick={finish}>I have saved the secret</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New incoming source</DialogTitle>
              <DialogDescription>A signed URL an outside system can send events to. Each event is verified, stored and then processed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="source-name">Name *</Label>
                <Input id="source-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(nameError)} placeholder="Website contact form" />
                {nameError ? <p className="text-2xs text-danger">{nameError}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source-sender">Sender label *</Label>
                <Input id="source-sender" value={sender} maxLength={60} onChange={(event) => setSender(event.target.value.toLowerCase())} aria-invalid={Boolean(senderError)} placeholder="website-form" />
                <p className="text-2xs text-muted-foreground">A short name for whatever sends the events. It is stored as the lead&apos;s source.</p>
                {senderError ? <p className="text-2xs text-danger">{senderError}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source-company">Company *</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger id="source-company" aria-invalid={Boolean(companyError)}><SelectValue placeholder="Choose a company" /></SelectTrigger>
                  <SelectContent>{snapshot.companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-2xs text-muted-foreground">Records created from these events always go to this company. The body of an event can never choose a different one.</p>
                {companyError ? <p className="text-2xs text-danger">{companyError}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Events this source accepts *</Label>
                {processed.length === 0 ? <p className="text-2xs text-muted-foreground">No event type can be processed yet.</p> : processed.map((type) => (
                  <div key={type} className="flex items-start gap-2">
                    <Checkbox id={`source-event-${type}`} checked={events.includes(type)} onCheckedChange={(value) => setPicked(value === true ? [...new Set([...events, type])] : events.filter((item) => item !== type))} />
                    <Label htmlFor={`source-event-${type}`} className="text-[0.8125rem] font-normal leading-snug"><span className="font-mono">{type}</span> <span className="text-muted-foreground">{EVENT_HELP[type] ?? ""}</span></Label>
                  </div>
                ))}
                {eventsError ? <p className="text-2xs text-danger">{eventsError}</p> : null}
              </div>
              {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={finish} disabled={create.isPending}>Cancel</Button>
              <Button onClick={() => void submit()} disabled={create.isPending}>{create.isPending ? <Loader2Icon className="animate-spin" /> : null}Create source</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
