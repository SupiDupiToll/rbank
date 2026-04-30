"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { formatGermanDate } from "@/lib/date";

type DonationBoxItem = {
  id: string;
  name: string;
  slug: string;
  link: string;
  createdAt: string;
  ownerName: string;
  ownerCustomerId: string;
};

type Props = {
  initialOwnBoxes: DonationBoxItem[];
  initialAllBoxes: DonationBoxItem[];
};

function DonationBoxRow({
  item,
  action = "copy",
}: {
  item: DonationBoxItem;
  action?: "copy" | "open";
}) {
  const [message, setMessage] = useState("");

  async function handleAction() {
    if (action === "open") {
      window.open(item.link, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await navigator.clipboard.writeText(item.link);
      setMessage("Link kopiert.");
    } catch {
      setMessage(item.link);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-100">{item.name}</p>
          <p className="mt-1 text-sm text-slate-400">
            von {item.ownerName} · #{item.ownerCustomerId}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Erstellt am {formatGermanDate(item.createdAt)}
          </p>
          <a
            className="mt-2 block truncate text-sm text-primary hover:text-primary/80"
            href={item.link}
            rel="noreferrer"
            target="_blank"
          >
            {item.link}
          </a>
        </div>
        <Button
          className="h-10 shrink-0 rounded-full px-4"
          onClick={() => void handleAction()}
          type="button"
          variant="outline"
        >
          {action === "open" ? "Oeffnen" : "Link kopieren"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}

export function DonationBoxesDashboard({
  initialOwnBoxes,
  initialAllBoxes,
}: Props) {
  const router = useRouter();
  const [ownBoxes, setOwnBoxes] = useState(initialOwnBoxes);
  const [allBoxes, setAllBoxes] = useState(initialAllBoxes);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setMessage("Bitte einen Namen fuer die Spendenbox eingeben.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/customer/donation-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({ name }),
      });

      const data = (await response.json()) as {
        error?: string;
        donationBox?: DonationBoxItem;
      };

      if (!response.ok || !data.donationBox) {
        setMessage(data.error ?? "Spendenbox konnte nicht erstellt werden.");
        return;
      }

      setOwnBoxes((current) => [data.donationBox!, ...current]);
      setAllBoxes((current) => [data.donationBox!, ...current]);
      setName("");
      setMessage("Spendenbox wurde erstellt.");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Community
        </p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">
          Spendenboxen
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Erstelle eigene Spendenboxen mit persoenlichem Link und sieh dir alle
          bisher erstellten Boxen im Netzwerk an.
        </p>
      </header>

      <Card className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            Neue Spendenbox erstellen
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Name eingeben, Link erzeugen und direkt teilen.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Klassenfahrt 2026"
            value={name}
          />
          <Button
            className="h-14 rounded-2xl px-6"
            disabled={isSubmitting}
            onClick={() => void handleCreate()}
            type="button"
          >
            {isSubmitting ? "Erstellt..." : "Spendenbox erstellen"}
          </Button>
        </div>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </Card>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
            Deine Boxen
          </p>
          <h3 className="mt-2 text-2xl font-display text-slate-100">
            Eigene Spendenlinks
          </h3>
        </div>
        {ownBoxes.length === 0 ? (
          <Card className="border border-dashed border-slate-700 bg-slate-950/40">
            <p className="text-sm text-slate-400">
              Noch keine Spendenbox erstellt.
            </p>
          </Card>
        ) : (
          ownBoxes.map((item) => <DonationBoxRow item={item} key={item.id} />)
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
            Netzwerk
          </p>
          <h3 className="mt-2 text-2xl font-display text-slate-100">
            Alle Spendenboxen
          </h3>
        </div>
        {allBoxes.length === 0 ? (
          <Card className="border border-dashed border-slate-700 bg-slate-950/40">
            <p className="text-sm text-slate-400">Es gibt noch keine Eintraege.</p>
          </Card>
        ) : (
          allBoxes.map((item) => (
            <DonationBoxRow action="open" item={item} key={item.id} />
          ))
        )}
      </section>
    </div>
  );
}
