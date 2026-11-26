export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden />;
}

/** Row-shaped loading placeholder for document lists. */
export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function DocumentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: rows }).map((_, index) => (
        <DocumentRowSkeleton key={index} />
      ))}
    </div>
  );
}
