"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-dark px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-7xl">📡</div>
        <h1 className="mb-3 text-3xl font-display text-slate-100">Offline</h1>
        <p className="text-lg text-slate-400">
          Keine Internetverbindung — Daten werden nach Verbindung aktualisiert
        </p>
        <button
          className="mt-8 rounded-xl bg-primary px-8 py-3 font-semibold text-background-dark transition-colors hover:bg-primary/80"
          onClick={() => window.location.reload()}
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
