import { useState } from 'react'
import { Clock } from '@gravity-ui/icons'
import { SectionCard } from '@/components/app/section-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toaster'

export interface AvailabilityRow {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean | null
}

// dayOfWeek: 0 = domingo ... 6 = sábado (convención de la tabla availability)
const DAYS = [
  { dow: 1, label: 'Lunes' },
  { dow: 2, label: 'Martes' },
  { dow: 3, label: 'Miércoles' },
  { dow: 4, label: 'Jueves' },
  { dow: 5, label: 'Viernes' },
  { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
]

const PRESETS = [
  { label: 'Mañana', start: '08:00', end: '12:00' },
  { label: 'Almuerzo', start: '12:00', end: '14:00' },
  { label: 'Tarde', start: '14:00', end: '19:00' },
  { label: 'Día completo', start: '09:00', end: '18:00' },
]

interface DayState {
  active: boolean
  start: string
  end: string
}

const hhmm = (t: string) => t.slice(0, 5)

function initial(rows: Array<AvailabilityRow>): Record<number, DayState> {
  const out: Record<number, DayState> = {}
  for (const { dow } of DAYS) {
    const row = rows.find((r) => r.dayOfWeek === dow)
    out[dow] = row
      ? {
          active: row.isActive ?? true,
          start: hhmm(row.startTime),
          end: hhmm(row.endTime),
        }
      : { active: false, start: '09:00', end: '18:00' }
  }
  return out
}

export function AvailabilityEditor({
  rows,
}: {
  rows: Array<AvailabilityRow>
}) {
  const [days, setDays] = useState(() => initial(rows))
  const [busy, setBusy] = useState(false)

  const invalid = (d: DayState) => d.active && d.start >= d.end

  function patch(dow: number, p: Partial<DayState>) {
    setDays((d) => ({ ...d, [dow]: { ...d[dow]!, ...p } }))
  }

  function save() {
    if (DAYS.some(({ dow }) => invalid(days[dow]!))) {
      toast.error('Revisa las horas: el fin debe ser posterior al inicio.')
      return
    }
    setBusy(true)
    // TODO API: guardar disponibilidad semanal del barbero
    setTimeout(() => {
      setBusy(false)
      toast.info('Guardar el horario aún no está disponible; tus cambios no se aplicaron.')
    }, 300)
  }

  return (
    <SectionCard
      icon={<Clock className="size-5" />}
      tone="blue"
      title="Horario semanal"
      description="Activa los días que atiendes y define tus horas. Usa los atajos para llenar rápido."
    >
      <ul className="space-y-3">
        {DAYS.map(({ dow, label }) => {
          const d = days[dow]!
          const bad = invalid(d)
          return (
            <li
              key={dow}
              className="space-y-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  {!d.active ? (
                    <span className="text-sm text-muted-foreground">No disponible</span>
                  ) : null}
                  <Switch
                    checked={d.active}
                    aria-label={`Atiendo el ${label.toLowerCase()}`}
                    onCheckedChange={(active) => patch(dow, { active })}
                  />
                </div>
              </div>
              {d.active ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${label}: hora de inicio`}
                      aria-invalid={bad ? true : undefined}
                      value={d.start}
                      onChange={(e) => patch(dow, { start: e.target.value })}
                      className="h-11 rounded-xl tabular-nums"
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      aria-label={`${label}: hora de fin`}
                      aria-invalid={bad ? true : undefined}
                      value={d.end}
                      onChange={(e) => patch(dow, { end: e.target.value })}
                      className="h-11 rounded-xl tabular-nums"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => {
                      const on = d.start === p.start && d.end === p.end
                      return (
                        <button
                          key={p.label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => patch(dow, { start: p.start, end: p.end })}
                          className={
                            on
                              ? 'press min-h-9 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground'
                              : 'press min-h-9 rounded-full bg-muted px-3.5 text-sm font-medium text-foreground hover:bg-muted/70'
                          }
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                  {bad ? (
                    <p className="text-sm text-destructive">
                      La hora de fin debe ser posterior a la de inicio.
                    </p>
                  ) : null}
                </>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={busy} className="press w-full rounded-xl sm:w-auto">
          {busy ? 'Guardando…' : 'Guardar horario'}
        </Button>
      </div>
    </SectionCard>
  )
}
