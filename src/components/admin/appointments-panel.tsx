import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Calendar as CalendarIcon,
  CalendarXmark,
  CircleDollar,
  ListUl,
  Xmark,
} from '@gravity-ui/icons'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { StatCard } from '@/components/app/stat-card'
import { UserAvatar } from '@/components/app/user-avatar'
import { Calendar } from '@/components/calendar/calendar'
import type { CalendarEvent, CalendarView } from '@/components/calendar/calendar'
import { businessToday } from '@/components/calendar/date-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import { STATUS_BADGE, STATUS_LABELS, STATUS_TONE } from './admin-ui'
import { useCancelAppointment } from './cancel-appointment'

export interface AdminAppointment {
  id: string
  startsAt: string
  status: string | null
  barberName: string
  customerName: string
  customerEmail: string
  serviceName: string
  servicePrice: string
}

export interface AdminAppointmentsData {
  appointments: Array<AdminAppointment>
  truncated: boolean
  metrics: {
    statusCounts: Record<string, number>
    approvedRevenueCents: number
  }
}

export interface AppointmentSearch {
  from?: string
  to?: string
  barberId?: string
  status?: string
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

const STATUS_PILLS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

export function AppointmentsPanel({
  data,
  barbers,
  search,
}: {
  data: AdminAppointmentsData
  barbers: Array<{ id: string; name: string }>
  search: AppointmentSearch
}) {
  const navigate = useNavigate({ from: '/admin' })
  const { request, cancelledIds, dialog } = useCancelAppointment()
  const [mode, setMode] = useState<'list' | 'calendar'>('list')
  const [calView, setCalView] = useState<CalendarView>('week')
  const [calDate, setCalDate] = useState(() => businessToday())

  function patch(next: Partial<AppointmentSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...next }) })
  }

  function clearFilters() {
    patch({
      from: undefined,
      to: undefined,
      barberId: undefined,
      status: undefined,
    })
  }

  const { statusCounts, approvedRevenueCents } = data.metrics
  const hasFilters = Boolean(
    search.from || search.to || search.barberId || search.status,
  )
  const statusOf = (a: AdminAppointment) =>
    cancelledIds.has(a.id) ? 'cancelled' : (a.status ?? '')

  const events = useMemo<Array<CalendarEvent>>(
    () =>
      data.appointments.map((a) => {
        const status = cancelledIds.has(a.id) ? 'cancelled' : (a.status ?? '')
        return {
          id: a.id,
          start: a.startsAt,
          title: a.customerName,
          subtitle: `${a.serviceName} · ${a.barberName}`,
          tone: STATUS_TONE[status] ?? 'cream',
          muted: status === 'cancelled',
        }
      }),
    [data.appointments, cancelledIds],
  )

  const toggle = (
    <div
      role="group"
      aria-label="Vista"
      className="inline-flex rounded-full bg-muted p-1"
    >
      {(
        [
          ['list', 'Lista', <ListUl key="l" className="size-4" />],
          ['calendar', 'Calendario', <CalendarIcon key="c" className="size-4" />],
        ] as const
      ).map(([value, label, icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all duration-200',
            mode === value
              ? 'bg-card text-foreground shadow-card'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pendientes"
          value={statusCounts.pending ?? 0}
          icon={<CalendarIcon />}
          tone="amber"
        />
        <StatCard
          label="Confirmadas"
          value={statusCounts.confirmed ?? 0}
          icon={<CalendarIcon />}
          tone="blue"
        />
        <StatCard
          label="Completadas"
          value={statusCounts.completed ?? 0}
          hint={`${statusCounts.cancelled ?? 0} canceladas · ${statusCounts.no_show ?? 0} no asistieron`}
          icon={<CalendarIcon />}
          tone="green"
        />
        <StatCard
          label="Ingresos aprobados"
          value={formatCop(approvedRevenueCents / 100)}
          icon={<CircleDollar />}
          tone="rose"
        />
      </div>

      <SectionCard
        icon={<CalendarIcon />}
        tone="rose"
        title="Citas"
        description={`${data.appointments.length} citas mostradas${data.truncated ? ' (resultado limitado, afina los filtros)' : ''}`}
        action={toggle}
      >
        <div
          className="mb-5 flex flex-col gap-3"
          role="group"
          aria-label="Filtros de citas"
        >
          <div
            className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
            role="group"
            aria-label="Estado"
          >
            <div className="inline-flex rounded-full bg-muted p-1">
              {STATUS_PILLS.map((p) => {
                const active = (search.status ?? 'all') === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      patch({ status: p.value === 'all' ? undefined : p.value })
                    }
                    className={cn(
                      'min-h-9 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-200',
                      active
                        ? 'bg-card text-foreground shadow-card'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Select
              value={search.barberId ?? 'all'}
              onValueChange={(v) =>
                patch({ barberId: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger
                aria-label="Barbero"
                className="min-h-11 w-full rounded-full bg-muted"
              >
                <SelectValue placeholder="Todos los barberos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los barberos</SelectItem>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="Desde"
              value={search.from ?? ''}
              onChange={(e) => patch({ from: e.target.value || undefined })}
              className="min-h-11 rounded-full bg-muted"
            />
            <Input
              type="date"
              aria-label="Hasta"
              value={search.to ?? ''}
              onChange={(e) => patch({ to: e.target.value || undefined })}
              className="min-h-11 rounded-full bg-muted"
            />
            {hasFilters ? (
              <Button
                variant="ghost"
                className="min-h-11 rounded-full"
                onClick={clearFilters}
              >
                <Xmark className="size-4" />
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        {mode === 'calendar' ? (
          <Calendar
            variant="full"
            view={calView}
            onViewChange={setCalView}
            date={calDate}
            onDateChange={setCalDate}
            events={events}
          />
        ) : data.appointments.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon />}
            title="Sin citas"
            description="No hay citas con estos filtros."
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-3" aria-live="polite">
            {data.appointments.map((a) => {
              const status = statusOf(a)
              const cancellable =
                (status === 'pending' || status === 'confirmed') &&
                new Date(a.startsAt).getTime() > Date.now()
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar name={a.customerName} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {a.customerName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.customerEmail}
                      </p>
                      <p className="truncate text-sm text-foreground">
                        {a.serviceName} · {formatCop(a.servicePrice)} ·{' '}
                        {a.barberName}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {dateFormatter.format(new Date(a.startsAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <Badge variant={STATUS_BADGE[status] ?? 'secondary'}>
                      {STATUS_LABELS[status] ?? status}
                    </Badge>
                    {cancellable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11 rounded-xl border-destructive/30 text-destructive hover:bg-destructive-soft hover:text-destructive sm:min-h-9"
                        onClick={() => request(a)}
                        aria-label={`Cancelar cita de ${a.customerName}`}
                      >
                        <CalendarXmark className="size-4" />
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
      {dialog}
    </div>
  )
}
