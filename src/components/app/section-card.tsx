import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { iconTile } from './tone'
import type { Tone } from './tone'

/** Tarjeta de sección: placa de icono + título + descripción + acción a la derecha. */
export function SectionCard({
  icon,
  tone = 'rose',
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  icon?: ReactNode
  tone?: Tone
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6',
        className,
      )}
    >
      <header className="flex items-start gap-3.5">
        {icon ? <span className={iconTile(tone)}>{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children !== undefined ? (
        <div className={cn('min-w-0', contentClassName)}>{children}</div>
      ) : null}
    </section>
  )
}
