import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  completed: { label: 'Completada', className: 'bg-primary/10 text-primary' },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-muted text-muted-foreground',
  },
  no_show: {
    label: 'No asistió',
    className: 'bg-destructive/10 text-destructive',
  },
}

/** Spanish status badge for an appointment status. */
export function StatusBadge({ status }: { status: string }) {
  const info = STATUS[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  }
  return <Badge className={cn(info.className)}>{info.label}</Badge>
}
