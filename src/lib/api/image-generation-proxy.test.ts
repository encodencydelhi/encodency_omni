import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { proxyImageGeneration } from "./image-generation-proxy";

const options = { backendOrigin: "http://backend.internal:4000", appBaseUrl: "https://app.example.test", production: true };
const request = (headers: Record<string, string> = {}, body = '{}') => new Request("https://app.example.test/api/v1/ai/generate-image", {
  method: "POST", headers: { "content-type": "application/json", cookie: "omni_session=synthetic", ...headers }, body,
});
describe("image generation proxy CSRF boundary", () => {
  it("rejects cross-site, missing and malformed origins before calling the backend", async () => {
    for (const origin of [undefined, "https://evil.test", "null", "https://app.example.test/path", "http://app.example.test"]) {
      const response = await proxyImageGeneration(request(origin ? { origin } : {}), { ...options, fetchImpl: async () => { throw new Error("must not call"); } });
      assert.equal(response.status, 403);
    }
  });
  it("fails closed if production has no configured first-party origin", async () => {
    const response = await proxyImageGeneration(request({ origin: options.appBaseUrl }), { ...options, appBaseUrl: undefined });
    assert.equal(response.status, 503);
  });
  it("forwards validated provenance and tenant cookies while preserving backend refusal", async () => {
    let calls = 0;
    const response = await proxyImageGeneration(request({ origin: options.appBaseUrl, "x-company-id": "company", "x-client-id": "client" }), {
      ...options, fetchImpl: async (url, init) => {
        calls++;
        assert.equal(url, "http://backend.internal:4000/api/v1/ai/generate-image");
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("origin"), options.appBaseUrl);
        assert.equal(headers.get("cookie"), "omni_session=synthetic");
        assert.equal(headers.get("x-company-id"), "company");
        assert.equal(headers.get("x-client-id"), "client");
        assert.equal(init?.redirect, "error");
        return Response.json({ reason: "quota_exceeded" }, { status: 402 });
      },
    });
    assert.equal(calls, 1);
    assert.equal(response.status, 402);
    assert.deepEqual(await response.json(), { reason: "quota_exceeded" });
  });
  it("accepts first-party Referer fallback and does not leak connection errors", async () => {
    const response = await proxyImageGeneration(request({ referer: `${options.appBaseUrl}/admin/content` }), { ...options, fetchImpl: async () => { throw new Error("private-network-hostname"); } });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private-network-hostname/);
  });
  it("rejects invalid JSON rather than calling a paid operation", async () => {
    const response = await proxyImageGeneration(request({ origin: options.appBaseUrl }, '{'), options);
    assert.equal(response.status, 400);
  });
  it("does not turn an invalid successful upstream response into a successful operation", async () => {
    const response = await proxyImageGeneration(request({ origin: options.appBaseUrl }), { ...options, fetchImpl: async () => new Response('<html>upstream error</html>', { status: 200 }) });
    assert.equal(response.status, 502);
  });
});
