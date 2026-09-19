/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Polished Loading Skeletons
 */


export function IntegrationsOverviewSkeleton() {
  return (
    <div className="space-y-4 max-w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-3.5 w-80 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-slate-200 rounded-lg" />
          <div className="h-8 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Nav Skeleton */}
      <div className="h-9 w-full bg-slate-100 rounded-lg" />

      {/* KPI Cards Strip (gap-1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200/60 p-3 space-y-2">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-6 w-12 bg-slate-300 rounded" />
            <div className="h-2.5 w-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 h-80 bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
        <div className="h-80 bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
      </div>

      {/* Bottom Strip */}
      <div className="h-44 bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
    </div>
  );
}

export function ProvidersCatalogueSkeleton() {
  return (
    <div className="space-y-4 max-w-full animate-pulse">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="h-6 w-44 bg-slate-200 rounded" />
          <div className="h-3.5 w-72 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
      </div>

      <div className="h-9 w-full bg-slate-100 rounded-lg" />

      {/* Toolbar Skeleton */}
      <div className="h-12 w-full bg-slate-100 rounded-xl border border-slate-200/60" />

      {/* Cards Grid (gap-1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-xl border border-slate-200/60 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="size-9 bg-slate-200 rounded-lg" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-200/60 rounded" />
            <div className="h-14 w-full bg-slate-200/40 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProviderDetailSkeleton() {
  return (
    <div className="space-y-4 max-w-full animate-pulse">
      <div className="h-4 w-40 bg-slate-200 rounded" />
      <div className="h-20 w-full bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3" />
        ))}
      </div>
      <div className="h-96 w-full bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
    </div>
  );
}

export function ConnectionsDirectorySkeleton() {
  return (
    <div className="space-y-4 max-w-full animate-pulse">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-3.5 w-80 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
      </div>

      <div className="h-9 w-full bg-slate-100 rounded-lg" />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3" />
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="h-96 w-full bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
    </div>
  );
}

export function ConnectionDetailSkeleton() {
  return (
    <div className="space-y-4 max-w-full animate-pulse">
      <div className="h-4 w-40 bg-slate-200 rounded" />
      <div className="h-20 w-full bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3" />
        ))}
      </div>
      <div className="h-96 w-full bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
    </div>
  );
}

export function IssuesQueueSkeleton() {
  return (
    <div className="space-y-4 max-w-full animate-pulse">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-3.5 w-80 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
      </div>

      <div className="h-9 w-full bg-slate-100 rounded-lg" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3" />
        ))}
      </div>

      <div className="h-96 w-full bg-slate-100 rounded-xl border border-slate-200/60 p-4" />
    </div>
  );
}
