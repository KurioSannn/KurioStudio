import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary disabled:pointer-events-none disabled:bg-brand-soft disabled:text-text-muted select-none active:scale-98 transition-transform duration-100",
  {
    variants: {
      variant: {
        primary: "bg-accent-primary text-text-primary hover:bg-amber-500 hover:-translate-y-0.5 shadow-sm font-semibold border border-amber-500",
        secondary: "bg-brand-surface border border-brand-border text-text-primary hover:bg-brand-bg hover:-translate-y-0.5 shadow-xs",
        ghost: "text-text-secondary hover:bg-brand-soft hover:text-text-primary",
        danger: "bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5 shadow-sm",
        warning: "bg-warning text-white hover:bg-orange-600 hover:-translate-y-0.5 shadow-sm",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-xs rounded-lg",
        lg: "h-13 px-7 text-base rounded-2xl",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
