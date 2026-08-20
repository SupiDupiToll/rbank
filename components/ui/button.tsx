import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "outline";
};

export function Button({ className, asChild, variant = "primary", ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full h-12 px-6 text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" &&
          "bg-primary-container text-white hover:opacity-90 active:scale-[0.98] glow-effect",
        variant === "outline" && "glass-card text-on-surface hover:bg-surface-container",
        className
      )}
      {...props}
    />
  );
}