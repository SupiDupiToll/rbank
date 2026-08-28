/**
 * Bruecke zwischen der eingebetteten Checkout-Seite (iframe) und dem Host
 * (RBankCheckout SDK) per postMessage.
 *
 * Das iframe bleibt die Sicherheitsgrenze: Die PIN wird ausschliesslich
 * innerhalb des RBank-DOMs verarbeitet. Der Host erfaehrt ueber postMessage
 * nur Groessen-, Status- und Weiterleitungs-Informationen – nie Zahlungsdaten.
 *
 * Alle Nachrichten tragen das Praefix "rbank:".
 */

export type EmbedPaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export type EmbedMessage =
  | { type: "rbank:ready" }
  | { type: "rbank:height"; height: number }
  | { type: "rbank:status"; status: EmbedPaymentStatus }
  | { type: "rbank:success"; redirectUrl: string };

export function isEmbeddedInIframe(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.self !== window.top;
  } catch {
    // Cross-Origin-Zugriff auf window.top wirft -> wir sind auf jeden Fall geframed.
    return true;
  }
}

export function postEmbedMessage(message: EmbedMessage) {
  if (typeof window === "undefined" || !isEmbeddedInIframe()) {
    return;
  }

  // Die CSP (frame-ancestors) beschraenkt bereits, wer die Seite framen darf.
  // Deshalb ist "*" als Ziel-Origin hier vertretbar – der Empfaenger ist
  // immer der erlaubte Host. Auf Host-Seite validiert das SDK event.origin.
  window.parent.postMessage(message, "*");
}
