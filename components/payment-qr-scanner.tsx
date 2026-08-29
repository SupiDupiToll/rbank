"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RBANK_PAY_PREFIX = "RBANK:PAY:";

function parseRbankPayload(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue.startsWith(RBANK_PAY_PREFIX)) {
    return null;
  }

  const recipientUserId = trimmedValue.slice(RBANK_PAY_PREFIX.length).trim();

  if (!/^c[a-z0-9]{24,}$/i.test(recipientUserId)) {
    return null;
  }

  return recipientUserId;
}

export function PaymentQrScanner({ myUserId }: { myUserId: string }) {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandledRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState("Kamera wird geöffnet…");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(`${RBANK_PAY_PREFIX}${myUserId}`, {
      margin: 2,
      width: 256,
      color: { dark: "#1e3a5f", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // QR-Code konnte nicht generiert werden – Hinweis reicht.
      });

    return () => {
      cancelled = true;
    };
  }, [myUserId]);

  useEffect(() => {
    void startScanner();

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    if (scannerRef.current || isHandledRef.current) return;

    setIsStarting(true);
    setMessage("Kamerazugriff wird angefragt…");

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (isHandledRef.current) return;

          const recipientUserId = parseRbankPayload(decodedText);

          if (recipientUserId) {
            isHandledRef.current = true;
            setMessage("RBank-Code erkannt. Zahlung wird geöffnet…");
            scanner.stop().catch(() => {});
            router.push(`/zahlungen/scan/${recipientUserId}` as Route);
          } else {
            setMessage("Kein gültiger RBank-Zahlungscode erkannt.");
          }
        },
        () => {
          // Scan error – silently ignore
        },
      );

      setIsScanning(true);
      setMessage("QR-Code wird gesucht…");
    } catch {
      setMessage("Kamerazugriff verweigert oder nicht verfügbar.");
    } finally {
      setIsStarting(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setMessage("Scanner gestoppt.");
  }

  return (
    <div className="space-y-6">
      {/* Scanner Area */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div id="qr-reader" className="aspect-[4/5] md:aspect-[16/9]" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          className="h-12 text-sm"
          disabled={isStarting || isScanning}
          onClick={startScanner}
          type="button"
        >
          {isStarting
            ? "Kamera startet…"
            : isScanning
              ? "Scanner aktiv"
              : "Kamera starten"}
        </Button>
        <Button
          className="h-12 text-sm"
          disabled={!isScanning}
          onClick={stopScanner}
          type="button"
          variant="outline"
        >
          Scanner stoppen
        </Button>
      </div>

      {/* Status */}
      <div className="glass-card rounded-2xl p-4">
        <p className="font-label-sm text-label-sm text-primary">Status</p>
        <p className="mt-1 text-sm text-on-surface">{message}</p>
      </div>

      {/* Händler QR-Code */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">
            storefront
          </span>
          <p className="font-label-sm text-label-sm text-primary">
            Händler QR-Code
          </p>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Kunden können diesen Code in ihrer RBank-App scannen, um dir einen
          Betrag zu zahlen. Kein Link nötig – nur RBank versteht ihn.
        </p>
        <div
          className={cn(
            "mt-4 flex items-center justify-center rounded-2xl bg-white p-4",
            !qrDataUrl && "min-h-40",
          )}
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Händler QR-Code für RBank-Zahlungen"
              className="h-48 w-48"
            />
          ) : (
            <p className="text-sm text-on-surface-variant">
              QR-Code wird generiert…
            </p>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="glass-card rounded-2xl p-4">
        <p className="font-label-sm text-label-sm mb-3 text-on-surface-variant">
          So geht&apos;s
        </p>
        <ol className="space-y-2 text-sm text-on-surface-variant">
          <li className="flex gap-3">
            <span className="glass-card flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-surface">
              1
            </span>
            RBank-Zahlungscode des Kunden vor die Kamera halten
          </li>
          <li className="flex gap-3">
            <span className="glass-card flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-surface">
              2
            </span>
            Betrag eingeben und mit PIN bestätigen
          </li>
          <li className="flex gap-3">
            <span className="glass-card flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-surface">
              3
            </span>
            Geld kommt direkt auf dem Konto des Händlers an
          </li>
        </ol>
      </div>
    </div>
  );
}
