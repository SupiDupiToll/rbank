import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-manrope",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-playfair-display",
});

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "RBANK Online Banking",
  description: "Online Banking System mit Admin- und Kundenbereich",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RBank",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="RBank" />
        <meta name="theme-color" content="#0f1115" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iPhone splash screens */}
        {/* iPhone SE (2nd/3rd gen) – 375x667 @2x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash/se-portrait.png"
        />
        {/* iPhone X / XS / 11 Pro / 12 mini – 375x812 @3x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/se-portrait.png"
        />
        {/* iPhone 12 / 13 / 14 – 390x844 @3x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/14-portrait.png"
        />
        {/* iPhone 14 Pro / 15 / 16 / 16e – 393x852 @3x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/14pro-portrait.png"
        />
        {/* iPhone 14 Plus / 15 Plus – 428x926 @3x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/14promax-portrait.png"
        />
        {/* iPhone 14 Pro Max / 15 Pro Max – 430x932 @3x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/14promax-portrait.png"
        />
        {/* iPhone 16 Pro Max – 440x956 @3x */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/14promax-portrait.png"
        />
      </head>
      <body className={`${manrope.variable} ${playfairDisplay.variable}`}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <div className="pointer-events-none absolute right-0 top-0 hidden h-64 w-64 -mr-32 -mt-32 rounded-full bg-primary/10 blur-3xl lg:block" />
            <div className="pointer-events-none absolute bottom-0 left-0 hidden h-48 w-48 -mb-24 -ml-24 rounded-full bg-white/5 blur-3xl lg:block" />
            <main className="relative z-10 min-h-screen">{children}</main>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
