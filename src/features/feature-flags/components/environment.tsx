"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { DEFAULT_ENVIRONMENT, ENVIRONMENTS, parseEnvironment } from "../data/config";
import type { Environment } from "../data/types";

const KEYS = ["env"] as const;

/**
 * The environment every Feature Flags screen is showing. It lives in the URL (?env=),
 * production being the default, so refresh, sharing and Back all keep it. An unknown
 * value falls back to production and is reported so it is never silently swallowed.
 */
export function useEnvironment(): { environment: Environment; invalid: string | null; set: (environment: Environment) => void } {
  const params = useSearchParams();
  const url = useUrlParams(KEYS);
  const raw = params.get("env");
  const parsed = parseEnvironment(raw);
  return {
    environment: parsed ?? DEFAULT_ENVIRONMENT,
    invalid: raw && !parsed ? raw : null,
    set: (environment) => url.set({ env: environment === DEFAULT_ENVIRONMENT ? null : environment }),
  };
}

/** Segmented environment control. Production is the default and the only one that carries a warning tone. */
export function EnvironmentSwitch({ environment, onChange, className }: { environment: Environment; onChange: (environment: Environment) => void; className?: string }) {
  return (
    <div role="group" aria-label="Environment" className={cn("inline-flex overflow-hidden rounded-sm border border-border-strong", className)}>
      {ENVIRONMENTS.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={environment === item.value}
          onClick={() => onChange(item.value)}
          className={cn("h-8 px-3 text-[0.8125rem] font-medium transition-colors", environment === item.value ? (item.value === "production" ? "bg-warning-subtle text-warning" : "bg-primary-subtle text-primary") : "bg-card text-muted-foreground hover:bg-accent")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
