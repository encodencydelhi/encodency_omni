import assert from "node:assert/strict";
import test from "node:test";
import { createDialogQueue } from "./ui-dialog-store";

test("confirmation waits for a choice and cancellation never approves", async () => {
  const queue = createDialogQueue();
  const result = queue.request({ kind: "confirm", title: "Delete", description: "Review first" });
  assert.equal(queue.snapshot()?.title, "Delete");
  queue.settle(false);
  assert.equal(await result, false);
  assert.equal(queue.snapshot(), null);
});
test("dialogs are processed in order and prompt text is returned intact", async () => {
  const queue = createDialogQueue();
  const first = queue.request({ kind: "confirm", title: "First", description: "Confirm" });
  const second = queue.request({ kind: "prompt", title: "Second", description: "URL" });
  queue.settle(true);
  assert.equal(await first, true);
  assert.equal(queue.snapshot()?.title, "Second");
  queue.settle("https://example.test/path");
  assert.equal(await second, "https://example.test/path");
});
test("unmount abort dismisses the active request without approving navigation", async () => {
  const queue = createDialogQueue(), controller = new AbortController();
  const result = queue.request({ kind: "confirm", title: "Leave", description: "Draft" }, controller.signal);
  controller.abort();
  assert.equal(await result, null);
  assert.equal(queue.snapshot(), null);
});
test("aborting a queued dialog preserves the active choice and host cleanup resolves everything", async () => {
  const queue = createDialogQueue(), controller = new AbortController();
  const first = queue.request({ kind: "confirm", title: "Active", description: "Draft" });
  const second = queue.request({ kind: "confirm", title: "Queued", description: "Draft" }, controller.signal);
  controller.abort();
  assert.equal(await second, null);
  assert.equal(queue.snapshot()?.title, "Active");
  queue.cancelAll();
  assert.equal(await first, null);
  assert.equal(queue.snapshot(), null);
});
