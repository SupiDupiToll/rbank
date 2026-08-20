"use client";

export default function Loading() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="glass-card mesh-gradient flex h-24 w-24 items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            account_balance
          </span>
        </div>
        <div className="text-center">
          <p className="font-headline-md text-headline-md font-black tracking-wide text-on-surface">
            RBANK
          </p>
          <p className="font-label-sm text-label-sm mt-1 text-primary/60">
            Online Banking
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-surface-container-highest border-t-primary" />
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Wird geladen…
        </p>
      </div>
    </div>
  );
}