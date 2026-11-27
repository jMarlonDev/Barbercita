import type { BadgeVariant } from '@/components/ui/badge'

export type AppointmentStatus =
  'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badgeVariant: BadgeVariant; bar: string }
> = {
  pending: {
    label: 'Pendiente',
    badgeVariant: 'warning',
    bar: 'border-l-warning',
  },
  confirmed: {
    label: 'Confirmada',
    badgeVariant: 'info',
    bar: 'border-l-secondary',
  },
  completed: {
    label: 'Asistió',
    badgeVariant: 'success',
    bar: 'border-l-success',
  },
  cancelled: {
    label: 'Cancelada',
    badgeVariant: 'destructive',
    bar: 'border-l-destructive',
  },
  no_show: {
    label: 'No asistió',
    badgeVariant: 'destructive',
    bar: 'border-l-destructive',
  },
}

export function normalizeStatus(value: string | null): AppointmentStatus {
  return value && value in STATUS_CONFIG
    ? (value as AppointmentStatus)
    : 'pending'
}
