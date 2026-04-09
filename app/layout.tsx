import "@/app/globals.css";
import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server";

export const metadata: Metadata = {
  title: "RBANK Online Banking",
  description: "Online Banking System mit Admin- und Kundenbereich"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -mr-32 -mt-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 -mb-24 -ml-24 rounded-full bg-white/5 blur-3xl" />
            <main className="relative z-10 min-h-screen">{children}</main>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
