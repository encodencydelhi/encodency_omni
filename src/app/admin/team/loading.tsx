import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-2 p-4"><div className="grid grid-cols-3 gap-1 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16"/>)}</div><Skeleton className="h-10"/><Skeleton className="h-80"/></div>; }
