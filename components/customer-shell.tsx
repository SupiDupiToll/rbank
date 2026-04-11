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
  children: React.ReactNode;
};

type NavIconProps = {
  className?: string;
};

function HomeIcon({ className }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.75 10.5 12 4l8.25 6.5v8.25a1.5 1.5 0 0 1-1.5 1.5h-4.5v-5.25h-4.5v5.25h-4.5a1.5 1.5 0 0 1-1.5-1.5V10.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TransferIcon({ className }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.5 7.5h12.75m0 0-3-3m3 3-3 3M19.5 16.5H6.75m0 0 3 3m-3-3 3-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ReceivePaymentIcon({ className }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.5 8.25V6A1.5 1.5 0 0 1 6 4.5h2.25M15.75 4.5H18A1.5 1.5 0 0 1 19.5 6v2.25M19.5 15.75V18A1.5 1.5 0 0 1 18 19.5h-2.25M8.25 19.5H6A1.5 1.5 0 0 1 4.5 18v-2.25M8.25 8.25h7.5v7.5h-7.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TransactionsIcon({ className }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7.5 6.75h9m-9 5.25h9m-9 5.25h5.25M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SavingsIcon({ className }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 6.75a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Zm0 0V4.5m0 9.75v5.25m4.5-11.25 1.5-1.5m-12 12 1.5-1.5m9 1.5-1.5-1.5m-7.5-7.5L6 8.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SettingsIcon({ className }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m9.6 3.9-.24 1.91a6.84 6.84 0 0 0-1.47.61L6.3 5.46a1.5 1.5 0 0 0-1.86.22L3.68 6.44a1.5 1.5 0 0 0-.22 1.86l.96 1.6c-.28.47-.49.97-.61 1.47L1.9 11.6A1.5 1.5 0 0 0 .75 13.08v1.08A1.5 1.5 0 0 0 1.9 15.64l1.91.24c.12.5.33 1 .61 1.47l-.96 1.6a1.5 1.5 0 0 0 .22 1.86l.76.76a1.5 1.5 0 0 0 1.86.22l1.6-.96c.47.28.97.49 1.47.61l.24 1.91A1.5 1.5 0 0 0 11.08 24h1.08a1.5 1.5 0 0 0 1.48-1.15l.24-1.91c.5-.12 1-.33 1.47-.61l1.6.96a1.5 1.5 0 0 0 1.86-.22l.76-.76a1.5 1.5 0 0 0 .22-1.86l-.96-1.6c.28-.47.49-.97.61-1.47l1.91-.24A1.5 1.5 0 0 0 24 14.16v-1.08a1.5 1.5 0 0 0-1.15-1.48l-1.91-.24a6.84 6.84 0 0 0-.61-1.47l.96-1.6a1.5 1.5 0 0 0-.22-1.86l-.76-.76a1.5 1.5 0 0 0-1.86-.22l-1.6.96a6.84 6.84 0 0 0-1.47-.61L14.16 3.9A1.5 1.5 0 0 0 12.68 2.75H11.6A1.5 1.5 0 0 0 9.6 3.9ZM12.14 9a4.62 4.62 0 1 1 0 9.24 4.62 4.62 0 0 1 0-9.24Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

const navigation = [
  { href: "/dashboard" as Route, label: "Übersicht", icon: HomeIcon },
  {
    href: "/dashboard/transfer" as Route,
    label: "Überweisung",
    icon: TransferIcon,
  },
  {
    href: "/dashboard/receive-payment" as Route,
    label: "Zahlung",
    icon: ReceivePaymentIcon,
  },
  {
    href: "/dashboard/transactions" as Route,
    label: "Transaktionen",
    icon: TransactionsIcon,
  },
  {
    href: "/dashboard/festgeld" as Route,
    label: "Festgeld",
    icon: SavingsIcon,
  },
  {
    href: "/dashboard/settings" as Route,
    label: "Einstellungen",
    icon: SettingsIcon,
  },
];

export function CustomerShell({
  customerId,
  displayName,
  children,
}: CustomerShellProps) {
  const pathname = usePathname();
  const currentPage =
    navigation.find((item) => item.href === pathname)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background-dark text-slate-100">
      <NavigationLoadingBar />
      <div className="lg:hidden">
        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-background-dark/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-4 pt-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
                RBANK
              </p>
              <h1 className="mt-2 text-2xl font-display text-slate-100">
                {currentPage}
              </h1>
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-0 pb-24 pt-0 lg:flex-row lg:px-8 lg:py-6">
        <aside className="hidden w-full rounded-3xl border border-slate-800 bg-slate-950/70 p-5 lg:sticky lg:top-6 lg:block lg:h-fit lg:w-72">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              RBANK
            </p>
            <h1 className="mt-3 text-2xl font-display text-slate-100">
              {displayName ?? "Kundenkonto"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Kundennummer {customerId}
            </p>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-background-dark"
                      : "bg-slate-900 text-slate-200 hover:bg-slate-800",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3 border-t border-slate-800 pt-6">
            <LogoutButton className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800" />
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 pt-4 lg:px-0 lg:pt-0">
          <div className="mx-auto max-w-md lg:max-w-none">{children}</div>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-background-dark/95 px-2 pt-2 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-background-dark"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
                )}
                href={item.href}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
