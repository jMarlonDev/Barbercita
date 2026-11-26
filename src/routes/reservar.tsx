import { useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, Check, ChevronRight, Scissors01, CreditCard01 } from '@untitledui/icons'
import { SlotCalendar } from '@/components/appointments/slot-calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toaster'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  Stepper,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
} from '@/components/ui/stepper'

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
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="size-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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
          <Link to="/cuenta" search={{ tab: 'citas' }}>Ir a mi cuenta</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

const STEPS = [
  { label: 'Servicio', description: 'Elige tu servicio' },
  { label: 'Barbero', description: 'Selecciona barbero' },
  { label: 'Fecha y hora', description: 'Horario disponible' },
  { label: 'Pago', description: 'Confirmar y pagar' },
] as const

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
        'rounded-xl border-2 p-4 text-left transition-all hover:bg-secondary',
        selected
          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
          : 'border-border',
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
      await navigate({ to: '/cuenta', search: { tab: 'citas' } })
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
    <Card className="lg:sticky lg:top-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tu cita</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="space-y-2 text-muted-foreground">
          <div className="flex justify-between gap-3">
            <dt>Servicio</dt>
            <dd className="text-right text-foreground font-medium">
              {selectedService?.name ?? target?.service.name ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Barbero</dt>
            <dd className="text-right text-foreground font-medium">
              {selectedBarberName ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Fecha</dt>
            <dd className="text-right capitalize text-foreground font-medium">
              {startsAt ? summaryFormatter.format(new Date(startsAt)) : '—'}
            </dd>
          </div>
          <Separator />
          <div className="flex justify-between gap-3 font-semibold text-foreground text-base">
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

      {!isReschedule && (
        <Stepper value={current} onValueChange={setStep} className="mb-6">
          {STEPS.map((s, index) => (
            <StepperItem key={s.label}>
              <StepperTrigger
                className={cn(
                  'flex items-center gap-3',
                  index === current && 'text-primary',
                  index < current && 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all',
                    index < current
                      ? 'bg-primary text-primary-foreground'
                      : index === current
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {index < current ? <Check className="size-4" /> : index + 1}
                </span>
                <div className="hidden sm:block">
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <div className="sm:hidden text-sm font-medium">{s.label}</div>
              </StepperTrigger>
              {index < STEPS.length - 1 && <StepperSeparator />}
            </StepperItem>
          ))}
        </Stepper>
      )}

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              {current === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Elige tu servicio</h3>
                    <p className="text-sm text-muted-foreground">
                      Selecciona el servicio que deseas reservar
                    </p>
                  </div>
                  {catalog.length === 0 ? (
                    <Alert>
                      <AlertCircle className="size-4" />
                      <AlertTitle>Sin servicios disponibles</AlertTitle>
                      <AlertDescription>
                        Aún no hay servicios configurados. Contacta con la barbería.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
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
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {service.effectiveDuration} min ·{' '}
                              <span className="font-semibold text-foreground">
                                {formatCop(service.effectivePrice)}
                              </span>
                            </p>
                          </div>
                        </OptionButton>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {current === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Selecciona tu barbero</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedService?.name} — Elige quién te atenderá
                    </p>
                  </div>
                  {barbersForService.length === 0 ? (
                    <Alert>
                      <AlertCircle className="size-4" />
                      <AlertTitle>Sin barberos disponibles</AlertTitle>
                      <AlertDescription>
                        No hay barberos que ofrezcan este servicio actualmente.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
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
                            <div className="flex items-start gap-3">
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <Scissors01 className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{barber.name}</p>
                                {barber.bio && (
                                  <p className="line-clamp-1 text-sm text-muted-foreground">
                                    {barber.bio}
                                  </p>
                                )}
                              </div>
                              {price && (
                                <span className="text-sm font-semibold tabular-nums text-foreground">
                                  {formatCop(price.effectivePrice)}
                                </span>
                              )}
                            </div>
                          </OptionButton>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {current === 2 && activeBarberId && activeServiceId && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Elige fecha y hora</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedService?.name} con {selectedBarberName}
                    </p>
                  </div>
                  <SlotCalendar
                    key={`${activeBarberId}-${activeServiceId}`}
                    barberId={activeBarberId}
                    serviceId={activeServiceId}
                    value={startsAt}
                    onChange={setStartsAt}
                    refreshToken={refreshToken}
                  />
                </div>
              )}

              {current === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Confirmar y pagar</h3>
                    <p className="text-sm text-muted-foreground">
                      Revisa los detalles y elige cómo pagar
                    </p>
                  </div>
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
                    <Alert className="border-accent/30 bg-accent/5">
                      <CreditCard01 className="size-4" />
                      <AlertTitle className="text-accent-foreground">Pago seguro con Wompi</AlertTitle>
                      <AlertDescription className="text-accent-foreground/90">
                        Pagas de forma segura con Wompi. También puedes reservar y pagar
                        después desde tu cuenta.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!isReschedule && step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                <ChevronRight className="size-4 rotate-180 mr-2" />
                Atrás
              </Button>
            )}
            {isReschedule ? (
              <Button
                onClick={() => void handleConfirm(false)}
                disabled={!startsAt || isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar nuevo horario'}
              </Button>
            ) : step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
                Continuar
                <ChevronRight className="size-4 ml-2" />
              </Button>
            ) : (
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => void handleConfirm(true)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? 'Guardando...' : 'Reservar y pagar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Pagar después
                </Button>
              </div>
            )}
          </div>
        </div>
        {summary}
      </div>
    </div>
  )
}