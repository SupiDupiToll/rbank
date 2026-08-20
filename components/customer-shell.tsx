"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { NavigationLoadingBar } from "@/components/navigation-loading-bar";

type CustomerShellProps = {
  customerId: string;
  displayName: string | null;
  showDonationBoxesList: boolean;
  children: React.ReactNode;
};

type NavItem = {
  href: Route;
  label: string;
  icon: string;
};

const baseNavigation: NavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: "home" },
  { href: "/dashboard/transfer", label: "Überweisung", icon: "swap_horiz" },
  { href: "/dashboard/receive-payment", label: "Zahlung", icon: "qr_code_scanner" },
  { href: "/dashboard/transactions", label: "Transaktionen", icon: "receipt_long" },
  { href: "/dashboard/kredite", label: "Kredite", icon: "request_quote" },
  { href: "/dashboard/festgeld", label: "Festgeld", icon: "savings" },
  { href: "/dashboard/haendler", label: "Händler", icon: "storefront" },
];

export function CustomerShell({
  customerId,
  displayName,
  showDonationBoxesList,
  children,
}: CustomerShellProps) {
  const pathname = usePathname();
  const navigation: NavItem[] = [
    ...baseNavigation,
    ...(showDonationBoxesList
      ? [
          {
            href: "/dashboard/spendenboxen" as Route,
            label: "Spendenboxen",
            icon: "volunteer_activism",
          },
        ]
      : []),
    { href: "/dashboard/settings" as Route, label: "Einstellungen", icon: "settings" },
  ];

  function isActive(href: Route): boolean {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-on-background md:pb-0">
      <NavigationLoadingBar />

      {/* Desktop Top AppBar */}
      <header className="fixed top-0 z-50 hidden w-full border-b border-white/10 bg-surface/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-primary-container to-secondary-container">
              <span className="material-symbols-outlined text-lg text-white">
                account_balance
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md tracking-tighter text-primary">
              RBank
            </h1>
          </div>

          <nav className="hide-scrollbar flex items-center gap-1 overflow-x-auto">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary-container/15 text-primary"
                      : "text-on-surface-variant hover:text-primary/80",
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{
                      fontVariationSettings: `'FILL' ${active ? 1 : 0}`,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="glass-card flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-all hover:opacity-80 active:scale-95"
              aria-label="Suchen"
            >
              <span className="material-symbols-outlined text-lg">search</span>
            </button>
            <LogoutButton className="glass-card flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-on-surface-variant transition-all hover:opacity-80 active:scale-95" />
          </div>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/90 pt-7 backdrop-blur-lg md:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-primary-container to-secondary-container">
              <span className="material-symbols-outlined text-lg text-white">
                account_balance
              </span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md leading-none tracking-tighter text-primary">
                RBank
              </h1>
              <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                {displayName ?? `Kunde ${customerId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="glass-card flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-transform active:scale-95"
              aria-label="Suchen"
            >
              <span className="material-symbols-outlined text-lg">search</span>
            </button>
            <LogoutButton className="glass-card flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-transform active:scale-95" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-5 pb-10 pt-28 md:px-8 md:pt-28">
        <div className="mx-auto max-w-md lg:max-w-none">{children}</div>
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-lg border-t border-white/10 bg-surface/80 shadow-[0_-10px_30px_rgba(127,61,255,0.1)] backdrop-blur-xl md:hidden"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
        }}
      >
        <div className="hide-scrollbar mx-auto flex w-full max-w-md items-stretch justify-around gap-1 overflow-x-auto px-2 pt-2">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 pb-2 pt-2 transition-all active:scale-90",
                  active ? "text-primary" : "text-on-surface-variant hover:text-primary/80",
                )}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{
                    fontVariationSettings: `'FILL' ${active ? 1 : 0}`,
                  }}
                >
                  {item.icon}
                </span>
                <span className="truncate font-label-sm text-label-sm">
                  {item.label}
                </span>
                {active ? (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_#7f3dff]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}