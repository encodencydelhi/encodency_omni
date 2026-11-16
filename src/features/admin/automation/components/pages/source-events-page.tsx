'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { automationApi, type ClientScope } from '../../data/automation-api';
import { errorMessage, useAutomationScope } from '../../data/hooks';
import { formatDateTime } from '../shared';
import { useTenancyContext } from '@/lib/api/tenancy-context';

export function SourceEventsPage() {
  const { clientId } = useAutomationScope();
  const { companyId } = useTenancyContext();
  return <SourceEventsPanel key={`${companyId}:${clientId ?? 'all'}`} companyId={companyId} clientId={clientId} />;
}

function SourceEventsPanel({ clientId, companyId }: { clientId: ClientScope; companyId: string | null }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuerySearch(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [busy, setBusy] = useState<string | null>(null);
  const cursor = cursors.at(-1);
  const query = useQuery({ queryKey: ['automation', 'source-events', companyId, clientId, status, cursor, querySearch], queryFn: () => automationApi.sourceEvents(clientId, status, cursor, querySearch), enabled: Boolean(companyId), refetchInterval: 15_000 });
  const replay = async (id: string) => {
    setBusy(id);
    try { await automationApi.replaySourceEvent(clientId, id); toast.success('Event queued for recovery. Existing workflow events stay deduplicated.'); await query.refetch(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  };
  const replayMatching = async () => {
    const count = Math.min(200, query.data?.counts.DEAD ?? 0);
    if (!count || !window.confirm(`Queue up to ${count} matching failed events for recovery? Fix the underlying failure first; unresolved problems will fail again. Expired inputs are excluded.`)) return;
    setBusy('bulk');
    try { const result = await automationApi.replayMatchingSourceEvents(clientId, querySearch); toast.success(`${result.recovered} events queued; ${result.remaining} matching failures remain.`); setCursors([undefined]); await query.refetch(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  };
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-900">Business event delivery</h2><p className="mt-1 max-w-3xl text-xs text-slate-600">Track business activity and routing. Paused companies resume automatically. Expired inputs cannot be recovered. Administrator access is required.</p></div>
      <button type="button" className="rounded-md border px-3 py-2 text-xs" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</button>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <input type="search" aria-label="Search event type or ID" placeholder="Search event type or ID" value={search} onChange={(event) => { setSearch(event.target.value); setCursors([undefined]); }} className="min-w-60 rounded-lg border px-3 py-2 text-xs" />
      <button type="button" disabled={busy !== null || search.trim() !== querySearch || !query.data?.counts.DEAD || (status !== '' && status !== 'DEAD')} onClick={() => void replayMatching()} className="rounded-lg border px-3 py-2 text-xs text-blue-700 disabled:opacity-40">{busy === 'bulk' ? 'Queueing...' : 'Recover matching failed events (up to 200)'}</button>
    </div>
    <div className="flex flex-wrap gap-3">
      {['PENDING', 'SENDING', 'PROCESSED', 'DEAD', 'EXPIRED', 'SUPPRESSED'].map((value) => <button key={value} type="button" onClick={() => { setStatus(value); setCursors([undefined]); }} className={`rounded-lg border px-3 py-2 text-xs ${status === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>{value === 'DEAD' ? 'Needs recovery' : value.toLowerCase()} <strong className="ml-2">{query.data?.counts[value] ?? 0}</strong></button>)}
      <select aria-label="Event delivery status" value={status} onChange={(event) => { setStatus(event.target.value); setCursors([undefined]); }} className="rounded-lg border px-3 text-xs"><option value="">All statuses</option>{['PENDING', 'SENDING', 'PROCESSED', 'DEAD', 'EXPIRED', 'SUPPRESSED'].map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    {query.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errorMessage(query.error)}</p> : query.isLoading ? <p className="p-4 text-sm text-slate-500">Loading events...</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="p-2">Event</th><th className="p-2">Received</th><th className="p-2">Status</th><th className="p-2">Attempts</th><th className="p-2">Summary</th><th className="p-2">Matched workflows</th><th className="p-2">Delivery detail</th><th className="p-2">Recovery</th></tr></thead><tbody>
        {query.data?.items.map((event) => <tr key={event.id} className="border-b border-slate-100 align-top"><td className="p-2"><div className="font-medium">{event.eventType.replaceAll('_', ' ')}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{event.id}</div></td><td className="whitespace-nowrap p-2">{formatDateTime(event.createdAt)}</td><td className="p-2">{event.status}</td><td className="p-2">{event.attempts}</td><td className="max-w-xs break-words p-2 text-slate-600">{event.summary?.scrubbed ? 'Inputs expired' : <>{event.summary?.resourceType ?? 'Business activity'}<div className="font-mono text-[10px]">{event.summary?.resourceId}</div>{event.summary?.outcome}</>}</td><td className="min-w-48 p-2"><div>{event.matchedWorkflowCount ? `${event.matchedWorkflowCount} matched` : event.status === 'PROCESSED' ? 'No matching workflow' : 'Routing incomplete'}</div>{event.matches?.map((match) => <div key={match.workflowId} className="mt-1 text-slate-600"><span className="font-medium">{match.name}</span> · {match.status}{match.runId ? <div className="font-mono text-[10px]">Run {match.runId}</div> : null}</div>)}</td><td className="max-w-md break-words p-2 text-slate-600">{event.lastError ?? (event.status === 'PROCESSED' ? 'Workflow routing completed' : 'Waiting for dispatch')}</td><td className="p-2">{event.replayable ? <button type="button" disabled={busy !== null} onClick={() => void replay(event.id)} className="rounded border px-2 py-1 font-medium text-blue-700">{busy === event.id ? 'Queueing...' : 'Recover event'}</button> : '—'}</td></tr>)}
        {!query.data?.items.length ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">No events match this selection. Only subscribed business activity is captured.</td></tr> : null}
      </tbody></table></div>
      <div className="flex justify-end gap-2"><button type="button" className="rounded border px-3 py-2 text-xs disabled:opacity-40" disabled={cursors.length <= 1} onClick={() => setCursors((value) => value.slice(0, -1))}>Previous</button><button type="button" className="rounded border px-3 py-2 text-xs disabled:opacity-40" disabled={!query.data?.nextCursor} onClick={() => { if (query.data?.nextCursor) setCursors((value) => [...value, query.data!.nextCursor!]); }}>Next</button></div>
    </>}
  </section>;
}
