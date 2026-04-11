"use client";

export default function Loading() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      {/* Splash-ähnliches Branding */}
      <div className="flex flex-col items-center gap-6">
        {/* App-Logo */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 backdrop-blur-xl">
          <span className="text-3xl font-black tracking-[0.2em] text-primary">
            RB
          </span>
        </div>
        {/* App-Name */}
        <div className="text-center">
          <p className="text-2xl font-display font-black tracking-wide text-slate-100">
            RBANK
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-primary/60">
            Online Banking
          </p>
        </div>
      </div>

      {/* Lade-Animation */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-slate-700 border-t-primary" />
        </div>
        <p className="text-xs font-medium tracking-wide text-slate-500">
          Wird geladen…
        </p>
      </div>
    </div>
  );
}
