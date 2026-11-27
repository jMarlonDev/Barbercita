import { Link } from '@tanstack/react-router'
import { Plus, Scissors } from '@gravity-ui/icons'
import { AppointmentCard, isUpcoming } from './appointment-card'
import type { AppointmentRow } from './appointment-card'
import type { AppointmentActions } from './use-appointment-actions'
import { EmptyState } from '@/components/app/empty-state'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'

export function AppointmentsPanel({
  appointments,
  actions,
}: {
  appointments: Array<AppointmentRow>
  actions: AppointmentActions
}) {
  const upcoming = appointments
    .filter(isUpcoming)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow="Mis citas"
        title="Tus próximas citas"
        description="Revisa, reprograma o paga tus citas desde aquí."
        action={
          <Button asChild size="lg" className="press min-h-12 w-full gap-2 sm:w-auto">
            <Link to="/reservar">
              <Plus className="size-5" />
              Agendar cita
            </Link>
          </Button>
        }
      />
      {upcoming.length === 0 ? (
        <EmptyState
          icon={<Scissors />}
          title="No tienes citas próximas"
          description="Agenda tu próximo corte en menos de un minuto."
          className="rounded-3xl bg-warm-surface py-14"
          action={
            <Button asChild size="lg" className="press min-h-12">
              <Link to="/reservar">Agendar cita</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6">
          {upcoming.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              role="customer"
              busy={actions.busy}
              onCancel={actions.askCancel}
              onPay={actions.pay}
              onReschedule={actions.askReschedule}
            />
          ))}
        </div>
      )}
    </div>
  )
}
