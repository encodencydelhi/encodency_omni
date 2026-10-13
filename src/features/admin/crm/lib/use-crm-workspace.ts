"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isMockMode } from "@/config/env";
import { useAuth } from "@/features/auth/components/auth-provider";
import { teamApi } from "@/features/admin/team/live/team-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { crmApi, type CrmScope } from "../data/crm-api";
import { teamMembers } from "../data/crm-data";
import type { CrmActivity } from "../types";
import { initialsOf, newId, normalizeActivity } from "./crm-records";

export interface Assignee { id: string; name: string }

/**
 * Tenant scope, assignable team members and best-effort activity logging for a
 * CRM page. In mock mode there is no API: scope is null and calls are skipped.
 */
export function useCrmWorkspace(entityType: CrmActivity["entityType"]) {
  const { user } = useAuth();
  const { companyId, clientId, isReady } = useTenancyContext();
  const scope = useMemo<CrmScope | null>(() => (companyId && clientId ? { companyId, clientId } : null), [companyId, clientId]);
  const [assignees, setAssignees] = useState<Assignee[]>(() => (isMockMode ? teamMembers.map((m) => ({ id: m.id, name: m.name })) : []));
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const actor = user?.name?.trim() || user?.email || "Team member";

  useEffect(() => {
    if (isMockMode || !scope) return;
    let cancelled = false;
    teamApi.listMembers(scope.companyId).then((rows) => {
      if (cancelled) return;
      const active = rows.filter((m) => !m.suspendedAt).map((m) => ({ id: m.user.id, name: m.user.name?.trim() || m.user.email }));
      if (active.length) setAssignees(active);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [scope]);

  const logActivity = useCallback(async (type: CrmActivity["type"], description: string, entityId: string, oldValue?: string, newValue?: string) => {
    const entry = normalizeActivity({
      id: newId("a"), type, actor, actorInitials: initialsOf(actor), description, oldValue, newValue,
      entityId, entityType, createdAt: new Date().toISOString(),
    });
    try {
      const saved = isMockMode ? entry : normalizeActivity(await crmApi.create("activity", entry, scope ?? undefined));
      setActivities((prev) => [saved, ...prev]);
    } catch { /* The primary action already succeeded; activity logging is best-effort. */ }
  }, [actor, entityType, scope]);

  return { scope, isReady, assignees, activities, setActivities, actor, logActivity };
}
