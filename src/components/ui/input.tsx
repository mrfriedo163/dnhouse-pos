import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none",
        "bg-white text-navy transition focus:border-brand focus:ring-4 focus:ring-sky-100", className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1 block text-sm font-extrabold text-navy", className)} {...props} />
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn("w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-brand focus:ring-4 focus:ring-sky-100", className)} {...props} />
  ),
);
Select.displayName = "Select";
