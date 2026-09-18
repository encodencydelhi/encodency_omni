"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRoles } from "./repository";
import type { AdminRole } from "./types";

export function useRolesData() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchRoles();
      setRoles(payload.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Roles unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { roles, isLoading, error, refresh };
}
