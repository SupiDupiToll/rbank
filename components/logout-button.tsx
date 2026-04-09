"use client";

import { useState } from "react";
import { stackClientApp } from "@/stack/client";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      await stackClientApp.signOut({
        redirectUrl: "/handler/sign-in"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className={className}
      disabled={isLoading}
      onClick={() => void handleLogout()}
      type="button"
    >
      {isLoading ? "Wird abgemeldet..." : "Ausloggen"}
    </button>
  );
}
