/**
 * The X repository is the only boundary the UI talks to.
 *
 *   today:  UI → XRepository → mock provider (in-memory, deterministic)
 *   later:  UI → XRepository → OmniPlatform backend → X API
 *
 * Swapping the implementation is the whole integration: no component imports
 * mock data, and no component knows whether a mutation crossed a network.
 *
 * The repository is the *transport*, not the store. It validates input,
 * simulates latency, and returns whatever the server would return — including
 * the id X assigns at publish time. The session's source of truth is the
 * store, which applies the returned values.
 */

import { addMinutes } from "date-fns";
import { X_MOCK_MODE } from "../lib/constants";
import {
  buildSeries,
  mockAccount,
  mockActivity,
  mockApprovals,
  mockAudience,
  mockCampaigns,
  mockConnection,
  mockMentions,
  mockNotifications,
  mockPosts,
  mockScopes,
  mockSettings,
  mockTeam,
} from "./mock-provider";
import type {
  ConnectionInfo,
  ConversationMessage,
  ISODate,
  MediaKind,
  SeriesPoint,
  XMedia,
  XMention,
  XPost,
  XScope,
  XSettings,
  XSnapshot,
} from "./types";

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type XErrorCode =
  | "service_unavailable"
  | "token_expired"
  | "rate_limited"
  | "network"
  | "validation"
  | "not_found";

/** Every repository rejection is one of these, so the UI can always recover. */
export class XServiceError extends Error {
  readonly code: XErrorCode;
  /** One line telling the user what to do next. */
  readonly hint: string;

  constructor(code: XErrorCode, message: string, hint: string) {
    super(message);
    this.name = "XServiceError";
    this.code = code;
    this.hint = hint;
  }
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export type PostDraft = Pick<
  XPost,
  "text" | "thread" | "type" | "media" | "poll" | "linkUrl" | "campaignId" | "internalTags" | "ownerId" | "approval"
> & {
  status: Extract<XPost["status"], "draft" | "scheduled" | "published">;
  scheduledAt: ISODate | null;
};

export interface PublishResult {
  /** X issues a new post id on publish; drafts keep their OmniPlatform id until then. */
  id: string;
  publishedAt: ISODate;
}

export interface UploadInput {
  name: string;
  size: number;
  kind: MediaKind;
  /** Object URL for the local preview. Replaced by the CDN URL once uploaded. */
  previewUrl: string;
}

export interface XRepository {
  readonly mode: "mock" | "live";
  /** False when no backend is configured — the workspace then refuses to invent data. */
  isAvailable(): boolean;

  loadSnapshot(): Promise<XSnapshot>;
  loadSeries(days: number, offset?: number): Promise<SeriesPoint[]>;

  sync(): Promise<ConnectionInfo>;
  connect(): Promise<{ connection: ConnectionInfo; scopes: XScope[] }>;
  disconnect(): Promise<ConnectionInfo>;

  createPost(input: PostDraft): Promise<XPost>;
  updatePost(id: string, patch: Partial<XPost>): Promise<Partial<XPost>>;
  publishPost(post: XPost): Promise<PublishResult>;
  schedulePost(post: XPost, at: ISODate): Promise<Partial<XPost>>;
  retryPost(post: XPost): Promise<PublishResult>;
  deletePost(post: XPost): Promise<void>;

  sendReply(mention: XMention, text: ISODate): Promise<ConversationMessage>;

  uploadMedia(input: UploadInput, onProgress: (percent: number) => void): Promise<XMedia>;
  saveSettings(patch: Partial<XSettings>): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Mock implementation                                                 */
/* ------------------------------------------------------------------ */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** X post ids are 19-digit snowflakes; generating a realistic one keeps links honest. */
function snowflake() {
  return `1${Math.floor(700_000_000_000_000_000 + Math.random() * 99_000_000_000_000_000)}`.slice(0, 19);
}

const EMPTY_METRICS: XPost["metrics"] = {
  impressions: 0,
  engagements: 0,
  likes: 0,
  replies: 0,
  reposts: 0,
  quotes: 0,
  bookmarks: 0,
  linkClicks: 0,
  profileVisits: 0,
  videoViews: null,
};

class MockXRepository implements XRepository {
  readonly mode = "mock" as const;

  isAvailable() {
    return true;
  }

  async loadSnapshot(): Promise<XSnapshot> {
    await wait(620);
    // Cloned so a mutation in the session can never write back into the fixture.
    return structuredClone({
      account: mockAccount,
      connection: mockConnection,
      scopes: mockScopes,
      posts: mockPosts,
      mentions: mockMentions,
      audience: mockAudience,
      settings: mockSettings,
      team: mockTeam,
      campaigns: mockCampaigns,
      approvals: mockApprovals,
      activity: mockActivity,
      notifications: mockNotifications,
    });
  }

  async loadSeries(days: number, offset = 0) {
    return buildSeries(days, offset);
  }

  async sync(): Promise<ConnectionInfo> {
    await wait(1100);
    return {
      ...mockConnection,
      state: "connected",
      lastSyncedAt: nowIso(),
      nextSyncAt: addMinutes(new Date(), 60).toISOString(),
      rateLimitResetAt: null,
      requestsUsed: mockConnection.requestsUsed + 38,
      lastError: null,
    };
  }

  async connect() {
    // Production: redirect to the backend's X OAuth 2.0 authorise URL (PKCE)
    // and resume here when the callback lands.
    await wait(1250);
    return {
      connection: {
        ...mockConnection,
        state: "connected" as const,
        lastSyncedAt: nowIso(),
        nextSyncAt: addMinutes(new Date(), 60).toISOString(),
        rateLimitResetAt: null,
        lastError: null,
      },
      scopes: [...mockScopes],
    };
  }

  async disconnect(): Promise<ConnectionInfo> {
    await wait(900);
    return { ...mockConnection, state: "disconnected", rateLimitResetAt: null, lastError: null };
  }

  async createPost(input: PostDraft): Promise<XPost> {
    await wait(input.status === "draft" ? 420 : 900);
    const published = input.status === "published";
    return {
      id: published ? snowflake() : uid("draft"),
      text: input.text,
      thread: input.thread,
      type: input.type,
      media: input.media,
      poll: input.poll,
      linkUrl: input.linkUrl,
      status: input.status,
      publishedAt: published ? nowIso() : null,
      scheduledAt: input.scheduledAt,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      metrics: EMPTY_METRICS,
      failure: null,
      approval: input.approval,
      ownerId: input.ownerId,
      campaignId: input.campaignId,
      internalTags: input.internalTags,
      archivedAt: null,
    };
  }

  async updatePost(_id: string, patch: Partial<XPost>) {
    await wait(480);
    return { ...patch, updatedAt: nowIso() };
  }

  async publishPost(): Promise<PublishResult> {
    await wait(1200);
    return { id: snowflake(), publishedAt: nowIso() };
  }

  async schedulePost(_post: XPost, at: ISODate) {
    await wait(520);
    return { status: "scheduled" as const, scheduledAt: at, failure: null, updatedAt: nowIso() };
  }

  async retryPost(post: XPost): Promise<PublishResult> {
    await wait(1400);
    // A duplicate-content failure will not clear itself — retrying the same
    // text fails the same way, which is what the real API does.
    if (post.failure?.code === "duplicate_content") {
      throw new XServiceError(
        "validation",
        "X blocked this post again — the text is still identical to a post published in the last 24 hours.",
        "Edit the text so it differs from the original, then publish or reschedule.",
      );
    }
    return { id: snowflake(), publishedAt: nowIso() };
  }

  async deletePost() {
    await wait(800);
  }

  async sendReply(_mention: XMention, text: string): Promise<ConversationMessage> {
    await wait(750);
    return {
      id: uid("conv"),
      authorHandle: mockAccount.handle,
      authorName: mockAccount.name,
      isUs: true,
      text,
      at: nowIso(),
    };
  }

  async uploadMedia(input: UploadInput, onProgress: (percent: number) => void): Promise<XMedia> {
    const id = uid("m");
    // Stream progress the way a real multipart upload would.
    for (let percent = 12; percent < 100; percent += 22) {
      await wait(190);
      onProgress(percent);
    }
    onProgress(100);
    // Video needs a transcode pass after the bytes land.
    if (input.kind === "video") await wait(900);
    return {
      id,
      kind: input.kind,
      url: input.previewUrl,
      altText: "",
      state: "ready",
      progress: 100,
      durationSec: input.kind === "video" ? 48 : undefined,
    };
  }

  async saveSettings() {
    await wait(520);
  }
}

/* ------------------------------------------------------------------ */
/* Unavailable implementation (mock mode off, no backend attached)     */
/* ------------------------------------------------------------------ */

const UNAVAILABLE = () =>
  new XServiceError(
    "service_unavailable",
    "X service not connected — the OmniPlatform backend for this channel isn't available.",
    "Mock mode is off and no X backend is configured. Set NEXT_PUBLIC_X_MOCK_MODE=true to explore the workspace with sample data.",
  );

/**
 * Deliberately refuses every call. With mock mode off the workspace shows the
 * service-unavailable state instead of silently rendering invented numbers.
 */
class UnavailableXRepository implements XRepository {
  readonly mode = "live" as const;

  isAvailable() {
    return false;
  }

  async loadSnapshot(): Promise<XSnapshot> {
    throw UNAVAILABLE();
  }
  async loadSeries(): Promise<SeriesPoint[]> {
    throw UNAVAILABLE();
  }
  async sync(): Promise<ConnectionInfo> {
    throw UNAVAILABLE();
  }
  async connect(): Promise<{ connection: ConnectionInfo; scopes: XScope[] }> {
    throw UNAVAILABLE();
  }
  async disconnect(): Promise<ConnectionInfo> {
    throw UNAVAILABLE();
  }
  async createPost(): Promise<XPost> {
    throw UNAVAILABLE();
  }
  async updatePost(): Promise<Partial<XPost>> {
    throw UNAVAILABLE();
  }
  async publishPost(): Promise<PublishResult> {
    throw UNAVAILABLE();
  }
  async schedulePost(): Promise<Partial<XPost>> {
    throw UNAVAILABLE();
  }
  async retryPost(): Promise<PublishResult> {
    throw UNAVAILABLE();
  }
  async deletePost(): Promise<void> {
    throw UNAVAILABLE();
  }
  async sendReply(): Promise<ConversationMessage> {
    throw UNAVAILABLE();
  }
  async uploadMedia(): Promise<XMedia> {
    throw UNAVAILABLE();
  }
  async saveSettings(): Promise<void> {
    throw UNAVAILABLE();
  }
}

let instance: XRepository | null = null;

export function getXRepository(): XRepository {
  if (!instance) instance = X_MOCK_MODE ? new MockXRepository() : new UnavailableXRepository();
  return instance;
}
