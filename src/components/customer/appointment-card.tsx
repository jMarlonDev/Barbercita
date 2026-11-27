import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  Pencil,
  Xmark,
} from '@gravity-ui/icons'
import { AppointmentTimeline } from './appointment-timeline'
import { StatusBadge } from './status'
import type { UserRole } from '@/lib/auth'
import type { getMyAppointments } from '@/server/appointments'
import { UserAvatar } from '@/components/app/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BUSINESS_TIME_ZONE, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'

export type AppointmentRow = Awaited<
  ReturnType<typeof getMyAppointments>
>[number]

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})
const dayNumber = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})
const monthShort = new Intl.DateTimeFormat('es-ES', {
  month: 'short',
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

export function isPaid(appointment: AppointmentRow) {
  return appointment.payments.some((p) => p.status === 'approved')
}

function hasPendingPayment(appointment: AppointmentRow) {
  return (
    !isPaid(appointment) &&
    appointment.payments.some((p) => p.status === 'pending')
  )
}

/** "hoy", "mañana", "en 2 días", "en 3 horas"… */
export function countdownLabel(startsAt: Date | string): string {
  const date = new Date(startsAt)
  const diffMs = date.getTime() - Date.now()
  if (diffMs <= 0) return 'ya pasó'
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 60) return `en ${minutes} min`
  const toUtc = (d: Date) => Date.parse(`${toDateKey(d)}T00:00:00Z`)
  const days = Math.round((toUtc(date) - toUtc(new Date())) / 86400000)
  if (days === 0) {
    const hours = Math.round(minutes / 60)
    return `hoy, en ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  if (days === 1) return 'mañana'
  return `en ${days} días`
}

export function AppointmentCard({
  appointment,
  role,
  busy,
  onCancel,
  onPay,
  onReschedule,
  featured = false,
}: {
  appointment: AppointmentRow
  role: UserRole
  /** Appointment id with an action in flight. */
  busy: string | null
  onCancel: (appointment: AppointmentRow) => void
  onPay: (appointmentId: string) => void
  onReschedule?: (appointment: AppointmentRow) => void
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
    <article
      className={cn(
        'lift space-y-6 rounded-3xl border bg-card p-5 shadow-card sm:p-6',
        featured ? 'border-primary/25 bg-warm-surface sm:p-8' : 'border-border',
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div
          className={cn(
            'flex shrink-0 flex-col items-center justify-center rounded-2xl bg-tone-rose text-tone-rose-fg',
            featured ? 'size-24' : 'size-20',
          )}
        >
          <span
            className={cn(
              'font-display font-extrabold leading-none tabular-nums',
              featured ? 'text-4xl' : 'text-3xl',
            )}
          >
            {dayNumber.format(startsAt)}
          </span>
          <span className="eyebrow mt-1 text-tone-rose-fg">
            {monthShort.format(startsAt).replace('.', '')}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                'font-display font-extrabold tracking-tight text-foreground',
                featured ? 'text-2xl sm:text-3xl' : 'text-xl',
              )}
            >
              {appointment.service.name}
            </h3>
            <StatusBadge status={status} />
            {paid && <Badge variant="success">Pagada</Badge>}
            {hasPendingPayment(appointment) && (
              <Badge variant="warning">Pago en proceso</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground">
            <span className="inline-flex items-center gap-2 capitalize">
              <Calendar className="size-5" />
              {dateFormatter.format(startsAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-5" />
              {timeFormatter.format(startsAt)} ·{' '}
              {appointment.service.durationMinutes} min
            </span>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={role === 'customer' ? appointment.barber.name : appointment.customer.name}
              size="md"
            />
            <div className="min-w-0 leading-tight">
              <p className="text-base font-semibold text-foreground">
                {role === 'customer' ? appointment.barber.name : appointment.customer.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {role === 'customer' ? 'Tu barbero' : 'Cliente'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <span className="font-display text-2xl font-extrabold tabular-nums text-foreground">
            {formatCop(appointment.service.price)}
          </span>
          {active && (
            <Badge variant="info" className="px-3 py-1 text-sm">
              {countdownLabel(startsAt)}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canPay && (
          <Button
            size="lg"
            className="press min-h-12 gap-2"
            onClick={() => onPay(appointment.id)}
            disabled={isBusy}
          >
            <CreditCard className="size-5" />
            {isBusy ? 'Abriendo pago…' : 'Pagar'}
          </Button>
        )}
        {active && role === 'customer' && (
          <Button
            variant="outline"
            size="lg"
            className="press min-h-12 gap-2"
            disabled={isBusy}
            onClick={() => onReschedule?.(appointment)}
            asChild={!onReschedule}
          >
            {onReschedule ? (
              <>
                <Pencil className="size-5" />
                Reprogramar
              </>
            ) : (
              <Link to="/reservar" search={{ cita: appointment.id }}>
                <Pencil className="size-5" />
                Reprogramar
              </Link>
            )}
          </Button>
        )}
        {active && (
          <Button
            variant="ghost"
            size="lg"
            className="press min-h-12 gap-2 text-destructive hover:bg-destructive-soft hover:text-destructive"
            onClick={() => onCancel(appointment)}
            disabled={isBusy}
          >
            <Xmark className="size-5" />
            Cancelar
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="press ml-auto min-h-12 gap-1.5"
          aria-expanded={showLog}
          onClick={() => setShowLog((v) => !v)}
        >
          Ver detalle
          <ChevronDown
            className={cn('size-5 transition-transform', showLog && 'rotate-180')}
          />
        </Button>
      </div>

      {showLog && (
        <div className="animate-fade-up rounded-2xl border border-border bg-muted/60 p-5">
          {appointment.notes && (
            <p className="mb-4 text-base text-foreground">
              <span className="font-semibold">Tus notas: </span>
              {appointment.notes}
            </p>
          )}
          <AppointmentTimeline appointmentId={appointment.id} />
        </div>
      )}
    </article>
  )
}
