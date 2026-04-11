"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

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
          if (isRedirectingRef.current) return;

          const target = normalizePaymentTarget(decodedText);

          if (target) {
            isRedirectingRef.current = true;
            const separator = target.includes("?") ? "&" : "?";
            const returnUrl = encodeURIComponent("/dashboard");
            const redirectUrl = `${target}${separator}return_url=${returnUrl}`;
            setMessage("Zahlungslink erkannt. Weiterleitung…");
            scanner.stop().catch(() => {});
            window.location.href = redirectUrl;
          } else {
            setMessage("Kein gültiger Zahlungslink erkannt.");
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
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
    setMessage("Scanner gestoppt.");
  }

  return (
    <div className="space-y-8">
      {/* Scanner Area */}
      <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/40">
        <div id="qr-reader" className="aspect-[4/5] md:aspect-[16/9]" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          className="h-14 rounded-xl text-sm"
          disabled={isStarting || isScanning}
          onClick={startScanner}
          type="button"
        >
          {isStarting
            ? "Kamera startet…"
            : isScanning
              ? "Scanner aktiv"
              : "Kamera freigeben"}
        </Button>
        <Button
          className="h-14 rounded-xl text-sm"
          disabled={!isScanning}
          onClick={stopScanner}
          type="button"
          variant="outline"
        >
          Scanner stoppen
        </Button>
      </div>

      {/* Status */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/80">
          Status
        </p>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
      </div>

      {/* Steps */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-5 py-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          So geht&apos;s
        </p>
        <ol className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
              1
            </span>
            Kamera freigeben
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
              2
            </span>
            QR-Code des Kunden vor die Kamera halten
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
              3
            </span>
            Automatische Weiterleitung zum Zahlungslin
          </li>
        </ol>
      </div>
    </div>
  );
}
