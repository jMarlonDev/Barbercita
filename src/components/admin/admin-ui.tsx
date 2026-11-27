import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export function SectionHeader({
  description,
  action,
}: {
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  help,
  action,
}: {
  icon: ReactNode
  title: string
  help: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="font-display text-base font-semibold text-foreground">
        {title}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">{help}</p>
      {action}
    </div>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: {
  label: string
  value: string
  hint?: string
  icon: ReactNode
  tone?: 'primary' | 'secondary'
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            tone === 'primary'
              ? 'bg-primary-soft text-primary'
              : 'bg-secondary-soft text-secondary'
          }`}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}
