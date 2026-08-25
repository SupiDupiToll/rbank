"use client";

import { cn } from "@/lib/utils";

type StepperProps = {
  steps: string[];
  current: number;
  className?: string;
};

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {steps.map((label, index) => {
        const isDone = index < current;
        const isActive = index === current;
        return (
          <div key={label} className="flex items-center">
            {index > 0 ? (
              <div
                className={cn(
                  "mx-1 h-0.5 w-6 rounded-full sm:w-8",
                  index <= current ? "bg-primary" : "bg-surface-container-highest",
                )}
              />
            ) : null}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isDone && "bg-primary text-white",
                  isActive && "bg-primary-container text-white glow-effect",
                  !isDone && !isActive && "bg-surface-container-highest text-on-surface-variant",
                )}
              >
                {isDone ? (
                  <span className="material-symbols-outlined text-base">check</span>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium uppercase tracking-wide sm:block",
                  isActive ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
