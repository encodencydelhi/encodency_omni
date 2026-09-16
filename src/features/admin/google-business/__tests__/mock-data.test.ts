import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockSnapshot } from "../data/mock-provider";
import { ALL_PERMISSIONS, MEDIA_CATEGORIES, METRICS } from "../lib/constants";
import type { PostState } from "../types";

const snapshot = mockSnapshot;
const locationIds = new Set(snapshot.locations.map((location) => location.locationId));

describe("mock data shape", () => {
  it("covers enough locations to exercise the multi-location workspace", () => {
    assert.ok(snapshot.locations.length >= 3);
    assert.ok(new Set(snapshot.locations.map((location) => location.verification)).size >= 2, "verification states should vary");
    assert.ok(snapshot.locations.some((location) => location.sync.state === "failed"), "one location should show a failed sync");
  });

  it("keeps every child record attached to a real location", () => {
    for (const review of snapshot.reviews) assert.ok(locationIds.has(review.locationId), `review ${review.reviewId} points at a missing location`);
    for (const item of snapshot.media) assert.ok(locationIds.has(item.locationId), `media ${item.mediaId} points at a missing location`);
    for (const keyword of snapshot.searchKeywords) assert.ok(locationIds.has(keyword.locationId));
    for (const series of snapshot.performance) assert.ok(locationIds.has(series.locationId));
    for (const post of snapshot.posts) {
      assert.ok(post.locationIds.length > 0, `post ${post.id} has no locations`);
      for (const id of post.locationIds) assert.ok(locationIds.has(id), `post ${post.id} points at a missing location`);
    }
  });

  it("gives every location a performance series long enough for a 90-day comparison", () => {
    assert.equal(snapshot.performance.length, snapshot.locations.length);
    for (const series of snapshot.performance) assert.ok(series.series.length >= 180, `${series.locationId} has only ${series.series.length} days`);
  });

  it("uses only Google's documented metric fields", () => {
    const allowed = new Set(Object.values(METRICS).flatMap((metric) => metric.sources));
    for (const point of snapshot.performance[0]!.series.slice(0, 5)) {
      for (const key of Object.keys(point.values)) assert.ok(allowed.has(key as never), `${key} is not a Google DailyMetric`);
    }
  });

  it("uses only Google's media categories", () => {
    for (const item of snapshot.media) assert.ok(MEDIA_CATEGORIES.includes(item.category), `${item.category} is not a Google media category`);
  });

  it("exercises every post state, including the OmniPlatform workflow ones", () => {
    const states = new Set<PostState>(snapshot.posts.map((post) => post.state));
    for (const state of ["draft", "pending_approval", "scheduled", "published", "failed"] as PostState[]) {
      assert.ok(states.has(state), `no mock post is in the ${state} state`);
    }
  });

  it("only references attribute definitions it ships", () => {
    const defined = new Set(snapshot.attributeDefinitions.map((attribute) => attribute.attributeId));
    for (const location of snapshot.locations) {
      for (const key of Object.keys(location.profile.attributes)) {
        assert.ok(defined.has(key), `${location.profile.title} sets undefined attribute ${key}`);
      }
    }
  });

  it("only references categories it ships", () => {
    const defined = new Set(snapshot.categories.map((category) => category.categoryId));
    for (const location of snapshot.locations) {
      assert.ok(defined.has(location.profile.primaryCategoryId), `${location.profile.title} has an unknown primary category`);
      for (const id of location.profile.additionalCategoryIds) assert.ok(defined.has(id));
    }
  });

  it("grants roles only permissions the app knows about, and gives the owner all of them", () => {
    for (const [role, permissions] of Object.entries(snapshot.settings.rolePermissions)) {
      for (const permission of permissions) assert.ok(ALL_PERMISSIONS.includes(permission), `${role} has unknown permission ${permission}`);
    }
    assert.equal(snapshot.settings.rolePermissions.owner.length, ALL_PERMISSIONS.length);
    assert.ok(snapshot.settings.rolePermissions.analyst.length < ALL_PERMISSIONS.length, "analyst should be read-mostly");
  });

  it("gives every team member a role that has a permission set", () => {
    for (const member of snapshot.team) assert.ok(member.role in snapshot.settings.rolePermissions, `${member.name} has role ${member.role}`);
    assert.ok(snapshot.team.some((member) => member.role === "owner"));
  });

  it("stamps activity entries with a source so Google sync is distinguishable from OmniPlatform edits", () => {
    assert.ok(snapshot.activity.length > 0);
    for (const event of snapshot.activity) {
      assert.ok(["OmniPlatform", "Google sync"].includes(event.source));
      assert.ok(event.summary.length > 0);
      if (event.locationId) assert.ok(locationIds.has(event.locationId));
    }
  });

  it("has a connection record with quota accounting", () => {
    assert.ok(snapshot.connection.quotaLimit > 0);
    assert.ok(snapshot.connection.quotaUsed >= 0 && snapshot.connection.quotaUsed <= snapshot.connection.quotaLimit);
    assert.ok(snapshot.scopes.includes("business.manage"));
  });

  it("carries no data for features Google does not expose through the API", () => {
    const serialised = JSON.stringify(snapshot).toLowerCase();
    for (const forbidden of ["questionsandanswers", "\"qanda\"", "competitorrank", "seoscore", "googlescore"]) {
      assert.ok(!serialised.includes(forbidden), `mock data contains ${forbidden}, which Google does not provide`);
    }
    assert.ok(!snapshot.posts.some((post) => (post.type as string) === "product"), "product posts are not creatable through the API");
  });
});
