import type * as React from 'react'
import { cn } from 'cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 py-2.5 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 font-body text-base text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out outline-none placeholder:text-muted-foreground/80 hover:border-foreground/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }