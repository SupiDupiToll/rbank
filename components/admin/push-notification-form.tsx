"use client";

import { useState, useTransition } from "react";

type PushFormProps = {
  csrfToken?: string;
};

export function PushNotificationForm({ csrfToken }: PushFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [result, setResult] = useState<{ success: boolean; sentCount?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/notifications/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken ?? ""
          },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            userId: sendToAll ? undefined : userId.trim() || undefined
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setResult({ success: false, error: data.error ?? "Fehler beim Senden" });
          return;
        }

        setResult({ success: true, sentCount: data.sentCount });
        setTitle("");
        setBody("");
        setUserId("");
      } catch {
        setResult({ success: false, error: "Netzwerkfehler" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Push-Benachrichtigung senden</h3>

      <div className="mb-4">
        <label className="mb-1 block text-sm text-slate-400">Empfänger</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="recipient"
              checked={sendToAll}
              onChange={() => setSendToAll(true)}
              className="accent-primary"
            />
            Alle Benutzer
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="recipient"
              checked={!sendToAll}
              onChange={() => setSendToAll(false)}
              className="accent-primary"
            />
            Bestimmter Benutzer
          </label>
        </div>
      </div>

      {!sendToAll && (
        <div className="mb-4">
          <label htmlFor="userId" className="mb-1 block text-sm text-slate-400">
            Benutzer-ID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="cuid des Benutzers"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-primary focus:outline-none"
          />
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="push-title" className="mb-1 block text-sm text-slate-400">
          Titel
        </label>
        <input
          id="push-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Systemwartung"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-primary focus:outline-none"
          required
        />
      </div>

      <div className="mb-6">
        <label htmlFor="push-body" className="mb-1 block text-sm text-slate-400">
          Nachricht
        </label>
        <textarea
          id="push-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Benachrichtigungstext..."
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-primary focus:outline-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !title.trim() || !body.trim()}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-background-dark transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Senden..." : "Push-Benachrichtigung senden"}
      </button>

      {result && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            result.success ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
          }`}
        >
          {result.success
            ? `✅ Gesendet an ${result.sentCount} Gerät(e)`
            : `❌ ${result.error}`}
        </div>
      )}
    </form>
  );
}
