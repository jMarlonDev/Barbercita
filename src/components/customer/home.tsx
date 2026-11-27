import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CircleCheck,
  Plus,
  Scissors,
  Sparkles,
} from '@gravity-ui/icons'
import { AppointmentCard, isPaid, isUpcoming } from './appointment-card'
import type { AppointmentRow } from './appointment-card'
import type { AppointmentActions } from './use-appointment-actions'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { WelcomeBanner } from '@/components/onboarding/welcome-banner'
import { Button } from '@/components/ui/button'

const TIPS = [
  'Llega 5 minutos antes para empezar a tiempo.',
  'Cuéntale a tu barbero cómo quieres el corte; una foto de referencia ayuda.',
  'Puedes reprogramar sin costo desde Mis citas si surge un imprevisto.',
  'Paga en línea y olvídate del efectivo en la barbería.',
]

/** Customer landing view: greeting, primary CTA and next appointment. */
export function CustomerHome({
  userId,
  name,
  appointments,
  actions,
}: {
  userId: string
  name: string
  appointments: Array<AppointmentRow>
  actions: AppointmentActions
}) {
  const upcoming = appointments
    .filter(isUpcoming)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
  const next = upcoming[0] ?? null
  const completed = appointments.filter((a) => a.status === 'completed').length
  const needsPayment = next ? next.status === 'pending' && !isPaid(next) : false
  const tip = needsPayment
    ? 'Paga en línea para asegurar tu horario y evitar filas.'
    : TIPS[new Date().getDate() % TIPS.length]

  return (
    <div className="space-y-8 animate-fade-up">
      <WelcomeBanner
        size="lg"
        userId={userId}
        name={name}
        subtitle={
          next
            ? 'Todo listo para tu próxima visita. Aquí tienes los detalles.'
            : 'Reservar tu corte toma menos de un minuto.'
        }
        action={
          <Button asChild size="lg" className="press min-h-14 w-full gap-2 px-8 text-lg sm:w-auto">
            <Link to="/reservar">
              <Plus className="size-6" />
              Agendar cita
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-tone-green px-3.5 py-2 font-semibold text-tone-green-fg">
            <CircleCheck className="size-4" />
            {completed} {completed === 1 ? 'corte' : 'cortes'} contigo
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-tone-blue px-3.5 py-2 font-semibold text-tone-blue-fg">
            <Calendar className="size-4" />
            {upcoming.length} {upcoming.length === 1 ? 'cita próxima' : 'citas próximas'}
          </span>
        </div>
      </WelcomeBanner>

      {next ? (
        <section className="space-y-4" aria-labelledby="next-appointment">
          <h3
            id="next-appointment"
            className="font-display text-2xl font-extrabold tracking-tight text-foreground"
          >
            Tu próxima cita
          </h3>
          <AppointmentCard
            appointment={next}
            role="customer"
            busy={actions.busy}
            onCancel={actions.askCancel}
            onPay={actions.pay}
            onReschedule={actions.askReschedule}
            featured
          />
          {upcoming.length > 1 && (
            <Button asChild variant="ghost" size="lg" className="press">
              <Link to="/cuenta" search={{ tab: 'citas' }}>
                Ver mis {upcoming.length} citas
              </Link>
            </Button>
          )}
        </section>
      ) : (
        <EmptyState
          icon={<Scissors />}
          title="Aún no tienes citas, ¡agenda la primera!"
          description="Elige servicio, barbero y horario en pocos toques. Nosotros nos encargamos del resto."
          className="rounded-3xl bg-warm-surface py-14"
          action={
            <Button asChild size="lg" className="press min-h-14 gap-2 px-8 text-lg">
              <Link to="/reservar">
                <Plus className="size-6" />
                Agendar cita
              </Link>
            </Button>
          }
        />
      )}

      <SectionCard
        tone="amber"
        icon={<Sparkles />}
        title="Un consejo para ti"
        description={tip}
        className="bg-warm-surface"
      />
    </div>
  )
}
