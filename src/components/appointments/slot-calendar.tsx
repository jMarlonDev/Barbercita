import { useCallback, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { ChevronLeft, ChevronRight } from '@untitledui/icons'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { cn } from '@/lib/utils'
import { getAvailability } from '@/server/appointments'

const POLL_INTERVAL_MS = 30_000
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const monthFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

type MonthAvailability = Record<string, string[]>

interface Month {
  year: number
  /** 0-based month index. */
  month: number
}

const pad = (value: number) => String(value).padStart(2, '0')
const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`
const toMonthKey = ({ year, month }: Month) => `${year}-${pad(month + 1)}`

/** Today's date (YYYY-MM-DD) in the business time zone. */
function getBusinessToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date())
}

function shiftMonth({ year, month }: Month, delta: number): Month {
  const date = new Date(Date.UTC(year, month + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

interface SlotCalendarProps {
  barberId: string
  serviceId: string
  /** Selected start time (ISO) or null. */
  value: string | null
  onChange: (startsAt: string | null) => void
  /** Increment to force an immediate availability refetch. */
  refreshToken?: number
}

export function SlotCalendar({
  barberId,
  serviceId,
  value,
  onChange,
  refreshToken = 0,
}: SlotCalendarProps) {
  const getAvailabilityFn = useServerFn(getAvailability)
  const today = getBusinessToday()

  const [visible, setVisible] = useState<Month>(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }))
  const [cache, setCache] = useState<Record<string, MonthAvailability>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const monthKey = toMonthKey(visible)

  const load = useCallback(async () => {
    const lastDay = new Date(
      Date.UTC(visible.year, visible.month + 1, 0),
    ).getUTCDate()
    try {
      const data = await getAvailabilityFn({
        data: {
          barberId,
          serviceId,
          from: toDateKey(visible.year, visible.month, 1),
          to: toDateKey(visible.year, visible.month, lastDay),
        },
      })
      setCache((prev) => ({ ...prev, [monthKey]: data }))
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la disponibilidad.',
      )
    }
  }, [getAvailabilityFn, barberId, serviceId, visible, monthKey])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load, refreshToken])

  const availability = cache[monthKey]
  const leadingBlanks =
    (new Date(Date.UTC(visible.year, visible.month, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(
    Date.UTC(visible.year, visible.month + 1, 0),
  ).getUTCDate()
  const slots = selectedDate ? (availability?.[selectedDate] ?? []) : []
  const isCurrentMonth = monthKey === today.slice(0, 7)

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey)
    onChange(null)
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium capitalize">
            {monthFormatter.format(
              new Date(Date.UTC(visible.year, visible.month, 1)),
            )}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={isCurrentMonth}
              onClick={() => setVisible(shiftMonth(visible, -1))}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setVisible(shiftMonth(visible, 1))}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="py-1 text-xs font-medium text-muted-foreground"
            >
              {weekday}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dateKey = toDateKey(visible.year, visible.month, i + 1)
            const hasSlots = (availability?.[dateKey]?.length ?? 0) > 0
            const isSelected = dateKey === selectedDate
            return (
              <button
                key={dateKey}
                type="button"
                disabled={!hasSlots}
                aria-pressed={isSelected}
                onClick={() => selectDate(dateKey)}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                  hasSlots
                    ? 'font-medium hover:bg-secondary'
                    : 'text-muted-foreground/40',
                  dateKey === today && !isSelected && 'ring-1 ring-ring',
                  isSelected &&
                    'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {i + 1}
              </button>
            )
          })}
        </div>

        {!availability && !error && (
          <p className="text-xs text-muted-foreground">
            Cargando disponibilidad...
          </p>
        )}
      </div>

      <div className="space-y-3">
        {selectedDate ? (
          <>
            <p className="text-sm font-medium capitalize">
              {dayFormatter.format(new Date(`${selectedDate}T00:00:00Z`))}
            </p>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ya no quedan horarios este día. Elige otra fecha.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={slot === value}
                    onClick={() => onChange(slot)}
                    className={cn(
                      'rounded-lg border border-border px-2 py-1.5 text-sm tabular-nums transition-colors hover:bg-secondary',
                      slot === value &&
                        'border-primary bg-primary text-primary-foreground hover:bg-primary',
                    )}
                  >
                    {timeFormatter.format(new Date(slot))}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Elige un día disponible para ver los horarios.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
