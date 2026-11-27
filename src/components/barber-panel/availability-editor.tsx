import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    if (DAYS.some(({ dow }) => invalid(days[dow]!))) return
    setBusy(true)
    // TODO API: guardar disponibilidad semanal
    setTimeout(() => {
      setBusy(false)
      toast.info('Guardar horario aún no está disponible. Tus cambios no se aplicaron.')
    }, 400)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display font-semibold tracking-tight">
          Horario semanal
        </CardTitle>
        <CardDescription>
          Activa los días que atiendes y define la hora de inicio y fin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border">
          {DAYS.map(({ dow, label }) => {
            const d = days[dow]!
            const bad = invalid(d)
            return (
              <li key={dow} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex w-36 items-center gap-3">
                    <Switch
                      checked={d.active}
                      aria-label={`Atiendo el ${label.toLowerCase()}`}
                      onCheckedChange={(active) => patch(dow, { active })}
                    />
                    <span className="font-medium text-foreground">{label}</span>
                  </div>
                  {d.active ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${label}: hora de inicio`}
                        aria-invalid={bad ? true : undefined}
                        value={d.start}
                        onChange={(e) => patch(dow, { start: e.target.value })}
                        className="w-32 tabular-nums"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        aria-label={`${label}: hora de fin`}
                        aria-invalid={bad ? true : undefined}
                        value={d.end}
                        onChange={(e) => patch(dow, { end: e.target.value })}
                        className="w-32 tabular-nums"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No disponible
                    </span>
                  )}
                </div>
                {bad ? (
                  <p className="text-sm text-destructive">
                    La hora de fin debe ser posterior a la de inicio.
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
            {busy ? 'Guardando…' : 'Guardar horario'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
