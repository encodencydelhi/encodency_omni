import { env } from "@/config/env";
import type { RequestSpec, Transport } from "@/lib/api/transport";
import { ApiError } from "@/types/api";
import type { MockRouter } from "./lib/router";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Stands in for the network while the backend is being built.
 *
 * It deliberately behaves like a remote service — it is asynchronous, it takes
 * time, and it throws the same `ApiError` the HTTP transport throws — so that
 * loading and error states are exercised for real during development.
 */
export class MockTransport implements Transport {
  constructor(
    private readonly router: MockRouter,
    private readonly latencyMs: number = env.mockLatencyMs,
  ) {}

  async request<TResult>(spec: RequestSpec): Promise<TResult> {
    const match = this.router.match(spec.method, spec.path);

    if (!match) {
      throw new ApiError({
        code: "NOT_FOUND",
        status: 404,
        message: `No mock handler for ${spec.method} ${spec.path}`,
      });
    }

    // A small variable delay keeps skeletons visible and surfaces races that a
    // synchronous fixture would hide.
    await delay(this.latencyMs + Math.round(this.latencyMs * 0.4 * Math.random()));

    if (spec.signal?.aborted) {
      throw new ApiError({ code: "NETWORK_ERROR", status: 0, message: "Request aborted" });
    }

    const result = await match.handler({
      params: match.params,
      query: spec.query ?? {},
      body: spec.body,
    });

    return result as TResult;
  }
}
