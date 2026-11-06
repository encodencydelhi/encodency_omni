"use client";
import { CampaignApiKeys } from './advanced-controls';
import { nativeWhatsAppEnabled } from "./native-api";
import { NativeActionButton, NativeCampaignTrigger } from "./native-operations";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { useWorkspaceAccess } from "./workspace-access";
import { Button } from "@/components/ui/button";
import { type Workspace, type Campaign, type Template } from "./mock-service";
import { Panel, Select, Badge, Modal, DataTable, FutureAction } from "./ui";
import { TemplatePhonePreview } from "./creation-shell";
import { campaignRecipients, editorHref } from "./creation-model";
import { LibraryList, TemplateDeleteButton } from "./template-extras";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";


function MessagePreview({ template }: { template?: Template }) {
  return template ? <TemplatePhonePreview template={template} /> : <p className="text-xs text-slate-400">Select A Template To Preview.</p>;
}
export function Campaigns({ data, query, scope }: { data: Workspace; query: string; scope: string }) {
  const access=useWorkspaceAccess();
  const [filter, setFilter] = useState("All");
  const [kind, setKind] = useState("All");
  const [templateFilter, setTemplateFilter] = useState("All");
  const [audienceFilter, setAudienceFilter] = useState("All");
  const [selectedDetail, setDetail] = useState<Campaign | null>(null);
  const detail=data.campaigns.find(item=>item.id===selectedDetail?.id)||selectedDetail;
  const campaigns = data.campaigns.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && (filter === "All" || c.status === filter) && (kind === "All" || (c.kind || "Broadcast") === kind) && (templateFilter === "All" || data.templates.find(t => t.id === c.templateId)?.name === templateFilter) && (audienceFilter === "All" || c.audience.some(id => data.contacts.some(contact => contact.id === id && contact.tags.includes(audienceFilter)))));
  return <>
    <Panel title="Campaigns" actions={access.canManage?<Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"><Link href={editorHref("campaigns")}><Plus />Create Campaign</Link></Button>:<Button size="sm" disabled>Create Campaign</Button>}>
      <div className="mb-3 flex flex-wrap items-end gap-2"><Select label="Campaign Type" value={kind} onChange={setKind} options={["All", "Broadcast", "API"]} /><Select label="Template" value={templateFilter} onChange={setTemplateFilter} options={["All", ...data.templates.map(t => t.name)]} /><Select label="Audience" value={audienceFilter} onChange={setAudienceFilter} options={["All", ...new Set(data.contacts.flatMap(c => c.tags))]} /><Select label="Status" value={filter} onChange={setFilter} options={["All", "Draft", "Scheduled", "Active", "Paused", "Cancelled", "Completed"]} /></div>
      <DataTable headers={["Campaign Name", "Type", "Status", "Final Audience", "Sent", "Read", "Actions"]} rows={campaigns.map(c => [c.name, c.kind || "Broadcast", <Badge key="status">{c.status}</Badge>, c.kind === "API" ? "At API Runtime" : campaignRecipients(data.contacts, c.audience, c.manualRecipients || []).phones.length, c.sent, c.read, <div key="actions" className="flex gap-2"><Button size="xs" variant="outline" onClick={() => setDetail(c)}>View Details</Button>{nativeWhatsAppEnabled && c.status !== "Draft" && <Button asChild size="xs" variant="outline"><Link href={`/admin/whatsapp/campaigns/${c.id}`}>Report</Link></Button>}{access.canManage && c.status !== "Completed" && <Button asChild size="xs" variant="outline"><Link href={editorHref("campaigns", c.id)}>Edit Draft</Link></Button>}</div>])} />
      <p className="mt-3 text-[11px] text-slate-400">{nativeWhatsAppEnabled?"Saved Campaigns Run Through The Queue For The Selected Client’s Connection. API Campaigns Require An Authorized Trigger.":"Demo Scheduled Campaigns Do Not Run Automatically."}</p>
    </Panel>
    <Modal title="Campaign Performance" open={!!detail} onClose={() => setDetail(null)}>{detail && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-3 text-sm"><p className="font-bold">{detail.name}</p><Badge>{detail.kind || "Broadcast"} · {detail.status}</Badge><p>Sent: {detail.sent} · Read: {detail.read}</p><p>Read Rate: {detail.sent ? Math.round(detail.read / detail.sent * 100) : 0}%</p><p>Schedule: {detail.scheduledAt || "Not Scheduled"}</p><p>Retries: {detail.retryCount || 0}</p><p className="text-xs text-slate-500">Audience: {data.contacts.filter(c => detail.audience.includes(c.id)).map(c => c.name).join(", ") || (detail.kind === "API" ? "Supplied At API Runtime" : "No Saved Contacts")}</p>{access.canManage && detail.status !== "Completed" && <Button asChild size="sm" variant="outline"><Link href={editorHref("campaigns", detail.id)}>Edit Draft</Link></Button>}{nativeWhatsAppEnabled?<div className="flex flex-wrap gap-2">{["Draft","Paused"].includes(detail.status)&&<NativeActionButton scope={scope} path={`/campaigns/${detail.id}/activate`} label="Activate Campaign" body={{confirm:true}} disabled={!access.canSend} confirmation="Activate this campaign for the selected client?"/>}{["Active","Scheduled"].includes(detail.status)&&<NativeActionButton scope={scope} path={`/campaigns/${detail.id}/pause`} label="Pause Campaign" disabled={!access.canSend}/>}{["Active","Scheduled","Paused"].includes(detail.status)&&<NativeActionButton scope={scope} path={`/campaigns/${detail.id}/cancel`} label="Cancel Campaign" disabled={!access.canSend} confirmation="Cancel the remaining campaign sends?"/>}<NativeActionButton scope={scope} path={`/campaigns/${detail.id}/duplicate`} label="Duplicate Campaign" disabled={!access.canManage}/></div>:<FutureAction label="Send Campaign"/>}</div><div className="space-y-3"><MessagePreview template={data.templates.find(t => t.id === detail.templateId)} />{nativeWhatsAppEnabled&&detail.kind==="API"&&detail.status==="Active"&&access.canSend&&<><NativeCampaignTrigger scope={scope} data={data} campaignId={detail.id} templateId={detail.templateId}/><CampaignApiKeys key={`${scope}:${detail.id}`} scope={scope} campaignId={detail.id}/></>}</div></div>}</Modal>
  </>;
}
export function Templates({ data, query, scope }: { data: Workspace; query: string; scope: string }) {
  const access=useWorkspaceAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("All");
  const [language, setLanguage] = useState("All");
  const [status, setStatus] = useState("All");
  const [preview, setPreview] = useState<Template | null>(null);
  const [library, setLibrary] = useState(false);
  const statuses = ["All", "Approved", "Pending", "Action Required", "Drafts"];
  const matchesStatus = (template: Template) => status === "All" || (status === "Drafts" ? template.status === "Draft" : status === "Action Required" ? template.status === "Rejected" : template.status === status);
  const templates = data.templates.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) && (category === "All" || t.category === category) && (language === "All" || t.language === language) && matchesStatus(t));
  return <>
    <Panel title="Template Messages" actions={<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setLibrary(true)}><BookOpen />Template Library</Button><Button asChild size="sm" aria-disabled={!access.canManage} className={`bg-emerald-600 text-white hover:bg-emerald-700 ${!access.canManage?"pointer-events-none opacity-50":""}`}><Link tabIndex={access.canManage?0:-1} href={editorHref("templates")}><Plus />Create Template</Link></Button></div>}>
      <nav aria-label="Template Approval Status" className="mb-3 flex gap-5 overflow-x-auto border-b border-slate-200">{statuses.map(item => <button key={item} onClick={() => setStatus(item)} aria-current={status === item ? "page" : undefined} className={`shrink-0 border-b-2 pb-2 text-xs font-semibold ${status === item ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500"}`}>{item} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{data.templates.filter(t => item === "All" || (item === "Drafts" ? t.status === "Draft" : item === "Action Required" ? t.status === "Rejected" : t.status === item)).length}</span></button>)}</nav>
      <div className="mb-3 flex flex-wrap gap-2"><Select label="Category" value={category} onChange={setCategory} options={["All", "Marketing", "Utility", "Authentication"]} /><Select label="Language" value={language} onChange={setLanguage} options={["All", ...new Set(data.templates.map(t => t.language))]} /></div>
      <DataTable headers={["Template Name", "Category", "Type", "Language", "Status", "Actions"]} rows={templates.map(t => [t.name, t.category, t.type || "Text", t.language, <Badge key="status">{t.status}</Badge>, <div key="actions" className="flex gap-2"><Button size="xs" variant="outline" onClick={() => setPreview(t)}>Preview</Button><Button asChild size="xs" variant="outline" aria-disabled={!access.canManage} className={!access.canManage?"pointer-events-none opacity-50":""}><Link tabIndex={access.canManage?0:-1} href={editorHref("templates", t.id)}>{t.status === "Draft" ? "Edit Draft" : "Duplicate"}</Link></Button>{t.status !== "Draft" && <Button asChild size="xs" variant="outline" aria-disabled={!access.canManage} className={!access.canManage?"pointer-events-none opacity-50":""}><Link tabIndex={access.canManage?0:-1} href={`${editorHref("templates", t.id)}&mode=language`}>Add Language</Link></Button>}<TemplateDeleteButton scope={scope} template={t} disabled={!access.canConfigure} onDone={() => void queryClient.invalidateQueries({ queryKey: ["whatsapp-native", scope] })} /></div>])} />
      <p className="mt-3 text-[11px] text-slate-400">{nativeWhatsAppEnabled?"Statuses Come From This Client’s Provider. Simulated Approval Is Not Meta Approval.":"Approval Statuses Are Demo Examples."}</p>
    </Panel>
    <Modal title="Template Preview" open={!!preview} onClose={() => setPreview(null)}>{preview && <><div className="flex flex-wrap gap-2"><Badge>{preview.status}</Badge><Badge>{preview.category}</Badge><Badge>{preview.language}</Badge></div>{preview.status === "Rejected" && <p className="text-xs text-rose-600">Review The Category And Message Content Before Creating A New Draft.</p>}<TemplatePhonePreview template={preview} /><div className="flex flex-wrap gap-3"><Button asChild size="sm" variant="outline" aria-disabled={!access.canManage} className={!access.canManage?"pointer-events-none opacity-50":""}><Link tabIndex={access.canManage?0:-1} href={editorHref("templates", preview.id)}>{preview.status === "Draft" ? "Edit Draft" : "Use As New Template"}</Link></Button>{nativeWhatsAppEnabled?<><NativeActionButton scope={scope} path="/templates/sync" label="Sync Approval Status" disabled={!access.canConfigure}/>{preview.status==="Draft"&&<NativeActionButton scope={scope} path={`/templates/${preview.id}/submit`} label="Submit For Review" disabled={!access.canConfigure}/>}</>:<FutureAction label="Sync Approval Status"/>}</div></>}</Modal>
    <Modal title="Template Library" open={library} onClose={() => setLibrary(false)}><LibraryList scope={scope} onPick={(item) => router.push(`${editorHref("templates")}?library=${encodeURIComponent(item.id)}`)} /></Modal>
  </>;
}
