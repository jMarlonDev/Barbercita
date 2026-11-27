import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Diálogo de confirmación controlado. Con `withReason` pide un motivo (obligatorio
 * si `reasonRequired`). Solo se abre cuando `open` es true: nunca se monta abierto.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  destructive = false,
  busy = false,
  withReason = false,
  reasonRequired = false,
  reasonLabel = 'Motivo',
  reasonPlaceholder = 'Cuéntanos brevemente el motivo…',
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  withReason?: boolean
  reasonRequired?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  onConfirm: (reason: string) => void | Promise<void>
  children?: ReactNode
}) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) {
      setReason('')
      setTouched(false)
    }
  }, [open])

  const missing = withReason && reasonRequired && reason.trim().length < 3

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {withReason ? (
          <div className="space-y-2">
            <Label htmlFor={`${id}-reason`}>
              {reasonLabel}
              {reasonRequired ? '' : ' (opcional)'}
            </Label>
            <Textarea
              id={`${id}-reason`}
              value={reason}
              maxLength={300}
              rows={3}
              placeholder={reasonPlaceholder}
              aria-invalid={touched && missing}
              aria-describedby={touched && missing ? `${id}-err` : undefined}
              onBlur={() => setTouched(true)}
              onChange={(e) => setReason(e.target.value)}
            />
            {touched && missing ? (
              <p id={`${id}-err`} className="text-sm text-destructive">
                Escribe un motivo de al menos 3 caracteres.
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy}
            onClick={() => {
              setTouched(true)
              if (missing) return
              void onConfirm(reason.trim())
            }}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
