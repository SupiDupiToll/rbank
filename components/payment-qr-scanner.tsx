"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PAYMENT_HOST = "rbank.sdtoll.de";
const PAYMENT_PATH_PREFIX = "/zahlungen";

function normalizePaymentTarget(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedUrl =
    trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")
      ? trimmedValue
      : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const isAllowedHost = parsedUrl.hostname === PAYMENT_HOST;
    const isAllowedPath = parsedUrl.pathname.startsWith(PAYMENT_PATH_PREFIX);

    if (!isAllowedHost || !isAllowedPath) {
      return null;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return null;
  }
}

export function PaymentQrScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRedirectingRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState("Scanner noch nicht gestartet.");

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      }
    };
  }, []);

  async function startScanner() {
    setIsStarting(true);
    setMessage("Kamerazugriff wird angefragt...");

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
          if (isRedirectingRef.current) return;

          const target = normalizePaymentTarget(decodedText);

          if (target) {
            isRedirectingRef.current = true;
            setMessage("Gueltiger Zahlungslink erkannt. Weiterleitung...");
            scanner.stop().catch(() => {});
            window.location.href = target;
          } else {
            setMessage(
              "QR-Code erkannt, aber kein gueltiger Zahlungslink von rbank.sdtoll.de/zahlungen.",
            );
          }
        },
        () => {
          // Scan error – silently ignore
        },
      );

      setIsScanning(true);
      setMessage("QR-Code wird gesucht...");
    } catch {
      setMessage("Kamerazugriff wurde verweigert oder ist nicht verfügbar.");
    } finally {
      setIsStarting(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
    setMessage("Scanner gestoppt.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Zahlung entgegennehmen
          </p>
          <h2 className="mt-2 text-3xl font-display text-slate-100">
            QR-Code scannen
          </h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Öffne die Kamera, scanne den QR-Code des Kunden und leite nur dann
            weiter, wenn der Code auf rbank.sdtoll.de/zahlungen zeigt.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
          <div id="qr-reader" className="aspect-[4/5] md:aspect-[16/9]" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="rounded-xl sm:min-w-48"
            disabled={isStarting || isScanning}
            onClick={startScanner}
            type="button"
          >
            {isStarting
              ? "Kamera startet..."
              : isScanning
                ? "Scanner aktiv"
                : "Kamera freigeben"}
          </Button>
          <Button
            className="rounded-xl sm:min-w-40"
            disabled={!isScanning}
            onClick={stopScanner}
            type="button"
            variant="outline"
          >
            Scanner stoppen
          </Button>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-slate-100">Status</p>
          <p className="mt-2 text-sm text-slate-300">{message}</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-xl font-display text-slate-100">Ablauf</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <p>1. Kamera freigeben.</p>
          <p>2. QR-Code vor die Kamera halten.</p>
          <p>
            3. Weiterleitung erfolgt nur bei gueltigen Links unter
            `rbank.sdtoll.de/zahlungen...`.
          </p>
        </div>
      </Card>
    </div>
  );
}
