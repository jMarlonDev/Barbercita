import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  CalendarCheck01,
  Calendar as CalendarIcon,
  Check,
  List,
  X,
} from '@untitledui/icons'
import {
  CancelDialog,
  RescheduleDialog,
} from '@/components/barber-panel/appointment-dialogs'
import {
  STATUS_CONFIG,
  normalizeStatus,
} from '@/components/barber-panel/status'
import {
  keyToLocalDate,
  localDateToKey,
  longDay,
  timeFormatter,
} from '@/components/barber-panel/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toaster'
import { dayRangeUtc, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getBarberAgenda } from '@/server/barber-panel'
import { setBarberAppointmentStatus } from '@/server/barber-panel'

type AgendaRow = Awaited<ReturnType<typeof getBarberAgenda>>[number]
type Layout = 'list' | 'calendar'
type Filter = 'upcoming' | 'past'

function AppointmentCard({
  appointment,
  status,
  onStatus,
  onChanged,
}: {
  appointment: AgendaRow
  status: ReturnType<typeof normalizeStatus>
  onStatus: (id: string, next: 'confirmed' | 'completed' | 'no_show') => void
  onChanged: () => void
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const config = STATUS_CONFIG[status]
  const startsAt = new Date(appointment.startsAt)
  const started = startsAt.getTime() <= Date.now()
  const open = status === 'pending' || status === 'confirmed'
  const isPaid = appointment.payments.some((p) => p.status === 'approved')
  const summary = `${timeFormatter.format(startsAt)} · ${appointment.service.name} · ${appointment.customer.name}`

  return (
    <li
      className={cn(
        'space-y-4 rounded-xl border border-l-4 border-border bg-card p-4 shadow-card sm:p-5',
        config.bar,
        status === 'cancelled' && 'opacity-80',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            <span className="mr-2 tabular-nums text-primary">
              {timeFormatter.format(startsAt)}
            </span>
            {appointment.service.name}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {appointment.customer.name}
            {appointment.customer.phone
              ? ` · ${appointment.customer.phone}`
              : ''}
          </p>
          {appointment.notes ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nota: {appointment.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
          <Badge variant="outline" className="tabular-nums">
            {isPaid ? 'Pagada' : formatCop(appointment.service.price)}
          </Badge>
        </div>
      </div>
      {open ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {status === 'pending' ? (
            <Button size="sm" onClick={() => onStatus(appointment.id, 'confirmed')}>
              <Check className="size-4" />
              Confirmar
            </Button>
          ) : null}
          {started ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStatus(appointment.id, 'completed')}
              >
                <Check className="size-4" />
                Asistió
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatus(appointment.id, 'no_show')}
              >
                <X className="size-4" />
                No asistió
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
              <CalendarCheck01 className="size-4" />
              Reprogramar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            <X className="size-4" />
            Cancelar
          </Button>
        </div>
      ) : null}
      <CancelDialog
        appointmentId={appointment.id}
        summary={summary}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onDone={onChanged}
      />
      <RescheduleDialog
        appointmentId={appointment.id}
        summary={summary}
        open={moveOpen}
        onOpenChange={setMoveOpen}
        onDone={onChanged}
      />
    </li>
  )
}

function Empty({ text, action }: { text: string; action?: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarCheck01 className="size-6" aria-hidden />
        </span>
        <p className="font-medium text-foreground">Sin citas</p>
        <p className="text-sm text-muted-foreground">{text}</p>
        {action ? (
          <Button variant="outline" onClick={action}>
            Ir a hoy
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function BarberAgenda({
  appointments,
}: {
  appointments: Array<AgendaRow>
}) {
  const router = useRouter()
  const setStatus = useServerFn(setBarberAppointmentStatus)
  const [layout, setLayout] = useState<Layout>('list')
  const [filter, setFilter] = useState<Filter>('upcoming')
  const todayKey = toDateKey(new Date())
  const [anchor, setAnchor] = useState(todayKey)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const statusOf = (a: AgendaRow) =>
    normalizeStatus(overrides[a.id] ?? a.status)

  async function changeStatus(
    id: string,
    next: 'confirmed' | 'completed' | 'no_show',
  ) {
    const previous = overrides[id]
    setOverrides((o) => ({ ...o, [id]: next }))
    try {
      await setStatus({ data: { appointmentId: id, status: next } })
      toast.success(
        next === 'confirmed'
          ? 'Cita confirmada'
          : next === 'completed'
            ? 'Marcada como asistió'
            : 'Marcada como no asistió',
      )
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setOverrides((o) => {
        const { [id]: _removed, ...rest } = o
        return previous ? { ...rest, [id]: previous } : rest
      })
    }
  }

  const refresh = () => void router.invalidate()
  const keyOf = (a: AgendaRow) => toDateKey(new Date(a.startsAt))

  const renderList = (items: Array<AgendaRow>) => (
    <ul className="space-y-3">
      {items.map((a) => (
        <AppointmentCard
          key={a.id}
          appointment={a}
          status={statusOf(a)}
          onStatus={(id, next) => void changeStatus(id, next)}
          onChanged={refresh}
        />
      ))}
    </ul>
  )

  const todayStart = dayRangeUtc(todayKey).start.getTime()
  const upcoming = appointments.filter(
    (a) => new Date(a.startsAt).getTime() >= todayStart,
  )
  const past = appointments
    .filter((a) => new Date(a.startsAt).getTime() < todayStart)
    .reverse()
  const listItems = filter === 'upcoming' ? upcoming : past

  const groups = new Map<string, Array<AgendaRow>>()
  for (const a of listItems) {
    const key = keyOf(a)
    groups.set(key, [...(groups.get(key) ?? []), a])
  }

  const daysWithAppointments = [
    ...new Set(appointments.map(keyOf).map(keyToLocalDate).map((d) => d.getTime())),
  ].map((t) => new Date(t))
  const dayItems = appointments.filter((a) => keyOf(a) === anchor)

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">
          Tus citas: confirma, marca asistencia o cancela con motivo.
        </p>
        <Tabs value={layout} onValueChange={(v) => setLayout(v as Layout)}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="size-4" aria-hidden />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="size-4" aria-hidden />
              Calendario
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {layout === 'list' ? (
        <div className="space-y-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="upcoming">Próximas</TabsTrigger>
              <TabsTrigger value="past">Pasadas</TabsTrigger>
            </TabsList>
          </Tabs>
          {groups.size === 0 ? (
            <Empty
              text={
                filter === 'upcoming'
                  ? 'No tienes citas próximas agendadas.'
                  : 'Aún no hay citas pasadas registradas (últimos 180 días).'
              }
            />
          ) : (
            [...groups.entries()].map(([key, items]) => (
              <section key={key} className="space-y-3">
                <h3 className="font-display font-semibold capitalize tracking-tight text-foreground">
                  {longDay.format(new Date(items[0]?.startsAt ?? Date.now()))}
                </h3>
                {renderList(items)}
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
          <Card className="w-fit max-w-full self-start p-2">
            <Calendar
              mode="single"
              selected={keyToLocalDate(anchor)}
              onSelect={(d) => d && setAnchor(localDateToKey(d))}
              modifiers={{ booked: daysWithAppointments }}
              modifiersClassNames={{ booked: 'font-semibold text-primary underline' }}
            />
          </Card>
          <section className="min-w-0 space-y-3">
            <h3 className="font-display font-semibold capitalize tracking-tight text-foreground">
              {longDay.format(new Date(dayRangeUtc(anchor).start.getTime() + 12 * 60 * 60_000))}
            </h3>
            {dayItems.length === 0 ? (
              <Empty
                text="No tienes citas para esta fecha."
                action={anchor === todayKey ? undefined : () => setAnchor(todayKey)}
              />
            ) : (
              renderList(dayItems)
            )}
          </section>
        </div>
      )}
    </div>
  )
}
