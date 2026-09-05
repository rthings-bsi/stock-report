import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-800 text-white hover:bg-emerald-700",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
        destructive:
          "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-black",
        outline: "text-slate-900 border-slate-300",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
        amber: "border-amber-300 bg-amber-50 text-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
