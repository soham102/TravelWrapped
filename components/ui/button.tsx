import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-electric-400/40 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-sunset-500 text-white shadow-[0_8px_24px_-8px_rgba(255,106,61,0.7)] hover:bg-sunset-600",
        dark: "bg-navy-900 text-cream-100 hover:bg-navy-800",
        electric: "bg-electric-500 text-white shadow-[0_8px_24px_-8px_rgba(123,77,255,0.7)] hover:bg-electric-600",
        outline: "border-2 border-navy-900/15 bg-white/60 text-ink hover:border-navy-900/30 hover:bg-white",
        ghost: "text-ink hover:bg-navy-900/5",
        light: "bg-cream-100 text-navy-900 hover:bg-white",
        glass: "bg-white/10 text-white backdrop-blur border border-white/20 hover:bg-white/20",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-14 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
