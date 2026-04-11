"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationLoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] h-0.5 bg-transparent">
      <div className="h-full animate-[loading_1.2s_ease-in-out_forwards] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
    </div>
  );
}
