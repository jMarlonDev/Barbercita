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
}: {
  appointment: AppointmentRow
  role: UserRole
  /** Appointment id with an action in flight. */
  busy: string | null
  onCancel: (appointment: AppointmentRow) => void
  onPay: (appointmentId: string) => void
}) {
  const [showLog, setShowLog] = useState(false)
  const startsAt = new Date(appointment.startsAt)
  const status = appointment.status ?? 'pending'
  const active = isUpcoming(appointment)
  const paid = isPaid(appointment)
  const isBusy = busy === appointment.id
  const canPay = role === 'customer' && active && status === 'pending' && !paid

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{appointment.service.name}</span>
              <StatusBadge status={status} />
              {paid && (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  Pagada
                </Badge>
              )}
              {hasPendingPayment(appointment) && (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  Pago en proceso
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {role !== 'customer' && (
                <span className="inline-flex items-center gap-1">
                  <User01 className="size-3.5" />
                  {appointment.customer.name}
                </span>
              )}
              {role !== 'barber' && (
                <span className="inline-flex items-center gap-1">
                  <Scissors01 className="size-3.5" />
                  {appointment.barber.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                {dateFormatter.format(startsAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {timeFormatter.format(startsAt)} (
                {appointment.service.durationMinutes} min)
              </span>
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {formatCop(appointment.service.price)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPay && (
            <Button
              size="sm"
              onClick={() => onPay(appointment.id)}
              disabled={isBusy}
            >
              {isBusy ? 'Redirigiendo...' : 'Pagar'}
            </Button>
          )}
          {active && role === 'customer' && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/reservar" search={{ cita: appointment.id }}>
                Reprogramar
              </Link>
            </Button>
          )}
          {active && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(appointment)}
              disabled={isBusy}
            >
              Cancelar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1"
            aria-expanded={showLog}
            onClick={() => setShowLog((v) => !v)}
          >
            Actividad
            <ChevronDown className={showLog ? 'size-4 rotate-180' : 'size-4'} />
          </Button>
        </div>

        {showLog && (
          <div className="rounded-lg bg-muted/40 p-3">
            <AppointmentTimeline appointmentId={appointment.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
