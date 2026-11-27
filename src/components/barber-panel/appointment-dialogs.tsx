import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowRotateLeft,
  Check,
  Clock,
  Handset,
  Scissors,
  Xmark,
} from '@gravity-ui/icons'
import { UserAvatar } from '@/components/app/user-avatar'
import { Calendar } from '@/components/calendar/calendar'
import { SlotPicker } from '@/components/calendar/slot-picker'
import { STATUS_CONFIG, normalizeStatus } from '@/components/barber-panel/status'
import { longDay, timeFormatter } from '@/components/barber-panel/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getBarberAgenda } from '@/server/barber-panel'
import {
  getRescheduleSlots,
  rescheduleBarberAppointment,
} from '@/server/barber-panel'

export type AgendaRow = Awaited<ReturnType<typeof getBarberAgenda>>[number]
export type StatusAction = 'confirmed' | 'completed' | 'no_show'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'No se pudo completar la acción.'
}

/** Detalle de cita con acciones. Solo se abre cuando `appointment` no es null. */
export function AppointmentDetailDialog({
  appointment,
  status,
  onClose,
  onStatus,
  onReschedule,
  onCancel,
}: {
  appointment: AgendaRow | null
  status: string | null
  onClose: () => void
  onStatus: (id: string, next: StatusAction) => void
  onReschedule: (a: AgendaRow) => void
  onCancel: (a: AgendaRow) => void
}) {
  const a = appointment
  const st = normalizeStatus(status ?? a?.status ?? null)
  const config = STATUS_CONFIG[st]
  const startsAt = a ? new Date(a.startsAt) : new Date()
  const started = startsAt.getTime() <= Date.now()
  const open = st === 'pending' || st === 'confirmed'
  const isPaid = a?.payments.some((p) => p.status === 'approved') ?? false

  return (
    <Dialog open={a !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-3xl">
        {a ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display font-extrabold tracking-tight">
                Detalle de la cita
              </DialogTitle>
              <DialogDescription className="capitalize">
                {longDay.format(startsAt)} · {timeFormatter.format(startsAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <UserAvatar name={a.customer.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{a.customer.name}</p>
                {a.customer.phone ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Handset className="size-4" aria-hidden />
                    {a.customer.phone}
                  </p>
                ) : null}
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', config.pill)}>
                {config.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                <Scissors className="size-4" aria-hidden />
                {a.service.name}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 tabular-nums">
                <Clock className="size-4" aria-hidden />
                {a.service.durationMinutes} min
              </span>
              <span className="rounded-full bg-tone-green px-3 py-1.5 tabular-nums text-tone-green-fg">
                {isPaid ? 'Pagada' : formatCop(a.service.price)}
              </span>
            </div>
            {a.notes ? (
              <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
                Nota: {a.notes}
              </p>
            ) : null}
            {open ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {st === 'pending' ? (
                  <Button
                    className="press min-h-11 rounded-xl sm:col-span-2"
                    onClick={() => onStatus(a.id, 'confirmed')}
                  >
                    <Check className="size-4" />
                    Confirmar cita
                  </Button>
                ) : null}
                {started ? (
                  <>
                    <Button
                      variant="secondary"
                      className="press min-h-11 rounded-xl"
                      onClick={() => onStatus(a.id, 'completed')}
                    >
                      <Check className="size-4" />
                      Asistió
                    </Button>
                    <Button
                      variant="outline"
                      className="press min-h-11 rounded-xl"
                      onClick={() => onStatus(a.id, 'no_show')}
                    >
                      <Xmark className="size-4" />
                      No asistió
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="press min-h-11 rounded-xl"
                      onClick={() => onReschedule(a)}
                    >
                      <ArrowRotateLeft className="size-4" />
                      Reprogramar
                    </Button>
                    <Button
                      variant="ghost"
                      className="press min-h-11 rounded-xl text-destructive hover:text-destructive"
                      onClick={() => onCancel(a)}
                    >
                      <Xmark className="size-4" />
                      Cancelar cita
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Reprogramar: calendario picker + chips de horarios libres. Cerrado por defecto. */
export function RescheduleDialog({
  appointment,
  onClose,
  onDone,
}: {
  appointment: AgendaRow | null
  onClose: () => void
  onDone: () => void
}) {
  const loadSlots = useServerFn(getRescheduleSlots)
  const reschedule = useServerFn(rescheduleBarberAppointment)
  const today = toDateKey(new Date())
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState<Array<string> | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function pickDate(value: string) {
    if (!appointment) return
    setDate(value)
    setSelected(null)
    setSlots(null)
    try {
      setSlots(await loadSlots({ data: { appointmentId: appointment.id, date: value } }))
    } catch (err) {
      setSlots([])
      toast.error(errorMessage(err))
    }
  }

  function close() {
    setDate(today)
    setSlots(null)
    setSelected(null)
    onClose()
  }

  async function confirm() {
    if (!selected || !appointment) return
    setBusy(true)
    try {
      await reschedule({ data: { appointmentId: appointment.id, startsAt: selected } })
      toast.success('Cita reprogramada')
      close()
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={appointment !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold tracking-tight">
            Reprogramar cita
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `${appointment.customer.name} · ${appointment.service.name}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Calendar
            variant="picker"
            view="month"
            views={['month']}
            date={date}
            minDate={today}
            onDateChange={(d) => void pickDate(d)}
          />
          {slots !== null || busy ? null : (
            <p className="text-sm text-muted-foreground">
              Elige una fecha para ver los horarios libres.
            </p>
          )}
          {slots !== null ? (
            <SlotPicker
              slots={slots}
              value={selected}
              onChange={setSelected}
              emptyMessage="No hay horarios libres ese día. Prueba con otra fecha."
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={close}>
            Volver
          </Button>
          <Button className="press rounded-xl" disabled={!selected || busy} onClick={confirm}>
            {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
