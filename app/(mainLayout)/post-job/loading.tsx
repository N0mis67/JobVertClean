export default function LoadingPostJobPage() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </div>
          <div className="h-12 rounded bg-muted" />
          <div className="h-[280px] rounded bg-muted" />
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="h-6 w-56 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </div>
          <div className="h-20 rounded bg-muted" />
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="h-6 w-64 rounded bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}