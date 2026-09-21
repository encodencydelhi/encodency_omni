/**
 * The Audit Logs frontend state: investigations and the audit events created by this module's
 * own exports. Audit events themselves are never stored here - they are derived from the
 * records the other modules own - so nothing in this file can edit or delete one.
 * Persisted to sessionStorage only once something changes.
 */
import { DEMO_CLOCK_ANCHOR } from "@/features/companies/data/config";
import { STAFF } from "@/features/companies/data/mock/dataset";
import { SESSION_STORAGE_KEYS } from "./config";
import { caseId } from "./investigation-policies";
import type { AuditEvent, EventScope, Investigation, InvestigationActivity } from "./types";

interface State {
  investigations: Investigation[];
  exportEvents: AuditEvent[];
  seq: number;
  noteSeq: number;
  activitySeq: number;
  exportSeq: number;
}

interface Persisted extends State {
  v: 1;
}

let current: State | null = null;

const at = (hoursAgo: number) => new Date(DEMO_CLOCK_ANCHOR - hoursAgo * 3_600_000).toISOString();
const staffName = (id: string) => STAFF.find((member) => member.id === id)?.name ?? id;
const PLATFORM: EventScope = { level: "platform", companyId: null, companyName: null, clientId: null, clientName: null };

function seedInvestigations(events: readonly AuditEvent[]): Investigation[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const link = (id: string, by: string, hoursAgo: number, note: string) => (byId.has(id) ? [{ eventId: id, linkedBy: staffName(by), linkedAt: at(hoursAgo), note }] : []);
  let n = 0;
  const act = (id: string, hoursAgo: number, actor: string, kind: InvestigationActivity["kind"], summary: string, context: string | null = null): InvestigationActivity => ({ id: `ia_seed_${id}_${(n += 1)}`, at: at(hoursAgo), actor: staffName(actor), kind, summary, context });

  const emergency = events.find((event) => event.actionKey === "feature_flag.emergency_disabled") ?? events.find((event) => event.priority === "high");
  const refundCompany = byId.get("aud_seed_044")?.scope ?? PLATFORM;
  const emergencyLinks = emergency ? [{ eventId: emergency.id, linkedBy: staffName("stf_001"), linkedAt: at(20), note: "The emergency disable that started this review." }] : [];

  return [
    {
      id: caseId(1), title: "Repeated failed sign-ins on a platform staff account", description: "Three failed sign-in attempts for one staff account within a few minutes, followed by an automatic lockout. Review whether the attempts came from an expected location.",
      scope: PLATFORM, ownerId: "stf_003", ownerName: staffName("stf_003"), priority: "elevated", status: "in_review", createdBy: staffName("stf_001"), createdAt: at(10), updatedAt: at(7), closedAt: null, closure: null,
      links: [...link("aud_seed_010", "stf_003", 9.9, "First attempt."), ...link("aud_seed_011", "stf_003", 9.9, "Second attempt, same address."), ...link("aud_seed_012", "stf_003", 9.9, "Third attempt."), ...link("aud_seed_013", "stf_003", 9.8, "Automatic lockout.")],
      notes: [{ id: "note_seed_1", author: staffName("stf_003"), authorId: "stf_003", at: at(7), type: "note", text: "All three attempts came from one address that is not in the staff location list. Waiting to hear whether the account owner was travelling.", correctsNoteId: null }],
      activity: [act("1", 10, "stf_001", "created", "Investigation created", "Opened from the lockout event."), act("1", 9.9, "stf_003", "event_linked", "4 events linked"), act("1", 9, "stf_001", "owner_changed", `Owner set to ${staffName("stf_003")}`), act("1", 7, "stf_003", "note_added", "Note added"), act("1", 7, "stf_003", "status_changed", "Status changed to In Review", "Open to In Review")],
      relatedReference: null,
    },
    {
      id: caseId(2), title: "Duplicate-charge refund review", description: "Routine review of a refund that went through request, approval and gateway confirmation, to confirm the approval trail is complete.",
      scope: refundCompany, ownerId: "stf_005", ownerName: staffName("stf_005"), priority: "normal", status: "open", createdBy: staffName("stf_005"), createdAt: at(50), updatedAt: at(48), closedAt: null, closure: null,
      links: [...link("aud_seed_044", "stf_005", 49, "Request."), ...link("aud_seed_045", "stf_005", 49, "Approval by a second person."), ...link("aud_seed_046", "stf_005", 49, "Gateway confirmation.")],
      notes: [], activity: [act("2", 50, "stf_005", "created", "Investigation created"), act("2", 49, "stf_005", "event_linked", "3 events linked")], relatedReference: null,
    },
    {
      id: caseId(3), title: "Emergency disable of a production feature", description: "A production feature was emergency disabled. Confirm the reason, the affected companies and whether it should be restored.",
      scope: PLATFORM, ownerId: "stf_001", ownerName: staffName("stf_001"), priority: "high", status: "awaiting_information", createdBy: staffName("stf_001"), createdAt: at(20), updatedAt: at(12), closedAt: null, closure: null,
      links: emergencyLinks,
      notes: [{ id: "note_seed_2", author: staffName("stf_001"), authorId: "stf_001", at: at(12), type: "note", text: "Asked the owning team for the incident summary before deciding whether to restore.", correctsNoteId: null }],
      activity: [act("3", 20, "stf_001", "created", "Investigation created"), act("3", 20, "stf_001", "event_linked", "1 event linked"), act("3", 12, "stf_001", "note_added", "Note added"), act("3", 12, "stf_001", "status_changed", "Status changed to Awaiting Information", "Open to Awaiting Information")],
      relatedReference: null,
    },
    {
      id: caseId(4), title: "Platform role change review", description: "Access review of a temporary elevation to Super Admin, from request through application.",
      scope: PLATFORM, ownerId: "stf_002", ownerName: staffName("stf_002"), priority: "normal", status: "closed", createdBy: staffName("stf_002"), createdAt: at(70), updatedAt: at(40), closedAt: at(40),
      closure: { reason: "Review complete", conclusion: "The change followed the approval process: requested by one Super Admin, approved by another and applied automatically. A follow-up review is scheduled for the end of the leave period.", closedBy: staffName("stf_002") },
      links: [...link("aud_seed_021", "stf_002", 69, "Request."), ...link("aud_seed_022", "stf_002", 69, "Approval."), ...link("aud_seed_023", "stf_002", 69, "Application.")],
      notes: [{ id: "note_seed_3", author: staffName("stf_002"), authorId: "stf_002", at: at(41), type: "note", text: "Approval came from a different person than the requester, as required.", correctsNoteId: null }],
      activity: [act("4", 70, "stf_002", "created", "Investigation created"), act("4", 69, "stf_002", "event_linked", "3 events linked"), act("4", 41, "stf_002", "note_added", "Note added"), act("4", 40, "stf_002", "closed", "Investigation closed", "Review complete")],
      relatedReference: null,
    },
    {
      id: caseId(5), title: "Provider scope change and reauthorization requests", description: "Track the Meta provider configuration change and the reauthorization requests it caused, including a delay in when the requests were recorded.",
      scope: PLATFORM, ownerId: "stf_003", ownerName: staffName("stf_003"), priority: "normal", status: "open", createdBy: staffName("stf_003"), createdAt: at(12), updatedAt: at(11), closedAt: null, closure: null,
      links: [...link("aud_seed_050", "stf_003", 11.5, "The configuration change."), ...link("aud_seed_051", "stf_003", 11.5, "Recorded about three hours after it occurred."), ...link("aud_seed_052", "stf_003", 11.5, "Same workflow.")],
      notes: [], activity: [act("5", 12, "stf_003", "created", "Investigation created"), act("5", 11.5, "stf_003", "event_linked", "3 events linked")], relatedReference: null,
    },
  ];
}

function fromScratch(events: readonly AuditEvent[]): State {
  const investigations = seedInvestigations(events);
  return { investigations, exportEvents: [], seq: investigations.length, noteSeq: 10, activitySeq: 100, exportSeq: 0 };
}

function load(events: readonly AuditEvent[]): State {
  if (typeof window === "undefined") return fromScratch(events);
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.state);
    if (!raw) return fromScratch(events);
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed.v !== 1 || !parsed.investigations || !parsed.exportEvents) return fromScratch(events);
    return { investigations: parsed.investigations, exportEvents: parsed.exportEvents, seq: parsed.seq ?? parsed.investigations.length, noteSeq: parsed.noteSeq ?? 10, activitySeq: parsed.activitySeq ?? 100, exportSeq: parsed.exportSeq ?? 0 };
  } catch {
    return fromScratch(events);
  }
}

function persist(state: State): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.state, JSON.stringify({ v: 1, ...state } satisfies Persisted));
  } catch {
    // Storage may be blocked or full; the in-memory state is still correct.
  }
}

/** The store, initialised on first use. `events` only seeds the demo investigations' links. */
export function state(events: readonly AuditEvent[]): State {
  current ??= load(events);
  return current;
}

export const nextCase = (store: State) => caseId((store.seq += 1));
export const nextId = (store: State, kind: "note" | "activity" | "export") => {
  if (kind === "note") return `note_${(store.noteSeq += 1)}`;
  if (kind === "activity") return `ia_${(store.activitySeq += 1)}`;
  return `${(store.exportSeq += 1)}`;
};

export function save(store: State): void {
  persist(store);
}

export function resetAuditState(): void {
  current = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.state);
    } catch {
      // ignore
    }
  }
}
