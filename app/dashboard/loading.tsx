export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-slate-700 border-t-primary" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-primary/10 blur-md" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      </div>
      <p className="text-sm font-medium tracking-wide text-slate-400">
        Wird geladen…
      </p>
    </div>
  );
}
