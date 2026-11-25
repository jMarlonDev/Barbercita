import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BUSINESS_TIME_ZONE, dayRangeUtc, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getBarberAgenda } from '@/server/barber-panel'
import { setBarberAppointmentStatus } from '@/server/barber-panel'

type AgendaRow = Awaited<ReturnType<typeof getBarberAgenda>>[number]
type Status = 'confirmed' | 'completed' | 'cancelled'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-muted text-muted-foreground',
  },
  completed: { label: 'Completada', className: 'bg-primary/10 text-primary' },
}

const dayFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

type Range = 'today' | 'week' | 'all'
const RANGES: Array<{ id: Range; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'all', label: 'Próximas' },
]

function rangeEnd(range: Range): number {
  const today = dayRangeUtc(toDateKey(new Date())).start.getTime()
  const day = 24 * 60 * 60_000
  if (range === 'today') return today + day
  if (range === 'week') return today + 7 * day
  return Number.POSITIVE_INFINITY
}

function AppointmentItem({ appointment }: { appointment: AgendaRow }) {
  const router = useRouter()
  const setStatus = useServerFn(setBarberAppointmentStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = appointment.status ?? 'pending'
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  }
  const startsAt = new Date(appointment.startsAt)
  const isPast = startsAt.getTime() <= Date.now()
  const isPaid = appointment.payments.some((p) => p.status === 'approved')

  async function change(next: Status) {
    setError(null)
    setBusy(true)
    try {
      await setStatus({ data: { appointmentId: appointment.id, status: next } })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {timeFormatter.format(startsAt)} · {appointment.service.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {appointment.customer.name}
            {appointment.customer.phone
              ? ` · ${appointment.customer.phone}`
              : ''}
          </p>
          {appointment.notes ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nota: {appointment.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs font-medium">
          <span className={cn('rounded-full px-2.5 py-1', config.className)}>
            {config.label}
          </span>
          {isPaid ? (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
              Pagada
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {formatCop(appointment.service.price)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === 'pending' ? (
          <Button size="sm" disabled={busy} onClick={() => change('confirmed')}>
            Confirmar
          </Button>
        ) : null}
        {status === 'confirmed' && isPast ? (
          <Button size="sm" disabled={busy} onClick={() => change('completed')}>
            Completar
          </Button>
        ) : null}
        {(status === 'pending' || status === 'confirmed') && !isPast ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => change('cancelled')}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  )
}

export function BarberAgenda({
  appointments,
}: {
  appointments: Array<AgendaRow>
}) {
  const [range, setRange] = useState<Range>('today')
  const end = rangeEnd(range)
  const visible = appointments.filter(
    (a) => new Date(a.startsAt).getTime() < end,
  )

  const groups = new Map<string, Array<AgendaRow>>()
  for (const a of visible) {
    const key = toDateKey(new Date(a.startsAt))
    groups.set(key, [...(groups.get(key) ?? []), a])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agenda</CardTitle>
        <CardDescription>
          Tus citas desde hoy. Solo ves y gestionas las asignadas a ti.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={range === r.id ? 'default' : 'outline'}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay citas en este periodo.
          </p>
        ) : (
          [...groups.entries()].map(([key, items]) => (
            <section key={key} className="space-y-2">
              <h2 className="text-sm font-semibold capitalize">
                {dayFormatter.format(new Date(items[0]?.startsAt ?? key))}
              </h2>
              <ul className="space-y-2">
                {items.map((a) => (
                  <AppointmentItem key={a.id} appointment={a} />
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}
