import { useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, Check, Clock, Scissors01 } from '@untitledui/icons'
import { SlotCalendar } from '@/components/appointments/slot-calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
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
    const offers = await Promise.all(
      barbers.map(async (barber) => ({
        barber,
        services: await getServicesByBarber({ data: { barberId: barber.id } }),
      })),
    )
    return { barbers, appointment, offers }
  },
  component: BookingPage,
})

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

const STEPS = ['Servicio', 'Barbero', 'Fecha y hora', 'Pago'] as const

function Stepper({
  current,
  labels,
}: {
  current: number
  labels: ReadonlyArray<string>
}) {
  return (
    <ol className="flex items-center gap-2" aria-label="Pasos de la reserva">
      {labels.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <span
              className={cn(
                'h-1 rounded-full bg-border',
                (done || active) && 'bg-primary',
              )}
            />
            <span
              className={cn(
                'flex items-center gap-1 truncate text-xs',
                active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3" /> : <span>{index + 1}.</span>}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{active ? label : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border p-3 text-left transition-colors hover:bg-secondary',
        selected && 'border-primary bg-secondary',
      )}
    >
      {children}
    </button>
  )
}

function BookingPage() {
  const { user } = Route.useRouteContext()
  const { cita } = Route.useSearch()
  const { appointment, offers } = Route.useLoaderData()
  const navigate = useNavigate()
  const createFn = useServerFn(createAppointment)
  const rescheduleFn = useServerFn(rescheduleAppointment)
  const paymentFn = useServerFn(createPayment)

  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [barberId, setBarberId] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Distinct services offered by at least one active barber.
  const catalog = useMemo(() => {
    const map = new Map<string, BarberServiceOption>()
    for (const offer of offers) {
      for (const service of offer.services) {
        if (!map.has(service.id)) map.set(service.id, service)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [offers])

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

  const barbersForService = serviceId
    ? offers.filter((o) => o.services.some((s) => s.id === serviceId))
    : []
  const activeBarberId = target?.barberId ?? barberId
  const activeServiceId = target?.serviceId ?? serviceId
  const selectedOffer = offers.find((o) => o.barber.id === activeBarberId)
  const selectedService = selectedOffer?.services.find(
    (s) => s.id === activeServiceId,
  )
  const selectedBarberName = target?.barber.name ?? selectedOffer?.barber.name

  // Reschedule skips straight to date/time; create runs the full wizard.
  const current = isReschedule ? 2 : step
  const canContinue =
    (current === 0 && serviceId !== null) ||
    (current === 1 && barberId !== null) ||
    (current === 2 && startsAt !== null)

  async function handleConfirm(payNow: boolean) {
    if (!startsAt || !activeBarberId || !activeServiceId) return
    setError(null)
    setIsSubmitting(true)
    try {
      if (cita) {
        await rescheduleFn({ data: { appointmentId: cita, startsAt } })
        toast.success('Cita reprogramada')
      } else {
        const created = await createFn({
          data: {
            barberId: activeBarberId,
            serviceId: activeServiceId,
            startsAt,
            notes: notes.trim() || undefined,
          },
        })
        toast.success('Cita reservada')
        if (payNow) {
          try {
            const { checkoutUrl } = await paymentFn({
              data: { appointmentId: created.id },
            })
            window.location.href = checkoutUrl
            return
          } catch {
            toast.error(
              'No se pudo iniciar el pago. Puedes pagar desde tu cuenta.',
            )
          }
        }
      }
      await navigate({ to: '/cuenta' })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la cita. Intenta de nuevo.'
      setError(message)
      toast.error(message)
      setStartsAt(null)
      if (!isReschedule) setStep(2)
      setRefreshToken((token) => token + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const summary = (
    <Card size="sm" className="lg:sticky lg:top-4">
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">Tu cita</p>
        <dl className="space-y-1.5 text-muted-foreground">
          <div className="flex justify-between gap-3">
            <dt>Servicio</dt>
            <dd className="text-right text-foreground">
              {selectedService?.name ?? target?.service.name ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Barbero</dt>
            <dd className="text-right text-foreground">
              {selectedBarberName ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Fecha</dt>
            <dd className="text-right capitalize text-foreground">
              {startsAt ? summaryFormatter.format(new Date(startsAt)) : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold text-foreground">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {selectedService
                ? formatCop(selectedService.effectivePrice)
                : '—'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isReschedule ? 'Reprogramar cita' : 'Agendar cita'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {target
            ? `${target.service.name} con ${target.barber.name}. Elige un nuevo horario.`
            : 'Cuatro pasos y listo.'}
        </p>
      </div>

      {!isReschedule && <Stepper current={current} labels={STEPS} />}

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          {current === 0 &&
            (catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay servicios disponibles.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {catalog.map((service) => (
                  <OptionButton
                    key={service.id}
                    selected={service.id === serviceId}
                    onClick={() => {
                      setServiceId(service.id)
                      setBarberId(null)
                      setStartsAt(null)
                    }}
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
                  </OptionButton>
                ))}
              </div>
            ))}

          {current === 1 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {barbersForService.map(({ barber, services }) => {
                const price = services.find((s) => s.id === serviceId)
                return (
                  <OptionButton
                    key={barber.id}
                    selected={barber.id === barberId}
                    onClick={() => {
                      setBarberId(barber.id)
                      setStartsAt(null)
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Scissors01 className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{barber.name}</span>
                        {barber.bio && (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {barber.bio}
                          </span>
                        )}
                      </span>
                      {price && (
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCop(price.effectivePrice)}
                        </span>
                      )}
                    </span>
                  </OptionButton>
                )
              })}
            </div>
          )}

          {current === 2 && activeBarberId && activeServiceId && (
            <SlotCalendar
              key={`${activeBarberId}-${activeServiceId}`}
              barberId={activeBarberId}
              serviceId={activeServiceId}
              value={startsAt}
              onChange={setStartsAt}
              refreshToken={refreshToken}
            />
          )}

          {current === 3 && (
            <div className="space-y-4">
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
              <p className="text-sm text-muted-foreground">
                Pagas de forma segura con Wompi. También puedes reservar y pagar
                después desde tu cuenta.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {!isReschedule && step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Atrás
              </Button>
            )}
            {isReschedule ? (
              <Button
                onClick={() => void handleConfirm(false)}
                disabled={!startsAt || isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar nuevo horario'}
              </Button>
            ) : step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
                Continuar
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => void handleConfirm(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Reservar y pagar'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void handleConfirm(false)}
                  disabled={isSubmitting}
                >
                  Pagar después
                </Button>
              </>
            )}
          </div>
        </div>
        {summary}
      </div>
    </div>
  )
}
