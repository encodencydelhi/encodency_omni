"use client";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CrmCursorPagination({ count, page, size, loading, error, hasMore, hasPrevious, onNext, onPrevious, onSize }: { count: number; page: number; size: number; loading: boolean; error: unknown; hasMore: boolean; hasPrevious: boolean; onNext: () => void; onPrevious: () => void; onSize: (size: number) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600" aria-label="CRM cursor pagination">
    <span aria-live="polite">{loading ? 'Loading matching records…' : error ? 'This page could not be loaded. Retry without changing the selection.' : `Page ${page} · ${count} matching records shown`}</span>
    <div className="flex items-center gap-2">
      <Select value={String(size)} onValueChange={value => onSize(Number(value))}><SelectTrigger size="sm" className="w-28" aria-label="Records per page"><SelectValue /></SelectTrigger><SelectContent>{[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>)}</SelectContent></Select>
      <Button variant="outline" size="sm" disabled={loading || !hasPrevious} onClick={onPrevious}>Previous</Button>
      <Button variant="outline" size="sm" disabled={loading || !hasMore} onClick={onNext}>Next</Button>
    </div>
  </div>;
}
