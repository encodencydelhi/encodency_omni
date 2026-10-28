"use client";
import { useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { Panel } from "@/features/companies/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { describeError, privacyDownloadPath, useConfiguration, usePrivacyRequests, useSettingsMutations } from "../data/hooks";
import type { PrivacyRequestSummary } from "../data/types";

export function PrivacyRequests() {
  const mutations = useSettingsMutations();
  const { user } = useAuth();
  const query = usePrivacyRequests();
  const config = useConfiguration();
  const [creating, setCreating] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [selected, setSelected] = useState<PrivacyRequestSummary | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canRequest = config.data?.values["privacy.export.requesters"] === "staff_on_request";
  if (!query.data?.length && !canRequest) return null;
  return <>
    <Panel title="Privacy Requests" description="Exports expire automatically. Company closure follows the platform archival policy.">
      {canRequest ? <Button variant="outline" size="sm" onClick={() => { setCreating(true); setReason(""); setError(null); }}>Request Company Export</Button> : null}
      <div className="space-y-1">{(query.data ?? []).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-2xs">
        <div><p className="font-medium">{row.kind === "export" ? "Company Export" : "Company Closure"} · {row.state.replaceAll("_", " ")}</p><p className="text-muted-foreground">{row.companyId}</p>{row.error ? <p role="alert" className="text-danger">{row.error}</p> : null}</div>
        <Button variant="ghost" size="sm" onClick={() => { setSelected(row); setReason(""); setError(null); }}>Details</Button>
      </div>)}</div>
    </Panel>
    <Dialog open={creating} onOpenChange={(open) => !open && !busy && setCreating(false)}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Request Company Export</DialogTitle><DialogDescription>Record the company identifier and the reason for this request.</DialogDescription></DialogHeader>
      <Label htmlFor="export-company">Company ID</Label><Input id="export-company" value={companyId} onChange={(event) => setCompanyId(event.target.value)} />
      <Label htmlFor="export-reason">Reason</Label><Textarea id="export-reason" maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
      {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
      <DialogFooter><Button disabled={busy || !reason.trim() || !companyId.trim()} onClick={async () => { setBusy(true); setError(null); try { await mutations.requestCompanyExport(companyId.trim(), reason); setCreating(false); setCompanyId(""); } catch (failure) { setError(describeError(failure).message); } finally { setBusy(false); } }}>Submit Request</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !busy && setSelected(null)}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Privacy Request</DialogTitle><DialogDescription>{selected?.reason}</DialogDescription></DialogHeader>
      {selected?.state === "pending_approval" && selected.requestedBy !== user?.id ? <>
        <Label htmlFor="privacy-review-reason">Review reason</Label><Textarea id="privacy-review-reason" maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
        <DialogFooter>{(["approve", "reject"] as const).map((decision) => <Button key={decision} disabled={busy || !reason.trim()} variant={decision === "approve" ? "default" : "destructive"} onClick={async () => {
          setBusy(true); setError(null);
          try { await mutations.reviewPrivacyRequest(selected.id, decision, reason); setSelected(null); }
          catch (failure) { setError(describeError(failure).message); } finally { setBusy(false); }
        }}>{decision === "approve" ? "Approve Request" : "Reject Request"}</Button>)}</DialogFooter>
      </> : null}
      {selected?.kind === "export" && selected.state === "completed" && selected.requestedBy === user?.id ? <Button asChild><a href={privacyDownloadPath(selected.id)}>Download Export</a></Button> : null}
      {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
    </DialogContent></Dialog>
  </>;
}
