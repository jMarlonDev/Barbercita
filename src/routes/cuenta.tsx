import { useState } from 'react'
import type { FormEvent } from 'react'
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
  CheckCircle,
  Clock,
  Plus,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthUser, UserRole } from '@/lib/auth'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { cn } from '@/lib/utils'
import { cancelAppointment, getMyAppointments } from '@/server/appointments'
import { updateProfile } from '@/server/auth'

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
  timeZone: BUSINESS_TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
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

type AppointmentRow = Awaited<ReturnType<typeof getMyAppointments>>[number]

function isUpcoming(appointment: AppointmentRow) {
  return (
    (appointment.status === 'pending' || appointment.status === 'confirmed') &&
    new Date(appointment.startsAt).getTime() > Date.now()
  )
}

function ProfileCard({ user }: { user: AuthUser }) {
  const router = useRouter()
  const updateProfileFn = useServerFn(updateProfile)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    setIsSaving(true)
    try {
      await updateProfileFn({ data: { name, phone } })
      await router.invalidate()
      setFeedback({ ok: true, message: 'Perfil actualizado.' })
    } catch (err) {
      setFeedback({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el perfil.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mi perfil</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              minLength={2}
              maxLength={100}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              maxLength={20}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {feedback && (
              <span
                role={feedback.ok ? 'status' : 'alert'}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm',
                  feedback.ok ? 'text-emerald-600' : 'text-destructive',
                )}
              >
                {feedback.ok ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
                {feedback.message}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function AppointmentCard({
  appointment,
  role,
  cancellingId,
  onCancel,
}: {
  appointment: AppointmentRow
  role: UserRole
  cancellingId: string | null
  onCancel: (appointmentId: string) => void
}) {
  const startsAt = new Date(appointment.startsAt)
  const statusKey = appointment.status ?? 'pending'
  const statusInfo = STATUS_CONFIG[statusKey] ?? {
    label: statusKey,
    className: 'bg-muted text-muted-foreground',
  }
  const canManage = isUpcoming(appointment)
  const isCancelling = cancellingId === appointment.id

  return (
    <Card size="sm">
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

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm font-semibold tabular-nums">
            ${appointment.service.price}
          </span>

          {canManage && role === 'customer' && (
            <Button variant="outline" size="xs" asChild>
              <Link to="/reservar" search={{ cita: appointment.id }}>
                Reprogramar
              </Link>
            </Button>
          )}
          {canManage && (
            <Button
              variant="destructive"
              size="xs"
              onClick={() => onCancel(appointment.id)}
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
}

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

  const isCustomer = user.role === 'customer'
  // Customers get upcoming (soonest first) and history sections.
  const upcoming = isCustomer
    ? appointments.filter(isUpcoming).reverse()
    : appointments
  const history = isCustomer ? appointments.filter((a) => !isUpcoming(a)) : []

  const renderList = (list: Array<AppointmentRow>) => (
    <div className="grid gap-3">
      {list.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          role={user.role}
          cancellingId={cancellingId}
          onCancel={handleCancel}
        />
      ))}
    </div>
  )

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

      {isCustomer && (
        <ProfileCard key={`${user.name}|${user.phone}`} user={user} />
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isCustomer
                ? 'Próximas citas'
                : APPOINTMENTS_COPY[user.role].title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {APPOINTMENTS_COPY[user.role].description}
            </p>
          </div>
          {isCustomer && (
            <Button size="sm" asChild className="gap-1.5">
              <Link to="/reservar">
                <Plus className="size-4" />
                Reservar cita
              </Link>
            </Button>
          )}
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

        {upcoming.length === 0 ? (
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
            </CardContent>
          </Card>
        ) : (
          renderList(upcoming)
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Historial</h2>
          {renderList(history)}
        </section>
      )}
    </div>
  )
}
