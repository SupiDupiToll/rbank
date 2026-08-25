"use client";

import { cn } from "@/lib/utils";

type NumericKeypadProps = {
  onAppend: (digits: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  className?: string;
};

const ROW_LAYOUT = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["00", "0", "backspace"],
] as const;

/**
 * Großer mobiler Ziffernblock in Banking-Optik.
 * Die Werte werden als roher Integer-String (Cent) von einem Parent-State
 * gehalten; diese Komponente ruft nur onAppend (Ziffer(n) anfügen) und
 * onBackspace (letzte Ziffer löschen) auf. So lassen sich Beträge von
 * hinten tippen (z.B. "1000" => 10,00 EUR).
 */
export function NumericKeypad({
  onAppend,
  onBackspace,
  disabled = false,
  className,
}: NumericKeypadProps) {
  return (
    <div className={cn("mx-auto w-full max-w-xs space-y-2.5", className)}>
      {ROW_LAYOUT.map((row, rowIndex) => (
        <div className="grid grid-cols-3 gap-2.5" key={rowIndex}>
          {row.map((key) => {
            const isBackspace = key === "backspace";
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-label={
                  isBackspace
                    ? "Letzte Ziffer löschen"
                    : `${key} hinzufügen`
                }
                className={cn(
                  "flex h-16 items-center justify-center rounded-2xl text-2xl font-semibold transition-all disabled:opacity-50",
                  isBackspace
                    ? "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    : "glass-card text-on-surface hover:bg-surface-container",
                  !disabled && "active:scale-95",
                  disabled && "pointer-events-none opacity-50",
                )}
                onClick={() => {
                  if (isBackspace) {
                    onBackspace();
                  } else {
                    onAppend(key);
                  }
                }}
              >
                {isBackspace ? (
                  <span className="material-symbols-outlined text-2xl">
                    backspace
                  </span>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Hängt Ziffern an den aktuellen Betrag an und begrenzt die Länge. */
export function appendDigits(
  current: string,
  digits: string,
  maxLength = 9,
): string {
  const next = `${current}${digits}`;
  return next.length > maxLength ? current : next;
}

/** Entfernt die letzte Ziffer. */
export function removeLastDigit(current: string): string {
  return current.slice(0, -1);
}
