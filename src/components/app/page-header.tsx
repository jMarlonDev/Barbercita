import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Encabezado de vista: eyebrow + título grande + descripción + acción. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="eyebrow">
            <span className="size-1.5 rounded-full bg-primary" />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-pretty text-[0.95rem] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  )
}
