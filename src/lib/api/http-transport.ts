import { env } from "@/config/env";
import { ApiError, type ApiErrorCode } from "@/types/api";
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

interface ErrorBody {
  message?: string;
  code?: ApiErrorCode;
  fieldErrors?: Record<string, string>;
}
export class HttpTransport implements Transport {
  constructor(private readonly baseUrl: string = env.apiBaseUrl) { }

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
        },
        body: spec.body ? JSON.stringify(spec.body) : undefined,
      });
    } catch {
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: "Unable to reach the platform API.",
        status: 0,
      });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorBody;
      throw new ApiError({
        code: body.code ?? STATUS_TO_CODE[response.status] ?? "UNKNOWN",
        message: body.message ?? "The request could not be completed.",
        status: response.status,
        fieldErrors: body.fieldErrors,
      });
    }

    if (response.status === 204) return undefined as TResult;

    const payload = (await response.json()) as { data?: TResult } | TResult;
    return payload && typeof payload === "object" && "data" in payload && !("pagination" in payload)
      ? ((payload as { data: TResult }).data)
      : (payload as TResult);
  }
}
