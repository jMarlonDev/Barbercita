import { useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleExclamation,
  CircleXmark,
  Clock,
  CreditCard,
  Scissors,
} from '@gravity-ui/icons'
import { SlotCalendar } from '@/components/appointments/slot-calendar'
import { Confetti } from '@/components/customer/confetti'
import {
  PaymentWaitingPanel,
  useCheckout,
} from '@/components/customer/checkout'
import { UserAvatar } from '@/components/app/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

type BookingSearch = { cita?: string; barbero?: string }

export const Route = createFileRoute('/reservar')({
  validateSearch: (search: Record<string, unknown>): BookingSearch => {
    const result: BookingSearch = {}
    if (typeof search.cita === 'string' && UUID_PATTERN.test(search.cita)) {
      result.cita = search.cita
    }
    if (typeof search.barbero === 'string' && UUID_PATTERN.test(search.barbero)) {
      result.barbero = search.barbero
    }
    return result
  },
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
      <CircleExclamation className="size-5" />
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
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-foreground/12 bg-warm-surface p-10 text-center">
      <div className="space-y-1">
        <p className="font-display text-xl font-extrabold text-foreground">{title}</p>
        <p className="text-base text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="lg" className="press min-h-12">
        <Link to="/cuenta" search={{ tab: 'inicio' }}>
          Ir a mi cuenta
        </Link>
      </Button>
    </div>
  )
}

const STEPS = [
  { label: 'Servicio' },
  { label: 'Barbero' },
  { label: 'Fecha y hora' },
  { label: 'Confirmar' },
  { label: 'Pagar' },
] as const

function BookingStepper({
  current,
  onGo,
}: {
  current: number
  onGo: (index: number) => void
}) {
  return (
    <nav aria-label="Pasos de la reserva">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, index) => {
          const done = index < current
          const active = index === current
          const clickable = done && current < 4
          return (
            <li
              key={s.label}
              className={cn('flex items-center gap-2', index < STEPS.length - 1 && 'flex-1')}
              aria-current={active ? 'step' : undefined}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onGo(index)}
                aria-label={`Paso ${index + 1}: ${s.label}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full py-1 pr-1 pl-1 text-sm font-semibold transition-colors disabled:cursor-default',
                  active && 'bg-primary-soft pr-4 text-primary',
                  done && 'text-foreground',
                  !active && !done && 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm',
                    active && 'bg-primary text-primary-foreground',
                    done && 'bg-success text-primary-foreground',
                    !active && !done && 'bg-muted',
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span className={cn(!active && 'hidden', 'sm:inline')}>{s.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-0.5 flex-1 rounded-full transition-colors duration-300',
                    done ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
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
        'press lift min-h-24 rounded-3xl border-2 p-5 text-left transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none sm:p-6',
        selected
          ? 'animate-pop-in border-primary bg-primary-soft'
          : 'border-border bg-card hover:border-primary/40',
      )}
    >
      {children}
    </button>
  )
}

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="text-base text-muted-foreground">{hint}</p>
    </div>
  )
}

function BookingPage() {
  const { user } = Route.useRouteContext()
  const { cita, barbero } = Route.useSearch()
  const { appointment, offers } = Route.useLoaderData()
  const navigate = useNavigate()
  const createFn = useServerFn(createAppointment)
  const rescheduleFn = useServerFn(rescheduleAppointment)

  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [barberId, setBarberId] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'approved' | 'rejected' | null>(null)
  const checkout = useCheckout((result) => setOutcome(result))

  const catalog = useMemo(() => {
    const map = new Map<string, BarberServiceOption>()
    for (const offer of offers) {
      if (barbero && offer.barber.id !== barbero) continue
      for (const service of offer.services) {
        if (!map.has(service.id)) map.set(service.id, service)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [offers, barbero])

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

  const current = isReschedule ? 2 : createdId ? 4 : step

  async function handleConfirm(payNow: boolean) {
    if (!startsAt || !activeBarberId || !activeServiceId) return
    // Se abre en el click (sincrónico) para que el navegador no bloquee el popup.
    const payWindow = payNow && !cita ? window.open('', '_blank') : null
    setError(null)
    setIsSubmitting(true)
    try {
      if (cita) {
        await rescheduleFn({ data: { appointmentId: cita, startsAt } })
        toast.success('Cita reprogramada')
        await navigate({ to: '/cuenta', search: { tab: 'citas' } })
        return
      }
      const created = await createFn({
        data: {
          barberId: activeBarberId,
          serviceId: activeServiceId,
          startsAt,
          notes: notes.trim() || undefined,
        },
      })
      toast.success('¡Cita reservada!')
      setCreatedId(created.id)
      if (payNow) {
        await checkout.pay(created.id, payWindow)
      }
    } catch (err) {
      payWindow?.close()
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
    if (index < step && !createdId) setStep(index)
  }

  const summary = (
    <aside className="rounded-3xl border border-border bg-warm-surface p-6 shadow-card lg:sticky lg:top-24">
      <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
        Tu cita
      </h3>
      <dl className="mt-4 space-y-3 text-base">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Servicio</dt>
          <dd className="text-right font-semibold text-foreground">
            {selectedService?.name ?? target?.service.name ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Barbero</dt>
          <dd className="text-right font-semibold text-foreground">
            {selectedBarberName ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Fecha y hora</dt>
          <dd className="text-right font-semibold capitalize text-foreground">
            {startsAt ? summaryFormatter.format(new Date(startsAt)) : '—'}
          </dd>
        </div>
        <Separator />
        <div className="flex justify-between gap-4 font-display text-xl font-extrabold text-foreground">
          <dt>Total</dt>
          <dd className="tabular-nums">
            {selectedService ? formatCop(selectedService.effectivePrice) : '—'}
          </dd>
        </div>
      </dl>
    </aside>
  )

  if (createdId) {
    return (
      <div className="space-y-6">
        <BookingStepper current={4} onGo={goTo} />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="relative animate-pop-in space-y-5 overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-10">
              <Confetti />
              <span
                className={cn(
                  'mx-auto flex size-20 items-center justify-center rounded-full',
                  outcome === 'rejected'
                    ? 'bg-destructive-soft text-destructive'
                    : 'bg-success-soft text-success',
                )}
              >
                {outcome === 'rejected' ? (
                  <CircleXmark className="size-10" />
                ) : (
                  <CircleCheck className="size-10" />
                )}
              </span>
              <div className="space-y-2">
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
                  {outcome === 'approved'
                    ? '¡Pago recibido! Todo listo'
                    : outcome === 'rejected'
                      ? 'El pago no se completó'
                      : '¡Tu cita está reservada!'}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {outcome === 'approved'
                    ? 'Tu cita quedó confirmada. Te esperamos.'
                    : outcome === 'rejected'
                      ? 'No te preocupes, tu cita sigue apartada. Puedes intentar pagar de nuevo.'
                      : 'Te esperamos. Puedes pagar ahora o al llegar a la barbería.'}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                {outcome !== 'approved' && !checkout.state && (
                  <Button
                    size="lg"
                    className="press min-h-14 gap-2 text-lg"
                    disabled={checkout.starting !== null}
                    onClick={() => {
                      setOutcome(null)
                      void checkout.pay(createdId)
                    }}
                  >
                    <CreditCard className="size-6" />
                    {outcome === 'rejected' ? 'Intentar de nuevo' : 'Pagar ahora'}
                  </Button>
                )}
                <Button
                  variant={outcome === 'approved' ? 'default' : 'outline'}
                  size="lg"
                  className="press min-h-14 text-lg"
                  onClick={() => void navigate({ to: '/cuenta', search: { tab: 'citas' } })}
                >
                  {outcome === 'approved' ? 'Ver mis citas' : 'Pagar en la barbería'}
                </Button>
              </div>
            </section>
            {checkout.state && (
              <PaymentWaitingPanel
                state={checkout.state}
                onVerify={() => void checkout.verify(true)}
                onReopen={checkout.reopen}
                onDismiss={checkout.dismiss}
              />
            )}
          </div>
          {summary}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {target ? (
          <p className="text-lg text-muted-foreground">
            {`${target.service.name} con ${target.barber.name}. Elige un nuevo horario.`}
          </p>
        ) : (
          <BookingStepper current={current} onGo={goTo} />
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section
            key={current}
            className="animate-fade-up space-y-6 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8"
          >
            {current === 0 && (
              <>
                <StepHeader
                  title="¿Qué servicio quieres?"
                  hint="Toca una opción y seguimos."
                />
                {catalog.length === 0 ? (
                  <Alert variant="destructive">
                    <CircleExclamation className="size-5" />
                    <AlertTitle>Sin servicios disponibles</AlertTitle>
                    <AlertDescription>
                      Aún no hay servicios configurados. Contacta con la
                      barbería.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {catalog.map((service) => (
                      <OptionButton
                        key={service.id}
                        selected={service.id === serviceId}
                        onClick={() => {
                          setServiceId(service.id)
                          setStartsAt(null)
                          const preferred =
                            barbero &&
                            offers.some(
                              (o) =>
                                o.barber.id === barbero &&
                                o.services.some((s) => s.id === service.id),
                            )
                          setBarberId(preferred ? barbero : null)
                          setStep(preferred ? 2 : 1)
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-tone-rose text-tone-rose-fg">
                            <Scissors className="size-6" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg font-extrabold text-foreground">
                              {service.name}
                            </p>
                            <p className="mt-1 inline-flex items-center gap-1.5 text-base text-muted-foreground">
                              <Clock className="size-4" />
                              {service.effectiveDuration} min
                            </p>
                          </div>
                          <span className="font-display text-lg font-extrabold tabular-nums text-foreground">
                            {formatCop(service.effectivePrice)}
                          </span>
                        </div>
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
                    <CircleExclamation className="size-5" />
                    <AlertTitle>Sin barberos disponibles</AlertTitle>
                    <AlertDescription>
                      No hay barberos que ofrezcan este servicio ahora.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
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
                            <UserAvatar name={barber.name} size="lg" />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="font-display text-lg font-extrabold text-foreground">
                                {barber.name}
                              </p>
                              {/* TODO API: calificación promedio del barbero */}
                              <Badge variant="info">Nuevo</Badge>
                              {barber.bio && (
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {barber.bio}
                                </p>
                              )}
                            </div>
                            {price && (
                              <span className="font-display text-lg font-extrabold tabular-nums text-foreground">
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
                  hint="Revisa el resumen y reserva. Es el último paso."
                />
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-base">
                    Notas (opcional)
                  </Label>
                  <Input
                    id="notes"
                    value={notes}
                    maxLength={500}
                    className="h-12 text-base"
                    placeholder="Alguna preferencia para tu barbero"
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
                <Alert>
                  <CreditCard className="size-5" />
                  <AlertTitle>Pago seguro con Wompi</AlertTitle>
                  <AlertDescription>
                    Se abre en una pestaña nueva y aquí verás la confirmación.
                    También puedes pagar al llegar.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            {!isReschedule && step > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
                className="press min-h-12 gap-2"
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
                className="press min-h-14 w-full gap-2 text-lg sm:w-auto"
              >
                <CircleCheck className="size-5" />
                {isSubmitting ? 'Guardando…' : 'Confirmar nuevo horario'}
              </Button>
            ) : (
              step === 3 && (
                <>
                  <Button
                    size="lg"
                    onClick={() => void handleConfirm(true)}
                    disabled={isSubmitting}
                    className="press min-h-14 flex-1 gap-2 text-lg sm:flex-none"
                  >
                    <CreditCard className="size-6" />
                    {isSubmitting ? 'Guardando…' : 'Reservar y pagar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => void handleConfirm(false)}
                    disabled={isSubmitting}
                    className="press min-h-14 flex-1 text-lg sm:flex-none"
                  >
                    Reservar, pagar en la barbería
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
