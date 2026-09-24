"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Play, RefreshCw, Shield, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  HARNESS_ROUTES_META,
  tenancyHarnessService,
  type HarnessCheckResult,
  type HarnessRouteKey,
} from "../services/tenancy-harness-service";

const ROUTE_KEYS: HarnessRouteKey[] = [
  "platform",
  "company",
  "client",
  "client-optional",
  "campaigns-read",
  "campaigns-write",
];

export function TenancyHarnessCard() {
  const [companyId, setCompanyId] = useState("");
  const [clientId, setClientId] = useState("");
  const [running, setRunning] = useState(false);
  const [singleRunning, setSingleRunning] = useState<HarnessRouteKey | null>(null);
  const [results, setResults] = useState<Record<HarnessRouteKey, HarnessCheckResult | null>>({
    platform: null,
    company: null,
    client: null,
    "client-optional": null,
    "campaigns-read": null,
    "campaigns-write": null,
  });
  const [expandedRoute, setExpandedRoute] = useState<HarnessRouteKey | null>(null);

  async function handleRunAll() {
    setRunning(true);
    try {
      const headers = {
        companyId: companyId.trim() || undefined,
        clientId: clientId.trim() || undefined,
      };
      const checkResults = await tenancyHarnessService.runAllChecks(headers);
      const mapped: Record<HarnessRouteKey, HarnessCheckResult | null> = { ...results };
      for (const res of checkResults) {
        mapped[res.route] = res;
      }
      setResults(mapped);
    } finally {
      setRunning(false);
    }
  }

  async function handleRunSingle(route: HarnessRouteKey) {
    setSingleRunning(route);
    const meta = HARNESS_ROUTES_META[route];
    const start = Date.now();
    try {
      const headers = {
        companyId: companyId.trim() || undefined,
        clientId: clientId.trim() || undefined,
      };
      const response = await tenancyHarnessService.testRoute(route, headers);
      setResults((prev) => ({
        ...prev,
        [route]: {
          route,
          path: meta.path,
          description: meta.description,
          scope: meta.scope,
          requiredCapability: meta.requiredCapability,
          success: true,
          status: 200,
          durationMs: Date.now() - start,
          tenantContext: response.tenantContext,
        },
      }));
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      setResults((prev) => ({
        ...prev,
        [route]: {
          route,
          path: meta.path,
          description: meta.description,
          scope: meta.scope,
          requiredCapability: meta.requiredCapability,
          success: false,
          status: errorObj.status ?? 0,
          durationMs: Date.now() - start,
          error: errorObj.message || "Failed to execute harness check",
        },
      }));
    } finally {
      setSingleRunning(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-[#111C3A]" />
            <h2 className="text-sm font-bold text-[#111C3A]">
              Tenancy Guard Verification Harness (<code className="text-xs">/_manual/tenancy/*</code>)
            </h2>
            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10.5px] font-semibold text-indigo-700">
              6 Routes
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time verification of global NestJS TenantContextGuard, Company isolation, Client access rules, and RBAC capabilities.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunAll}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#111C3A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1e2e5c] disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", running && "animate-spin")} />
          {running ? "Verifying all…" : "Run All 6 Harness Checks"}
        </button>
      </div>

      <div className="border-b border-slate-100 bg-slate-50/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="harness-company-id" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              x-company-id Header (Optional)
            </label>
            <input
              id="harness-company-id"
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#111C3A] focus:outline-none focus:ring-1 focus:ring-[#111C3A]"
            />
            <p className="mt-1 text-[11px] text-slate-500">Passed for company-scoped harness routes.</p>
          </div>
          <div>
            <label htmlFor="harness-client-id" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              x-client-id Header (Optional)
            </label>
            <input
              id="harness-client-id"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. client-uuid-or-id"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#111C3A] focus:outline-none focus:ring-1 focus:ring-[#111C3A]"
            />
            <p className="mt-1 text-[11px] text-slate-500">Passed for client-required & client-optional routes.</p>
          </div>
          <div className="flex items-end">
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Notice:</span> Calls send{" "}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-[10px]">skipSessionExpiry: true</code> so unauthorized
              test probes (401/403) will not log you out of your session.
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {ROUTE_KEYS.map((routeKey) => {
          const meta = HARNESS_ROUTES_META[routeKey];
          const result = results[routeKey];
          const isExpanded = expandedRoute === routeKey;
          const isBusy = singleRunning === routeKey;

          return (
            <div key={routeKey} className="px-4 py-3 transition hover:bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#111C3A]">{meta.path}</span>
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                      {meta.scope}
                    </span>
                    {meta.requiredCapability ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800">
                        Capability: {meta.requiredCapability}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {result ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                          result.success
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700",
                        )}
                      >
                        {result.success ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        {result.status ? `${result.status}` : "Error"}
                      </span>
                      <span className="text-[11px] text-slate-400">{result.durationMs}ms</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Not run yet</span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRunSingle(routeKey)}
                    disabled={isBusy || running}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Play className={cn("size-3", isBusy && "animate-spin")} />
                    {isBusy ? "Running…" : "Test"}
                  </button>

                  {result ? (
                    <button
                      type="button"
                      onClick={() => setExpandedRoute(isExpanded ? null : routeKey)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={isExpanded ? "Collapse response" : "Expand response"}
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  ) : null}
                </div>
              </div>

              {isExpanded && result ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-slate-100">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-1.5 text-[11px] text-slate-400">
                    <span>Resolved TenantContext Payload</span>
                    <span>Status: {result.status}</span>
                  </div>
                  {result.tenantContext ? (
                    <pre className="overflow-x-auto text-[11.5px] leading-relaxed text-emerald-400">
                      {JSON.stringify(result.tenantContext, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-rose-400">
                      <p className="font-bold">Error Message:</p>
                      <p className="mt-1">{result.error}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
