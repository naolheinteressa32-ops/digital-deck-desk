import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className="h-9 bg-slate-800/60" />
          ))}
        </div>
      ))}
    </div>
  );
}
