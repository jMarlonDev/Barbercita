import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CircleCheck } from '@gravity-ui/icons'
import { PaymentWaitingPanel, useCheckout } from './checkout'
import type { AppointmentRow } from './appointment-card'
import { SlotCalendar } from '@/components/appointments/slot-calendar'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
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
import { cancelAppointment, rescheduleAppointment } from '@/server/appointments'

export interface AppointmentActions {
  busy: string | null
  askCancel: (appointment: AppointmentRow) => void
  askReschedule: (appointment: AppointmentRow) => void
  pay: (appointmentId: string) => void
}

/**
 * Acciones de cliente sobre citas (cancelar, reprogramar, pagar). Los diálogos
 * nacen cerrados y solo se abren tras una acción del usuario.
 */
export function useAppointmentActions() {
  const router = useRouter()
  const cancelFn = useServerFn(cancelAppointment)
  const rescheduleFn = useServerFn(rescheduleAppointment)
  const checkout = useCheckout()
  const [busy, setBusy] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<AppointmentRow | null>(null)
  const [toReschedule, setToReschedule] = useState<AppointmentRow | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  async function confirmCancel(_reason: string) {
    // TODO API: enviar el motivo de cancelación (cancelAppointment solo recibe appointmentId).
    if (!toCancel) return
    const id = toCancel.id
    setBusy(id)
    try {
      await cancelFn({ data: { appointmentId: id } })
      await router.invalidate()
      toast.success('Cita cancelada. Cuando quieras, agenda otra.')
      setToCancel(null)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo cancelar la cita. Intenta de nuevo.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function confirmReschedule() {
    if (!toReschedule || !slot) return
    const id = toReschedule.id
    setBusy(id)
    try {
      await rescheduleFn({ data: { appointmentId: id, startsAt: slot } })
      await router.invalidate()
      toast.success('Cita reprogramada. ¡Te esperamos!')
      closeReschedule()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo reprogramar. Elige otro horario.',
      )
      setSlot(null)
      setRefreshToken((t) => t + 1)
    } finally {
      setBusy(null)
    }
  }

  function closeReschedule() {
    setToReschedule(null)
    setSlot(null)
  }

  const actions: AppointmentActions = {
    busy: busy ?? checkout.starting,
    askCancel: setToCancel,
    askReschedule: (a) => {
      setSlot(null)
      setToReschedule(a)
    },
    // Llamado directo desde el click: abre la pestaña de pago sin bloqueo.
    pay: (id) => void checkout.pay(id),
  }

  const waiting = checkout.state ? (
    <PaymentWaitingPanel
      state={checkout.state}
      onVerify={() => void checkout.verify(true)}
      onReopen={checkout.reopen}
      onDismiss={checkout.dismiss}
    />
  ) : null

  const dialogs = (
    <>
      <ConfirmDialog
        open={toCancel !== null}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="¿Cancelar esta cita?"
        description={
          toCancel
            ? `${toCancel.service.name} con ${toCancel.barber.name}. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Sí, cancelar"
        cancelLabel="Mantener cita"
        destructive
        busy={busy !== null}
        withReason
        reasonLabel="¿Nos cuentas por qué?"
        reasonPlaceholder="Opcional, nos ayuda a mejorar"
        onConfirm={confirmCancel}
      />
      <Dialog
        open={toReschedule !== null}
        onOpenChange={(o) => !o && busy === null && closeReschedule()}
      >
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Elige un nuevo horario
            </DialogTitle>
            <DialogDescription>
              {toReschedule
                ? `${toReschedule.service.name} con ${toReschedule.barber.name}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {toReschedule && (
            <SlotCalendar
              key={toReschedule.id}
              barberId={toReschedule.barberId}
              serviceId={toReschedule.serviceId}
              value={slot}
              onChange={setSlot}
              refreshToken={refreshToken}
            />
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="lg"
              disabled={busy !== null}
              onClick={closeReschedule}
            >
              Volver
            </Button>
            <Button
              size="lg"
              className="press gap-2"
              disabled={!slot || busy !== null}
              onClick={() => void confirmReschedule()}
            >
              <CircleCheck className="size-5" />
              {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  return { actions, waiting, dialogs }
}
