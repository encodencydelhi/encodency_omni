"use client";

import { PlugIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import {
  INTEGRATION_PROVIDER,
  INTEGRATION_STATUS,
  type CompanyIntegration,
} from "@/types/domain/integration";
import { useCompanyIntegrations } from "../../hooks/use-companies";

function IntegrationRow({ integration }: { integration: CompanyIntegration }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.8125rem] font-medium text-foreground">
            {INTEGRATION_PROVIDER[integration.provider].label}
          </p>
          <StatusBadge registry={INTEGRATION_STATUS} status={integration.status} withDot />
        </div>
        <p className="truncate text-2xs text-muted-foreground">
          {integration.accountName} · {integration.projectName}
        </p>
        {/* Scopes are shown, secrets and tokens never are. */}
        <p className="truncate text-2xs text-muted-foreground">
          Scopes: {integration.scopes.join(", ")}
        </p>
      </div>

      <div className="shrink-0 text-left sm:text-right">
        <p className="text-2xs text-muted-foreground">
          Last sync {formatRelativeTime(integration.lastSyncAt)}
        </p>
        <p className="text-2xs text-muted-foreground">
          {integration.tokenExpiresAt
            ? `Token expires ${formatDate(integration.tokenExpiresAt)}`
            : "No active token"}
        </p>
      </div>
    </li>
  );
}

/** Every channel connection this organisation holds, grouped as a flat list. */
export function CompanyIntegrationsTab({ companyId }: { companyId: string }) {
  const { data, isPending, error, refetch } = useCompanyIntegrations(companyId);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {isPending ? (
        <div className="space-y-4 p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={PlugIcon}
          title="No channels connected"
          description="This organisation has not authorised any external platform yet."
        />
      ) : (
        <ul className="divide-y divide-border">
          {data?.map((integration) => (
            <IntegrationRow key={integration.id} integration={integration} />
          ))}
        </ul>
      )}
    </div>
  );
}
