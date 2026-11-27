import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { iconTile } from './tone'
import type { Tone } from './tone'

/** Estado vacío con borde punteado, icono en placa y una acción. */
export function EmptyState({
  icon,
  tone = 'rose',
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  tone?: Tone
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/12 bg-muted/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span className={iconTile(tone)}>{icon}</span>
      <p className="font-display text-base font-bold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
