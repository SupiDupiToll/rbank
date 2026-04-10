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
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-slate-200">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">RBANK</p>
        <h1 className="mt-3 text-3xl font-display text-slate-100">Weiterleitung zur Anmeldung</h1>
      </div>
    </div>
  );
}
