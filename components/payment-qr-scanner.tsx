"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { PaymentRequestFlow } from "@/components/payment-request-flow";
import { cn } from "@/lib/utils";

const RBANK_PAY_PREFIX = "RBANK:PAY:";

function parseRbankPayload(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();

  if (trimmedValue.startsWith(RBANK_PAY_PREFIX)) {
    const recipientUserId = trimmedValue.slice(RBANK_PAY_PREFIX.length).trim();
    return /^c[a-z0-9]{24,}$/i.test(recipientUserId) ? recipientUserId : null;
  }

  // Alte URL-QRs (https://<host>/zahlungen/<userId>) weiterhin akzeptieren –
  // sie öffnen das Popup statt einer neuen Seite.
  try {
    const normalizedUrl =
      trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")
        ? trimmedValue
        : `https://${trimmedValue}`;
    const parsedUrl = new URL(normalizedUrl);

    if (
      parsedUrl.hostname === window.location.hostname &&
      parsedUrl.pathname.startsWith("/zahlungen/")
    ) {
      const userId = parsedUrl.pathname.split("/").filter(Boolean)[1] ?? "";
      return /^c[a-z0-9]{24,}$/i.test(userId) ? userId : null;
    }
  } catch {
    // Kein URL-Format – ignorieren.
  }

  return null;
}

type ScannedRecipient = {
  userId: string;
  displayName: string;
};

export function PaymentQrScanner({ myUserId }: { myUserId: string }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandledRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState("Kamera wird geöffnet…");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scannedRecipient, setScannedRecipient] =
    useState<ScannedRecipient | null>(null);

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
        scannerRef.current = null;
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
            void openPaymentPopup(recipientUserId);
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
  }

  async function openPaymentPopup(recipientUserId: string) {
    await stopScanner();

    // Popup sofort öffnen – der Name wird im Hintergrund nachgeladen.
    setScannedRecipient({
      userId: recipientUserId,
      displayName: "Empfänger",
    });

    try {
      const response = await fetch(
        `/api/customer/recipient/${recipientUserId}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as { displayName?: string };
      if (!data.displayName) return;
      const displayName = data.displayName;
      setScannedRecipient((current) =>
        current?.userId === recipientUserId
          ? { ...current, displayName }
          : current,
      );
    } catch {
      // Name bleibt Platzhalter – die Zahlung prüft den Empfänger serverseitig.
    }
  }

  function closePaymentPopup() {
    setScannedRecipient(null);
    isHandledRef.current = false;
    setMessage("QR-Code wird gesucht…");
    void startScanner();
  }

  return (
    <div className="space-y-6">
      {/* Scanner Area */}
      <div className="glass-card relative overflow-hidden rounded-2xl">
        <div id="qr-reader" className="aspect-[4/5] md:aspect-[16/9]" />

        {!isScanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/95 p-6 text-center backdrop-blur-sm">
            {isStarting ? (
              <>
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-on-surface-variant border-t-primary" />
                <p className="text-sm text-on-surface-variant">
                  Kamerazugriff wird angefragt…
                </p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-primary">
                  qr_code_scanner
                </span>
                <p className="text-sm text-on-surface-variant">
                  Kamera nicht aktiv
                </p>
                <Button
                  className="h-12 px-6"
                  onClick={startScanner}
                  type="button"
                >
                  Kamera starten
                </Button>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              void stopScanner();
              setMessage("Scanner gestoppt.");
            }}
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-sm">stop</span>
            Stoppen
          </button>
        )}
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

      {/* So geht's */}
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

      {/* Zahlungs-Popup */}
      {scannedRecipient ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePaymentPopup();
          }}
        >
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 pb-8 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-label-sm text-label-sm text-primary">Zahlung</p>
              <button
                type="button"
                onClick={closePaymentPopup}
                aria-label="Schließen"
                className="glass-card flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-all hover:opacity-80 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <PaymentRequestFlow
              recipientUserId={scannedRecipient.userId}
              recipientEmail={scannedRecipient.displayName}
              returnUrl="/dashboard"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
