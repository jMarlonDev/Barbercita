import type * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 py-2 file:border-0 file:bg-transparent file:font-medium w-full min-w-0 rounded-lg border border-input bg-background px-3.5 font-body text-base text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out outline-none placeholder:text-muted-foreground/80 hover:border-foreground/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }