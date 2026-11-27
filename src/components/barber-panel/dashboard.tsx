import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CalendarCheck01,
  Clock,
  CurrencyDollarCircle,
} from '@untitledui/icons'
import type { ComponentType, SVGProps } from 'react'
import {
  STATUS_CONFIG,
  normalizeStatus,
} from '@/components/barber-panel/status'
import {
  longDay,
  timeFormatter,
} from '@/components/barber-panel/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dayRangeUtc, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getBarberAgenda } from '@/server/barber-panel'

type AgendaRow = Awaited<ReturnType<typeof getBarberAgenda>>[number]

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  hint?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: 'primary' | 'secondary'
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="text-sm text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            tone === 'primary'
              ? 'bg-primary-soft text-primary'
              : 'bg-secondary-soft text-secondary',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}

function Row({ a }: { a: AgendaRow }) {
  const startsAt = new Date(a.startsAt)
  const config = STATUS_CONFIG[normalizeStatus(a.status)]
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          <span className="mr-2 tabular-nums text-primary">
            {timeFormatter.format(startsAt)}
          </span>
          {a.service.name}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {a.customer.name}
        </p>
      </div>
      <Badge variant={config.badgeVariant}>{config.label}</Badge>
    </li>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarCheck01 className="size-6" aria-hidden />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export function BarberDashboard({
  appointments,
}: {
  appointments: Array<AgendaRow>
}) {
  const now = Date.now()
  const todayKey = toDateKey(new Date())
  const todayStart = dayRangeUtc(todayKey).start.getTime()
  const todayEnd = dayRangeUtc(todayKey).end.getTime()
  const monthPrefix = todayKey.slice(0, 7)
  const isOpen = (a: AgendaRow) => {
    const s = normalizeStatus(a.status)
    return s === 'pending' || s === 'confirmed'
  }

  const today = appointments.filter((a) => {
    const t = new Date(a.startsAt).getTime()
    return t >= todayStart && t < todayEnd && normalizeStatus(a.status) !== 'cancelled'
  })
  const upcoming = appointments
    .filter((a) => new Date(a.startsAt).getTime() >= todayEnd && isOpen(a))
    .slice(0, 5)
  const pendingCount = appointments.filter(
    (a) => normalizeStatus(a.status) === 'pending' && new Date(a.startsAt).getTime() >= now,
  ).length
  // Own income: completed appointments of the current month (service price).
  // TODO API: ingresos netos tras comisión / liquidaciones (barber_payouts)
  const monthIncome = appointments
    .filter(
      (a) =>
        normalizeStatus(a.status) === 'completed' &&
        toDateKey(new Date(a.startsAt)).startsWith(monthPrefix),
    )
    .reduce((sum, a) => sum + Number(a.service.price), 0)
  const dayIncome = today
    .filter((a) => normalizeStatus(a.status) === 'completed')
    .reduce((sum, a) => sum + Number(a.service.price), 0)

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-muted-foreground">
        Resumen de tu día, próximas citas e ingresos del mes.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Citas de hoy" value={String(today.length)} icon={Calendar} tone="primary" />
        <Kpi
          label="Próximas citas"
          value={String(upcoming.length)}
          hint="Siguientes días"
          icon={Clock}
          tone="secondary"
        />
        <Kpi
          label="Por confirmar"
          value={String(pendingCount)}
          icon={CalendarCheck01}
          tone="primary"
        />
        <Kpi
          label="Ingresos del mes"
          value={formatCop(monthIncome)}
          hint={`Hoy: ${formatCop(dayIncome)}`}
          icon={CurrencyDollarCircle}
          tone="secondary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display font-semibold tracking-tight">
              Hoy · <span className="capitalize">{longDay.format(new Date())}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {today.length === 0 ? (
              <EmptyState text="No tienes citas para hoy." />
            ) : (
              <ul className="divide-y divide-border">
                {today.map((a) => (
                  <Row key={a.id} a={a} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display font-semibold tracking-tight">
              Próximas citas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcoming.length === 0 ? (
              <EmptyState text="No hay citas próximas agendadas." />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <p className="pt-3 text-sm capitalize text-muted-foreground">
                      {longDay.format(new Date(a.startsAt))}
                    </p>
                    <ul>
                      <Row a={a} />
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/barbero" search={{ tab: 'agenda' }}>
                Ver todas mis citas
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
