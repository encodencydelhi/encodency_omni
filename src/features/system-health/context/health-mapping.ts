import type { DashboardSnapshot } from "@/types/domain/dashboard";

/** Global system health state extracted for the shell (e.g. footer). */
export interface HealthState {
  globalStatus: "operational" | "degraded" | "outage" | "maintenance";
  entries: DashboardSnapshot["platformHealth"];
  isLoading: boolean;
}

export type ApiHealthView = "ok" | "degraded" | "unreachable" | "checking";

/**
 * Pure mapping of `GET /health` (or its failure) onto the shell's vocabulary.
 * Only API + database are known — no invented services.
 */
export function toApiHealthView(
  result:
    | { ok: true; body: { status: "ok" | "error"; database: "connected" | "error" } }
    | { ok: false; error: unknown },
): ApiHealthView {
  if (!result.ok) return "unreachable";
  if (result.body.status === "ok" && result.body.database === "connected") return "ok";
  return "degraded";
}

export function toHealthState(view: ApiHealthView): HealthState {
  if (view === "checking") {
    return { globalStatus: "operational", entries: [], isLoading: true };
  }

  const serviceStatus = view === "ok" ? "operational" : view === "degraded" ? "degraded" : "outage";

  return {
    globalStatus: serviceStatus === "operational" ? "operational" : serviceStatus === "degraded" ? "degraded" : "outage",
    entries: [
      { id: "svc_api", label: "Core API", status: serviceStatus },
      { id: "svc_db", label: "Primary Database", status: serviceStatus },
    ],
    isLoading: false,
  };
}
