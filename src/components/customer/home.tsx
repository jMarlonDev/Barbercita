import { Link } from '@tanstack/react-router'
import { Calendar, Plus } from '@untitledui/icons'
import { AppointmentCard, isUpcoming } from './appointment-card'
import type { AppointmentRow } from './appointment-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

/** Customer landing view: greeting, primary CTA and next appointment. */
export function CustomerHome({
  name,
  appointments,
  busy,
  onCancel,
  onPay,
}: {
  name: string
  appointments: Array<AppointmentRow>
  busy: string | null
  onCancel: (appointment: AppointmentRow) => void
  onPay: (appointmentId: string) => void
}) {
  const upcoming = appointments
    .filter(isUpcoming)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
  const next = upcoming[0] ?? null

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Hola, {firstName(name)}
          </h2>
          <p className="text-base text-muted-foreground">
            {next ? 'Esta es tu próxima cita.' : 'Reserva tu próximo corte.'}
          </p>
        </div>
        <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
          <Link to="/reservar">
            <Plus className="size-5" />
            Agendar cita
          </Link>
        </Button>
      </div>

      {next ? (
        <div className="space-y-3">
          <AppointmentCard
            appointment={next}
            role="customer"
            busy={busy}
            onCancel={onCancel}
            onPay={onPay}
            featured
          />
          {upcoming.length > 1 && (
            <Button asChild variant="ghost">
              <Link to="/cuenta" search={{ tab: 'citas' }}>
                Ver mis {upcoming.length} citas
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Calendar className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">
                No tienes citas próximas
              </p>
              <p className="text-sm text-muted-foreground">
                Agenda una cita en menos de un minuto.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/reservar">Agendar cita</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
