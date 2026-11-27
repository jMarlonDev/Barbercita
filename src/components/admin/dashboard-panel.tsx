import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CalendarXmark,
  ChartColumn,
  CircleDollar,
  Clock,
  Persons,
} from '@gravity-ui/icons'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { StatCard } from '@/components/app/stat-card'
import { UserAvatar } from '@/components/app/user-avatar'
import { WelcomeBanner } from '@/components/onboarding/welcome-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BUSINESS_TIME_ZONE, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { STATUS_BADGE, STATUS_LABELS } from './admin-ui'
import { useCancelAppointment } from './cancel-appointment'
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

function RevenueChart({ finance }: { finance: FinanceData | null }) {
  const empty = (title: string, description: string) => (
    <EmptyState
      icon={<ChartColumn />}
      tone="green"
      title={title}
      description={description}
    />
  )
  if (!finance) {
    return empty(
      'Sin datos de ingresos',
      'Cuando haya pagos aprobados de citas, verás aquí su evolución diaria.',
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
    return empty(
      'Sin ingresos en el periodo',
      'No hay pagos aprobados de citas en este mes.',
    )
  }
  const label = `Ingresos por citas por día, ${finance.range.from} a ${finance.range.to}. Total ${formatCop(total / 100)}. Máximo diario ${formatCop(max / 100)}.`
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={label}
        className="relative flex h-52 items-end gap-1 border-b border-border sm:gap-1.5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col justify-between"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-t border-dashed border-border/70" />
          ))}
        </div>
        {days.map((d) => {
          const text = `${dayLabel.format(new Date(`${d.key}T00:00:00Z`))}: ${formatCop(d.cents / 100)}`
          return (
            <div
              key={d.key}
              className="group relative flex h-full min-w-0 flex-1 items-end"
              title={text}
            >
              <div
                className="w-full rounded-t-full bg-primary/55 transition-colors duration-200 group-hover:bg-primary"
                style={{
                  height: `${Math.max((d.cents / max) * 100, d.cents > 0 ? 4 : 0)}%`,
                }}
              />
              {d.cents > 0 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-pop transition-opacity duration-150 group-hover:opacity-100"
                >
                  {text}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
      <div
        className="flex justify-between text-sm text-muted-foreground tabular-nums"
        aria-hidden
      >
        <span>{dayLabel.format(new Date(start))}</span>
        <span className="font-semibold text-foreground">
          Total {formatCop(total / 100)}
        </span>
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
  user,
  data,
  barbers,
  finance,
}: {
  user: { id: string; name: string } | null
  data: AdminAppointmentsData
  barbers: Array<AdminBarber>
  finance: FinanceData | null
}) {
  const { request, cancelledIds, dialog } = useCancelAppointment()
  const todayKey = toDateKey(new Date())
  const keyOf = (iso: string) => toDateKey(new Date(iso))
  const live = data.appointments.filter((a) => !cancelledIds.has(a.id))
  const active = (status: string | null) =>
    status !== 'cancelled' && status !== 'no_show'
  const today = live.filter(
    (a) => keyOf(a.startsAt) === todayKey && active(a.status),
  ).length
  const activeBarbers = barbers.filter((b) => b.isActive).length
  const { statusCounts } = data.metrics
  const pending = Math.max(
    (statusCounts.pending ?? 0) -
      data.appointments.filter(
        (a) => cancelledIds.has(a.id) && a.status === 'pending',
      ).length,
    0,
  )
  const attended = Object.entries(statusCounts)
    .filter(([k]) => k !== 'cancelled' && k !== 'pending')
    .reduce((acc, [, n]) => acc + n, 0)
  const noShowRate =
    attended > 0
      ? Math.round(((statusCounts.no_show ?? 0) / attended) * 100)
      : 0
  const now = Date.now()
  const upcoming = live
    .filter(
      (a) =>
        new Date(a.startsAt).getTime() >= now &&
        (a.status === 'pending' || a.status === 'confirmed'),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      {user ? (
        <WelcomeBanner
          userId={user.id}
          name={user.name}
          subtitle="Esto es lo que pasa hoy en tu barbería"
          size="lg"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {today} {today === 1 ? 'cita hoy' : 'citas hoy'}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
            </Badge>
          </div>
        </WelcomeBanner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Citas de hoy"
          value={today}
          hint="Sin canceladas"
          icon={<Calendar />}
          tone="rose"
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCop((finance?.summary.collectedCents ?? 0) / 100)}
          hint="Pagos aprobados"
          icon={<CircleDollar />}
          tone="green"
        />
        <StatCard
          label="Pendientes"
          value={pending}
          hint="Por confirmar"
          icon={<Clock />}
          tone="amber"
        />
        <StatCard
          label="Barberos activos"
          value={activeBarbers}
          hint={`Inasistencia ${noShowRate}% (${statusCounts.no_show ?? 0} de ${attended})`}
          icon={<Persons />}
          tone="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          icon={<ChartColumn />}
          tone="green"
          title="Ingresos por citas"
          description="Pagos aprobados por día, mes en curso."
        >
          <RevenueChart finance={finance} />
        </SectionCard>

        <SectionCard
          icon={<Calendar />}
          tone="rose"
          title="Próximas citas"
          description="Pendientes y confirmadas."
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<Calendar />}
              title="Sin citas próximas"
              description="No hay citas pendientes o confirmadas por venir."
              action={
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/admin" search={{ tab: 'appointments' }}>
                    Ver citas
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 animate-fade-up"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar name={a.customerName} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {a.customerName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.serviceName} · {a.barberName}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {dateFormatter.format(new Date(a.startsAt))}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[a.status ?? ''] ?? 'secondary'}>
                      {STATUS_LABELS[a.status ?? ''] ?? a.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 self-end rounded-xl border-destructive/30 text-destructive hover:bg-destructive-soft hover:text-destructive sm:min-h-9"
                    onClick={() => request(a)}
                    aria-label={`Cancelar cita de ${a.customerName}`}
                  >
                    <CalendarXmark className="size-4" />
                    Cancelar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
      {dialog}
    </div>
  )
}
