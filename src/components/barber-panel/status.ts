export type AppointmentStatus =
  'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badge: string; bar: string }
> = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    bar: 'border-l-amber-500',
  },
  confirmed: {
    label: 'Confirmada',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    bar: 'border-l-emerald-500',
  },
  completed: {
    label: 'Asistió',
    badge: 'bg-primary/10 text-primary',
    bar: 'border-l-primary',
  },
  cancelled: {
    label: 'Cancelada',
    badge: 'bg-muted text-muted-foreground',
    bar: 'border-l-muted-foreground/40',
  },
  no_show: {
    label: 'No asistió',
    badge: 'bg-destructive/10 text-destructive',
    bar: 'border-l-destructive',
  },
}

export function normalizeStatus(value: string | null): AppointmentStatus {
  return value && value in STATUS_CONFIG
    ? (value as AppointmentStatus)
    : 'pending'
}
