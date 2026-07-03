"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift",
  secondary: "border border-sky-200 bg-white text-navy shadow-soft hover:border-navy hover:-translate-y-0.5",
  danger: "bg-red-600 text-white shadow-soft hover:bg-red-700",
  ghost: "bg-transparent text-slate-700 hover:bg-skySoft hover:text-navy",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-extrabold",
        "transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
