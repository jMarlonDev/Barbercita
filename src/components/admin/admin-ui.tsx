import type { Tone } from '@/components/app/tone'

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
}

export const STATUS_BADGE: Record<
  string,
  'warning' | 'success' | 'destructive' | 'info' | 'secondary'
> = {
  pending: 'warning',
  confirmed: 'info',
  cancelled: 'destructive',
  completed: 'success',
  no_show: 'secondary',
}

export const STATUS_TONE: Record<string, Tone> = {
  pending: 'amber',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'rose',
  no_show: 'cream',
}
