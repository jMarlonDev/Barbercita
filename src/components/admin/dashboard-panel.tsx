import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CalendarCheck01,
  CurrencyDollar,
  UserX01,
  Users01,
} from '@untitledui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BUSINESS_TIME_ZONE, toDateKey } from '@/lib/availability'
import { presetRange } from '@/lib/finance'
import { formatCop } from '@/lib/format'
import { EmptyState, KpiCard } from './admin-ui'
import type { AdminAppointmentsData } from './appointments-panel'
import type { AdminBarber } from './catalog-panel'
import type { FinanceData } from './finance-panel'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

const dayLabel = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'warning' | 'success' }
> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmada', variant: 'success' },
}

function RevenueChart({ finance }: { finance: FinanceData | null }) {
  if (!finance) {
    return (
      <EmptyState
        icon={<CurrencyDollar className="size-6" />}
        title="Sin datos de ingresos"
        help="Cuando haya pagos aprobados de citas, verás aquí su evolución diaria."
      />
    )
  }
  const totals = new Map<string, number>()
  for (const h of finance.history) {
    const key = toDateKey(new Date(h.startsAt))
    totals.set(key, (totals.get(key) ?? 0) + h.amountCents)
  }
  const days: Array<{ key: string; cents: number }> = []
  const start = new Date(`${finance.range.from}T00:00:00Z`).getTime()
  const end = new Date(`${finance.range.to}T00:00:00Z`).getTime()
  for (let t = start; t <= end; t += 86_400_000) {
    const key = new Date(t).toISOString().slice(0, 10)
    days.push({ key, cents: totals.get(key) ?? 0 })
  }
  const max = Math.max(...days.map((d) => d.cents), 1)
  const total = days.reduce((acc, d) => acc + d.cents, 0)
  if (total === 0) {
    return (
      <EmptyState
        icon={<CurrencyDollar className="size-6" />}
        title="Sin ingresos en el periodo"
        help="No hay pagos aprobados de citas en este mes."
      />
    )
  }
  const label = `Ingresos por citas por día, ${finance.range.from} a ${finance.range.to}. Total ${formatCop(total / 100)}. Máximo diario ${formatCop(max / 100)}.`
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={label}
        className="flex h-48 items-end gap-1 border-b border-border"
      >
        {days.map((d, i) => (
          <div
            key={d.key}
            className="group relative flex h-full min-w-0 flex-1 items-end"
            title={`${dayLabel.format(new Date(`${d.key}T00:00:00Z`))}: ${formatCop(d.cents / 100)}`}
          >
            <div
              className={`w-full rounded-t-sm transition-colors duration-200 ${
                i % 2 === 0 ? 'bg-primary' : 'bg-secondary'
              } group-hover:opacity-80`}
              style={{
                height: `${Math.max((d.cents / max) * 100, d.cents > 0 ? 3 : 0)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="flex justify-between text-sm tabular-nums text-muted-foreground"
        aria-hidden
      >
        <span>{dayLabel.format(new Date(start))}</span>
        <span>Total {formatCop(total / 100)}</span>
        <span>{dayLabel.format(new Date(end))}</span>
      </div>
      <table className="sr-only">
        <caption>Ingresos por día</caption>
        <tbody>
          {days
            .filter((d) => d.cents > 0)
            .map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.key}</th>
                <td>{formatCop(d.cents / 100)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export function DashboardPanel({
  data,
  barbers,
  finance,
}: {
  data: AdminAppointmentsData
  barbers: Array<AdminBarber>
  finance: FinanceData | null
}) {
  const todayKey = toDateKey(new Date())
  const week = presetRange('week', todayKey)
  const keyOf = (iso: string) => toDateKey(new Date(iso))
  const active = (status: string | null) => status !== 'cancelled'
  const today = data.appointments.filter(
    (a) => keyOf(a.startsAt) === todayKey && active(a.status),
  ).length
  const thisWeek = data.appointments.filter((a) => {
    const k = keyOf(a.startsAt)
    return k >= week.from && k <= week.to && active(a.status)
  }).length
  const activeBarbers = barbers.filter((b) => b.isActive).length
  const { statusCounts } = data.metrics
  const attended = Object.entries(statusCounts)
    .filter(([k]) => k !== 'cancelled' && k !== 'pending')
    .reduce((acc, [, n]) => acc + n, 0)
  const noShowRate =
    attended > 0
      ? Math.round(((statusCounts.no_show ?? 0) / attended) * 100)
      : 0
  const now = Date.now()
  const upcoming = data.appointments
    .filter(
      (a) =>
        new Date(a.startsAt).getTime() >= now &&
        (a.status === 'pending' || a.status === 'confirmed'),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Citas hoy"
          value={String(today)}
          icon={<CalendarCheck01 className="size-5" />}
        />
        <KpiCard
          label="Citas esta semana"
          value={String(thisWeek)}
          icon={<Calendar className="size-5" />}
          tone="secondary"
        />
        <KpiCard
          label="Ingresos por citas"
          value={formatCop((finance?.summary.collectedCents ?? 0) / 100)}
          hint="Mes en curso"
          icon={<CurrencyDollar className="size-5" />}
        />
        <KpiCard
          label="Barberos activos"
          value={String(activeBarbers)}
          icon={<Users01 className="size-5" />}
          tone="secondary"
        />
        <KpiCard
          label="Tasa de inasistencia"
          value={`${noShowRate}%`}
          hint={`${statusCounts.no_show ?? 0} de ${attended} citas`}
          icon={<UserX01 className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display font-semibold tracking-tight">
              Ingresos por citas
            </CardTitle>
            <CardDescription>
              Pagos aprobados por día, mes en curso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart finance={finance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display font-semibold tracking-tight">
              Próximas citas
            </CardTitle>
            <CardDescription>Pendientes y confirmadas.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck01 className="size-6" />}
                title="Sin citas próximas"
                help="No hay citas pendientes o confirmadas por venir."
                action={
                  <Button asChild variant="outline">
                    <Link to="/admin" search={{ tab: 'appointments' }}>
                      Ver citas
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {upcoming.map((a) => {
                  const badge = STATUS_BADGE[a.status ?? ''] ?? {
                    label: a.status ?? '',
                    variant: 'warning' as const,
                  }
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {a.customerName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {a.serviceName} · {a.barberName}
                        </p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {dateFormatter.format(new Date(a.startsAt))}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
