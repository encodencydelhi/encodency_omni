export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export type SortDirection = "asc" | "desc";

export interface SortSpec<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export interface ListParams<TFilters extends object = Record<string, never>> {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: SortSpec | null;
  filters?: Partial<TFilters>;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION_FAILED"
  | "SERVICE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "NO_COMPANY_SELECTED"
  | "NO_CLIENT_SELECTED"
  | "MEDIA_NOT_SUPPORTED"
  | "UNKNOWN";
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors: Record<string, string> | undefined;
  /**
   * Backend business-error discriminator (TASK-11B and friends), e.g.
   * `revision_conflict`, `already_scheduled`, `integration_reconnect_required`.
   * Absent for plain HTTP errors that carry no `reason`.
   */
  readonly reason: string | undefined;
  /** Remaining keys of a structured error body (`currentRevision`, `scheduledPostId`, ...). */
  readonly details: Record<string, unknown> | undefined;

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    status?: number;
    fieldErrors?: Record<string, string>;
    reason?: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status ?? 500;
    this.fieldErrors = params.fieldErrors;
    this.reason = params.reason;
    this.details = params.details;
  }

  /** Reads a typed sibling field of a structured error body. */
  detail<T>(key: string): T | undefined {
    return this.details?.[key] as T | undefined;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  get isAuthError(): boolean {
    return this.code === "UNAUTHORIZED" || this.code === "FORBIDDEN";
  }
}
