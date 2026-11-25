import { useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, Clock, Scissors01 } from '@untitledui/icons'
import { SlotCalendar } from '@/components/appointments/slot-calendar'
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
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  createAppointment,
  getMyAppointments,
  rescheduleAppointment,
} from '@/server/appointments'
import { getBarbers } from '@/server/barbers'
import { createPayment } from '@/server/payments'
import { getServicesByBarber } from '@/server/services'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const summaryFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

type BarberServiceOption = Awaited<
  ReturnType<typeof getServicesByBarber>
>[number]

export const Route = createFileRoute('/reservar')({
  validateSearch: (search: Record<string, unknown>): { cita?: string } =>
    typeof search.cita === 'string' && UUID_PATTERN.test(search.cita)
      ? { cita: search.cita }
      : {},
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  loaderDeps: ({ search }) => ({ cita: search.cita }),
  loader: async ({ deps }) => {
    const [barbers, appointments] = await Promise.all([
      getBarbers(),
      deps.cita ? getMyAppointments() : Promise.resolve([]),
    ])
    const appointment = appointments.find((a) => a.id === deps.cita) ?? null
    return { barbers, appointment }
  },
  component: BookingPage,
})

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {step}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function Notice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/cuenta">Ir a mi cuenta</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function BookingPage() {
  const { user } = Route.useRouteContext()
  const { cita } = Route.useSearch()
  const { barbers, appointment } = Route.useLoaderData()
  const navigate = useNavigate()
  const getServicesFn = useServerFn(getServicesByBarber)
  const createFn = useServerFn(createAppointment)
  const rescheduleFn = useServerFn(rescheduleAppointment)
  const paymentFn = useServerFn(createPayment)

  const [barberId, setBarberId] = useState<string | null>(null)
  const [services, setServices] = useState<BarberServiceOption[]>([])
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return null
  }

  if (user.role !== 'customer') {
    return (
      <Notice
        title="Las reservas son para clientes"
        description="Gestiona las citas desde tu cuenta."
      />
    )
  }

  const target =
    appointment &&
    appointment.customerId === user.id &&
    (appointment.status === 'pending' || appointment.status === 'confirmed') &&
    new Date(appointment.startsAt).getTime() > Date.now()
      ? appointment
      : null
  const isReschedule = Boolean(cita)

  if (isReschedule && !target) {
    return (
      <Notice
        title="Esta cita no se puede reprogramar"
        description="Solo las citas propias, activas y futuras pueden cambiarse."
      />
    )
  }

  const activeBarberId = target?.barberId ?? barberId
  const activeServiceId = target?.serviceId ?? serviceId
  const selectedService = services.find((s) => s.id === serviceId)

  async function selectBarber(id: string) {
    setBarberId(id)
    setServiceId(null)
    setStartsAt(null)
    setServices([])
    setError(null)
    try {
      setServices(await getServicesFn({ data: { barberId: id } }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar servicios.',
      )
    }
  }

  async function handleConfirm(payNow = false) {
    if (!startsAt || !activeBarberId || !activeServiceId) return
    setError(null)
    setIsSubmitting(true)
    try {
      if (cita) {
        await rescheduleFn({ data: { appointmentId: cita, startsAt } })
      } else {
        const created = await createFn({
          data: {
            barberId: activeBarberId,
            serviceId: activeServiceId,
            startsAt,
            notes: notes.trim() || undefined,
          },
        })
        if (payNow) {
          try {
            const { checkoutUrl } = await paymentFn({
              data: { appointmentId: created.id },
            })
            window.location.href = checkoutUrl
            return
          } catch {
            // The appointment exists; the customer can pay from /cuenta.
          }
        }
      }
      await navigate({ to: '/cuenta' })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la cita. Intenta de nuevo.',
      )
      setStartsAt(null)
      setRefreshToken((token) => token + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const calendarStep = isReschedule ? 1 : 3

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isReschedule ? 'Reprogramar cita' : 'Reservar cita'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {target
            ? `${target.service.name} con ${target.barber.name}. Elige un nuevo horario.`
            : 'Elige barbero, servicio y horario en unos pasos.'}
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      {!isReschedule && (
        <StepCard step={1} title="Barbero">
          {barbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay barberos disponibles.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  type="button"
                  aria-pressed={barber.id === barberId}
                  onClick={() => void selectBarber(barber.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-secondary',
                    barber.id === barberId && 'border-primary bg-secondary',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Scissors01 className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{barber.name}</span>
                    {barber.bio && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {barber.bio}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </StepCard>
      )}

      {!isReschedule && barberId && (
        <StepCard step={2} title="Servicio">
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este barbero no tiene servicios disponibles.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={service.id === serviceId}
                  onClick={() => {
                    setServiceId(service.id)
                    setStartsAt(null)
                  }}
                  className={cn(
                    'rounded-lg border border-border p-3 text-left transition-colors hover:bg-secondary',
                    service.id === serviceId && 'border-primary bg-secondary',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCop(service.effectivePrice)}
                    </span>
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {service.effectiveDuration} min
                  </span>
                </button>
              ))}
            </div>
          )}
        </StepCard>
      )}

      {activeBarberId && activeServiceId && (
        <StepCard step={calendarStep} title="Fecha y hora">
          <SlotCalendar
            key={`${activeBarberId}-${activeServiceId}`}
            barberId={activeBarberId}
            serviceId={activeServiceId}
            value={startsAt}
            onChange={setStartsAt}
            refreshToken={refreshToken}
          />
        </StepCard>
      )}

      {startsAt && (
        <StepCard step={calendarStep + 1} title="Confirmar">
          <div className="space-y-4">
            {!isReschedule && (
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  maxLength={500}
                  placeholder="Alguna preferencia para tu barbero"
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            )}
            <CardDescription className="capitalize">
              {summaryFormatter.format(new Date(startsAt))}
              {selectedService &&
                ` · ${selectedService.name} · ${formatCop(selectedService.effectivePrice)}`}
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void handleConfirm(!isReschedule)}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Guardando...'
                  : isReschedule
                    ? 'Confirmar nuevo horario'
                    : 'Reservar y pagar'}
              </Button>
              {!isReschedule && (
                <Button
                  variant="outline"
                  onClick={() => void handleConfirm()}
                  disabled={isSubmitting}
                >
                  Reservar, pagar después
                </Button>
              )}
            </div>
          </div>
        </StepCard>
      )}
    </div>
  )
}
