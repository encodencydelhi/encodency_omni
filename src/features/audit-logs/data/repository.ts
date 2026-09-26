/**
 * The one seam between the Audit Logs UI and wherever audit records live.
 *
 *   Today:  UI -> hooks -> auditRepository -> demo provider (events derived from the modules' own histories)
 *   Later:  UI -> hooks -> auditRepository -> authenticated backend audit service
 *
 * Components never import a provider or a mock event array. When mock mode is off the
 * repository resolves to a provider that refuses to invent events. There is no method to
 * edit or delete an audit event, in either provider: original events are append-only.
 */
import { AUDIT_MOCK_MODE } from "./config";
import { mockAuditProvider } from "./mock-provider";
import { apiAuditProvider } from "./api-provider";
import { unavailableAuditProvider } from "./unavailable-provider";
import type {
  ActivityPoint,
  AuditEvent,
  AuditOverview,
  CreateInvestigationInput,
  DateWindow,
  Environment,
  EventDetail,
  EventFacets,
  EventPage,
  EventQuery,
  ExportRequest,
  ExportResult,
  Investigation,
  InvestigationDetail,
  InvestigationList,
  InvestigationPriority,
  InvestigationQuery,
  InvestigationStatus,
  MutationActor,
  OwnerOption,
  SensitiveCategory,
  SettingsData,
} from "./types";

export interface ScopeOption {
  id: string;
  name: string;
  clients: Array<{ id: string; name: string }>;
}

export interface LinkCheck {
  ok: boolean;
  duplicate: boolean;
  message: string;
}

export interface AddEventsResult {
  investigation: Investigation;
  added: string[];
  skipped: Array<{ eventId: string; reason: string }>;
}

export interface SecurityCounts {
  authentication: number;
  user_access: number;
  staff: number;
  policies: number;
}

export interface AuditRepository {
  readonly mode: "live" | "mock" | "unavailable";
  getOverview(window: DateWindow, environment: Environment | null): Promise<AuditOverview>;
  getActivity(window: DateWindow, metric: string, environment: Environment | null): Promise<{ unit: "hour" | "day" | "week"; points: ActivityPoint[] }>;
  listEvents(query: EventQuery): Promise<EventPage>;
  getFacets(): Promise<EventFacets>;
  getScopeOptions(): Promise<ScopeOption[]>;
  getEvent(id: string): Promise<EventDetail>;
  getSecurityCounts(window: DateWindow): Promise<SecurityCounts>;
  getSensitiveCounts(window: DateWindow): Promise<Record<SensitiveCategory, number>>;
  getSettings(): Promise<SettingsData>;
  exportEvents(request: ExportRequest, actor: MutationActor): Promise<ExportResult>;

  listInvestigations(query: InvestigationQuery): Promise<InvestigationList>;
  getInvestigation(id: string): Promise<InvestigationDetail>;
  listOwners(): Promise<OwnerOption[]>;
  createInvestigation(input: CreateInvestigationInput, actor: MutationActor): Promise<Investigation>;
  checkLink(investigationId: string, eventId: string): Promise<LinkCheck>;
  addEvents(investigationId: string, eventIds: string[], note: string, actor: MutationActor): Promise<AddEventsResult>;
  unlinkEvent(investigationId: string, eventId: string, actor: MutationActor): Promise<Investigation>;
  editRelevance(investigationId: string, eventId: string, note: string, actor: MutationActor): Promise<Investigation>;
  addNote(investigationId: string, text: string, actor: MutationActor, correctsNoteId?: string | null): Promise<Investigation>;
  changeOwner(investigationId: string, ownerId: string, reason: string, actor: MutationActor): Promise<Investigation>;
  changeStatus(investigationId: string, status: InvestigationStatus, actor: MutationActor): Promise<Investigation>;
  changePriority(investigationId: string, priority: InvestigationPriority, actor: MutationActor): Promise<Investigation>;
  closeInvestigation(investigationId: string, input: { reason: string; conclusion: string }, actor: MutationActor): Promise<Investigation>;
  resetDemoData?(): Promise<void>;
}

export type { AuditEvent };
export const auditRepository: AuditRepository = AUDIT_MOCK_MODE ? mockAuditProvider : apiAuditProvider;
