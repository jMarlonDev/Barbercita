import { useCallback, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { toast } from '@/components/ui/toaster'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { updateAppointmentStatus } from '@/server/appointments'

export interface CancellableAppointment {
  id: string
  startsAt: string
  customerName: string
  serviceName: string
  barberName: string
}

const whenFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

/**
 * Flujo de cancelación de citas para el admin: diálogo con motivo, llamada a
 * la API, ocultado optimista y revalidación. Solo se abre por acción del usuario.
 */
export function useCancelAppointment() {
  const router = useRouter()
  const updateStatus = useServerFn(updateAppointmentStatus)
  const [target, setTarget] = useState<CancellableAppointment | null>(null)
  const [open, setOpen] = useState(false)
  const [cancelledIds, setCancelledIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const request = useCallback((appointment: CancellableAppointment) => {
    setTarget(appointment)
    setOpen(true)
  }, [])

  async function confirm(_reason: string) {
    if (!target) return
    const current = target
    // TODO API: persistir motivo de cancelación (_reason)
    setOpen(false)
    setCancelledIds((prev) => new Set(prev).add(current.id))
    try {
      await updateStatus({
        data: { appointmentId: current.id, status: 'cancelled' },
      })
      toast.success('Cita cancelada')
      await router.invalidate()
    } catch (e) {
      setCancelledIds((prev) => {
        const next = new Set(prev)
        next.delete(current.id)
        return next
      })
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar')
    }
  }

  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      destructive
      withReason
      title="Cancelar cita"
      description={
        target ? (
          <>
            {target.customerName} · {target.serviceName} con{' '}
            {target.barberName}. {whenFormatter.format(new Date(target.startsAt))}
            . El horario quedará libre.
          </>
        ) : undefined
      }
      confirmLabel="Cancelar cita"
      cancelLabel="Volver"
      reasonLabel="Motivo de la cancelación"
      onConfirm={(reason) => void confirm(reason)}
    />
  )

  return { request, cancelledIds, dialog }
}
