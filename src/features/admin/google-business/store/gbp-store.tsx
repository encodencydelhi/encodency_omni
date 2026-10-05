"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addHours } from "date-fns";
import { toast } from "sonner";
import { gbpRepository, mockControls, type GbpNotConnectedDetail, type GbpNotConnectedError } from "../data/repository";
import { evaluateCapabilities } from "../lib/capabilities";
import { GBP_MOCK_MODE, gbRoutes } from "../lib/constants";
import { googleBusinessApi, startGoogleBusinessConnect, mapProfileBody, toMediaItem, toPost, type GbpCreatePostInput, type GbpProfileUpdateInput } from "../live/google-business-api";
import { ApiError } from "@/types/api";
import type {
  ActivityEvent,
  AttributeDefinition,
  AttributeValue,
  BusinessAccount,
  CapabilityMap,
  Category,
  ConnectionInfo,
  ConnectionState,
  GbpScope,
  GbpSnapshot,
  Location,
  LocationPerformance,
  LocationProfile,
  MediaCategory,
  MediaItem,
  Post,
  PostState,
  Review,
  SearchKeyword,
  SpecialHour,
  TeamMember,
  WorkspaceNotification,
  WorkspaceRole,
  WorkspaceSettings,
} from "../types";

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export type LoadStatus = "loading" | "ready" | "error" | "not_connected";

export type NewPostInput = Pick<Post, "locationIds" | "type" | "summary" | "media" | "cta" | "event" | "offer" | "scheduledAt"> & {
  state: PostState;
};

const WEEK_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

/** Workspace hours -> the backend's weekly schedule (a day open 24 hours is 00:00-24:00). */
function toLiveHours(hours: LocationProfile["regularHours"]): NonNullable<GbpProfileUpdateInput["regularHours"]> {
  const periods = hours.periods.map((p) => ({ day: WEEK_DAYS[p.day] ?? "MONDAY", open: p.open, close: p.close }));
  const allDay = hours.open24.map((day) => ({ day: WEEK_DAYS[day] ?? "MONDAY", open: "00:00", close: "24:00" }));
  return [...allDay, ...periods];
}

const LIVE_PROFILE_KEYS = new Set(["title", "description", "website", "phone", "additionalPhones", "regularHours"]);

/** Only what Google's Business Information API lets us change; any other key means the whole change is refused (null). */
function toLiveProfilePatch(patch: Partial<LocationProfile>): GbpProfileUpdateInput | null {
  if (Object.keys(patch).some((key) => !LIVE_PROFILE_KEYS.has(key))) return null;
  const out: GbpProfileUpdateInput = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.website !== undefined) out.websiteUri = patch.website;
  if (patch.phone !== undefined) out.primaryPhone = patch.phone;
  if (patch.additionalPhones !== undefined) out.additionalPhones = patch.additionalPhones;
  if (patch.regularHours !== undefined) out.regularHours = toLiveHours(patch.regularHours);
  return out;
}

const GOOGLE_MEDIA_CATEGORY: Record<MediaCategory, string> = {
  LOGO: "LOGO",
  COVER: "COVER",
  EXTERIOR: "EXTERIOR",
  INTERIOR: "INTERIOR",
  TEAM: "TEAMS",
  AT_WORK: "AT_WORK",
  ADDITIONAL: "ADDITIONAL",
  VIDEO: "ADDITIONAL",
};
const toGoogleMediaCategory = (category: MediaCategory): string => GOOGLE_MEDIA_CATEGORY[category];

/** Workspace post -> the backend's immediate-publish payload. A Call button has no link; every other button needs one. */
function toLivePost(input: NewPostInput): GbpCreatePostInput {
  const payload: GbpCreatePostInput = { summary: input.summary };
  if (input.type === "event" || input.type === "offer") payload.topicType = input.type === "event" ? "EVENT" : "OFFER";
  if (input.cta) payload.callToAction = input.cta.actionType === "CALL" ? { actionType: "CALL" } : { actionType: input.cta.actionType, url: input.cta.url };
  const date = (iso: string) => iso.slice(0, 10);
  if (input.event) payload.event = { title: input.event.title, startDate: date(input.event.startDate), endDate: date(input.event.endDate) };
  if (input.type === "offer" && input.offer) {
    payload.offer = {
      ...(input.offer.couponCode ? { couponCode: input.offer.couponCode } : {}),
      ...(input.offer.redeemOnlineUrl ? { redeemOnlineUrl: input.offer.redeemOnlineUrl } : {}),
      ...(input.offer.termsConditions ? { termsConditions: input.offer.termsConditions } : {}),
    };
  }
  const photo = input.media.find((url) => /^https:\/\//i.test(url));
  if (photo) payload.photoUrl = photo;
  return payload;
}

interface Simulation {
  failNextAction: boolean;
  failNextLoad: boolean;
}

export interface GuardRegistration {
  dirty: boolean;
  save?: () => Promise<boolean>;
  label?: string;
}

interface PerformOptions {
  pending: string;
  success: string;
  /** Read-only operations still run while the token is expired (cached data). */
  requiresWrite?: boolean;
  retry?: () => void;
}

interface GbpStore {
  status: LoadStatus;
  mockMode: boolean;
  error: string | null;
  reload: () => void;
  /** Why nothing is shown when the status is "not_connected". */
  notConnected: GbpNotConnectedDetail | null;

  account: BusinessAccount | null;
  connection: ConnectionInfo;
  scopes: GbpScope[];
  locations: Location[];
  reviews: Review[];
  posts: Post[];
  media: MediaItem[];
  performance: LocationPerformance[];
  searchKeywords: SearchKeyword[];
  categories: Category[];
  attributeDefinitions: AttributeDefinition[];
  settings: WorkspaceSettings;
  team: TeamMember[];
  activity: ActivityEvent[];
  notifications: WorkspaceNotification[];

  role: WorkspaceRole;
  currentUser: TeamMember;
  can: CapabilityMap;
  /** Capabilities evaluated for one location (verification and managed state matter). */
  capabilitiesFor: (locationId: string | null) => CapabilityMap;
  simulation: Simulation;

  /* Reviews */
  replyToReview: (reviewId: string, comment: string) => Promise<boolean>;
  deleteReviewReply: (reviewId: string) => Promise<boolean>;

  /* Locations & profile */
  updateProfile: (locationId: string, patch: Partial<LocationProfile>, summary?: string) => Promise<boolean>;
  setLocationManaged: (locationId: string, managed: boolean) => Promise<boolean>;
  syncLocations: (locationIds?: string[]) => Promise<boolean>;
  applyBulkHours: (locationIds: string[], hours: LocationProfile["regularHours"]) => Promise<boolean>;
  applyBulkSpecialHours: (locationIds: string[], special: SpecialHour) => Promise<boolean>;
  applyBulkAttributes: (locationIds: string[], attributes: Record<string, AttributeValue>) => Promise<boolean>;

  /* Posts */
  createPost: (input: NewPostInput) => Promise<Post | null>;
  updatePost: (id: string, patch: Partial<Post>, summary?: string) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  publishPost: (id: string) => Promise<boolean>;
  schedulePost: (id: string, at: string) => Promise<boolean>;
  reviewPost: (id: string, action: "approved" | "changes_requested" | "rejected", note?: string) => Promise<boolean>;
  submitPostForApproval: (id: string, note?: string) => Promise<boolean>;

  /* Media */
  uploadMedia: (input: { locationId: string; category: MediaCategory; sourceUrl: string; sizeBytes: number; dimensions: { widthPx: number; heightPx: number } }) => Promise<boolean>;
  deleteMedia: (mediaIds: string[]) => Promise<boolean>;

  /* Connection & settings */
  reconnect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  updateSettings: (patch: Partial<WorkspaceSettings>, summary?: string) => Promise<boolean>;
  updateConnection: (patch: Partial<ConnectionInfo>) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  /* Mock-mode preview controls */
  simulate: {
    setConnectionState: (state: ConnectionState) => void;
    setScopeGranted: (scope: GbpScope, granted: boolean) => void;
    setRole: (role: WorkspaceRole) => void;
    setFailNextAction: (fail: boolean) => void;
    setFailNextLoad: (fail: boolean) => void;
    setVerification: (locationId: string, verification: Location["verification"]) => void;
  };

  registerGuard: (guard: GuardRegistration | null) => void;
  guardRef: React.RefObject<GuardRegistration | null>;
}

const StoreContext = createContext<GbpStore | null>(null);

const EMPTY_SETTINGS: WorkspaceSettings = {
  notifications: {
    newReview: { inApp: true, email: false },
    lowRatingReview: { inApp: true, email: true },
    replyNeeded: { inApp: true, email: false },
    locationUpdate: { inApp: true, email: false },
    syncFailure: { inApp: true, email: true },
    verificationChange: { inApp: true, email: true },
    permissionExpired: { inApp: true, email: true },
    duplicateLocation: { inApp: true, email: false },
  },
  defaults: { postCta: "LEARN_MORE", postLocationScope: "selected", replySignature: "", requireApproval: false, timezone: "Asia/Kolkata" },
  rolePermissions: { owner: [], manager: [], editor: [], contributor: [], analyst: [] },
};

const FALLBACK_USER: TeamMember = { id: "usr-unknown", name: "You", email: "", role: "owner", initials: "YO" };

const DISCONNECTED_CONNECTION: ConnectionInfo = {
  state: "disconnected",
  lastSyncedAt: null,
  nextSyncAt: null,
  autoSync: false,
  syncFrequency: "daily",
  quotaUsed: 0,
  quotaLimit: 10_000,
};

export function GoogleBusinessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GbpSnapshot | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("owner");
  const [simulation, setSimulation] = useState<Simulation>({ failNextAction: false, failNextLoad: false });
  const [reloadToken, setReloadToken] = useState(0);
  const [notConnected, setNotConnected] = useState<GbpNotConnectedDetail | null>(null);
  const guardRef = useRef<GuardRegistration | null>(null);

  const reload = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((t) => t + 1);
  }, []);

  // `status` already starts as "loading"; reload() puts it back before bumping
  // the token, so the effect only reports the outcome.
  useEffect(() => {
    let cancelled = false;
    gbpRepository
      .loadSnapshot()
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.name === "GbpNotConnectedError") {
          setNotConnected((err as GbpNotConnectedError).detail);
          setStatus("not_connected");
        } else {
          setError("OmniPlatform could not load Google Business data.");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const connection = snapshot?.connection ?? DISCONNECTED_CONNECTION;
  const settings = snapshot?.settings ?? EMPTY_SETTINGS;
  const team = useMemo(() => snapshot?.team ?? [], [snapshot]);
  const locations = useMemo(() => snapshot?.locations ?? [], [snapshot]);
  const permissions = useMemo(() => settings.rolePermissions[role] ?? [], [settings, role]);
  const scopes = useMemo(() => snapshot?.scopes ?? [], [snapshot]);

  const currentUser = useMemo(() => team.find((m) => m.role === role) ?? team[0] ?? FALLBACK_USER, [team, role]);

  const can = useMemo(
    () => evaluateCapabilities({ connection: connection.state, scopes, permissions, location: null }),
    [connection.state, scopes, permissions],
  );

  const capabilitiesFor = useCallback(
    (locationId: string | null) => {
      const location = locationId ? locations.find((l) => l.locationId === locationId) ?? null : null;
      return evaluateCapabilities({ connection: connection.state, scopes, permissions, location });
    },
    [connection.state, scopes, permissions, locations],
  );

  // Latest values reachable from stable callbacks.
  const live = useRef({ snapshot, currentUser, connection });
  useLayoutEffect(() => {
    live.current = { snapshot, currentUser, connection };
  });

  const patchSnapshot = useCallback((updater: (prev: GbpSnapshot) => GbpSnapshot) => {
    setSnapshot((prev) => (prev ? updater(prev) : prev));
  }, []);

  const log = useCallback(
    (event: Omit<ActivityEvent, "id" | "at" | "actor" | "source"> & { source?: ActivityEvent["source"] }) => {
      patchSnapshot((prev) => ({
        ...prev,
        activity: [{ id: uid("act"), at: nowIso(), actor: live.current.currentUser.name, source: "OmniPlatform", ...event }, ...prev.activity],
      }));
    },
    [patchSnapshot],
  );

  const notify = useCallback(
    (n: Omit<WorkspaceNotification, "id" | "at" | "read">) => {
      patchSnapshot((prev) => ({ ...prev, notifications: [{ id: uid("n"), at: nowIso(), read: false, ...n }, ...prev.notifications] }));
    },
    [patchSnapshot],
  );

  /** Live mode only: the workspace features Google's API cannot do (drafts, approvals, scheduling, attributes...) refuse clearly instead of pretending to save. */
  const notLive = useCallback((what: string): false => {
    toast.error(`${what} isn't available for a connected Google account`, { description: "Google's API does not provide this. Nothing was changed." });
    return false;
  }, []);

  /** Saving -> Saved / Failed for every mutation, with the connection checked first. */
  const perform = useCallback(
    async (opts: PerformOptions, apply: () => void): Promise<boolean> => {
      const state = live.current.connection.state;
      const requiresWrite = opts.requiresWrite ?? true;

      if (state === "disconnected") {
        toast.error("No Google Business account connected", {
          action: { label: "Connect", onClick: () => router.push(`${gbRoutes.settings}#connection`) },
        });
        return false;
      }
      if (requiresWrite && state === "token_expired") {
        toast.error("Google connection expired", {
          description: "Reconnect the account to continue. Your change was not sent.",
          action: { label: "Reconnect", onClick: () => router.push(`${gbRoutes.settings}#connection`) },
        });
        return false;
      }
      if (requiresWrite && state === "quota_exceeded") {
        toast.error("Google API quota reached", { description: "Try again once the daily quota resets." });
        return false;
      }

      const id = toast.loading(opts.pending);
      try {
        await gbpRepository.commit({ label: opts.pending, requiresWrite }, apply);
        toast.success(opts.success, { id });
        return true;
      } catch (err) {
        setSimulation((s) => ({ ...s, failNextAction: false }));
        if (ApiError.isApiError(err)) {
          toast.error(err.message, {
            id,
            description: err.reason === "provider_not_connected" ? "Reconnect the Google Business account in Integrations." : err.reason,
            action: err.reason === "provider_not_connected" ? { label: "Connect", onClick: () => router.push(`${gbRoutes.settings}#connection`) } : undefined,
          });
          return false;
        }
        toast.error("That did not go through", {
          id,
          description: "Google did not respond in time. Nothing was changed.",
          action: opts.retry ? { label: "Try again", onClick: opts.retry } : undefined,
        });
        return false;
      }
    },
    [router],
  );

  /* ---------------------------------------------------------------- */
  /* Reviews                                                           */
  /* ---------------------------------------------------------------- */

  const replyToReview = useCallback<GbpStore["replyToReview"]>(
    async (reviewId, comment) => {
      const review = live.current.snapshot?.reviews.find((r) => r.reviewId === reviewId);
      if (!review) return false;
      const isEdit = review.reply !== null;
      return perform({ pending: isEdit ? "Updating reply..." : "Posting reply...", success: isEdit ? "Reply updated" : "Reply posted" }, async () => {
        if (gbpRepository.mode === "live") {
          await googleBusinessApi.replyToReview(review.locationId, reviewId, comment);
        }
        patchSnapshot((prev) => ({
          ...prev,
          reviews: prev.reviews.map((r) =>
            r.reviewId === reviewId ? { ...r, reply: { comment, updateTime: nowIso(), author: live.current.currentUser.name } } : r,
          ),
        }));
        log({
          action: isEdit ? "reply_edit" : "review_reply",
          summary: isEdit ? "Edited a review reply" : `Replied to a ${review.starRating}-star review`,
          entity: { type: "review", id: reviewId, label: review.reviewer.displayName },
          locationId: review.locationId,
          previous: review.reply?.comment,
          next: comment,
        });
      });
    },
    [perform, patchSnapshot, log],
  );

  const deleteReviewReply = useCallback<GbpStore["deleteReviewReply"]>(
    async (reviewId) => {
      const review = live.current.snapshot?.reviews.find((r) => r.reviewId === reviewId);
      if (!review) return false;
      return perform({ pending: "Deleting reply...", success: "Reply deleted" }, async () => {
        if (gbpRepository.mode === "live") await googleBusinessApi.deleteReviewReply(review.locationId, reviewId);
        patchSnapshot((prev) => ({ ...prev, reviews: prev.reviews.map((r) => (r.reviewId === reviewId ? { ...r, reply: null } : r)) }));
        log({
          action: "reply_delete",
          summary: "Deleted a review reply",
          entity: { type: "review", id: reviewId, label: review.reviewer.displayName },
          locationId: review.locationId,
          previous: review.reply?.comment,
        });
      });
    },
    [perform, patchSnapshot, log],
  );

  /* ---------------------------------------------------------------- */
  /* Locations & profile                                               */
  /* ---------------------------------------------------------------- */

  const updateProfile = useCallback<GbpStore["updateProfile"]>(
    async (locationId, patch, summary = "Business profile updated") => {
      const location = live.current.snapshot?.locations.find((l) => l.locationId === locationId);
      if (!location) return false;
      let livePatch: GbpProfileUpdateInput | null = null;
      if (gbpRepository.mode === "live") {
        livePatch = toLiveProfilePatch(patch);
        if (livePatch === null) return notLive("Changing categories, attributes, services, special hours, the service area or the address");
      }
      return perform({ pending: "Saving to Google...", success: summary }, async () => {
        // Live: Google answers with the profile it now holds, which replaces the local copy.
        const saved = livePatch ? mapProfileBody(await googleBusinessApi.updateProfile(location.locationId, livePatch)) : null;
        patchSnapshot((prev) => ({
          ...prev,
          locations: prev.locations.map((l) =>
            l.locationId === locationId ? { ...l, profile: saved ? { ...l.profile, ...saved, specialHours: l.profile.specialHours, attributes: l.profile.attributes, services: l.profile.services } : { ...l.profile, ...patch } } : l,
          ),
        }));
        const changed = Object.keys(patch);
        const action = changed.includes("regularHours")
          ? "hours_change"
          : changed.includes("specialHours")
            ? "special_hours_change"
            : changed.includes("primaryCategoryId") || changed.includes("additionalCategoryIds")
              ? "category_change"
              : changed.includes("attributes")
                ? "attribute_change"
                : "profile_edit";
        log({
          action,
          summary,
          entity: { type: "location", id: locationId, label: location.profile.title },
          locationId,
          next: changed.join(", "),
        });
      });
    },
    [perform, patchSnapshot, log, notLive],
  );

  const setLocationManaged = useCallback<GbpStore["setLocationManaged"]>(
    async (locationId, managed) => {
      const location = live.current.snapshot?.locations.find((l) => l.locationId === locationId);
      if (!location) return false;
      return perform(
        { pending: managed ? "Enabling management..." : "Disabling management...", success: managed ? "Location is now managed in OmniPlatform" : "Location is no longer managed here", requiresWrite: false },
        () => {
          patchSnapshot((prev) => ({ ...prev, locations: prev.locations.map((l) => (l.locationId === locationId ? { ...l, managed } : l)) }));
          log({
            action: "permission_change",
            summary: managed ? "Enabled OmniPlatform management" : "Disabled OmniPlatform management",
            entity: { type: "location", id: locationId, label: location.profile.title },
            locationId,
          });
        },
      );
    },
    [perform, patchSnapshot, log],
  );

  const syncLocations = useCallback<GbpStore["syncLocations"]>(
    async (locationIds) => {
      const targets = locationIds ?? live.current.snapshot?.locations.map((l) => l.locationId) ?? [];
      if (gbpRepository.mode === "live") {
        // Live: "sync" is a real re-read from Google.
        toast.success("Refreshing from Google...");
        reload();
        return true;
      }
      patchSnapshot((prev) => ({
        ...prev,
        connection: { ...prev.connection, state: prev.connection.state === "connected" ? "syncing" : prev.connection.state },
        locations: prev.locations.map((l) => (targets.includes(l.locationId) ? { ...l, sync: { ...l.sync, state: "syncing" } } : l)),
      }));

      const ok = await perform(
        { pending: `Syncing ${targets.length === 1 ? "location" : `${targets.length} locations`}...`, success: `Synced ${targets.length === 1 ? "1 location" : `${targets.length} locations`}`, requiresWrite: false },
        () => {
          patchSnapshot((prev) => ({
            ...prev,
            connection: {
              ...prev.connection,
              state: prev.connection.state === "syncing" ? "connected" : prev.connection.state,
              lastSyncedAt: nowIso(),
              nextSyncAt: addHours(new Date(), 6).toISOString(),
              quotaUsed: prev.connection.quotaUsed + targets.length * 12,
            },
            locations: prev.locations.map((l) => (targets.includes(l.locationId) ? { ...l, sync: { state: "synced", lastSyncedAt: nowIso() } } : l)),
          }));
          log({
            action: "location_sync",
            summary: `Synced ${targets.length} ${targets.length === 1 ? "location" : "locations"}`,
            entity: { type: "account", label: "Google Business" },
            locationId: targets.length === 1 ? targets[0]! : null,
            source: "Google sync",
          });
        },
      );

      if (!ok) {
        patchSnapshot((prev) => ({
          ...prev,
          connection: { ...prev.connection, state: prev.connection.state === "syncing" ? "sync_failed" : prev.connection.state },
          locations: prev.locations.map((l) =>
            targets.includes(l.locationId) ? { ...l, sync: { ...l.sync, state: "failed", error: "The last sync did not complete." } } : l,
          ),
        }));
        notify({ kind: "sync_failure", title: "Sync failed", body: "The last manual sync did not complete.", href: `${gbRoutes.settings}#sync` });
      }
      return ok;
    },
    [perform, patchSnapshot, log, notify, reload],
  );

  const applyBulkHours = useCallback<GbpStore["applyBulkHours"]>(
    async (locationIds, hours) =>
      perform({ pending: `Updating hours for ${locationIds.length} locations...`, success: `Hours updated for ${locationIds.length} locations` }, async () => {
        if (gbpRepository.mode === "live") {
          const regularHours = toLiveHours(hours);
          for (const id of locationIds) await googleBusinessApi.updateProfile(id, { regularHours });
        }
        patchSnapshot((prev) => ({
          ...prev,
          locations: prev.locations.map((l) => (locationIds.includes(l.locationId) ? { ...l, profile: { ...l.profile, regularHours: hours } } : l)),
        }));
        log({ action: "hours_change", summary: `Bulk updated hours for ${locationIds.length} locations`, entity: { type: "location", label: `${locationIds.length} locations` }, locationId: null });
      }),
    [perform, patchSnapshot, log],
  );

  const applyBulkSpecialHours = useCallback<GbpStore["applyBulkSpecialHours"]>(
    async (locationIds, special) =>
      gbpRepository.mode === "live" ? notLive("Special hours") : perform({ pending: "Applying special hours...", success: `Special hours applied to ${locationIds.length} locations` }, () => {
        patchSnapshot((prev) => ({
          ...prev,
          locations: prev.locations.map((l) =>
            locationIds.includes(l.locationId)
              ? { ...l, profile: { ...l.profile, specialHours: [...l.profile.specialHours, { ...special, id: uid("sh") }] } }
              : l,
          ),
        }));
        log({ action: "special_hours_change", summary: `Applied "${special.label}" to ${locationIds.length} locations`, entity: { type: "location", label: `${locationIds.length} locations` }, locationId: null });
      }),
    [perform, patchSnapshot, log],
  );

  const applyBulkAttributes = useCallback<GbpStore["applyBulkAttributes"]>(
    async (locationIds, attributes) =>
      gbpRepository.mode === "live" ? notLive("Attributes") : perform({ pending: "Applying attributes...", success: `Attributes applied to ${locationIds.length} locations` }, () => {
        patchSnapshot((prev) => ({
          ...prev,
          locations: prev.locations.map((l) =>
            locationIds.includes(l.locationId) ? { ...l, profile: { ...l.profile, attributes: { ...l.profile.attributes, ...attributes } } } : l,
          ),
        }));
        log({ action: "attribute_change", summary: `Bulk applied attributes to ${locationIds.length} locations`, entity: { type: "location", label: `${locationIds.length} locations` }, locationId: null });
      }),
    [perform, patchSnapshot, log],
  );

  /* ---------------------------------------------------------------- */
  /* Posts                                                             */
  /* ---------------------------------------------------------------- */

  const createPost = useCallback<GbpStore["createPost"]>(
    async (input) => {
      if (gbpRepository.mode === "live") {
        if (input.state !== "published") {
          notLive("Drafts, scheduled posts and approvals");
          return null;
        }
        const payload = toLivePost(input);
        const created: Post[] = [];
        const ok = await perform({ pending: "Publishing to Google...", success: input.locationIds.length > 1 ? `Post published to ${input.locationIds.length} locations` : "Post published" }, async () => {
          for (const locationId of input.locationIds) {
            const { post } = await googleBusinessApi.createPost(locationId, payload);
            created.push(toPost(post, locationId));
          }
          patchSnapshot((prev) => ({ ...prev, posts: [...created, ...prev.posts] }));
          notify({ kind: "post_published", title: "Post published", body: input.summary.slice(0, 80), href: gbRoutes.posts });
        });
        return ok ? created[0] ?? null : null;
      }
      const post: Post = {
        ...input,
        id: uid("post"),
        createdAt: nowIso(),
        createdBy: live.current.currentUser.name,
        publishedAt: input.state === "published" ? nowIso() : null,
        searchUrl: input.state === "published" ? "https://search.google.com/local/posts" : null,
        metrics: input.state === "published" ? { views: 0, clicks: 0 } : null,
        approvals: input.state === "pending_approval" ? [{ id: uid("ap"), action: "submitted", actor: live.current.currentUser.name, at: nowIso() }] : [],
      };
      const verb =
        input.state === "published" ? "Post published" : input.state === "scheduled" ? "Post scheduled" : input.state === "pending_approval" ? "Post submitted for approval" : "Draft saved";
      const ok = await perform({ pending: input.state === "published" ? "Publishing to Google..." : "Saving...", success: verb }, () => {
        patchSnapshot((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
        log({
          action: input.state === "published" ? "post_publish" : input.state === "scheduled" ? "post_schedule" : "post_create",
          summary: verb,
          entity: { type: "post", id: post.id, label: post.event?.title ?? post.summary.slice(0, 60) },
          locationId: post.locationIds.length === 1 ? post.locationIds[0]! : null,
        });
        if (input.state === "published") {
          notify({ kind: "post_published", title: "Post published", body: post.summary.slice(0, 80), href: `${gbRoutes.posts}?post=${post.id}` });
        }
        if (input.state === "pending_approval") {
          notify({ kind: "approval_requested", title: "Post awaiting approval", body: post.summary.slice(0, 80), href: `${gbRoutes.posts}?status=pending_approval` });
        }
      });
      return ok ? post : null;
    },
    [perform, patchSnapshot, log, notify],
  );

  const updatePost = useCallback<GbpStore["updatePost"]>(
    async (id, patch, summary = "Post updated") => {
      const post = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!post) return false;
      if (gbpRepository.mode === "live") return notLive("Editing a published post");
      return perform({ pending: "Saving post...", success: summary }, () => {
        patchSnapshot((prev) => ({ ...prev, posts: prev.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        log({ action: "post_create", summary, entity: { type: "post", id, label: post.event?.title ?? post.summary.slice(0, 60) }, locationId: null });
      });
    },
    [perform, patchSnapshot, log],
  );

  const deletePost = useCallback<GbpStore["deletePost"]>(
    async (id) => {
      const post = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!post) return false;
      return perform({ pending: "Deleting post...", success: "Post deleted" }, async () => {
        if (gbpRepository.mode === "live") {
          for (const locationId of post.locationIds) await googleBusinessApi.deletePost(locationId, id);
        }
        patchSnapshot((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== id) }));
        log({ action: "post_delete", summary: "Deleted a post", entity: { type: "post", id, label: post.event?.title ?? post.summary.slice(0, 60) }, locationId: null });
      });
    },
    [perform, patchSnapshot, log],
  );

  const publishPost = useCallback<GbpStore["publishPost"]>(
    async (id) => {
      const post = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!post) return false;
      if (gbpRepository.mode === "live") return notLive("Publishing a draft");
      patchSnapshot((prev) => ({ ...prev, posts: prev.posts.map((p) => (p.id === id ? { ...p, state: "publishing" } : p)) }));
      const ok = await perform({ pending: "Publishing to Google...", success: "Post published" }, () => {
        patchSnapshot((prev) => ({
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === id
              ? { ...p, state: "published", publishedAt: nowIso(), scheduledAt: null, metrics: { views: 0, clicks: 0 }, searchUrl: "https://search.google.com/local/posts" }
              : p,
          ),
        }));
        log({ action: "post_publish", summary: "Published a post", entity: { type: "post", id, label: post.event?.title ?? post.summary.slice(0, 60) }, locationId: null });
        notify({ kind: "post_published", title: "Post published", body: post.summary.slice(0, 80), href: `${gbRoutes.posts}?post=${id}` });
      });
      if (!ok) {
        patchSnapshot((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p.id === id ? { ...p, state: "failed", failureReason: "Google did not accept the post. Try again." } : p)),
        }));
      }
      return ok;
    },
    [perform, patchSnapshot, log, notify],
  );

  const schedulePost = useCallback<GbpStore["schedulePost"]>(
    async (id, at) => {
      const post = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!post) return false;
      if (gbpRepository.mode === "live") return notLive("Scheduling a post");
      return perform({ pending: "Scheduling post...", success: post.scheduledAt ? "Post rescheduled" : "Post scheduled", requiresWrite: false }, () => {
        patchSnapshot((prev) => ({ ...prev, posts: prev.posts.map((p) => (p.id === id ? { ...p, state: "scheduled", scheduledAt: at } : p)) }));
        log({
          action: "post_schedule",
          summary: post.scheduledAt ? "Rescheduled a post" : "Scheduled a post",
          entity: { type: "post", id, label: post.event?.title ?? post.summary.slice(0, 60) },
          locationId: null,
          previous: post.scheduledAt ?? undefined,
          next: at,
        });
      });
    },
    [perform, patchSnapshot, log],
  );

  const submitPostForApproval = useCallback<GbpStore["submitPostForApproval"]>(
    async (id, note) => {
      const post = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!post) return false;
      if (gbpRepository.mode === "live") return notLive("Post approvals");
      return perform({ pending: "Submitting...", success: "Submitted for approval", requiresWrite: false }, () => {
        patchSnapshot((prev) => ({
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === id
              ? { ...p, state: "pending_approval", approvals: [...p.approvals, { id: uid("ap"), action: "submitted", actor: live.current.currentUser.name, note, at: nowIso() }] }
              : p,
          ),
        }));
        log({ action: "approval", summary: "Submitted a post for approval", entity: { type: "post", id, label: post.summary.slice(0, 60) }, locationId: null });
        notify({ kind: "approval_requested", title: "Post awaiting approval", body: post.summary.slice(0, 80), href: `${gbRoutes.posts}?status=pending_approval` });
      });
    },
    [perform, patchSnapshot, log, notify],
  );

  const reviewPost = useCallback<GbpStore["reviewPost"]>(
    async (id, action, note) => {
      const post = live.current.snapshot?.posts.find((p) => p.id === id);
      if (!post) return false;
      if (gbpRepository.mode === "live") return notLive("Post approvals");
      const label = { approved: "Approved", changes_requested: "Changes requested", rejected: "Rejected" }[action];
      return perform({ pending: "Saving review...", success: label, requiresWrite: false }, () => {
        patchSnapshot((prev) => ({
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === id
              ? {
                ...p,
                state: action === "approved" ? (p.scheduledAt ? "scheduled" : "approved") : action === "rejected" ? "rejected" : "draft",
                approvals: [...p.approvals, { id: uid("ap"), action, actor: live.current.currentUser.name, note, at: nowIso() }],
              }
              : p,
          ),
        }));
        log({ action: "approval", summary: label, entity: { type: "post", id, label: post.summary.slice(0, 60) }, locationId: null, next: note });
      });
    },
    [perform, patchSnapshot, log],
  );

  /* ---------------------------------------------------------------- */
  /* Media                                                             */
  /* ---------------------------------------------------------------- */

  const uploadMedia = useCallback<GbpStore["uploadMedia"]>(
    async ({ locationId, category, sourceUrl, sizeBytes, dimensions }) => {
      const location = live.current.snapshot?.locations.find((l) => l.locationId === locationId);
      if (gbpRepository.mode === "live") {
        // Google fetches the photo itself, so it needs a public https link (a local file or blob URL cannot be fetched).
        if (!/^https:\/\//i.test(sourceUrl)) {
          toast.error("Google needs a public image link", { description: "Use an https:// image URL that anyone can open. Nothing was uploaded." });
          return false;
        }
        return perform({ pending: "Uploading to Google...", success: "Media uploaded" }, async () => {
          const { item } = await googleBusinessApi.addMedia(locationId, { sourceUrl, category: toGoogleMediaCategory(category), format: category === "VIDEO" ? "VIDEO" : "PHOTO" });
          const mapped = toMediaItem(item, locationId);
          patchSnapshot((prev) => ({
            ...prev,
            media: [{ ...mapped, state: "processing", sizeBytes, dimensions: mapped.dimensions ?? dimensions }, ...prev.media],
            locations: prev.locations.map((l) => (l.locationId === locationId ? { ...l, photoCount: l.photoCount + 1 } : l)),
          }));
        });
      }
      return perform({ pending: "Uploading to Google...", success: "Media uploaded" }, () => {
        const item: MediaItem = {
          name: `media/${uid("med")}`,
          mediaId: uid("med"),
          locationId,
          category,
          format: category === "VIDEO" ? "VIDEO" : "PHOTO",
          sourceUrl,
          thumbnailUrl: sourceUrl,
          createTime: nowIso(),
          viewCount: 0,
          dimensions,
          sizeBytes,
          state: "processing",
          uploadedBy: live.current.currentUser.name,
        };
        patchSnapshot((prev) => ({
          ...prev,
          media: [item, ...prev.media],
          locations: prev.locations.map((l) => (l.locationId === locationId ? { ...l, photoCount: l.photoCount + 1 } : l)),
        }));
        log({ action: "media_upload", summary: "Uploaded media", entity: { type: "media", id: item.mediaId, label: location?.profile.title ?? "Location" }, locationId });
        // Google processes uploads asynchronously; reflect that after a moment.
        setTimeout(() => {
          patchSnapshot((prev) => ({ ...prev, media: prev.media.map((m) => (m.mediaId === item.mediaId ? { ...m, state: "live" } : m)) }));
        }, 2500);
      });
    },
    [perform, patchSnapshot, log],
  );

  const deleteMedia = useCallback<GbpStore["deleteMedia"]>(
    async (mediaIds) =>
      perform({ pending: "Deleting media...", success: mediaIds.length > 1 ? `${mediaIds.length} media items deleted` : "Media deleted" }, async () => {
        if (gbpRepository.mode === "live") {
          for (const mediaId of mediaIds) {
            const item = live.current.snapshot?.media.find((m) => m.mediaId === mediaId);
            if (item) await googleBusinessApi.deleteMedia(item.locationId, mediaId);
          }
        }
        patchSnapshot((prev) => ({
          ...prev,
          media: prev.media.filter((m) => !mediaIds.includes(m.mediaId)),
        }));
        log({ action: "media_delete", summary: `Deleted ${mediaIds.length} media ${mediaIds.length === 1 ? "item" : "items"}`, entity: { type: "media", label: `${mediaIds.length} items` }, locationId: null });
      }),
    [perform, patchSnapshot, log],
  );

  /* ---------------------------------------------------------------- */
  /* Connection & settings                                             */
  /* ---------------------------------------------------------------- */

  const reconnect = useCallback<GbpStore["reconnect"]>(async () => {
    if (gbpRepository.mode === "live") {
      try {
        window.location.assign(await startGoogleBusinessConnect());
        return true;
      } catch (err) {
        toast.error(ApiError.isApiError(err) ? err.message : "Could not start the Google sign-in", { description: "Only an owner or admin can connect Google Business." });
        return false;
      }
    }
    const id = toast.loading("Waiting for Google authorisation...");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    patchSnapshot((prev) => ({
      ...prev,
      scopes: ["business.manage"],
      connection: { ...prev.connection, state: "connected", lastSyncedAt: nowIso() },
    }));
    log({ action: "connection_change", summary: "Reconnected the Google account", entity: { type: "account", label: "Google Business" }, locationId: null });
    toast.success("Google Business reconnected", { id, description: "Permissions granted and data is up to date." });
    return true;
  }, [patchSnapshot, log, router]);

  const disconnect = useCallback<GbpStore["disconnect"]>(async () => {
    if (gbpRepository.mode === "live") {
      router.push("/admin/integrations");
      return true;
    }
    const id = toast.loading("Disconnecting account...");
    await new Promise((resolve) => setTimeout(resolve, 900));
    patchSnapshot((prev) => ({ ...prev, connection: { ...prev.connection, state: "disconnected" } }));
    log({ action: "connection_change", summary: "Disconnected Google Business", entity: { type: "account", label: "Google Business" }, locationId: null });
    toast.success("Google Business disconnected", { id, description: "Synced data is kept for 30 days." });
    return true;
  }, [patchSnapshot, log, router]);

  const updateSettings = useCallback<GbpStore["updateSettings"]>(
    async (patch, summary = "Settings saved") =>
      perform({ pending: "Saving settings...", success: summary, requiresWrite: false }, () => {
        patchSnapshot((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
        log({
          action: patch.rolePermissions ? "permission_change" : "profile_edit",
          summary,
          entity: { type: "settings", label: "Google Business settings" },
          locationId: null,
        });
      }),
    [perform, patchSnapshot, log],
  );

  const updateConnection = useCallback<GbpStore["updateConnection"]>(
    (patch) => patchSnapshot((prev) => ({ ...prev, connection: { ...prev.connection, ...patch } })),
    [patchSnapshot],
  );

  const markNotificationRead = useCallback(
    (id: string) => patchSnapshot((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    [patchSnapshot],
  );
  const markAllNotificationsRead = useCallback(
    () => patchSnapshot((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) })),
    [patchSnapshot],
  );

  const simulate = useMemo<GbpStore["simulate"]>(
    () => ({
      setConnectionState: (state) => {
        patchSnapshot((prev) => ({ ...prev, connection: { ...prev.connection, state } }));
        if (state === "token_expired") {
          notify({ kind: "permission_expired", title: "Google token expired", body: "Reconnect to resume publishing and syncing.", href: `${gbRoutes.settings}#connection` });
        }
      },
      setScopeGranted: (scope, granted) => {
        patchSnapshot((prev) => ({
          ...prev,
          scopes: granted ? [...new Set([...prev.scopes, scope])] : prev.scopes.filter((s) => s !== scope),
        }));
      },
      setRole,
      setFailNextAction: (fail) => {
        setSimulation((s) => ({ ...s, failNextAction: fail }));
        mockControls.failNextCommit(fail);
      },
      setFailNextLoad: (fail) => {
        setSimulation((s) => ({ ...s, failNextLoad: fail }));
        mockControls.failNextLoad(fail);
      },
      setVerification: (locationId, verification) => {
        patchSnapshot((prev) => ({ ...prev, locations: prev.locations.map((l) => (l.locationId === locationId ? { ...l, verification } : l)) }));
      },
    }),
    [patchSnapshot, notify],
  );

  const registerGuard = useCallback((guard: GuardRegistration | null) => {
    guardRef.current = guard;
  }, []);

  const value: GbpStore = {
    status,
    mockMode: GBP_MOCK_MODE,
    error,
    reload,
    notConnected,
    account: snapshot?.account ?? null,
    connection,
    scopes,
    locations,
    reviews: snapshot?.reviews ?? [],
    posts: snapshot?.posts ?? [],
    media: snapshot?.media ?? [],
    performance: snapshot?.performance ?? [],
    searchKeywords: snapshot?.searchKeywords ?? [],
    categories: snapshot?.categories ?? [],
    attributeDefinitions: snapshot?.attributeDefinitions ?? [],
    settings,
    team,
    activity: snapshot?.activity ?? [],
    notifications: snapshot?.notifications ?? [],
    role,
    currentUser,
    can,
    capabilitiesFor,
    simulation,
    replyToReview,
    deleteReviewReply,
    updateProfile,
    setLocationManaged,
    syncLocations,
    applyBulkHours,
    applyBulkSpecialHours,
    applyBulkAttributes,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    schedulePost,
    reviewPost,
    submitPostForApproval,
    uploadMedia,
    deleteMedia,
    reconnect,
    disconnect,
    updateSettings,
    updateConnection,
    markNotificationRead,
    markAllNotificationsRead,
    simulate,
    registerGuard,
    guardRef,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useGbp() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useGbp must be used inside <GoogleBusinessProvider>");
  return ctx;
}
