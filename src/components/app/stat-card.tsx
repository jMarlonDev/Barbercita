import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TONE_BG, TONE_FG } from './tone'
import type { Tone } from './tone'

/** KPI en tarjeta pastel (estilo Bukia): etiqueta, icono en placa blanca, cifra grande y pista. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'cream',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-3xl border border-border p-5',
        TONE_BG[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground/80">{label}</p>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl bg-card shadow-card [&_svg]:size-4',
            TONE_FG[tone],
          )}
        >
          {icon}
        </span>
      </div>
      <p className="font-display text-3xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-4xl">
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
