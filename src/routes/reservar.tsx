import { useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CreditCard01,
  Scissors01,
} from '@untitledui/icons'
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
    <Alert variant="destructive">
      <AlertCircle className="size-5" />
      <AlertTitle>No se pudo guardar</AlertTitle>
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
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild size="lg">
          <Link to="/cuenta" search={{ tab: 'inicio' }}>
            Ir a mi cuenta
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

const STEPS = [
  { label: 'Servicio', description: 'Qué te harás' },
  { label: 'Barbero', description: 'Quién te atiende' },
  { label: 'Fecha y hora', description: 'Cuándo' },
  { label: 'Confirmar', description: 'Revisa y paga' },
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
        'min-h-20 rounded-xl border-2 p-5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-base text-muted-foreground">{hint}</p>
    </div>
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

  const goTo = (index: number) => {
    if (index < step) setStep(index)
  }

  const summary = (
    <Card className="lg:sticky lg:top-24" size="sm">
      <CardHeader>
        <CardTitle className="font-display text-lg font-semibold tracking-tight">
          Tu cita
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Servicio</dt>
            <dd className="text-right font-medium text-foreground">
              {selectedService?.name ?? target?.service.name ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Barbero</dt>
            <dd className="text-right font-medium text-foreground">
              {selectedBarberName ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Fecha y hora</dt>
            <dd className="text-right font-medium capitalize text-foreground">
              {startsAt ? summaryFormatter.format(new Date(startsAt)) : '—'}
            </dd>
          </div>
          <Separator />
          <div className="flex justify-between gap-4 text-base font-semibold text-foreground">
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
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          {target
            ? `${target.service.name} con ${target.barber.name}. Elige un nuevo horario.`
            : `Paso ${current + 1} de ${STEPS.length}: ${STEPS[current]?.label ?? ''}`}
        </p>
        {!isReschedule && (
          <>
            <div
              role="progressbar"
              aria-label="Progreso de la reserva"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={current + 1}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <Stepper value={current} onValueChange={goTo}>
              {STEPS.map((s, index) => (
                <StepperItem key={s.label}>
                  <StepperTrigger
                    index={index}
                    label={s.label}
                    description={s.description}
                    aria-label={`Paso ${index + 1}: ${s.label}`}
                  />
                  {index < STEPS.length - 1 && (
                    <StepperSeparator isComplete={index < current} />
                  )}
                </StepperItem>
              ))}
            </Stepper>
          </>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card key={current} className="animate-fade-up">
            <CardContent className="space-y-5">
              {current === 0 && (
                <>
                  <StepHeader
                    title="¿Qué servicio quieres?"
                    hint="Toca una opción para continuar."
                  />
                  {catalog.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="size-5" />
                      <AlertTitle>Sin servicios disponibles</AlertTitle>
                      <AlertDescription>
                        Aún no hay servicios configurados. Contacta con la
                        barbería.
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
                            setStep(1)
                          }}
                        >
                          <p className="text-base font-medium text-foreground">
                            {service.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {service.effectiveDuration} min ·{' '}
                            <span className="font-semibold tabular-nums text-foreground">
                              {formatCop(service.effectivePrice)}
                            </span>
                          </p>
                        </OptionButton>
                      ))}
                    </div>
                  )}
                </>
              )}

              {current === 1 && (
                <>
                  <StepHeader
                    title="¿Con quién quieres tu cita?"
                    hint={`${selectedService?.name ?? 'Servicio'}. Toca un barbero para continuar.`}
                  />
                  {barbersForService.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="size-5" />
                      <AlertTitle>Sin barberos disponibles</AlertTitle>
                      <AlertDescription>
                        No hay barberos que ofrezcan este servicio ahora.
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
                              setStep(2)
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <Scissors01 className="size-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-base font-medium text-foreground">
                                  {barber.name}
                                </p>
                                {barber.bio && (
                                  <p className="line-clamp-1 text-sm text-muted-foreground">
                                    {barber.bio}
                                  </p>
                                )}
                              </div>
                              {price && (
                                <span className="font-semibold tabular-nums text-foreground">
                                  {formatCop(price.effectivePrice)}
                                </span>
                              )}
                            </div>
                          </OptionButton>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {current === 2 && activeBarberId && activeServiceId && (
                <>
                  <StepHeader
                    title="Elige día y hora"
                    hint={`${selectedService?.name ?? ''} con ${selectedBarberName ?? ''}`}
                  />
                  <SlotCalendar
                    key={`${activeBarberId}-${activeServiceId}`}
                    barberId={activeBarberId}
                    serviceId={activeServiceId}
                    value={startsAt}
                    onChange={(slot) => {
                      setStartsAt(slot)
                      if (slot && !isReschedule) setStep(3)
                    }}
                    refreshToken={refreshToken}
                  />
                </>
              )}

              {current === 3 && (
                <>
                  <StepHeader
                    title="Confirma tu cita"
                    hint="Revisa el resumen y reserva."
                  />
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Input
                      id="notes"
                      value={notes}
                      maxLength={500}
                      placeholder="Alguna preferencia para tu barbero"
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <Alert>
                    <CreditCard01 className="size-5" />
                    <AlertTitle>Pago seguro con Wompi</AlertTitle>
                    <AlertDescription>
                      Paga ahora o después desde Mis citas.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            {!isReschedule && step > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ArrowLeft className="size-5" />
                Atrás
              </Button>
            )}
            {isReschedule ? (
              <Button
                size="lg"
                onClick={() => void handleConfirm(false)}
                disabled={!startsAt || isSubmitting}
                className="w-full gap-2 sm:w-auto"
              >
                <CheckCircle className="size-5" />
                {isSubmitting ? 'Guardando…' : 'Confirmar nuevo horario'}
              </Button>
            ) : (
              step === 3 && (
                <>
                  <Button
                    size="lg"
                    onClick={() => void handleConfirm(true)}
                    disabled={isSubmitting}
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    <CreditCard01 className="size-5" />
                    {isSubmitting ? 'Guardando…' : 'Reservar y pagar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => void handleConfirm(false)}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    Pagar después
                  </Button>
                </>
              )
            )}
          </div>
        </div>
        {summary}
      </div>
    </div>
  )
}
