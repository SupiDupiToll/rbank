import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-surface-container-high p-4 text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary",
        className
      )}
      {...props}
    />
  );
}