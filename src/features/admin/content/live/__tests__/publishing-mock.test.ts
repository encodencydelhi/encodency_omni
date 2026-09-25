/**
 * TASK-11B mock parity: the stand-in backend must answer with the same paths,
 * `reason` discriminators and state machine as the real one, so mock-mode UI
 * work survives the transport swap.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "mock";
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";

const { schedulingApi } = await import("../../live/scheduling-api");
const { ApiError } = await import("@/types/api");

const companyId = "development-company-id";
const clientId = "moksha-sewa";
const draftId = "draft-001";
const fbVariantId = "var-001-fb";
const liVariantId = "var-001-li";

/** Comfortably inside the 2-min..180-day window. */
function futureIso(hours = 48): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe("publishing mock routes (TASK-11B parity)", () => {
  it("discovers targets for a draft variant, with publishable/reason", async () => {
    const targets = await schedulingApi.targets(companyId, clientId, draftId, fbVariantId);
    assert.equal(targets.items.length, 2);
    const publishable = targets.items.filter((t) => t.publishable);
    assert.equal(publishable.length, 1);
    assert.equal(publishable[0]!.resourceMappingId, "map-fb-001");
    const blocked = targets.items.find((t) => !t.publishable);
    assert.equal(blocked?.reason, "integration_reconnect_required");
  });

  it("creates a schedule and returns the warnings array", async () => {
    const created = await schedulingApi.schedule(companyId, clientId, draftId, fbVariantId, {
      resourceMappingId: "map-fb-001",
      scheduledFor: futureIso(30),
      expectedDraftRevision: 1,
    });

    assert.equal(created.status, "SCHEDULED");
    assert.equal(created.channel, "FACEBOOK_PAGE");
    assert.equal(created.draftRevision, 1);
    assert.ok(Array.isArray(created.warnings));

    const detail = await schedulingApi.get(companyId, clientId, created.id);
    assert.equal(detail.id, created.id);
    assert.equal(detail.status, "SCHEDULED");
  });

  it("rejects a duplicate schedule with already_scheduled + scheduledPostId", async () => {
    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, fbVariantId, {
        resourceMappingId: "map-fb-001",
        scheduledFor: futureIso(31),
        expectedDraftRevision: 1,
      }),
      (error: unknown) => {
        assert.ok(ApiError.isApiError(error));
        assert.equal(error.status, 409);
        assert.equal(schedulingApi.isAlreadyScheduled(error), true);
        assert.equal(typeof schedulingApi.existingScheduledPostId(error), "string");
        return true;
      },
    );
  });

  it("rejects a stale expectedDraftRevision with revision_conflict + currentRevision", async () => {
    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, liVariantId, {
        resourceMappingId: "map-li-001",
        scheduledFor: futureIso(32),
        expectedDraftRevision: 99,
      }),
      (error: unknown) => {
        assert.ok(ApiError.isApiError(error));
        assert.equal(error.status, 409);
        assert.equal(schedulingApi.isRevisionConflict(error), true);
        assert.equal(schedulingApi.conflictingRevision(error), 1);
        return true;
      },
    );
  });

  it("rejects a reconnect-required target with integration_reconnect_required", async () => {
    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, fbVariantId, {
        resourceMappingId: "map-fb-002",
        scheduledFor: futureIso(33),
        expectedDraftRevision: 1,
      }),
      (error: unknown) => ApiError.isApiError(error) && schedulingApi.isReconnectRequired(error),
    );
  });

  it("rejects a target whose channel does not match the variant", async () => {
    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, fbVariantId, {
        resourceMappingId: "map-li-001",
        scheduledFor: futureIso(34),
        expectedDraftRevision: 1,
      }),
      (error: unknown) => ApiError.isApiError(error) && schedulingApi.isChannelMismatch(error),
    );
  });

  it("rejects a scheduledFor outside the window", async () => {
    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, fbVariantId, {
        resourceMappingId: "map-fb-001",
        scheduledFor: new Date(Date.now() + 30 * 1000).toISOString(),
        expectedDraftRevision: 1,
      }),
      (error: unknown) => ApiError.isApiError(error) && /2 minutes/.test(error.message),
    );
  });

  it("lists scheduled posts paged and filtered by status", async () => {
    const list = await schedulingApi.list(companyId, clientId, { status: "SCHEDULED", page: 1, limit: 10 });
    assert.equal(list.page, 1);
    assert.equal(list.limit, 10);
    assert.ok(list.total >= 1);
    assert.ok(list.items.every((p) => p.status === "SCHEDULED"));
    assert.deepEqual(
      list.items.map((p) => p.scheduledFor),
      [...list.items.map((p) => p.scheduledFor)].sort(),
    );
  });

  it("cancels a scheduled post and stays idempotent on a second call", async () => {
    const list = await schedulingApi.list(companyId, clientId, { status: "SCHEDULED", limit: 10 });
    const target = list.items.find((p) => p.id === "sp-seed-001") ?? list.items[0]!;
    assert.ok(target);

    const cancelled = await schedulingApi.cancel(companyId, clientId, target.id);
    assert.equal(cancelled.status, "CANCELLED");

    const again = await schedulingApi.cancel(companyId, clientId, target.id);
    assert.equal(again.status, "CANCELLED");
  });

  it("returns 404 for an unknown scheduled post", async () => {
    await assert.rejects(
      schedulingApi.get(companyId, clientId, "sp-does-not-exist"),
      (error: unknown) => ApiError.isApiError(error) && error.status === 404,
    );
  });

  it("requires both company and client scope before touching the mock router", async () => {
    await assert.rejects(
      schedulingApi.list(companyId, ""),
      (error: unknown) => ApiError.isApiError(error) && error.code === "NO_CLIENT_SELECTED",
    );
  });
});
