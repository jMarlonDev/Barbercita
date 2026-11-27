import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Calendar,
  CalendarXmark,
  CircleCheck,
  CircleDollar,
  Check,
  Clock,
  Xmark,
} from '@gravity-ui/icons'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { StatCard } from '@/components/app/stat-card'
import { UserAvatar } from '@/components/app/user-avatar'
import {
  STATUS_CONFIG,
  normalizeStatus,
} from '@/components/barber-panel/status'
import { longDay, timeFormatter } from '@/components/barber-panel/utils'
import { WelcomeBanner } from '@/components/onboarding/welcome-banner'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { dayRangeUtc, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getBarberAgenda } from '@/server/barber-panel'
import { setBarberAppointmentStatus } from '@/server/barber-panel'

type AgendaRow = Awaited<ReturnType<typeof getBarberAgenda>>[number]

function Row({
  a,
  withDay,
  onMark,
  busy,
}: {
  a: AgendaRow
  withDay?: boolean
  onMark?: (id: string, status: 'completed' | 'no_show') => void
  busy?: boolean
}) {
  const startsAt = new Date(a.startsAt)
  const status = normalizeStatus(a.status)
  const config = STATUS_CONFIG[status]
  const canMark =
    onMark &&
    (status === 'pending' || status === 'confirmed') &&
    startsAt.getTime() <= Date.now()
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <UserAvatar name={a.customer.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{a.customer.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {a.service.name} ·{' '}
          <span className="tabular-nums">
            {withDay ? `${longDay.format(startsAt)}, ` : ''}
            {timeFormatter.format(startsAt)}
          </span>
        </p>
      </div>
      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', config.pill)}>
        {config.label}
      </span>
      {canMark ? (
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            size="sm"
            variant="secondary"
            className="press min-h-11 flex-1 rounded-xl sm:min-h-0"
            disabled={busy}
            onClick={() => onMark(a.id, 'completed')}
          >
            <Check className="size-4" />
            Asistió
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="press min-h-11 flex-1 rounded-xl sm:min-h-0"
            disabled={busy}
            onClick={() => onMark(a.id, 'no_show')}
          >
            <Xmark className="size-4" />
            No asistió
          </Button>
        </div>
      ) : null}
    </li>
  )
}

export function BarberDashboard({
  appointments,
  userId,
  name,
}: {
  appointments: Array<AgendaRow>
  userId: string
  name: string
}) {
  const router = useRouter()
  const setStatus = useServerFn(setBarberAppointmentStatus)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const rows: Array<AgendaRow> = appointments.map((a) => ({
    ...a,
    status: (overrides[a.id] as AgendaRow['status'] | undefined) ?? a.status,
  }))
  const now = Date.now()
  const todayKey = toDateKey(new Date())
  const todayStart = dayRangeUtc(todayKey).start.getTime()
  const todayEnd = dayRangeUtc(todayKey).end.getTime()
  const monthPrefix = todayKey.slice(0, 7)
  const isOpen = (a: AgendaRow) => {
    const s = normalizeStatus(a.status)
    return s === 'pending' || s === 'confirmed'
  }

  const today = rows
    .filter((a) => {
      const t = new Date(a.startsAt).getTime()
      return t >= todayStart && t < todayEnd && normalizeStatus(a.status) !== 'cancelled'
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  const todayOpen = today.filter(isOpen)
  const completed = today.filter((a) => normalizeStatus(a.status) === 'completed').length
  const pendingCount = rows.filter(
    (a) => normalizeStatus(a.status) === 'pending' && new Date(a.startsAt).getTime() >= now,
  ).length
  const nextToday = todayOpen.find((a) => new Date(a.startsAt).getTime() >= now)
  const upcoming = rows.filter((a) => new Date(a.startsAt).getTime() >= todayEnd && isOpen(a)).slice(0, 5)
  // Ingresos propios: precio de citas completadas del mes.
  // TODO API: ingresos netos tras comisión / liquidaciones (barber_payouts)
  const monthIncome = rows
    .filter(
      (a) =>
        normalizeStatus(a.status) === 'completed' &&
        toDateKey(new Date(a.startsAt)).startsWith(monthPrefix),
    )
    .reduce((sum, a) => sum + Number(a.service.price), 0)
  const cancelledRecent = rows.filter(
    (a) => normalizeStatus(a.status) === 'cancelled' && new Date(a.startsAt).getTime() >= todayStart,
  )

  async function mark(id: string, next: 'completed' | 'no_show') {
    setBusy(true)
    setOverrides((o) => ({ ...o, [id]: next }))
    try {
      await setStatus({ data: { appointmentId: id, status: next } })
      toast.success(next === 'completed' ? 'Marcada como asistió' : 'Marcada como no asistió')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setOverrides((o) => {
        const { [id]: _removed, ...rest } = o
        return rest
      })
      setBusy(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <WelcomeBanner
        userId={userId}
        name={name}
        subtitle="Mira lo que tienes hoy en la agenda"
        action={
          <Button asChild className="press rounded-xl">
            <Link to="/barbero" search={{ tab: 'agenda' }}>
              <Calendar className="size-4" />
              Ver mi agenda
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-rose px-3 py-1.5 text-sm font-medium text-tone-rose-fg">
            <Calendar className="size-4" />
            {today.length} {today.length === 1 ? 'cita hoy' : 'citas hoy'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-blue px-3 py-1.5 text-sm font-medium text-tone-blue-fg">
            <Clock className="size-4" />
            {nextToday
              ? `Siguiente a las ${timeFormatter.format(new Date(nextToday.startsAt))}`
              : 'Sin más citas hoy'}
          </span>
        </div>
      </WelcomeBanner>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Citas de hoy" value={today.length} icon={<Calendar />} tone="rose" />
        <StatCard label="Completadas" value={completed} hint="Hoy" icon={<CircleCheck />} tone="green" />
        <StatCard label="Pendientes" value={pendingCount} hint="Por confirmar" icon={<Clock />} tone="amber" />
        <StatCard
          label="Ingresos propios"
          value={formatCop(monthIncome)}
          hint="Este mes, antes de comisión"
          icon={<CircleDollar />}
          tone="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          icon={<Clock className="size-5" />}
          tone="rose"
          title="Próximas citas de hoy"
          description={<span className="capitalize">{longDay.format(new Date())}</span>}
        >
          {today.length === 0 ? (
            <EmptyState
              icon={<CircleCheck className="size-5" />}
              tone="green"
              title="Todo al día"
              description="No tienes citas para hoy. Disfruta el descanso."
            />
          ) : (
            <ul className="space-y-3">
              {today.map((a) => (
                <Row key={a.id} a={a} onMark={(id, s) => void mark(id, s)} busy={busy} />
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            icon={<Calendar className="size-5" />}
            tone="blue"
            title="Próximos días"
            action={
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/barbero" search={{ tab: 'agenda' }}>Ver todas</Link>
              </Button>
            }
          >
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<Calendar className="size-5" />}
                tone="blue"
                title="Sin citas próximas"
                description="Cuando te reserven, aparecerán aquí."
              />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <Row key={a.id} a={a} withDay />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            icon={<CalendarXmark className="size-5" />}
            tone="amber"
            title="Cancelaciones"
          >
            {cancelledRecent.length === 0 ? (
              <EmptyState
                icon={<CircleCheck className="size-5" />}
                tone="green"
                title="Sin cancelaciones"
                description="Ninguna cita próxima ha sido cancelada."
              />
            ) : (
              <ul className="space-y-3">
                {cancelledRecent.slice(0, 3).map((a) => (
                  <Row key={a.id} a={a} withDay />
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
