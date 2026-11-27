import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { BUSINESS_TIME_ZONE, toDateKey } from '@/lib/availability'
import {
  getRescheduleSlots,
  rescheduleBarberAppointment,
  setBarberAppointmentStatus,
} from '@/server/barber-panel'

const slotFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'No se pudo completar la acción.'
}

interface DialogProps {
  appointmentId: string
  summary: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export function CancelDialog({
  appointmentId,
  summary,
  open,
  onOpenChange,
  onDone,
}: DialogProps) {
  const cancel = useServerFn(setBarberAppointmentStatus)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fieldId = `reason-${appointmentId}`

  async function confirm() {
    if (!reason.trim()) {
      setError('Escribe el motivo de la cancelación.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await cancel({
        data: {
          appointmentId,
          status: 'cancelled',
          detail: reason.trim(),
        },
      })
      toast.success('Cita cancelada')
      setReason('')
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar esta cita?</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={fieldId}>Motivo de la cancelación</Label>
          <Textarea
            id={fieldId}
            value={reason}
            maxLength={300}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            placeholder="Ej. Imprevisto de salud, el cliente será notificado."
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
          />
          {error ? (
            <p id={`${fieldId}-error`} className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button variant="destructive" disabled={busy} onClick={confirm}>
            {busy ? 'Cancelando…' : 'Cancelar cita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RescheduleDialog({
  appointmentId,
  summary,
  open,
  onOpenChange,
  onDone,
}: DialogProps) {
  const loadSlots = useServerFn(getRescheduleSlots)
  const reschedule = useServerFn(rescheduleBarberAppointment)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Array<string> | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function pickDate(value: string) {
    setDate(value)
    setSelected(null)
    setSlots(null)
    if (!value) return
    try {
      setSlots(await loadSlots({ data: { appointmentId, date: value } }))
    } catch (err) {
      setSlots([])
      toast.error(errorMessage(err))
    }
  }

  async function confirm() {
    if (!selected) return
    setBusy(true)
    try {
      await reschedule({ data: { appointmentId, startsAt: selected } })
      toast.success('Cita reprogramada')
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprogramar cita</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`date-${appointmentId}`}>Nueva fecha</Label>
            <Input
              id={`date-${appointmentId}`}
              type="date"
              min={toDateKey(new Date())}
              value={date}
              onChange={(e) => void pickDate(e.target.value)}
            />
          </div>
          {date && slots === null ? (
            <p className="text-sm text-muted-foreground">Buscando horarios…</p>
          ) : null}
          {slots !== null && slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay horarios libres ese día. Prueba con otra fecha.
            </p>
          ) : null}
          {slots !== null && slots.length > 0 ? (
            <div
              role="radiogroup"
              aria-label="Horarios disponibles"
              className="grid grid-cols-3 gap-3 sm:grid-cols-4"
            >
              {slots.map((slot) => (
                <Button
                  key={slot}
                  size="sm"
                  role="radio"
                  aria-checked={selected === slot}
                  variant={selected === slot ? 'default' : 'outline'}
                  onClick={() => setSelected(slot)}
                >
                  {slotFormatter.format(new Date(slot))}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button disabled={!selected || busy} onClick={confirm}>
            {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
