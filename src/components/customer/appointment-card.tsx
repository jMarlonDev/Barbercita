import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Calendar,
  ChevronDown,
  Clock,
  Scissors01,
  User01,
} from '@untitledui/icons'
import { AppointmentTimeline } from './appointment-timeline'
import { StatusBadge } from './status'
import type { UserRole } from '@/lib/auth'
import type { getMyAppointments } from '@/server/appointments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'

export type AppointmentRow = Awaited<
  ReturnType<typeof getMyAppointments>
>[number]

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

export function isUpcoming(appointment: AppointmentRow) {
  return (
    (appointment.status === 'pending' || appointment.status === 'confirmed') &&
    new Date(appointment.startsAt).getTime() > Date.now()
  )
}

function isPaid(appointment: AppointmentRow) {
  return appointment.payments.some((p) => p.status === 'approved')
}

function hasPendingPayment(appointment: AppointmentRow) {
  return (
    !isPaid(appointment) &&
    appointment.payments.some((p) => p.status === 'pending')
  )
}

export function AppointmentCard({
  appointment,
  role,
  busy,
  onCancel,
  onPay,
  featured = false,
}: {
  appointment: AppointmentRow
  role: UserRole
  /** Appointment id with an action in flight. */
  busy: string | null
  onCancel: (appointment: AppointmentRow) => void
  onPay: (appointmentId: string) => void
  /** Larger layout for the highlighted next appointment. */
  featured?: boolean
}) {
  const [showLog, setShowLog] = useState(false)
  const startsAt = new Date(appointment.startsAt)
  const status = appointment.status ?? 'pending'
  const active = isUpcoming(appointment)
  const paid = isPaid(appointment)
  const isBusy = busy === appointment.id
  const canPay = role === 'customer' && active && status === 'pending' && !paid

  return (
    <Card className={featured ? 'border-primary/30 bg-card' : undefined}>
      <CardContent className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  featured
                    ? 'font-display text-xl font-semibold text-foreground'
                    : 'text-base font-medium text-foreground'
                }
              >
                {appointment.service.name}
              </span>
              <StatusBadge status={status} />
              {paid && <Badge variant="success">Pagada</Badge>}
              {hasPendingPayment(appointment) && (
                <Badge variant="warning">Pago en proceso</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {role !== 'customer' && (
                <span className="inline-flex items-center gap-1.5">
                  <User01 className="size-4" />
                  {appointment.customer.name}
                </span>
              )}
              {role !== 'barber' && (
                <span className="inline-flex items-center gap-1.5">
                  <Scissors01 className="size-4" />
                  {appointment.barber.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {dateFormatter.format(startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                {timeFormatter.format(startsAt)} (
                {appointment.service.durationMinutes} min)
              </span>
            </div>
          </div>
          <span className="font-semibold tabular-nums text-lg text-foreground">
            {formatCop(appointment.service.price)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canPay && (
            <Button onClick={() => onPay(appointment.id)} disabled={isBusy}>
              {isBusy ? 'Redirigiendo...' : 'Pagar'}
            </Button>
          )}
          {active && role === 'customer' && (
            <Button variant="outline" asChild>
              <Link to="/reservar" search={{ cita: appointment.id }}>
                Reprogramar
              </Link>
            </Button>
          )}
          {active && (
            <Button
              variant="destructive"
              onClick={() => onCancel(appointment)}
              disabled={isBusy}
            >
              Cancelar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5"
            aria-expanded={showLog}
            onClick={() => setShowLog((v) => !v)}
          >
            Actividad
            <ChevronDown className={showLog ? 'size-4 rotate-180' : 'size-4'} />
          </Button>
        </div>

        {showLog && (
          <div className="rounded-xl border border-border bg-muted p-4">
            <AppointmentTimeline appointmentId={appointment.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
