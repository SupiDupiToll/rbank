/**
 * RBankCheckout – schlankes Embed-SDK fuer Host-Anwendungen.
 *
 * Das SDK erzeugt ein leichtgewichtiges, lazy-geladenes iframe auf die
 * RBank-Checkout-Seite (/embed/pay/:token) und kommuniziert per postMessage
 * mit ihr. Die PIN wird ausschliesslich im RBank-DOM verarbeitet – der Host
 * erfaehrt nur Groesse, Status und Ziel-URL, nie Zahlungsdaten.
 *
 * Einbindung:
 *   <script src="https://rbank.sdtoll.de/rbank-checkout.js" defer></script>
 *
 * Verwendung:
 *   var instance = RBankCheckout.mount({
 *     token: "pay_...",
 *     key: "shared-embed-key",
 *     container: "#checkout",
 *     onSuccess: function (result) { /* result.redirectUrl *\/ },
 *   });
 *
 * Das Skript wird von RBank ausgeliefert, daher wird die RBank-Origin
 * automatisch aus der Skript-URL abgeleitet (ueber die Option `baseUrl`
 * ueberschreibbar, z.B. wenn das Skript gebundelt eingebunden wird).
 */
(function (global) {
  "use strict";

  var SCRIPT_ORIGIN = (function () {
    try {
      var src =
        typeof document !== "undefined" && document.currentScript
          ? document.currentScript.src
          : "";
      if (src) {
        return new URL(src, global.location.href).origin;
      }
    } catch (e) {
      /* ignore */
    }
    return global.location ? global.location.origin : "";
  })();

  /**
   * Checkout in `container` einbetten.
   *
   * Optionen:
   *   token       (Pflicht) Payment-Token der RBank-Session
   *   key         Embed-Key (RBANK_EMBED_CHECKOUT_KEY)
   *   container   Element oder CSS-Selektor, in das das iframe kommt
   *   baseUrl     RBank-Origin (Default: Origin der Skript-URL)
   *   lazy        iframe erst laden, wenn der Container sichtbar wird
   *               (Default: true)
   *   height      Start-Hoehe in px (Default: 480)
   *   onReady     iframe geladen und bereit
   *   onHeight    Hoehe des Inhalts geaendert (px)
   *   onStatus    Session-Status nicht mehr PENDING (z.B. bereits bezahlt)
   *   onSuccess   Zahlung erfolgreich; { redirectUrl }
   *
   * Rueckgabe: { start, unmount }
   */
  function mount(options) {
    options = options || {};

    if (!options.token) {
      throw new Error("RBankCheckout: token ist erforderlich.");
    }

    var container =
      typeof options.container === "string"
        ? document.querySelector(options.container)
        : options.container;
    if (!container) {
      throw new Error("RBankCheckout: container wurde nicht gefunden.");
    }

    var baseUrl = String(options.baseUrl || SCRIPT_ORIGIN).replace(/\/+$/, "");
    var origin = String(options.origin || baseUrl).replace(/\/+$/, "");
    var lazy = options.lazy !== false;
    var initialHeight =
      typeof options.height === "number" && options.height > 0
        ? options.height
        : 480;

    var state = {
      iframe: null,
      started: false,
      destroyed: false,
      observer: null,
    };

    function createIframe() {
      if (state.started || state.destroyed) {
        return;
      }
      state.started = true;

      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }

      var url =
        baseUrl +
        "/embed/pay/" +
        encodeURIComponent(options.token) +
        "?key=" +
        encodeURIComponent(options.key || "");

      var iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.title = "RBank Bezahlung";
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allowtransparency", "true");
      iframe.setAttribute("scrolling", "no");
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      iframe.style.width = "100%";
      iframe.style.height = initialHeight + "px";
      iframe.style.border = "0";
      iframe.style.display = "block";
      iframe.style.overflow = "hidden";

      container.appendChild(iframe);
      state.iframe = iframe;
    }

    function handleMessage(event) {
      if (event.origin !== origin) {
        return;
      }

      var iframe = state.iframe;
      if (!iframe || event.source !== iframe.contentWindow) {
        return;
      }

      var data = event.data;
      if (!data || typeof data.type !== "string") {
        return;
      }

      switch (data.type) {
        case "rbank:ready":
          if (typeof options.onReady === "function") {
            options.onReady();
          }
          break;
        case "rbank:height":
          if (typeof data.height === "number" && data.height > 0) {
            iframe.style.height = data.height + "px";
            if (typeof options.onHeight === "function") {
              options.onHeight(data.height);
            }
          }
          break;
        case "rbank:status":
          if (typeof options.onStatus === "function") {
            options.onStatus(data.status);
          }
          break;
        case "rbank:success":
          if (typeof options.onSuccess === "function") {
            options.onSuccess({ redirectUrl: data.redirectUrl });
          }
          break;
        default:
          break;
      }
    }

    function start() {
      if (state.destroyed) {
        return;
      }
      if (lazy && !state.started && "IntersectionObserver" in global) {
        state.observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                createIframe();
              }
            });
          },
          { rootMargin: "200px 0px" },
        );
        state.observer.observe(container);
        return;
      }
      createIframe();
    }

    function unmount() {
      state.destroyed = true;
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }
      window.removeEventListener("message", handleMessage);
      if (state.iframe && state.iframe.parentNode) {
        state.iframe.parentNode.removeChild(state.iframe);
      }
      state.iframe = null;
    }

    window.addEventListener("message", handleMessage);
    start();

    return {
      start: createIframe,
      unmount: unmount,
    };
  }

  global.RBankCheckout = {
    mount: mount,
  };
})(typeof window !== "undefined" ? window : this);
