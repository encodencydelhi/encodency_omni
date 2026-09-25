import { env } from "@/config/env";
import { ApiError, type ApiErrorCode } from "@/types/api";
import { notifySessionExpired } from "./session-events";
import { buildSearchParams, type RequestSpec, type Transport } from "./transport";

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

/** NestJS errors carry `message` as a string, or an array of validation messages. */
interface ErrorBody {
  message?: string | string[];
  code?: ApiErrorCode;
  fieldErrors?: Record<string, string>;
  reason?: string;
}

/** Keys consumed by the transport; everything else is business detail worth keeping. */
const RESERVED_ERROR_KEYS = new Set(["message", "code", "fieldErrors", "statusCode", "error"]);

function errorMessage(body: ErrorBody): string {
  if (Array.isArray(body.message)) return body.message.join(" ");
  return body.message ?? "The request could not be completed.";
}
export class HttpTransport implements Transport {
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.apiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  async request<TResult>(spec: RequestSpec): Promise<TResult> {
    const url = `${this.baseUrl}${spec.path}${buildSearchParams(spec.query)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: spec.method,
        credentials: "include",
        signal: spec.signal,
        headers: {
          Accept: "application/json",
          ...(spec.body ? { "Content-Type": "application/json" } : {}),
          ...spec.headers,
        },
        body: spec.body ? JSON.stringify(spec.body) : undefined,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: "Unable to reach the platform API.",
        status: 0,
      });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorBody & Record<string, unknown>;
      if (response.status === 401 && !spec.skipSessionExpiry) {
        notifySessionExpired();
      }
      const details: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (!RESERVED_ERROR_KEYS.has(key)) details[key] = value;
      }
      throw new ApiError({
        code: body.code ?? STATUS_TO_CODE[response.status] ?? "UNKNOWN",
        message: errorMessage(body),
        status: response.status,
        fieldErrors: body.fieldErrors,
        reason: typeof body.reason === "string" ? body.reason : undefined,
        details,
      });
    }

    if (response.status === 204) return undefined as TResult;

    const payload = (await response.json()) as { data?: TResult } | TResult;
    return payload && typeof payload === "object" && "data" in payload && !("pagination" in payload)
      ? ((payload as { data: TResult }).data)
      : (payload as TResult);
  }
}
