import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GbpNotConnectedError, gbpRepository, getProvider, mockControls } from "../data/repository";
import { mockSnapshot } from "../data/mock-provider";
import { GBP_MOCK_MODE } from "../lib/constants";

describe("gbpRepository", () => {
  it("resolves the provider from the single GBP_MOCK_MODE flag", () => {
    assert.equal(gbpRepository.mode, GBP_MOCK_MODE ? "mock" : "live");
    assert.equal(getProvider().mode, gbpRepository.mode);
  });

  it("loads a snapshot with every slice the workspace needs", async () => {
    const snapshot = await gbpRepository.loadSnapshot();
    for (const key of [
      "account",
      "connection",
      "scopes",
      "locations",
      "reviews",
      "posts",
      "media",
      "performance",
      "searchKeywords",
      "categories",
      "attributeDefinitions",
      "settings",
      "team",
      "activity",
      "notifications",
    ]) {
      assert.ok(key in snapshot, `snapshot is missing ${key}`);
    }
  });

  it("hands back a copy, so store mutations cannot corrupt the source data", async () => {
    const snapshot = await gbpRepository.loadSnapshot();
    const originalTitle = mockSnapshot.locations[0]!.profile.title;
    snapshot.locations[0]!.profile.title = "Mutated by a test";
    assert.equal(mockSnapshot.locations[0]!.profile.title, originalTitle);
  });

  it("applies a mutation through the commit seam and returns its result", async () => {
    const result = await gbpRepository.commit({ label: "test" }, () => "applied");
    assert.equal(result, "applied");
  });

  it("fails one commit when a failure is armed, then recovers", async () => {
    mockControls.failNextCommit(true);
    assert.equal(mockControls.shouldFailCommit, true);
    await assert.rejects(() => gbpRepository.commit({ label: "test" }, () => "applied"));
    assert.equal(mockControls.shouldFailCommit, false);
    assert.equal(await gbpRepository.commit({ label: "test" }, () => "applied"), "applied");
  });

  it("does not run the mutation when the commit fails", async () => {
    let ran = false;
    mockControls.failNextCommit(true);
    await assert.rejects(() =>
      gbpRepository.commit({ label: "test" }, () => {
        ran = true;
        return true;
      }),
    );
    assert.equal(ran, false, "a failed commit must not leave local state changed");
  });

  it("exposes a not-connected error rather than fabricating live data", () => {
    const error = new GbpNotConnectedError();
    assert.ok(error instanceof Error);
    assert.equal(error.name, "GbpNotConnectedError");
    assert.match(error.message, /not connected/i);
  });
});
