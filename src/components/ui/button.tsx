import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-800 text-white shadow-xs hover:bg-emerald-900 shadow-emerald-900/10",
        accent:
          "bg-amber-400 text-slate-950 shadow-xs hover:bg-amber-500 font-extrabold",
        destructive:
          "bg-rose-700 text-white shadow-xs hover:bg-rose-800",
        outline:
          "border border-slate-200 bg-white shadow-xs hover:bg-slate-50 hover:text-slate-900 text-slate-700",
        secondary:
          "bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80 border border-emerald-200/60",
        ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-700",
        link: "text-emerald-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
