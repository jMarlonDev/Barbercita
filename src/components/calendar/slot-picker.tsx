import { Clock } from '@gravity-ui/icons'
import { cn } from '@/lib/utils'
import { formatters, minutesOfDay } from './date-utils'

const GROUPS = [
  { label: 'Mañana', from: 0, to: 12 * 60 },
  { label: 'Tarde', from: 12 * 60, to: 18 * 60 },
  { label: 'Noche', from: 18 * 60, to: 24 * 60 },
] as const

/** Horarios disponibles como chips grandes, agrupados por franja. Un toque selecciona. */
export function SlotPicker({
  slots,
  value,
  onChange,
  loading = false,
  emptyMessage = 'Ya no quedan horarios este día. Prueba con otra fecha.',
}: {
  slots: readonly string[]
  value: string | null
  onChange: (slot: string) => void
  loading?: boolean
  emptyMessage?: string
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5" aria-label="Cargando horarios" role="status">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="skeleton h-14 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (slots.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-foreground/12 bg-muted/40 p-4 text-sm text-muted-foreground">
        <Clock className="size-5 shrink-0" />
        {emptyMessage}
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => {
        const list = slots.filter((s) => {
          const m = minutesOfDay(s)
          return m >= g.from && m < g.to
        })
        if (list.length === 0) return null
        return (
          <fieldset key={g.label} className="space-y-2.5">
            <legend className="eyebrow mb-2.5">
              {g.label} · {list.length}
            </legend>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
              {list.map((slot) => {
                const selected = slot === value
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(slot)}
                    className={cn(
                      'press h-14 cursor-pointer rounded-2xl border text-base font-semibold tabular-nums',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground shadow-pop'
                        : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft hover:text-primary',
                    )}
                  >
                    {formatters.time.format(new Date(slot))}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
