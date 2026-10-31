import { it } from "node:test";
import assert from "node:assert/strict";
import {
  creativeRefinements,
  imageCreativeBrief,
} from "../../lib/ai-creative-brief";
it("keeps client context opt-in and never implies a website fetch", () => {
  const context = {
    includeClient: false,
    clientName: "Private client",
    website: "https://example.test",
    channels: ["Facebook"],
    goal: "Explain the service",
  };
  assert.ok(!creativeRefinements(context).join(" ").includes("Private client"));
  assert.ok(
    creativeRefinements({ ...context, includeClient: true })
      .join(" ")
      .includes("do not claim to have visited"),
  );
});
it("refines the edited content and requested changes rather than fixed presets", () => {
  const result = creativeRefinements(
    { includeClient: false, channels: [] },
    { caption: "Edited launch date: Monday", hashtags: [] },
    "Keep the date, change the opening",
  );
  assert.ok(result.join(" ").includes("Monday"));
  assert.ok(result.join(" ").includes("change the opening"));
});
it("builds exact text, composition and palette into an inspectable image brief", () => {
  const prompt = imageCreativeBrief("A new cafe", {
    text: "OPEN MONDAY",
    composition: "Entrance at left",
    palette: "Warm amber",
    avoid: "Neon",
  });
  assert.ok(prompt.includes('"OPEN MONDAY"'));
  assert.ok(prompt.includes("Entrance at left"));
  assert.ok(prompt.includes("Warm amber"));
  assert.ok(!prompt.includes("Do not include text"));
});
it("requires a real subject and never silently truncates an oversized visual brief", () => {
  assert.throws(() => imageCreativeBrief(" ", {}));
  assert.throws(() => imageCreativeBrief("x".repeat(4001), {}));
  assert.ok(imageCreativeBrief("A forest", {}).includes("Do not include text"));
});
