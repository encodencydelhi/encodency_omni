import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChatMessage } from "./types";
import { historyForServer, isRtl, parseBlocks, parseInline, readStored, storageKey, trimForStorage } from "./text";

const msg = (id: string, role: "user" | "assistant", content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id, role, content, createdAt: 0, ...extra });

describe("assistant text helpers", () => {
  it("parses bold and code but keeps everything else (including markup) as plain text", () => {
    assert.deepEqual(parseInline("Open **Billing** and run `x`"), [
      { kind: "text", text: "Open " },
      { kind: "bold", text: "Billing" },
      { kind: "text", text: " and run " },
      { kind: "code", text: "x" },
    ]);
    assert.deepEqual(parseInline("<script>alert(1)</script>"), [{ kind: "text", text: "<script>alert(1)</script>" }]);
  });

  it("groups lists and paragraphs", () => {
    const blocks = parseBlocks("Steps:\n1. Open **Calendar**\n2) Pick the post\n\n- one\n- two\nDone");
    assert.deepEqual(blocks.map((block) => block.kind), ["p", "ol", "ul", "p"]);
    assert.equal((blocks[1] as { items: unknown[] }).items.length, 2);
    assert.equal((blocks[2] as { items: unknown[] }).items.length, 2);
  });

  it("sends only real turns to the server, never notices, and caps the count", () => {
    const messages = [msg("n", "assistant", "Could not reach", { notice: true }), ...Array.from({ length: 20 }, (_, i) => msg(`m${i}`, i % 2 ? "assistant" : "user", `t${i}`))];
    const sent = historyForServer(messages);
    assert.equal(sent.length, 12);
    assert.ok(sent.every((turn) => turn.content.startsWith("t")));
  });

  it("restores stored chat defensively", () => {
    assert.deepEqual(readStored(null), []);
    assert.deepEqual(readStored("not json"), []);
    assert.deepEqual(readStored(JSON.stringify([{ role: "system", content: "x", id: "1" }, { role: "user", content: 5, id: "2" }, msg("3", "user", "ok")])).map((m) => m.id), ["3"]);
    assert.equal(trimForStorage(Array.from({ length: 60 }, (_, i) => msg(String(i), "user", "x"))).length, 40);
  });

  it("keys the stored chat per person and Company", () => {
    assert.equal(storageKey("u1", "c1"), "omni.assistant.v1:u1:c1");
    assert.equal(storageKey(undefined, "c1"), null);
  });

  it("detects right-to-left text", () => {
    assert.equal(isRtl("مرحبا كيف حالك"), true);
    assert.equal(isRtl("שלום"), true);
    assert.equal(isRtl("मेरा पोस्ट क्यों fail हुआ"), false);
    assert.equal(isRtl("Hello"), false);
    assert.equal(isRtl("12345"), false);
  });
});
