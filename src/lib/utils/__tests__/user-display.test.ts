import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getUserDisplay } from "../user-display";

describe("getUserDisplay", () => {
  it("uses the saved profile name for greeting and account labels", () => {
    const display = getUserDisplay({ name: "Manish Sirohi", email: "officialmanishsirohi.01@gmail.com" });

    assert.equal(display.fullName, "Manish Sirohi");
    assert.equal(display.firstName, "Manish");
    assert.equal(display.initials, "MS");
  });

  it("does not greet with the email local-part when the profile name is missing", () => {
    const display = getUserDisplay({ name: "", email: "officialmanishsirohi.01@gmail.com" });

    assert.equal(display.fullName, "officialmanishsirohi.01@gmail.com");
    assert.equal(display.firstName, "User");
    assert.equal(display.initials, "OF");
  });
});
