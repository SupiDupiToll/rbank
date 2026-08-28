# RBankCheckout SDK (schlankes Embed-Modell)

Das SDK ist die empfohlene Art, den eingebetteten Checkout in eine
Host-Anwendung (z.B. Kiosk-/Self-Service-Terminal) einzubinden. Es loest die
beiden Schwachstellen des naiven iframe-Embeds:

1. **Ladezeit:** Das SDK laedt selbst nur wenige KB und erzeugt das iframe
   erst, wenn der Checkout-Bereich sichtbar wird (`lazy`). Die Embed-Seite
   selbst laeuft in einem eigenen, schlanken Root-Layout **ohne** den
   RBank-App-Shell und ohne Stack-Auth-Client-Bundle.
2. **Sicherheit:** Die PIN wird weiterhin ausschliesslich im RBank-DOM
   verarbeitet. Das iframe bleibt die Sicherheitsgrenze – der Host kann die
   PIN weder lesen noch manipulieren. Er erfaehrt per postMessage nur
   Groesse, Status und Ziel-URL.

## Dateien

| Datei | Zweck |
|---|---|
| `public/rbank-checkout.js` | Das SDK (wird unter `/rbank-checkout.js` ausgeliefert) |
| `sdk/example.html` | Beispiel-Host-Seite zum Kopieren |
| `lib/embed-bridge.ts` | postMessage-Protokoll auf RBank-Seite (iframe → Host) |
| `app/(embed)/...` | Schlankes Embed-Layout + Checkout-Seite |

## Einbindung

```html
<script src="https://rbank.example.com/rbank-checkout.js" defer></script>
```

```html
<div id="checkout"></div>
```

```js
var instance = RBankCheckout.mount({
  token: "pay_abc123",          // Payment-Token der RBank-Session
  key: "dein-embed-key",        // RBANK_EMBED_CHECKOUT_KEY
  container: "#checkout",       // Element oder CSS-Selektor
  lazy: true,                   // iframe erst laden, wenn sichtbar (Default)
  height: 480,                  // Start-Hoehe in px (Default: 480)

  onReady: function () {
    console.log("Checkout bereit");
  },
  onHeight: function (height) {
    console.log("Neue Hoehe:", height);
  },
  onStatus: function (status) {
    // Session ist nicht mehr PENDING (COMPLETED/CANCELLED/EXPIRED/REFUNDED)
    // z.B. Modal schliessen
  },
  onSuccess: function (result) {
    // Zahlung erfolgreich – hier entscheidet der Host, wohin es geht.
    // result.redirectUrl ist die konfigurierte Redirect-URL der Session
    // (inkl. token & status=success).
    window.location.href = result.redirectUrl;
  },
});

// Optional: iframe vorzeitig erzeugen (auch wenn lazy aktiv ist)
// instance.start();

// Aufraeumen (Modal schliessen o.ae.)
// instance.unmount();
```

## Optionen im Ueberblick

| Option | Typ | Beschreibung |
|---|---|---|
| `token` | `string` | (Pflicht) Payment-Token der RBank-Session |
| `key` | `string` | Embed-Key (`RBANK_EMBED_CHECKOUT_KEY`) |
| `container` | `Element \| string` | Container bzw. CSS-Selektor |
| `baseUrl` | `string` | RBank-Origin; Default: Origin der Skript-URL. Nur noetig, wenn das SDK nicht von RBank selbst geladen wird |
| `lazy` | `boolean` | Default `true` – iframe erst laden, wenn der Container nahe am Viewport ist |
| `height` | `number` | Start-Hoehe in px (Default `480`); wird danach von den `rbank:height`-Meldungen ueberschrieben |
| `onReady` | `() => void` | iframe geladen und bereit |
| `onHeight` | `(px: number) => void` | Inhaltshoehe geaendert |
| `onStatus` | `(status: string) => void` | Status nicht mehr `PENDING` |
| `onSuccess` | `({ redirectUrl }) => void` | Zahlung erfolgreich |

## postMessage-Protokoll (iframe → Host)

Das SDK validiert jede Nachricht gegen `event.origin` und
`event.source === iframe.contentWindow`. Unbekannte Nachrichten werden
ignoriert.

| Typ | Payload | Bedeutung |
|---|---|---|
| `rbank:ready` | – | Checkout-Seite geladen |
| `rbank:height` | `{ height }` | Aktuelle Inhaltshoehe in px (Auto-Sizing) |
| `rbank:status` | `{ status }` | Session nicht mehr `PENDING` (z.B. bereits bezahlt) |
| `rbank:success` | `{ redirectUrl }` | Zahlung erfolgreich; Host entscheidet ueber Weiterleitung |

## Sicherheitshinweise

- **Nie PIN-Eingabe nativ im Host-DOM rendern.** Die PIN gehoert ins
  RBank-iframe, sonst kann JavaScript der Host-Seite sie mitlesen.
- Das SDK prueft `event.origin` und `event.source` – Nachrichten von anderen
  Frames/Origins werden verworfen.
- Framing ist per CSP auf erlaubte Hosts beschraenkt
  (`frame-ancestors`, Default `https://*.sdtoll.de`, konfigurierbar ueber
  `RBANK_EMBED_FRAME_ANCESTORS` in `next.config.ts`).
- Der Embed-Key ist ein gemeinsames Geheimnis und steckt in der URL des
  iframes. Fuer sensible Umgebungen empfiehlt sich spaeter ein serverseitiger
  Token-Tausch statt des Klartext-Keys.

## Lokales Testen

Damit du das Embed lokal (z.B. `http://localhost:3000`) framen kannst, setze
in `next.config.ts` bzw. per Env-Variable:

```bash
RBANK_EMBED_FRAME_ANCESTORS="http://localhost:3000"
```

Nur fuer Entwicklung – in Produktion auf die echten Hosts beschraenken.
