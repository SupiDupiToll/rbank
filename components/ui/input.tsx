import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border-none bg-slate-800 p-4 text-slate-100 outline-none focus:ring-2 focus:ring-primary",
        className
      )}
      {...props}
    />
  );
}
