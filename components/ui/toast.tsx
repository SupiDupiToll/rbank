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
    success: "border-primary-container/40 bg-primary-container/20 text-primary",
    error: "border-error/40 bg-error/10 text-red-300",
    info: "border-white/10 bg-surface-container-high/90 text-on-surface",
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
