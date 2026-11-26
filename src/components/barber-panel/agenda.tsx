import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  CancelDialog,
  RescheduleDialog,
} from '@/components/barber-panel/appointment-dialogs'
import {
  STATUS_CONFIG,
  normalizeStatus,
} from '@/components/barber-panel/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toaster'
import { BUSINESS_TIME_ZONE, dayRangeUtc, toDateKey } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getBarberAgenda } from '@/server/barber-panel'
import { setBarberAppointmentStatus } from '@/server/barber-panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, Check, X, CalendarCheck01, Trash02 } from '@untitledui/icons'

type AgendaRow = Awaited<ReturnType<typeof getBarberAgenda>>[number]
type View = 'day' | 'week' | 'history'

const DAY_MS = 24 * 60 * 60_000
const longDay = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})
const shortDay = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

function shiftKey(key: string, days: number): string {
  return toDateKey(new Date(dayRangeUtc(key).start.getTime() + days * DAY_MS))
}

function weekStartKey(key: string): string {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay()
  return shiftKey(key, -((dow + 6) % 7))
}

function keyToDate(key: string): Date {
  return new Date(dayRangeUtc(key).start.getTime() + 12 * 60 * 60_000)
}

function AppointmentCard({
  appointment,
  status,
  onStatus,
  onChanged,
  compact,
}: {
  appointment: AgendaRow
  status: ReturnType<typeof normalizeStatus>
  onStatus: (id: string, next: 'confirmed' | 'completed' | 'no_show') => void
  onChanged: () => void
  compact?: boolean
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
        'space-y-3 rounded-xl border border-l-4 bg-card p-4',
        config.bar,
        status === 'cancelled' && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            <span className="tabular-nums mr-2">
              {timeFormatter.format(startsAt)}
            </span>
            {appointment.service.name}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {appointment.customer.name}
            {!compact && appointment.customer.phone
              ? ` · ${appointment.customer.phone}`
              : ''}
          </p>
          {!compact && appointment.notes ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nota: {appointment.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn('border-0 px-3 py-1', config.badge)}>
            {config.label}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {isPaid ? 'Pagada' : formatCop(appointment.service.price)}
          </Badge>
        </div>
      </div>
      {open ? (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          {status === 'pending' ? (
            <Button
              size="sm"
              onClick={() => onStatus(appointment.id, 'confirmed')}
              className="gap-2"
            >
              <Check className="size-3.5" />
              Confirmar
            </Button>
          ) : null}
          {started ? (
            <>
              <Button
                size="sm"
                onClick={() => onStatus(appointment.id, 'completed')}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Check className="size-3.5" />
                Asistió
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onStatus(appointment.id, 'no_show')}
                className="gap-2"
              >
                <X className="size-3.5" />
                No asistió
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMoveOpen(true)}
                className="gap-2"
              >
                <CalendarCheck01 className="size-3.5" />
                Reprogramar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCancelOpen(true)}
                className="gap-2 text-destructive hover:bg-destructive/10"
              >
                <Trash02 className="size-3.5" />
                Cancelar
              </Button>
            </>
          )}
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

export function BarberAgenda({
  appointments,
}: {
  appointments: Array<AgendaRow>
}) {
  const router = useRouter()
  const setStatus = useServerFn(setBarberAppointmentStatus)
  const [view, setView] = useState<View>('day')
  const [anchor, setAnchor] = useState(() => toDateKey(new Date()))
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const todayKey = toDateKey(new Date())
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
  const byDay = (key: string) =>
    appointments.filter((a) => toDateKey(new Date(a.startsAt)) === key)

  const step = view === 'week' ? 7 : 1
  const weekStart = weekStartKey(anchor)
  const weekKeys = Array.from({ length: 7 }, (_, i) => shiftKey(weekStart, i))

  const renderList = (items: Array<AgendaRow>, compact: boolean) => (
    <ul className="space-y-3">
      {items.map((a) => (
        <AppointmentCard
          key={a.id}
          appointment={a}
          status={statusOf(a)}
          onStatus={(id, next) => void changeStatus(id, next)}
          onChanged={refresh}
          compact={compact}
        />
      ))}
    </ul>
  )

  const history = appointments
    .filter(
      (a) =>
        new Date(a.startsAt).getTime() < dayRangeUtc(todayKey).start.getTime(),
    )
    .reverse()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        {view !== 'history' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              aria-label="Anterior"
              onClick={() => setAnchor(shiftKey(anchor, -step))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex flex-col items-center min-w-[150px]">
              <p className="text-sm font-semibold capitalize whitespace-nowrap">
                {view === 'day'
                  ? longDay.format(keyToDate(anchor))
                  : `${shortDay.format(keyToDate(weekKeys[0] ?? anchor))} – ${shortDay.format(keyToDate(weekKeys[6] ?? anchor))}`}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-0 text-xs"
                onClick={() => setAnchor(todayKey)}
              >
                Hoy
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              aria-label="Siguiente"
              onClick={() => setAnchor(shiftKey(anchor, step))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {view === 'day' && (
        <div className="space-y-3">
          {byDay(anchor).length === 0 ? (
            <Alert className="border-dashed">
              <CalendarCheck01 className="size-4" />
              <AlertDescription>
                No tienes citas programadas para esta fecha.
              </AlertDescription>
            </Alert>
          ) : (
            renderList(byDay(anchor), false)
          )}
        </div>
      )}

      {view === 'week' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekKeys.map((key) => {
            const items = byDay(key)
            const isToday = key === todayKey
            return (
              <section
                key={key}
                className={cn(
                  'space-y-2 rounded-xl p-3',
                  isToday && 'bg-primary/5 border border-primary/20',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    {shortDay.format(keyToDate(key))}
                    {isToday && (
                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                        Hoy
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length} cita{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">—</p>
                ) : (
                  renderList(items, true)
                )}
              </section>
            )
          })}
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <Alert className="border-dashed">
              <CalendarCheck01 className="size-4" />
              <AlertDescription>
                Aún no hay citas pasadas registradas.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Últimos 180 días, de la más reciente a la más antigua.
              </p>
              {history.map((a) => (
                <div key={a.id} className="space-y-2">
                  <p className="text-xs font-medium capitalize text-muted-foreground">
                    {longDay.format(new Date(a.startsAt))}
                  </p>
                  {renderList([a], false)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}