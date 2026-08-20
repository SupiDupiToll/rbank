"use client";

import { useEffect, useState } from "react";

function getRemaining(endDate: string) {
  const total = Math.max(0, new Date(endDate).getTime() - Date.now());
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  const expired = total <= 0;

  return {
    value: `${days}T ${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`,
    expired
  };
}

export function FestgeldCountdown({ endDate }: { endDate: string }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemaining(endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div>
      <p className="font-label-sm text-label-sm text-on-surface-variant">Countdown</p>
      <p className="mt-1 font-mono font-semibold text-on-surface">{remaining.value}</p>
      <p className={`font-label-sm text-label-sm mt-2 ${remaining.expired ? "text-error" : "text-primary"}`}>
        {remaining.expired ? "Abgelaufen" : "Läuft"}
      </p>
    </div>
  );
}