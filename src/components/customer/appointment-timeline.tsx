import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { getAppointmentEvents } from '@/server/appointments'

const ACTION_LABELS: Record<string, string> = {
  created: 'Cita creada',
  rescheduled: 'Cita reprogramada',
  cancelled: 'Cita cancelada',
  confirmed: 'Cita confirmada',
  completed: 'Cita completada',
  no_show: 'No asistió',
  paid: 'Pago aprobado',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administración',
  barber: 'Barbero',
  customer: 'Tú',
  system: 'Sistema',
}

const stampFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

type EventRow = Awaited<ReturnType<typeof getAppointmentEvents>>[number]

/** Visual activity log for one appointment. */
export function AppointmentTimeline({
  appointmentId,
}: {
  appointmentId: string
}) {
  const fetchEvents = useServerFn(getAppointmentEvents)
  const [events, setEvents] = useState<Array<EventRow> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchEvents({ data: { appointmentId } })
      .then((rows) => {
        if (!cancelled) setEvents(rows)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [appointmentId, fetchEvents])

  if (failed) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la actividad.
      </p>
    )
  }
  if (!events) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>
  }
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
    )
  }

  return (
    <ol className="space-y-5 border-l border-border pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[20px] top-2 size-3 rounded-full bg-primary" />
          <p className="font-medium text-sm text-foreground">
            {ACTION_LABELS[event.action] ?? event.action}
          </p>
          <p className="text-sm text-muted-foreground">
            {stampFormatter.format(new Date(event.createdAt))} ·{' '}
            {ROLE_LABELS[event.actorRole] ?? event.actorRole}
          </p>
        </li>
      ))}
    </ol>
  )
}
