import { Skeleton } from "@/components/ui/skeleton";

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <Skeleton className="h-3 w-24 bg-slate-800" />
          <Skeleton className="mt-3 h-7 w-32 bg-slate-800" />
          <Skeleton className="mt-2 h-3 w-20 bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}
