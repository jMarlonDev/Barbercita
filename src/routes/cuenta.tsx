import { useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  AlertCircle,
  Calendar,
  Clock,
  Scissors01,
  User01,
  XClose,
} from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { UserRole } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { cancelAppointment, getMyAppointments } from '@/server/appointments'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbero',
  customer: 'Cliente',
}

const APPOINTMENTS_COPY: Record<
  UserRole,
  { title: string; description: string; emptyTitle: string }
> = {
  admin: {
    title: 'Todas las citas',
    description: 'Supervisa las reservas de todos los clientes y barberos.',
    emptyTitle: 'Todavía no hay citas registradas',
  },
  barber: {
    title: 'Citas asignadas',
    description: 'Consulta y gestiona las reservas asignadas a tu agenda.',
    emptyTitle: 'No tienes citas asignadas',
  },
  customer: {
    title: 'Mis citas',
    description: 'Consulta y gestiona tus próximas reservas.',
    emptyTitle: 'No tienes citas programadas',
  },
}

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
  completed: {
    label: 'Completada',
    className: 'bg-primary/10 text-primary',
  },
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
})

export const Route = createFileRoute('/cuenta')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => {
    const appointments = await getMyAppointments()
    return { appointments }
  },
  component: AccountPage,
})

function AccountPage() {
  const { user } = Route.useRouteContext()
  const { appointments } = Route.useLoaderData()
  const router = useRouter()
  const cancelAppointmentFn = useServerFn(cancelAppointment)

  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return null
  }

  async function handleCancel(appointmentId: string) {
    setError(null)
    setCancellingId(appointmentId)

    try {
      await cancelAppointmentFn({ data: { appointmentId } })
      await router.invalidate()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cancelar la cita. Intenta de nuevo.',
      )
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <User01 className="size-5" />
            </span>
            <div>
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{user.email}</span>
                {user.phone && <span>· {user.phone}</span>}
              </CardDescription>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {ROLE_LABELS[user.role]}
          </span>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {APPOINTMENTS_COPY[user.role].title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {APPOINTMENTS_COPY[user.role].description}
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {appointments.length}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {appointments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Calendar className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {APPOINTMENTS_COPY[user.role].emptyTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cuando se registre una cita, aparecerá aquí con todos sus
                  detalles.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="mt-1">
                <Link to="/">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {appointments.map((appointment) => {
              const startsAt = new Date(appointment.startsAt)
              const statusKey = appointment.status ?? 'pending'
              const statusInfo = STATUS_CONFIG[statusKey] ?? {
                label: statusKey,
                className: 'bg-muted text-muted-foreground',
              }
              const isActive =
                statusKey === 'pending' || statusKey === 'confirmed'
              const isCancellable = isActive && startsAt.getTime() > Date.now()
              const isCancelling = cancellingId === appointment.id

              return (
                <Card key={appointment.id} size="sm">
                  <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {appointment.service.name}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            statusInfo.className,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {user.role !== 'customer' && (
                          <span className="inline-flex items-center gap-1">
                            <User01 className="size-3.5" />
                            {appointment.customer.name}
                          </span>
                        )}
                        {user.role !== 'barber' && (
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

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-sm font-semibold tabular-nums">
                        ${appointment.service.price}
                      </span>

                      {isCancellable && (
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleCancel(appointment.id)}
                          disabled={isCancelling}
                          className="gap-1"
                        >
                          <XClose className="size-3" />
                          {isCancelling ? 'Cancelando...' : 'Cancelar'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
