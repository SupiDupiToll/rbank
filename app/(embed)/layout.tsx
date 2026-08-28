import "@/app/globals.css";
import "material-symbols/outlined.css";
import "./layout.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#131313",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "RBank Bezahlen",
  robots: { index: false, follow: false },
};

/**
 * Schlankes Root-Layout fuer die eingebettete Checkout-Seite.
 *
 * Bewusst OHNE StackProvider und App-Shell: Das iframe laedt dadurch nur das
 * minimale Checkout-Bundle statt des kompletten RBank-Client-Bundles – das ist
 * der Kern des schnellen, schlanken Embed-Modells. Die PIN bleibt trotzdem
 * sicher im RBank-DOM, da die Seite weiterhin als iframe (Sicherheitsgrenze)
 * eingebunden wird.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark embed-root">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
