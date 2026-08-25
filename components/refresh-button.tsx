"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type RefreshButtonProps = {
  className?: string;
  iconClassName?: string;
  onRefresh?: () => void | Promise<void>;
  "aria-label"?: string;
};

export function RefreshButton({
  className,
  iconClassName,
  onRefresh,
  ...props
}: RefreshButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }, [loading, onRefresh, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={loading}
      aria-label={props["aria-label"] ?? "Daten aktualisieren"}
      title={props["aria-label"] ?? "Daten aktualisieren"}
      className={cn(
        "glass-card flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-all hover:opacity-80 active:scale-95",
        className,
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined text-lg",
          loading && "animate-spin",
          iconClassName,
        )}
      >
        refresh
      </span>
    </button>
  );
}
