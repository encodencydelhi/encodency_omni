"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { clientsApi, type ClientRecord } from "@/features/admin/projects/live/clients-api";

/**
 * Inline Client picker for channel pages that gate every request on
 * `useTenancyContext().clientId`. Scope resolution can legitimately end up empty
 * (the Company has no Clients yet, or the first list request failed), and the
 * scope notice alone gives the operator no way out — this renders the options
 * right where the message appears.
 */
export function ClientScopeSelect({
  companyId,
  onSelect,
}: {
  companyId: string;
  onSelect: (clientId: string) => void;
}) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State is only touched from promise callbacks so the effect below never
  // writes state synchronously; `retry` (an event handler) re-arms the spinner.
  const fetchClients = useCallback(() => {
    if (!companyId) return Promise.resolve();
    return clientsApi
      .list(companyId)
      .then((rows) => {
        setClients(rows);
        setError(null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load Clients."))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void fetchClients();
  }, [companyId, fetchClients]);

  const retry = () => {
    setLoading(true);
    setError(null);
    void fetchClients();
  };

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-amber-800">
        <span className="inline-flex items-center gap-1.5"><AlertCircle className="size-3.5 shrink-0" />{error}</span>
        <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-semibold underline">
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Loading Clients…</p>;
  }

  if (clients.length === 0) {
    return <p className="text-xs text-slate-600">This Company has no Clients yet. Create one under Clients, then reload.</p>;
  }

  return (
    <select
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) onSelect(event.target.value);
      }}
      className="h-9 min-w-56 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
    >
      <option value="" disabled>
        Choose a Client…
      </option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.displayName || client.name}
        </option>
      ))}
    </select>
  );
}
