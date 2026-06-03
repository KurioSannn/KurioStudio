import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold select-none transition-colors duration-150 capitalize",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent-primary/10 text-accent-secondary border-accent-primary/20",
        ready:
          "border-brand-border bg-brand-soft/60 text-text-primary",
        beta:
          "border-amber-500/20 bg-amber-500/10 text-amber-700",
        comingSoon:
          "border-brand-border bg-brand-bg text-text-muted cursor-not-allowed",
        danger:
          "border-red-500/20 bg-red-500/10 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "ready" | "beta" | "comingSoon" | "danger";
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

export { badgeVariants };
