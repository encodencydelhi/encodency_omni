import { readCampaignCsv } from "./creation-model";
import { readDevelopmentDraft, writeDevelopmentDraft } from "./draft-storage";

export type DemoStatus = "Draft" | "Scheduled" | "Completed" | "Approved" | "Pending" | "Rejected" | "Read" | "Delivered" | "Failed" | "Queued" | "Sending" | "Sent" | "Outcome Unknown" | "Active" | "Paused" | "Cancelled";
export interface Contact { id: string; name: string; phone: string; tags: string[]; consent: boolean; assignedMembershipId?: string|null; suppressed?:boolean; agent: string; notes: string; attributes?: Record<string, string>; }
export interface Message { id: string; contactId: string; body: string; outgoing: boolean; status: DemoStatus; time: string; createdAt?: string; attachment?: string; mediaId?: string; templateId?: string; parameters?: Record<string,string>; kind?: string; failureCode?:string; idempotencyKey?: string; }
export interface TemplateAction { id: string; type: "URL" | "Phone" | "Quick Reply" | "Copy Code" | "Flow" | "Catalog"; label: string; value: string; urlType?: "Static" | "Dynamic"; track?: boolean; trackTarget?: string; }
export interface CarouselCard {type:"Image"|"Video";body:string;mediaId:string;actions:{type:"URL"|"Quick Reply";label:string;value:string}[];}
export interface Template { id: string; name: string; category: string; language: string; header: string; body: string; footer: string; button: string; buttonType: string; buttonTarget: string; sample: string; variables?: Record<string, string>; status: DemoStatus; type?: "Text" | "Image" | "Video" | "File" | "Location"; actions?: TemplateAction[]; limitedTimeOffer?: { text: string; hasExpiration: boolean; offerHours?: number }; location?: { latitude: number; longitude: number; name: string; address: string }; mediaName?: string; mediaPreview?: string; mediaId?:string; timezone?:string; layout?:"Standard"|"Carousel";cards?:CarouselCard[];authentication?:{otpType:"COPY_CODE"|"ONE_TAP"|"ZERO_TAP";zeroTapTermsAccepted?:boolean;securityRecommendation:boolean;expirationMinutes:number;packageName?:string;signatureHash?:string}; }
export interface FollowUpStep { afterHours: number; condition: "NOT_READ" | "NO_REPLY" | "NO_CLICK" | "ALWAYS"; templateId: string; parameters: Record<string, string>; parameterFallbacks: Record<string, string>; mediaId?: string | null; }
export interface Campaign { id: string; name: string; status: DemoStatus; audience: string[]; templateId: string; scheduledAt: string; sent: number; read: number; kind?: "Broadcast" | "API"; parameters?: Record<string, string>; parameterFallbacks?: Record<string, string>; manualRecipients?: string[]; retryCount?: number; retryInterval?: string; mediaName?: string; testPhone?: string; consentConfirmed?: boolean; mediaPreview?: string; mediaId?:string; timezone?:string; followUps?: FollowUpStep[]; recurrence?: { frequency: "DAILY" | "WEEKLY" | "MONTHLY"; runs: number; until?: string } | null; }
export interface WorkflowNode { id: string; kind: "Trigger" | "Condition" | "Message" | "Assignment" | "Handoff" | "Delay" | "Template" | "Contact"; label: string; value: string; nextId?: string; matchId?: string; fallbackId?: string; operator?: "Contains" | "Equals" | "Does Not Contain"; }
export interface Workflow { id: string; name: string; nodes: WorkflowNode[]; }
export interface FlowField { id: string; label: string; type: "Text" | "Email" | "Select" | "Number" | "Phone" | "TextArea" | "Radio" | "Date"; required: boolean; options: string; }
export interface FlowScreen { id: string; title: string; fields: FlowField[]; route?:{fieldId:string;equals:string;matchScreenId:string;fallbackScreenId:string}; }
export interface Flow { id: string; name: string; screens: FlowScreen[]; dataExchange?:boolean;status?:string;version?:number;providerFailure?:string; }
export interface Media { id: string; name: string; type: string; size: string; url?: string; }
export interface SendRules { marketingPerDay: number; marketingPerWeek: number; campaignPerMinute: number; quietHours: { start: string; end: string; timezone: string } | null; }
export interface ContactFieldDef { key: string; label: string; }
export interface CannedReply { id: string; title: string; body: string; }
export interface Settings { business: string; description: string; email: string; phone: string; notifications: boolean; twoFactor: boolean; budget: number; role: string; sendRules?: SendRules; cannedReplies?: CannedReply[]; autoAssign?: boolean; contactFields?: ContactFieldDef[]; }
export interface Workspace { agents?: {id:string;name:string;userId?:string}[]; contacts: Contact[]; messages: Message[]; campaigns: Campaign[]; templates: Template[]; workflows: Workflow[]; flows: Flow[]; media: Media[]; settings: Settings; replyDrafts?: Record<string, string>; }
export interface WhatsAppDemoAdapter { load(scope: string): Workspace; save(scope: string, data: Workspace): void; restore?(scope: string): void; }
export const integrationNotice = "Coming After Meta Integration";
export function seedWorkspace(scope: string): Workspace {
  const offset = Array.from(scope).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 5;
  const names = ["Aarav Sharma", "Meera Kapoor", "Rohan Shah", "Priya Nair", "Ananya Rao", "Kabir Singh"];
  const contacts = names.slice(offset).concat(names.slice(0, offset)).map((name, i) => ({ id: `c${i}`, name, phone: `+91900000010${i}`, tags: [i % 2 ? "New Lead" : "VIP"], consent: i !== 4, agent: i % 2 ? "Neha" : "Arjun", notes: "Demo contact. Interested in the November collection." }));
  return {
    contacts,
    messages: contacts.flatMap((c, i) => [{ id: `m${i}`, contactId: c.id, body: "Hi, can you share details about the new collection?", outgoing: false, status: "Read" as const, time: "10:24", createdAt: new Date(Date.now() - (i === 1 ? 26 : 2) * 60 * 60 * 1000).toISOString() }, { id: `r${i}`, contactId: c.id, body: `Hello ${c.name.split(" ")[0]}! Happy to help with your request.`, outgoing: true, status: i === 3 ? "Failed" as const : "Delivered" as const, time: "10:25" }]),
    templates: [...["November Welcome", "Order Update", "Login Verification"].map((name, i) => ({ id: `t${i}`, name, category: ["Marketing", "Utility", "Authentication"][i] ?? "Marketing", language: "English", header: "A Little Something For You", body: "Hello {{1}}, thank you for choosing us. Explore our November collection today.", footer: "Reply STOP to opt out", button: "View Collection", buttonType: "URL", buttonTarget: "https://example.com/collection", sample: contacts[0]?.name ?? "Aarav", status: ["Approved", "Pending", "Rejected"][i] as DemoStatus })), { id: "t3", name: "collection_image", category: "Marketing", language: "English", type: "Image", header: "", body: "Hello {{1}}, take a look at our new collection. Thank you!", footer: "Reply STOP To Opt Out", sample: "Aarav", variables: { "1": "Aarav" }, button: "View Collection", buttonType: "URL", buttonTarget: "https://example.com/collection", mediaName: "Demo Collection Banner.png", status: "Approved" }],
    campaigns: [{ id: "ca1", name: "November Collection", status: "Completed", audience: contacts.filter(c => c.consent).map(c => c.id), templateId: "t0", scheduledAt: "2026-11-01T10:00", sent: 1240 + offset * 70, read: 986 + offset * 40 }, { id: "ca2", name: "Loyalty Rewards", status: "Draft", audience: [], templateId: "t0", scheduledAt: "", sent: 0, read: 0 }],
    workflows: [{ id: "w1", name: "Welcome And Route", nodes: [{ id: "n1", kind: "Trigger", label: "Incoming Message", value: "hello" }, { id: "n2", kind: "Message", label: "Welcome Reply", value: "Welcome! How can we help?" }, { id: "n3", kind: "Assignment", label: "Assign To Agent", value: "Neha" }] }],
    flows: [{ id: "f1", name: "Product Enquiry", screens: [{ id: "s1", title: "Your Details", fields: [{ id: "fi1", label: "Name", type: "Text", required: true, options: "" }, { id: "fi2", label: "Email", type: "Email", required: true, options: "" }] }] }],
    media: [{ id: "a1", name: "Collection Guide.pdf", type: "Document", size: "240 KB" }, { id: "a2", name: "Welcome Audio.mp3", type: "Audio", size: "810 KB" }, { id: "a3", name: "Product Showcase.mp4", type: "Video", size: "2.4 MB" }, { id: "a4", name: "November Banner.png", type: "Image", size: "164 KB" }],
    settings: { business: "Demo Business", description: "Thoughtful products and friendly service.", email: "hello@example.com", phone: "+919000000100", notifications: true, twoFactor: false, budget: 5000, role: "Administrator" },
  };
}
// Deliberately memory-only: no provider, HTTP, credentials, or production storage.
const workspaces = new Map<string, Workspace>();
const restoredScopes = new Set<string>();
export const recoveryWarnings = new Map<string, string>();
const workspaceListeners = new Map<string, Set<() => void>>();
export function subscribeDemoWorkspace(scope: string, listener: () => void): () => void {
  const listeners = workspaceListeners.get(scope) ?? new Set<() => void>();
  listeners.add(listener);
  workspaceListeners.set(scope, listeners);
  return () => { listeners.delete(listener); if (!listeners.size) workspaceListeners.delete(scope); };
}
export const demoAdapter: WhatsAppDemoAdapter = {
  load(scope) { const current = workspaces.get(scope); if (current) return current; const seed = seedWorkspace(scope); workspaces.set(scope, seed); return seed; },
  save(scope, data) { workspaces.set(scope, data); if (typeof window !== "undefined" && process.env.NODE_ENV === "development") { try { const saved = writeDevelopmentDraft(window.sessionStorage, scope, data, true); if (!saved) recoveryWarnings.set(scope, "Development draft recovery is unavailable or full. Current-page changes still work."); else recoveryWarnings.delete(scope); } catch { recoveryWarnings.set(scope, "Development draft recovery is unavailable. Current-page changes still work."); } } workspaceListeners.get(scope)?.forEach(listener => listener()); },
  restore(scope) { if (typeof window === "undefined" || process.env.NODE_ENV !== "development" || restoredScopes.has(scope)) return; restoredScopes.add(scope); try { const saved = readDevelopmentDraft(window.sessionStorage, scope, true); if (saved) { workspaces.set(scope, saved); workspaceListeners.get(scope)?.forEach(listener => listener()); } } catch { /* Storage can be disabled; memory mode stays available. */ } },
};
export const newId = () => globalThis.crypto.randomUUID();
export function campaignIssues(campaign: Pick<Campaign, "name" | "audience" | "scheduledAt">, scheduled: boolean): string[] {
  return [!campaign.name.trim() && "Enter A Campaign Name", !campaign.audience.length && "Select At Least One Consenting Contact", scheduled && (!campaign.scheduledAt || !Number.isFinite(new Date(campaign.scheduledAt).getTime()) || new Date(campaign.scheduledAt).getTime() <= Date.now()) && "Choose A Future Schedule"].filter((v): v is string => Boolean(v));
}
export function parseContactsCsv(text: string): Contact[] {
  const parsed=readCampaignCsv(text);const rows=[parsed.headers,...parsed.rows];
  if(text.length>100000||parsed.rows.length>1000)throw new Error("Import At Most 1,000 Contacts At Once.");
  if (rows[0]?.join(",").toLowerCase() !== "name,phone,consent") throw new Error("Use CSV Columns: name,phone,consent.");
  return rows.slice(1).filter(row => row.some(Boolean)).map((row, i) => {
    const [name = "", phone = "", consent = ""] = row;
    if (row.length !== 3 || !name || !/^\+\d{10,15}$/.test(phone) || !/^(true|false)$/i.test(consent)) throw new Error(`Invalid CSV Row ${i + 2}. Use An International Phone And true/false Consent.`);
    return { id: `csv-${i}-${phone}`, name, phone, consent: consent.toLowerCase() === "true", tags: ["Imported"], agent: "Unassigned", notes: "Imported In Demo" };
  });
}
