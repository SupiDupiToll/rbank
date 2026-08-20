"use client";

import { useEffect } from "react";
import { AUTH_REDIRECT_COOKIE_NAME, normalizeAuthRedirect } from "@/lib/auth-redirect";

type LoginRedirectProps = {
  redirectTo?: string;
};

export function LoginRedirect({ redirectTo }: LoginRedirectProps) {
  useEffect(() => {
    const normalizedRedirect = normalizeAuthRedirect(redirectTo);

    if (normalizedRedirect) {
      document.cookie = `${AUTH_REDIRECT_COOKIE_NAME}=${encodeURIComponent(normalizedRedirect)}; Path=/; SameSite=Lax`;
    } else {
      document.cookie = `${AUTH_REDIRECT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    }

    window.location.replace("/handler/sign-in");
  }, [redirectTo]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-on-surface-variant">
      <div>
        <div className="glass-card mesh-gradient mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            account_balance
          </span>
        </div>
        <p className="font-label-sm text-label-sm text-primary">RBANK</p>
        <h1 className="font-headline-md text-headline-md mt-3 text-on-surface">
          Weiterleitung zur Anmeldung
        </h1>
      </div>
    </div>
  );
}
