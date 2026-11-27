import type { Tone } from '@/components/app/tone'
import type { BadgeVariant } from '@/components/ui/badge'

export type AppointmentStatus =
  'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badgeVariant: BadgeVariant; bar: string; tone: Tone; pill: string }
> = {
  pending: {
    label: 'Pendiente',
    badgeVariant: 'warning',
    bar: 'border-l-warning',
    tone: 'amber',
    pill: 'bg-tone-amber text-tone-amber-fg',
  },
  confirmed: {
    label: 'Confirmada',
    badgeVariant: 'info',
    bar: 'border-l-secondary',
    tone: 'blue',
    pill: 'bg-tone-blue text-tone-blue-fg',
  },
  completed: {
    label: 'Asistió',
    badgeVariant: 'success',
    bar: 'border-l-success',
    tone: 'green',
    pill: 'bg-tone-green text-tone-green-fg',
  },
  cancelled: {
    label: 'Cancelada',
    badgeVariant: 'destructive',
    bar: 'border-l-destructive',
    tone: 'rose',
    pill: 'bg-tone-rose text-tone-rose-fg',
  },
  no_show: {
    label: 'No asistió',
    badgeVariant: 'destructive',
    bar: 'border-l-destructive',
    tone: 'cream',
    pill: 'bg-tone-cream text-tone-cream-fg',
  },
}

export function normalizeStatus(value: string | null): AppointmentStatus {
  return value && value in STATUS_CONFIG
    ? (value as AppointmentStatus)
    : 'pending'
}
