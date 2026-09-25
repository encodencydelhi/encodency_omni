import { ApiError } from "@/types/api";
import type { MockRequestContext, MockRoutes } from "../lib/router";
import { mockDrafts } from "./content";

/**
 * TASK-11B scheduling & publishing routes.
 *
 * Mirrors the backend contract (encodency_omni_documents/05-api-contracts/
 * 08-content-campaigns.md): the same paths, the same `reason` discriminators on
 * 4xx bodies, the same `warnings` array on the 201 body, and the same
 * SCHEDULED/PUBLISHING/PUBLISHED/FAILED/OUTCOME_UNKNOWN/CANCELLED states.
 */

type Channel = "FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT" | "GOOGLE_BUSINESS_LOCATION" | "LINKEDIN_ORGANIZATION";
type Status = "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "OUTCOME_UNKNOWN" | "CANCELLED";

interface MockTarget {
  resourceMappingId: string;
  resourceType: Channel;
  externalResourceId: string;
  integrationId: string;
  provider: string;
  connectionStatus: "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR";
  /** Only read by the schedule handler to reproduce `token_expires_before_publish`. */
  tokenExpiresAt: Date | null;
  canRefreshToken: boolean;
  supported: boolean;
}

interface MockScheduledPost {
  id: string;
  clientId: string;
  draftId: string;
  variantId: string;
  channel: Channel;
  resourceMappingId: string;
  target: { resourceType: Channel; externalResourceId: string };
  content: string;
  draftRevision: number;
  draftChangedSinceScheduled: boolean;
  scheduledFor: string;
  status: Status;
  failureCode: string | null;
  lastErrorCode: string | null;
  externalPostId: string | null;
  attemptCount: number;
  publishedAt: string | null;
  cancelledAt: string | null;
  createdByUserId: string;
  cancelledByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

const MIN_LEAD_MS = 2 * 60 * 1000;
const MAX_HORIZON_MS = 180 * 24 * 60 * 60 * 1000;
const CHANNEL_MAX_LENGTH: Partial<Record<Channel, number>> = {
  LINKEDIN_ORGANIZATION: 3000,
  FACEBOOK_PAGE: 10000,
};

/** `clientId` used by the seeded draft fixtures; resolved from the draft row itself. */
const mockTargets: MockTarget[] = [
  {
    resourceMappingId: "map-fb-001",
    resourceType: "FACEBOOK_PAGE",
    externalResourceId: "104857600000001",
    integrationId: "int-meta-001",
    provider: "META",
    connectionStatus: "ACTIVE",
    tokenExpiresAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    canRefreshToken: false,
    supported: true,
  },
  {
    resourceMappingId: "map-fb-002",
    resourceType: "FACEBOOK_PAGE",
    externalResourceId: "104857600000002",
    integrationId: "int-meta-002",
    provider: "META",
    connectionStatus: "EXPIRED",
    tokenExpiresAt: null,
    canRefreshToken: false,
    supported: true,
  },
  {
    resourceMappingId: "map-li-001",
    resourceType: "LINKEDIN_ORGANIZATION",
    externalResourceId: "urn:li:organization:123456",
    integrationId: "int-li-001",
    provider: "LINKEDIN",
    connectionStatus: "ACTIVE",
    tokenExpiresAt: null,
    canRefreshToken: true,
    supported: true,
  },
  {
    resourceMappingId: "map-ig-001",
    resourceType: "INSTAGRAM_ACCOUNT",
    externalResourceId: "178414000000001",
    integrationId: "int-meta-003",
    provider: "META",
    connectionStatus: "ACTIVE",
    tokenExpiresAt: null,
    canRefreshToken: true,
    supported: false,
  },
];

const mockScheduledPosts: MockScheduledPost[] = [
  {
    id: "sp-seed-001",
    clientId: "moksha-sewa",
    draftId: "draft-001",
    variantId: "var-001-li",
    channel: "LINKEDIN_ORGANIZATION",
    resourceMappingId: "map-li-001",
    target: { resourceType: "LINKEDIN_ORGANIZATION", externalResourceId: "urn:li:organization:123456" },
    content: "Announcing the 2025 Clean Ganga initiative in partnership with local community leaders.",
    draftRevision: 1,
    draftChangedSinceScheduled: false,
    scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: "SCHEDULED",
    failureCode: null,
    lastErrorCode: null,
    externalPostId: null,
    attemptCount: 0,
    publishedAt: null,
    cancelledAt: null,
    createdByUserId: "user-dev-owner",
    cancelledByUserId: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function requireClientScope(headers?: Record<string, string>): { companyId: string; clientId: string } {
  const companyId = headers?.["x-company-id"];
  const clientId = headers?.["x-client-id"];
  if (!companyId) throw new ApiError({ code: "NO_COMPANY_SELECTED", status: 400, message: "Company context required" });
  if (!clientId) throw new ApiError({ code: "NO_CLIENT_SELECTED", status: 400, message: "Client context required" });
  return { companyId, clientId };
}

function conflict(reason: string, message: string, extra?: Record<string, unknown>): never {
  throw new ApiError({ code: "CONFLICT", status: 409, message, reason, details: extra });
}

function badRequest(reason: string | undefined, message: string, extra?: Record<string, unknown>): never {
  throw new ApiError({ code: "BAD_REQUEST", status: 400, message, reason, details: extra });
}

function notFound(message: string): never {
  throw new ApiError({ code: "NOT_FOUND", status: 404, message });
}

function findDraft(draftId: string, companyId: string, clientId: string) {
  return mockDrafts.find((d) => d.id === draftId && d.companyId === companyId && d.clientId === clientId) ?? null;
}

function findVariant(
  draftId: string,
  variantId: string,
  companyId: string,
  clientId: string,
): { channel: Channel; content: string; draftRevision: number } | null {
  const draft = findDraft(draftId, companyId, clientId);
  if (!draft) return null;
  const variant = draft.variants.find((v) => v.id === variantId);
  if (!variant) return null;
  return {
    channel: variant.channel,
    content: variant.effectiveContent,
    draftRevision: draft.revision,
  };
}

/** Backend PUBLISHABLE_CHANNELS — Instagram/Google Business need TASK-11C media. */
const PUBLISHABLE_CHANNELS: Channel[] = ["FACEBOOK_PAGE", "LINKEDIN_ORGANIZATION"];

function toTargetResponse(target: MockTarget) {
  const reason = !target.supported
    ? "channel_not_supported_yet"
    : target.connectionStatus !== "ACTIVE"
      ? "integration_reconnect_required"
      : null;
  return {
    resourceMappingId: target.resourceMappingId,
    resourceType: target.resourceType,
    externalResourceId: target.externalResourceId,
    integrationId: target.integrationId,
    provider: target.provider,
    connectionStatus: target.connectionStatus,
    publishable: reason === null,
    reason,
  };
}

function parseInstant(value: unknown, field: string): Date {
  const text = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(text)) {
    badRequest(undefined, `${field} must be an ISO 8601 date-time with an explicit offset, e.g. 2026-10-01T09:30:00+05:30.`);
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    badRequest(undefined, `${field} must be an ISO 8601 date-time with an explicit offset, e.g. 2026-10-01T09:30:00+05:30.`);
  }
  return parsed;
}

export const publishingRoutes: MockRoutes = {
  /* ── Publishing target discovery ── */
  "GET /content/drafts/:draftId/variants/:variantId/targets": ({ headers, params }: MockRequestContext) => {
    const { companyId, clientId } = requireClientScope(headers);
    const variant = findVariant(params.draftId!, params.variantId!, companyId, clientId);
    if (!variant) notFound("Variant not found");

    const items = mockTargets.filter((t) => t.resourceType === variant.channel).map(toTargetResponse);

    return { items };
  },

  /* ── Schedule creation ── */
  "POST /content/drafts/:draftId/variants/:variantId/schedule": ({ headers, params, body }: MockRequestContext) => {
    const { companyId, clientId } = requireClientScope(headers);
    const payload = (body ?? {}) as {
      resourceMappingId?: string;
      scheduledFor?: string;
      expectedDraftRevision?: number;
    };

    // Order mirrors ScheduledPostsService.schedule: window checks first, then
    // draft → variant → channel → revision → target → mismatch → reconnect →
    // length → duplicate, so the `reason` a caller sees matches the backend.
    const scheduledFor = parseInstant(payload.scheduledFor, "scheduledFor");
    const now = new Date();
    if (scheduledFor.getTime() < now.getTime() + MIN_LEAD_MS) {
      badRequest(undefined, "scheduledFor must be at least 2 minutes from now.");
    }
    if (scheduledFor.getTime() > now.getTime() + MAX_HORIZON_MS) {
      badRequest(undefined, "scheduledFor must be within 180 days from now.");
    }

    const draft = findDraft(params.draftId!, companyId, clientId);
    if (!draft) notFound("Draft not found");
    const variant = findVariant(params.draftId!, params.variantId!, companyId, clientId);
    if (!variant) notFound("Variant not found");

    if (!PUBLISHABLE_CHANNELS.includes(variant.channel)) {
      badRequest("channel_not_supported_yet", `Publishing to ${variant.channel} is not available yet.`);
    }

    if (typeof payload.expectedDraftRevision !== "number") {
      badRequest(undefined, "expectedDraftRevision must be an integer.");
    }
    if (payload.expectedDraftRevision !== variant.draftRevision) {
      conflict(
        "revision_conflict",
        "This draft was changed by someone else. Reload it before scheduling.",
        { currentRevision: variant.draftRevision },
      );
    }

    const target = mockTargets.find((t) => t.resourceMappingId === payload.resourceMappingId);
    if (!target) notFound("Publishing target not found");
    if (target.resourceType !== variant.channel) {
      badRequest("channel_mismatch", "This target does not match the variant’s channel.");
    }
    if (target.connectionStatus !== "ACTIVE") {
      conflict("integration_reconnect_required", "The connection for this target must be reconnected first.");
    }

    const max = CHANNEL_MAX_LENGTH[variant.channel];
    if (max !== undefined && variant.content.length > max) {
      badRequest("content_too_long_for_channel", `Content is too long for ${variant.channel} (max ${max} characters).`);
    }

    const duplicate = mockScheduledPosts.find(
      (p) =>
        p.variantId === params.variantId &&
        p.resourceMappingId === target.resourceMappingId &&
        (p.status === "SCHEDULED" || p.status === "PUBLISHING"),
    );
    if (duplicate) {
      conflict("already_scheduled", "This variant is already scheduled to this target.", {
        scheduledPostId: duplicate.id,
      });
    }

    const warnings: string[] = [];
    if (target.tokenExpiresAt && !target.canRefreshToken && target.tokenExpiresAt.getTime() <= scheduledFor.getTime()) {
      warnings.push("token_expires_before_publish");
    }

    const created: MockScheduledPost = {
      id: `sp-${Date.now().toString(36)}`,
      clientId,
      draftId: params.draftId!,
      variantId: params.variantId!,
      channel: variant.channel,
      resourceMappingId: target.resourceMappingId,
      target: { resourceType: target.resourceType, externalResourceId: target.externalResourceId },
      content: variant.content,
      draftRevision: variant.draftRevision,
      draftChangedSinceScheduled: false,
      scheduledFor: scheduledFor.toISOString(),
      status: "SCHEDULED",
      failureCode: null,
      lastErrorCode: null,
      externalPostId: null,
      attemptCount: 0,
      publishedAt: null,
      cancelledAt: null,
      createdByUserId: "user-dev-owner",
      cancelledByUserId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    mockScheduledPosts.unshift(created);
    return { ...created, warnings };
  },

  /* ── Scheduled-post list ── */
  "GET /content/scheduled-posts": ({ headers, query }: MockRequestContext) => {
    const { clientId } = requireClientScope(headers);

    let items = mockScheduledPosts.filter((p) => p.clientId === clientId);
    if (query.status) items = items.filter((p) => p.status === query.status);
    if (query.draftId) items = items.filter((p) => p.draftId === query.draftId);
    if (query.from) items = items.filter((p) => p.scheduledFor >= String(query.from));
    if (query.to) items = items.filter((p) => p.scheduledFor < String(query.to));
    if (query.search) {
      const needle = String(query.search).toLowerCase();
      items = items.filter((p) => p.content.toLowerCase().includes(needle));
    }

    items = [...items].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.id.localeCompare(b.id));

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const start = (page - 1) * limit;

    return { items: items.slice(start, start + limit), total: items.length, page, limit };
  },

  /* ── Scheduled-post detail ── */
  "GET /content/scheduled-posts/:id": ({ headers, params }: MockRequestContext) => {
    const { clientId } = requireClientScope(headers);
    const post = mockScheduledPosts.find((p) => p.id === params.id && p.clientId === clientId);
    if (!post) notFound("Scheduled post not found");
    return post;
  },

  /* ── Cancellation (idempotent for an already-CANCELLED row) ── */
  "POST /content/scheduled-posts/:id/cancel": ({ headers, params }: MockRequestContext) => {
    const { clientId } = requireClientScope(headers);
    const post = mockScheduledPosts.find((p) => p.id === params.id && p.clientId === clientId);
    if (!post) notFound("Scheduled post not found");

    if (post.status === "SCHEDULED") {
      post.status = "CANCELLED";
      post.cancelledAt = new Date().toISOString();
      post.cancelledByUserId = "user-dev-owner";
      post.updatedAt = new Date().toISOString();
    } else if (post.status !== "CANCELLED") {
      conflict("not_cancellable", "Only a scheduled post that has not started publishing can be cancelled.", {
        status: post.status,
      });
    }

    return post;
  },
};
