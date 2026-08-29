"use client";

import { useState } from "react";
import { PaymentQrScanner } from "@/components/payment-qr-scanner";

export function QrScanButton({ myUserId }: { myUserId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex flex-col items-center gap-2"
      >
        <span className="glass-card relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-on-surface transition-transform group-active:scale-95">
          <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="material-symbols-outlined text-xl">
            qr_code_scanner
          </span>
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          QR scannen
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex h-full max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:h-auto sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 p-5 pb-3">
              <div>
                <p className="font-label-sm text-label-sm text-primary">
                  Zahlung
                </p>
                <h2 className="font-headline-md text-headline-md mt-1 text-on-surface">
                  QR-Code scannen
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Schließen"
                className="glass-card flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-all hover:opacity-80 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <PaymentQrScanner myUserId={myUserId} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
