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
        "inline-flex items-center justify-center rounded-full h-12 px-6 text-sm font-bold transition-all disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" &&
          "bg-primary text-background-dark hover:brightness-110 active:scale-[0.98] glow-accent",
        variant === "outline" && "border-2 border-slate-800 text-slate-100 hover:bg-slate-800/80",
        className
      )}
      {...props}
    />
  );
}
