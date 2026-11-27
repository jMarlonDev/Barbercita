import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Calendar as CalendarIcon, ChevronRight } from '@gravity-ui/icons'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { UserAvatar } from '@/components/app/user-avatar'
import {
  AppointmentDetailDialog,
  RescheduleDialog,
} from '@/components/barber-panel/appointment-dialogs'
import type {
  AgendaRow,
  StatusAction,
} from '@/components/barber-panel/appointment-dialogs'
import {
  STATUS_CONFIG,
  normalizeStatus,
} from '@/components/barber-panel/status'
import { timeFormatter } from '@/components/barber-panel/utils'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { Calendar } from '@/components/calendar/calendar'
import type { CalendarEvent, CalendarView } from '@/components/calendar/calendar'
import { businessToday, formatters, capitalize, dateOf } from '@/components/calendar/date-utils'
import { toast } from '@/components/ui/toaster'
import { toDateKey } from '@/lib/availability'
import { cn } from '@/lib/utils'
import { setBarberAppointmentStatus } from '@/server/barber-panel'

const STATUS_TOAST: Record<StatusAction, string> = {
  confirmed: 'Cita confirmada',
  completed: 'Marcada como asistió',
  no_show: 'Marcada como no asistió',
}

export function BarberAgenda({
  appointments,
}: {
  appointments: Array<AgendaRow>
}) {
  const router = useRouter()
  const setStatus = useServerFn(setBarberAppointmentStatus)
  const [view, setView] = useState<CalendarView>('day')
  const [date, setDate] = useState(businessToday())
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<AgendaRow | null>(null)
  const [moving, setMoving] = useState<AgendaRow | null>(null)
  const [cancelling, setCancelling] = useState<AgendaRow | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const statusOf = (a: AgendaRow) => overrides[a.id] ?? a.status

  const events = useMemo<Array<CalendarEvent>>(
    () =>
      appointments.map((a) => {
        const st = normalizeStatus(overrides[a.id] ?? a.status)
        const start = new Date(a.startsAt)
        return {
          id: a.id,
          start: start.toISOString(),
          end: new Date(start.getTime() + a.service.durationMinutes * 60_000).toISOString(),
          title: a.customer.name,
          subtitle: a.service.name,
          tone: STATUS_CONFIG[st].tone,
          muted: st === 'cancelled',
        }
      }),
    [appointments, overrides],
  )

  const dayItems = appointments
    .filter((a) => toDateKey(new Date(a.startsAt)) === date)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  async function changeStatus(id: string, next: StatusAction) {
    setSelected(null)
    setOverrides((o) => ({ ...o, [id]: next }))
    try {
      await setStatus({ data: { appointmentId: id, status: next } })
      toast.success(STATUS_TOAST[next])
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setOverrides((o) => {
        const { [id]: _removed, ...rest } = o
        return rest
      })
    }
  }

  async function cancelAppointment(reason: string) {
    if (!cancelling) return
    const id = cancelling.id
    setCancelBusy(true)
    setOverrides((o) => ({ ...o, [id]: 'cancelled' }))
    try {
      // El motivo viaja como `detail` y queda en la bitácora de la cita.
      // TODO API: persistir motivo visible al cliente (hoy solo bitácora interna)
      await setStatus({ data: { appointmentId: id, status: 'cancelled', detail: reason } })
      toast.success('Cita cancelada')
      setCancelling(null)
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar.')
    } finally {
      setOverrides((o) => {
        const { [id]: _removed, ...rest } = o
        return rest
      })
      setCancelBusy(false)
    }
  }

  const dayTitle = capitalize(formatters.dayLong.format(dateOf(date)))

  return (
    <div className="animate-fade-up space-y-6">
      <SectionCard
        icon={<CalendarIcon className="size-5" />}
        tone="rose"
        title="Tu agenda"
        description="Toca una cita para ver el detalle, marcar asistencia, reprogramar o cancelar."
        contentClassName="-mx-1 sm:mx-0"
      >
        <Calendar
          variant="full"
          view={view}
          onViewChange={setView}
          views={['day', 'week', 'month']}
          date={date}
          onDateChange={setDate}
          events={events}
          onEventClick={(e) => {
            const a = appointments.find((x) => x.id === e.id)
            if (a) setSelected(a)
          }}
        />
      </SectionCard>

      <SectionCard
        icon={<CalendarIcon className="size-5" />}
        tone="blue"
        title={dayTitle}
        description={`${dayItems.length} ${dayItems.length === 1 ? 'cita' : 'citas'} este día`}
      >
        {dayItems.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="size-5" />}
            tone="blue"
            title="Sin citas este día"
            description="Elige otra fecha en el calendario para ver más."
          />
        ) : (
          <ul className="space-y-3">
            {dayItems.map((a) => {
              const st = normalizeStatus(statusOf(a))
              const config = STATUS_CONFIG[st]
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(a)}
                    className={cn(
                      'press lift flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left',
                      st === 'cancelled' && 'opacity-70',
                    )}
                  >
                    <UserAvatar name={a.customer.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {a.customer.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.service.name} ·{' '}
                        <span className="tabular-nums">
                          {timeFormatter.format(new Date(a.startsAt))}
                        </span>
                      </p>
                    </div>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', config.pill)}>
                      {config.label}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <AppointmentDetailDialog
        appointment={selected}
        status={selected ? statusOf(selected) : null}
        onClose={() => setSelected(null)}
        onStatus={(id, next) => void changeStatus(id, next)}
        onReschedule={(a) => {
          setSelected(null)
          setMoving(a)
        }}
        onCancel={(a) => {
          setSelected(null)
          setCancelling(a)
        }}
      />
      <RescheduleDialog
        key={moving?.id ?? 'none'}
        appointment={moving}
        onClose={() => setMoving(null)}
        onDone={() => void router.invalidate()}
      />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => {
          if (!o) setCancelling(null)
        }}
        title="¿Cancelar esta cita?"
        description={
          cancelling
            ? `${cancelling.customer.name} · ${cancelling.service.name}. El cliente será notificado.`
            : undefined
        }
        confirmLabel="Cancelar cita"
        cancelLabel="Volver"
        destructive
        busy={cancelBusy}
        withReason
        reasonRequired
        reasonLabel="Motivo de la cancelación"
        reasonPlaceholder="Ej. Imprevisto de salud."
        onConfirm={(reason) => void cancelAppointment(reason)}
      />
    </div>
  )
}
