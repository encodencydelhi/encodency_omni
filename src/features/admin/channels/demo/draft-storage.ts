import { z } from "zod";
import type { Workspace } from "./mock-service";

const text = z.string().max(10000), id = z.string().max(200);
const status = z.enum(["Draft", "Scheduled", "Completed", "Approved", "Pending", "Rejected", "Read", "Delivered", "Failed"]);
const node = z.object({ id, kind: z.enum(["Trigger", "Condition", "Message", "Assignment", "Handoff"]), label: text, value: text, nextId: id.optional(), matchId: id.optional(), fallbackId: id.optional(), operator: z.enum(["Contains", "Equals", "Does Not Contain"]).optional() });
const field = z.object({ id, label: text, type: z.enum(["Text", "Email", "Select"]), required: z.boolean(), options: text });
const workspace = z.object({
  contacts: z.array(z.object({ id, name: text, phone: text, tags: z.array(text), consent: z.boolean(), agent: text, notes: text })),
  messages: z.array(z.object({ id, contactId: id, body: text, outgoing: z.boolean(), status, time: text, createdAt: text.optional(), attachment: text.optional() })),
  templates: z.array(z.object({ id, name: text, category: text, language: text, header: text, body: text, footer: text, button: text, buttonType: text, buttonTarget: text, sample: text, status, variables: z.record(text, text).optional(), type: z.enum(["Text", "Image", "Video", "File", "Location"]).optional(), limitedTimeOffer: z.object({ text, hasExpiration: z.boolean(), offerHours: z.number().optional() }).optional(), location: z.object({ latitude: z.number(), longitude: z.number(), name: text, address: text }).optional(), mediaName: text.optional(), actions: z.array(z.object({ id, type: z.enum(["URL", "Phone", "Quick Reply", "Copy Code", "Flow", "Catalog"]), label: text, value: text, urlType: z.enum(["Static", "Dynamic"]).optional() })).optional() })),
  campaigns: z.array(z.object({ id, name: text, status, audience: z.array(id), templateId: id, scheduledAt: text, sent: z.number().finite(), read: z.number().finite(), kind: z.enum(["Broadcast", "API"]).optional(), parameters: z.record(text, text).optional(), parameterFallbacks: z.record(text, text).optional(), manualRecipients: z.array(text).optional(), retryCount: z.number().finite().optional(), retryInterval: text.optional(), mediaName: text.optional(), testPhone: text.optional(), consentConfirmed: z.boolean().optional(), followUps: z.array(z.object({ afterHours: z.number().finite(), condition: z.enum(["NOT_READ", "NO_REPLY", "NO_CLICK", "ALWAYS"]), templateId: text, parameters: z.record(text, text), parameterFallbacks: z.record(text, text), mediaId: text.nullable().optional() })).optional(), recurrence: z.object({ frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]), runs: z.number().finite(), until: text.optional() }).nullable().optional() })),
  workflows: z.array(z.object({ id, name: text, nodes: z.array(node) })),
  flows: z.array(z.object({ id, name: text, screens: z.array(z.object({ id, title: text, fields: z.array(field) })) })),
  media: z.array(z.object({ id, name: text, type: text, size: text })),
  settings: z.object({ business: text, description: text, email: text, phone: text, notifications: z.boolean(), twoFactor: z.boolean(), budget: z.number().finite().nonnegative(), role: text }),
  replyDrafts: z.record(id, text).optional(),
});
const envelope = z.object({ version: z.literal(1), scope: z.string(), savedAt: z.number(), data: workspace });
export const draftStorageKey = (scope: string) => `omni:whatsapp-dev-draft:v1:${encodeURIComponent(scope)}`;
export function readDevelopmentDraft(storage: Pick<Storage, "getItem" | "removeItem">, scope: string, development: boolean, now = Date.now()): Workspace | null {
  if (!development) return null;
  try {
    const raw = storage.getItem(draftStorageKey(scope)); if (!raw || raw.length > 1000000) return null;
    const result = envelope.safeParse(JSON.parse(raw));
    if (!result.success || result.data.scope !== scope || now - result.data.savedAt > 12 * 60 * 60 * 1000 || result.data.savedAt > now + 60000) { storage.removeItem(draftStorageKey(scope)); return null; }
    return result.data.data;
  } catch { return null; }
}
export function writeDevelopmentDraft(storage: Pick<Storage, "setItem">, scope: string, data: Workspace, development: boolean, now = Date.now()): boolean {
  if (!development) return false;
  try {
    // Schema strips blob previews, media URLs and any unrecognised fields.
    const safe = workspace.parse(data);
    const raw = JSON.stringify({ version: 1, scope, savedAt: now, data: safe });
    if (raw.length > 1000000) return false;
    storage.setItem(draftStorageKey(scope), raw); return true;
  } catch { return false; }
}
