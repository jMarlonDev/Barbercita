import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: {
    label: 'Pendiente',
    variant: 'warning',
  },
  confirmed: {
    label: 'Confirmada',
    variant: 'success',
  },
  completed: { label: 'Completada', variant: 'active' },
  cancelled: {
    label: 'Cancelada',
    variant: 'secondary',
  },
  no_show: {
    label: 'No asistió',
    variant: 'destructive',
  },
}

/** Spanish status badge for an appointment status. */
export function StatusBadge({ status }: { status: string }) {
  const info = STATUS[status] ?? {
    label: status,
    variant: 'secondary',
  }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
