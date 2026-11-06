"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { nativeWhatsAppApi, nativeWhatsAppEnabled } from "./native-api";
import { CreationShell } from "./creation-shell";
import { CreationSession } from "./creation-session";
import { editorHref } from "./creation-model";
import { Badge, DataTable, Field, Modal, Panel, Select, downloadCsv } from "./ui";

const FILTERS = ["All", "Sent", "Delivered", "Read", "Failed", "Pending", "Suppressed", "Cancelled"] as const;
const RETARGETS: { label: string; segment: "FAILED" | "NOT_DELIVERED" | "NOT_READ" | "READ_NO_REPLY" | "REPLIED" | "CLICKED" }[] = [
  { label: "Failed (Retry Safely)", segment: "FAILED" },
  { label: "Sent, Not Delivered", segment: "NOT_DELIVERED" },
  { label: "Delivered, Not Read", segment: "NOT_READ" },
  { label: "Read, No Reply", segment: "READ_NO_REPLY" },
  { label: "Replied", segment: "REPLIED" },
  { label: "Clicked A Button Or Link", segment: "CLICKED" },
];
const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN") : "—");

export function CampaignReportPage({ id }: { id: string }) {
  return <CreationSession>{(scope) => <CampaignReport key={`${scope}:${id}`} scope={scope} id={id} />}</CreationSession>;
}

function CampaignReport({ scope, id }: { scope: string; id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retarget, setRetarget] = useState<string>("Failed (Retry Safely)");
  const [testing, setTesting] = useState(false);
  const [phone, setPhone] = useState("");
  const [own, setOwn] = useState(false);
  const [busy, setBusy] = useState(false);
  const limit = 25;
  const report = useQuery({
    queryKey: ["whatsapp-campaign-report", scope, id],
    queryFn: () => nativeWhatsAppApi.campaignReport(scope, id),
    refetchInterval: (query) => (["ACTIVE", "SCHEDULED"].includes(query.state.data?.campaign.status ?? "") ? 5000 : false),
  });
  const rows = useQuery({
    queryKey: ["whatsapp-campaign-recipients", scope, id, filter, search, page],
    queryFn: () => nativeWhatsAppApi.campaignRecipients(scope, id, { page, limit, status: filter.toUpperCase(), query: search.trim() || undefined }),
    refetchInterval: ["ACTIVE", "SCHEDULED"].includes(report.data?.campaign.status ?? "") ? 5000 : false,
  });
  const estimate = useQuery({ queryKey: ["whatsapp-campaign-estimate", scope, id], queryFn: () => nativeWhatsAppApi.campaignEstimate(scope, id) });
  const data = report.data, funnel = data?.funnel;
  const cards: [string, number | undefined, number | undefined][] = [
    ["Recipients", funnel?.total, undefined], ["Sent", funnel?.sent, undefined], ["Delivered", funnel?.delivered, data?.rates.delivery],
    ["Read", funnel?.read, data?.rates.read], ["Replied", funnel?.replied, data?.rates.reply], ["Clicked", funnel?.clicked, data?.rates.click], ["Failed", funnel?.failed, data?.rates.failure],
  ];
  const run = async (work: () => Promise<void>, failure: string) => { setBusy(true); try { await work(); } catch (error) { toast.error(error instanceof Error ? error.message : failure); } finally { setBusy(false); } };
  const totalPages = Math.max(1, Math.ceil((rows.data?.total ?? 0) / limit));
  return (
    <CreationShell title={data?.campaign.name ?? "Campaign Report"} section="Campaigns">
      {report.error ? <p role="alert" className="p-4 text-sm text-rose-700">{report.error.message}</p> : report.isLoading || !data ? <p role="status" className="p-4 text-sm">Loading Campaign Report...</p> : (
        <div className="space-y-2">
          <Panel title="Campaign Funnel" actions={<div className="flex flex-wrap items-center gap-2"><Badge>{data.campaign.status}</Badge><Badge>{data.origin === "SIMULATED" ? "Simulated" : "Live"}</Badge></div>}>
            <p className="mb-3 text-xs text-slate-500">Template: {data.campaign.template ? `${data.campaign.template.name} (${data.campaign.template.category})` : "—"} · Replies Count Within {data.replyWindowDays} Days Of The Message.</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7">
              {cards.map(([label, value, rate]) => (
                <div key={label} className="rounded border border-slate-200 bg-white p-2">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
                  <p className="text-lg font-bold">{value ?? 0}</p>
                  {rate !== undefined && <p className="text-[10px] text-slate-500">{rate}%</p>}
                </div>
              ))}
            </div>
            {!!funnel?.pending && <p className="mt-2 text-xs text-slate-500">{funnel.pending} Still Waiting To Be Sent.</p>}
            {!!data.buttons.length && (
              <div className="mt-3"><DataTable headers={["Button", "Type", "Taps", "People"]} rows={data.buttons.map((item) => [item.label || "—", item.kind === "URL_CLICK" ? "Link Click" : "Quick Reply", item.events, item.contacts])} /></div>
            )}
            {!!data.failureReasons.length && (
              <div className="mt-3"><DataTable headers={["Failure Reason", "Code", "Messages"]} rows={data.failureReasons.map((item) => [item.reason, item.code ?? "—", item.count])} /></div>
            )}
          </Panel>

          <div className="grid gap-2 lg:grid-cols-2">
            <Panel title="Before You Send">
              {estimate.data && (
                <p className="mb-3 text-xs text-slate-600">
                  {estimate.data.recipients} Eligible Recipients · {estimate.data.available && estimate.data.totalMinor !== null ? `Estimated ${formatCurrency(estimate.data.totalMinor, estimate.data.currency ?? "INR")} (${formatCurrency(estimate.data.perMessageMinor ?? 0, estimate.data.currency ?? "INR")} Per ${estimate.data.category ?? "Message"})` : "Estimate Unavailable"}. {estimate.data.note}
                </p>
              )}
              <Button size="sm" variant="outline" disabled={!nativeWhatsAppEnabled} onClick={() => setTesting(true)}>Send Test Message</Button>
              <p className="mt-2 text-[10px] text-slate-500">A Test Goes To One Number Only And Is Not Counted In This Campaign.</p>
            </Panel>
            <Panel title="Follow Up">
              <div className="flex flex-wrap items-end gap-2">
                <Select label="Message Again To" value={retarget} options={RETARGETS.map((item) => item.label)} onChange={setRetarget} />
                <Button size="sm" disabled={busy} onClick={() => void run(async () => {
                  const item = RETARGETS.find((entry) => entry.label === retarget)!;
                  const created = await nativeWhatsAppApi.campaignRetarget(scope, id, { segment: item.segment });
                  toast.success(`Draft Created For ${created.recipients} Contacts`);
                  router.push(editorHref("campaigns", created.id));
                }, "Could not create the follow-up campaign.")}>Create Follow-Up Draft</Button>
              </div>
              {nativeWhatsAppEnabled && <div className="mt-3"><Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { const result = await nativeWhatsAppApi.stopCampaignSeries(scope, id); toast.success(result.stoppedJobs ? `Stopped ${result.stoppedJobs} Pending Follow-Up, Retry Or Repeat` : "Nothing Was Pending"); void queryClient.invalidateQueries({ queryKey: ["whatsapp-campaign-report", scope, id] }); }, "Could not stop the follow-ups.")}>Stop Follow-Ups And Repeats</Button></div>}
              <p className="mt-2 text-[10px] text-slate-500">Creates A Draft With The Same Template. Contacts Who Opted Out Are Left Out, And Consent Is Checked Again When You Activate It. Unknown Send Results Are Never Included.</p>
            </Panel>
          </div>

          <Panel title="Recipients" actions={<div className="flex flex-wrap items-end gap-2">
            <Select label="Status" value={filter} options={FILTERS} onChange={(value) => { setFilter(value as (typeof FILTERS)[number]); setPage(1); }} />
            <Field label="Search"><Input value={search} placeholder="Name Or Phone" onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></Field>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { const file = await nativeWhatsAppApi.campaignExport(scope, id); downloadCsv(file.filename, file.rows); }, "Export failed.")}>Export CSV</Button>
          </div>}>
            {rows.error ? <p role="alert" className="text-xs text-rose-700">{rows.error.message}</p> : (
              <DataTable headers={["Contact", "Phone", "Status", "Reason", "Last Update"]} rows={(rows.data?.items ?? []).map((item) => [item.name || "—", item.phone, <Badge key="s">{item.status}</Badge>, item.failureReason || "—", when(item.lastStatusAt)])} />
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{rows.data?.total ?? 0} Recipients · Page {page} Of {totalPages}</span>
              <span className="flex gap-2"><Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="xs" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button></span>
            </div>
          </Panel>
          <Link href="/admin/whatsapp?section=Campaigns" className="inline-block text-xs text-emerald-700">Back To Campaigns</Link>
        </div>
      )}
      <Modal title="Send Test Message" open={testing} onClose={() => setTesting(false)}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await nativeWhatsAppApi.campaignTest(scope, id, { phone: phone.trim(), ownNumberConfirmed: own });
          toast.success("Test Message Queued");
          setTesting(false); setPhone(""); setOwn(false);
          void queryClient.invalidateQueries({ queryKey: ["whatsapp-campaign-report", scope, id] });
        }, "Test send failed."); }}>
          <Field label="WhatsApp Number (With Country Code)"><Input required value={phone} placeholder="+919876543210" onChange={(event) => setPhone(event.target.value)} /></Field>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={own} onChange={(event) => setOwn(event.target.checked)} />This Is My Own Number Or A Test Number That Agreed To Receive It. (Needed For A Number Not Already In Contacts.)</label>
          <Button type="submit" size="sm" disabled={busy || !phone.trim()}>Send Test</Button>
        </form>
      </Modal>
    </CreationShell>
  );
}
