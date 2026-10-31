import assert from "node:assert/strict";
import { afterEach, it, mock } from "node:test";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import { fetchDynamicAiVisual } from "../../services/ai-image.service";

afterEach(() => mock.restoreAll());

it("sends a single scoped image request with explicit size, quality and cancellation", async () => {
  const request = mock.method(apiClient, "request", async () => ({ success:true, image:{url:"data:image/jpeg;base64,YWJj"} }));
  const signal = new AbortController().signal;
  const result = await fetchDynamicAiVisual("Forest", "Natural", 0, undefined, "company-test", {size:"1024x1536",quality:"high",signal});
  assert.equal(request.mock.callCount(), 1);
  const spec = request.mock.calls[0]!.arguments[0];
  assert.ok(spec);
  assert.equal(spec.path, "/ai/generate-image");
  assert.equal(spec.headers?.["x-company-id"], "company-test");
  assert.equal(spec.signal, signal);
  assert.deepEqual(spec.body, {prompt:"Forest",style:"Natural",size:"1024x1536",quality:"high"});
  assert.equal(result.aspectRatio, "2:3");
});

it("asks the model for the canvas's own request size and labels the result with the canvas ratio", async () => {
  const request = mock.method(apiClient, "request", async () => ({ success:true, image:{url:"data:image/jpeg;base64,YWJj"} }));
  const result = await fetchDynamicAiVisual("Diya", "Natural", 0, undefined, "company-test", {size:"1088x1360", canvas:{width:1080,height:1350,ratio:"4:5"}, quality:"medium"});
  assert.equal(request.mock.callCount(), 1);
  assert.deepEqual(request.mock.calls[0]!.arguments[0]!.body, {prompt:"Diya",style:"Natural",size:"1088x1360",quality:"medium"});
  assert.equal(result.aspectRatio, "4:5");
});

it("rejects an empty prompt without sending a request", async () => {
  const request = mock.method(apiClient, "request", async () => ({}));
  await assert.rejects(fetchDynamicAiVisual(" "), /Describe the image/);
  assert.equal(request.mock.callCount(), 0);
});

it("retains actionable provider errors without console errors or automatic retries", async () => {
  const failure = new ApiError({code:"SERVICE_UNAVAILABLE",status:503,message:"The platform server could not connect to the image provider.",reason:"image_provider_connection_failed"});
  const request = mock.method(apiClient, "request", async () => { throw failure; });
  const consoleError = mock.method(console, "error", () => {});
  await assert.rejects(fetchDynamicAiVisual("Forest", "Natural", 0, undefined, "company-test"), error => error === failure);
  assert.equal(request.mock.callCount(), 1);
  assert.equal(consoleError.mock.callCount(), 0);
});

it("explains frontend-to-backend network failures and does not retry", async () => {
  const request = mock.method(apiClient, "request", async () => {throw new ApiError({code:"NETWORK_ERROR",status:0,message:"fetch failed"});});
  await assert.rejects(fetchDynamicAiVisual("Forest", "Natural", 0, undefined, "company-test"), /backend is running and reachable/);
  assert.equal(request.mock.callCount(), 1);
});
