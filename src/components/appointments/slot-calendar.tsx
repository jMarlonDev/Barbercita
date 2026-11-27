import { useCallback, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Calendar } from '@/components/calendar/calendar'
import type { CalendarView } from '@/components/calendar/calendar'
import { SlotPicker } from '@/components/calendar/slot-picker'
import {
  businessToday,
  capitalize,
  dateOf,
  endOfMonth,
  formatters,
  startOfMonth,
  weekDays,
} from '@/components/calendar/date-utils'
import { getAvailability } from '@/server/appointments'

const POLL_INTERVAL_MS = 30_000

type Availability = Record<string, string[]>

interface SlotCalendarProps {
  barberId: string
  serviceId: string
  /** Selected start time (ISO) or null. */
  value: string | null
  onChange: (startsAt: string | null) => void
  /** Increment to force an immediate availability refetch. */
  refreshToken?: number
}

/** Selector de fecha + hora para reservar/reprogramar, sobre el calendario común. */
export function SlotCalendar({ barberId, serviceId, value, onChange, refreshToken = 0 }: SlotCalendarProps) {
  const getAvailabilityFn = useServerFn(getAvailability)
  const today = businessToday()
  const [view, setView] = useState<CalendarView>('month')
  const [date, setDate] = useState(today)
  const [picked, setPicked] = useState(false)
  const [data, setData] = useState<Availability>({})
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Rango visible: mes completo o semana (puede cruzar meses).
  const range =
    view === 'week'
      ? { from: weekDays(date)[0] ?? date, to: weekDays(date)[6] ?? date }
      : { from: startOfMonth(date), to: endOfMonth(date) }
  const from = range.from < today ? today : range.from
  const to = range.to
  const rangeKey = `${barberId}|${serviceId}|${from}|${to}`

  const load = useCallback(async () => {
    if (to < from) return
    try {
      const res = await getAvailabilityFn({ data: { barberId, serviceId, from, to } })
      setData((prev) => ({ ...prev, ...res }))
      setLoaded((prev) => ({ ...prev, [rangeKey]: true }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la disponibilidad.')
    }
  }, [getAvailabilityFn, barberId, serviceId, from, to, rangeKey])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load, refreshToken])

  const loading = !loaded[rangeKey]
  const markers: Record<string, number> = {}
  for (const [k, v] of Object.entries(data)) markers[k] = v.length
  const slots = data[date] ?? []
  const isDateDisabled = (d: string) => d < today || (!loading && (data[d]?.length ?? 0) === 0)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-6">
      <Calendar
        variant="picker"
        view={view}
        views={['month', 'week']}
        onViewChange={setView}
        date={date}
        minDate={today}
        onDateChange={(d) => {
          setDate(d)
          setPicked(true)
          onChange(null)
        }}
        markers={markers}
        isDateDisabled={isDateDisabled}
        loading={loading}
      />
      <div className="min-w-0 space-y-4">
        <div>
          <p className="eyebrow">Horarios disponibles</p>
          <p className="mt-1 font-display text-xl font-extrabold tracking-tight">
            {picked || slots.length ? capitalize(formatters.dayLong.format(dateOf(date))) : 'Elige un día'}
          </p>
        </div>
        {picked || slots.length ? (
          <SlotPicker slots={slots} value={value} onChange={(s) => onChange(s)} loading={loading} />
        ) : (
          <p className="text-muted-foreground">Toca un día marcado con un punto para ver sus horarios.</p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
