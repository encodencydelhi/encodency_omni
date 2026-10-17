import assert from "node:assert/strict";
import test from "node:test";
import { apiClient } from "@/lib/api/client";
import { setStoredTenancy } from "@/lib/api/tenancy-storage";
import { LiveAutomationRepository } from "./live-provider";

test("unwraps successful bulk retry results and preserves cancel responses", async () => {
  const original = apiClient.request;
  setStoredTenancy("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222");
  const calls: Array<{ method?: string; path?: string }> = [];
  apiClient.request = async (spec) => {
    calls.push(spec);
    if (spec.path === "/automation/runs/retry") return [
      { runId: "one", ok: true, run: { id: "retry-one", status: "Successful" } },
      { runId: "two", ok: false, error: "not retryable" },
    ] as never;
    return { id: "waiting-one", status: "Cancelled" } as never;
  };
  try {
    const repository = new LiveAutomationRepository();
    assert.deepEqual(await repository.bulkRetryRuns(["one", "two"]), [{ id: "retry-one", status: "Successful" }]);
    assert.deepEqual(await repository.cancelRun("waiting-one"), { id: "waiting-one", status: "Cancelled" });
    assert.deepEqual(calls.map((call) => [call.method, call.path]), [["POST", "/automation/runs/retry"], ["POST", "/automation/runs/waiting-one/cancel"]]);
  } finally {
    apiClient.request = original;
  }
});
