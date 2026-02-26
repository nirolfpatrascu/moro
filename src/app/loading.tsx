export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-card border border-border bg-surface p-6"
          >
            <div className="mb-3 h-3 w-24 rounded bg-border" />
            <div className="mb-2 h-7 w-32 rounded bg-border" />
            <div className="h-3 w-16 rounded bg-border-light" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="animate-pulse rounded-card border border-border bg-surface">
        <div className="border-b border-border p-4">
          <div className="h-4 w-48 rounded bg-border" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border-light p-4 last:border-0">
            <div className="h-4 w-24 rounded bg-border-light" />
            <div className="h-4 w-32 rounded bg-border-light" />
            <div className="h-4 w-20 rounded bg-border-light" />
            <div className="h-4 flex-1 rounded bg-border-light" />
          </div>
        ))}
      </div>
    </div>
  );
}
