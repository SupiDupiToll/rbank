"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="glass-card mesh-gradient mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            cloud_off
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md mb-3 text-on-surface">
          Offline
        </h1>
        <p className="text-lg text-on-surface-variant">
          Keine Internetverbindung — Daten werden nach Verbindung aktualisiert
        </p>
        <button
          className="bg-primary-container glow-effect mt-8 rounded-full px-8 py-3 font-semibold text-white transition-colors hover:opacity-90"
          onClick={() => window.location.reload()}
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}