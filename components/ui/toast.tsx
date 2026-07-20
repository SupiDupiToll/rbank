"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "info") {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (message: string, type: ToastType) => {
      const id = ++toastId;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  if (items.length === 0) return null;

  const colors = {
    success: "border-primary/30 bg-primary/10 text-primary",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    info: "border-slate-600/30 bg-slate-800/90 text-slate-100",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`animate-in slide-in-from-right rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${colors[item.type]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
