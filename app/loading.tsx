export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-on-surface-variant">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-surface-container-highest border-t-primary" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-primary-container/20 blur-md" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="material-symbols-outlined text-xl text-primary">
            account_balance
          </div>
        </div>
      </div>
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        Wird geladen…
      </p>
    </div>
  );
}