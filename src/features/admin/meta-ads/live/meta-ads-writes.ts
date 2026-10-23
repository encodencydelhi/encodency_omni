"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { metaAdsApi, type MetaAdsEntityKind } from "./meta-ads-api";

function errorMessage(error: unknown): string {
  return ApiError.isApiError(error) ? error.message : "Meta did not confirm the change.";
}

export function useMetaAdsWrites() {
  const { companyId } = useTenancyContext();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["meta-ads", companyId] });
  }, [companyId, queryClient]);

  const setStatus = useCallback(async (kind: MetaAdsEntityKind, id: string, name: string, currentStatus: string, dailyBudget: number | null, adAccountId: string) => {
    const activating = currentStatus === "paused";
    if (activating) {
      if (!dailyBudget) {
        toast.error("Set a daily budget before activating this item.");
        return false;
      }
      const approved = window.confirm(`Activate “${name}”? Spend can begin immediately with a daily budget of ${dailyBudget.toFixed(2)}.`);
      if (!approved) return false;
    }
    setBusyId(id);
    try {
      await metaAdsApi.updateStatus(companyId, kind, id, {
        adAccountId,
        status: activating ? "ACTIVE" : "PAUSED",
        ...(activating ? { confirmedDailyBudgetMinor: Math.round(dailyBudget! * 100) } : {}),
      });
      toast.success(`${activating ? "Activated" : "Paused"} “${name}”.`);
      await refresh();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusyId(null);
    }
  }, [companyId, refresh]);

  return { busyId, refresh, setStatus };
}
