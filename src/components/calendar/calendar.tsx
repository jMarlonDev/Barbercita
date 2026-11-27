import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from '@gravity-ui/icons'
import type { Tone } from '@/components/app/tone'
import { TONE_BG, TONE_FG } from '@/components/app/tone'
import { cn } from '@/lib/utils'
import {
  addDays,
  addMonths,
  businessToday,
  capitalize,
  dateOf,
  formatters,
  minutesOfDay,
  monthGrid,
  toDateKey,
  weekDays,
} from './date-utils'

export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarEvent {
  id: string
  /** Inicio ISO. */
  start: string
  /** Fin ISO (por defecto +30 min). */
  end?: string
  title: string
  subtitle?: string
  tone?: Tone
  /** Atenuado (p. ej. cancelada). */
  muted?: boolean
}

export interface CalendarProps {
  view: CalendarView
  onViewChange?: (view: CalendarView) => void
  views?: readonly CalendarView[]
  /** Día seleccionado / ancla (YYYY-MM-DD, zona del negocio). */
  date: string
  onDateChange: (date: string) => void
  /**
   * `full`: agenda con rejilla horaria (barbero/admin).
   * `picker`: selector de fecha para reservar (celdas grandes y táctiles).
   */
  variant?: 'full' | 'picker'
  events?: readonly CalendarEvent[]
  /** Cantidad por día (p. ej. horarios libres) para marcar días. */
  markers?: Readonly<Record<string, number>>
  /** Deshabilita días (p. ej. sin horarios o pasados). */
  isDateDisabled?: (date: string) => boolean
  /** No permite navegar antes de este día. */
  minDate?: string
  onEventClick?: (event: CalendarEvent) => void
  /** Hora inicial/final de la rejilla horaria. */
  hours?: readonly [number, number]
  action?: ReactNode
  /** Contenido bajo la cabecera en vista día del picker (p. ej. chips de horario). */
  children?: ReactNode
  loading?: boolean
  className?: string
}

const VIEW_LABEL: Record<CalendarView, string> = { month: 'Mes', week: 'Semana', day: 'Día' }
const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOUR_PX = 64

function heading(view: CalendarView, date: string) {
  if (view === 'month') {
    return { title: capitalize(formatters.month.format(dateOf(date))), year: date.slice(0, 4) }
  }
  if (view === 'week') {
    const days = weekDays(date)
    const a = dateOf(days[0] ?? date)
    const b = dateOf(days[6] ?? date)
    const sameMonth = a.getUTCMonth() === b.getUTCMonth()
    return {
      title: sameMonth
        ? `${a.getUTCDate()} – ${b.getUTCDate()} de ${formatters.month.format(b)}`
        : `${formatters.dayMonth.format(a)} – ${formatters.dayMonth.format(b)}`,
      year: date.slice(0, 4),
    }
  }
  return { title: capitalize(formatters.dayLong.format(dateOf(date))), year: date.slice(0, 4) }
}

function eventsByDay(events: readonly CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const key = toDateKey(new Date(e.start))
    const list = map.get(key)
    if (list) list.push(e)
    else map.set(key, [e])
  }
  for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start))
  return map
}

function hourLabel(h: number) {
  const suffix = h < 12 ? 'am' : 'pm'
  const n = h % 12 === 0 ? 12 : h % 12
  return `${n} ${suffix}`
}

/** Calendario reutilizable (mes / semana / día) para los tres roles. */
export function Calendar({
  view,
  onViewChange,
  views = ['month', 'week', 'day'],
  date,
  onDateChange,
  variant = 'full',
  events = [],
  markers,
  isDateDisabled,
  minDate,
  onEventClick,
  hours = [7, 21],
  action,
  children,
  loading = false,
  className,
}: CalendarProps) {
  const today = businessToday()
  const byDay = useMemo(() => eventsByDay(events), [events])
  const { title, year } = heading(view, date)
  const step = (dir: 1 | -1) => {
    const next = view === 'month' ? addMonths(date, dir) : addDays(date, view === 'week' ? 7 * dir : dir)
    onDateChange(minDate && next < minDate ? minDate : next)
  }
  const prevDisabled =
    !!minDate &&
    (view === 'month' ? date.slice(0, 7) <= minDate.slice(0, 7) : view === 'week' ? weekDays(date)[0]! <= minDate : date <= minDate)
  const isPicker = variant === 'picker'

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card',
        className,
      )}
    >
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDateChange(minDate && today < minDate ? minDate : today)}
            className="press h-9 cursor-pointer rounded-full border border-border bg-card px-3.5 text-sm font-semibold hover:bg-muted"
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Anterior"
            disabled={prevDisabled}
            onClick={() => step(-1)}
            className="press flex size-9 cursor-pointer items-center justify-center rounded-full border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => step(1)}
            className="press flex size-9 cursor-pointer items-center justify-center rounded-full border border-border hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <h3 className="min-w-0 flex-1 truncate font-display text-lg font-extrabold tracking-tight sm:text-xl" aria-live="polite">
          {title} <span className="text-sm font-medium text-muted-foreground">{year}</span>
        </h3>
        {onViewChange && views.length > 1 ? (
          <div role="tablist" aria-label="Vista" className="flex rounded-full bg-muted p-1">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => onViewChange(v)}
                className={cn(
                  'h-8 cursor-pointer rounded-full px-3 text-sm font-medium transition-all duration-200',
                  view === v ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
        ) : null}
        {action}
      </div>

      <div className={cn('relative transition-opacity duration-200', loading && 'opacity-60')} aria-busy={loading}>
        {view === 'month' ? (
          <MonthView
            date={date}
            today={today}
            isPicker={isPicker}
            byDay={byDay}
            markers={markers}
            isDateDisabled={isDateDisabled}
            onSelect={(d) => {
              onDateChange(d)
              if (!isPicker && onViewChange && views.includes('day')) onViewChange('day')
            }}
            onEventClick={onEventClick}
          />
        ) : isPicker ? (
          view === 'week' ? (
            <PickerWeek date={date} today={today} markers={markers} isDateDisabled={isDateDisabled} onSelect={onDateChange} />
          ) : null
        ) : (
          <TimeGrid
            days={view === 'week' ? weekDays(date) : [date]}
            today={today}
            hours={hours}
            byDay={byDay}
            onEventClick={onEventClick}
            onSelectDay={(d) => {
              onDateChange(d)
              if (onViewChange && views.includes('day')) onViewChange('day')
            }}
          />
        )}
        {children}
      </div>
    </div>
  )
}

function MonthView({
  date,
  today,
  isPicker,
  byDay,
  markers,
  isDateDisabled,
  onSelect,
  onEventClick,
}: {
  date: string
  today: string
  isPicker: boolean
  byDay: Map<string, CalendarEvent[]>
  markers?: Readonly<Record<string, number>>
  isDateDisabled?: (d: string) => boolean
  onSelect: (d: string) => void
  onEventClick?: (e: CalendarEvent) => void
}) {
  const grid = monthGrid(date)
  const month = date.slice(0, 7)
  // Recorta la última semana si es toda del mes siguiente.
  const cells = grid.slice(35).every((d) => d.slice(0, 7) !== month) ? grid.slice(0, 35) : grid

  return (
    <div role="grid" aria-label="Mes" className={cn(isPicker && 'p-3 sm:p-4')}>
      <div role="row" className={cn('grid grid-cols-7', !isPicker && 'border-b border-border bg-muted/40')}>
        {WEEKDAY_SHORT.map((w) => (
          <span
            key={w}
            role="columnheader"
            className="py-2 text-center text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase"
          >
            {w}
          </span>
        ))}
      </div>
      <div className={cn('grid grid-cols-7', isPicker ? 'gap-1.5 sm:gap-2' : '')}>
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === month
          const disabled = isDateDisabled?.(d) ?? false
          const selected = d === date
          const isToday = d === today
          const dayEvents = byDay.get(d) ?? []
          const count = markers?.[d] ?? dayEvents.length
          const dayNum = Number(d.slice(8))

          if (isPicker) {
            return (
              <button
                key={d}
                type="button"
                role="gridcell"
                disabled={disabled || !inMonth}
                aria-selected={selected}
                aria-label={`${formatters.dayLong.format(dateOf(d))}${count ? `, ${count} horarios` : ''}`}
                onClick={() => onSelect(d)}
                className={cn(
                  'press relative flex aspect-square min-h-11 cursor-pointer flex-col items-center justify-center rounded-2xl text-base font-semibold tabular-nums',
                  !inMonth && 'invisible',
                  disabled
                    ? 'cursor-not-allowed text-muted-foreground/45'
                    : selected
                      ? 'bg-primary text-primary-foreground shadow-pop'
                      : 'bg-muted/50 text-foreground hover:bg-primary-soft hover:text-primary',
                  isToday && !selected && 'ring-1.5 ring-primary/60 ring-inset',
                )}
              >
                {dayNum}
                {count > 0 && !disabled ? (
                  <span
                    aria-hidden="true"
                    className={cn('mt-0.5 size-1.5 rounded-full', selected ? 'bg-primary-foreground' : 'bg-primary')}
                  />
                ) : null}
              </button>
            )
          }

          return (
            <div
              key={d}
              role="gridcell"
              aria-selected={selected}
              className={cn(
                'group min-h-24 border-r border-b border-border p-1.5 text-left transition-colors duration-150 [&:nth-child(7n)]:border-r-0 sm:min-h-28 sm:p-2',
                !inMonth && 'bg-muted/40 text-muted-foreground/60',
                selected && 'bg-primary-soft/50',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-label={`Ver ${formatters.dayLong.format(dateOf(d))}`}
                className={cn(
                  'flex size-7 cursor-pointer items-center justify-center rounded-full text-sm font-semibold tabular-nums hover:bg-muted',
                  isToday && 'bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
              >
                {dayNum}
              </button>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEventClick?.(e)}
                    className={cn(
                      'block w-full cursor-pointer truncate rounded-md px-1.5 py-0.5 text-left text-[0.7rem] font-medium',
                      TONE_BG[e.tone ?? 'rose'],
                      TONE_FG[e.tone ?? 'rose'],
                      e.muted && 'line-through opacity-60',
                    )}
                  >
                    <span className="hidden sm:inline">{formatters.time.format(new Date(e.start))} · </span>
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => onSelect(d)}
                    className="cursor-pointer px-1.5 text-[0.7rem] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    +{dayEvents.length - 2} más
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PickerWeek({
  date,
  today,
  markers,
  isDateDisabled,
  onSelect,
}: {
  date: string
  today: string
  markers?: Readonly<Record<string, number>>
  isDateDisabled?: (d: string) => boolean
  onSelect: (d: string) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5 p-3 sm:gap-2 sm:p-4">
      {weekDays(date).map((d, i) => {
        const disabled = isDateDisabled?.(d) ?? false
        const selected = d === date
        const count = markers?.[d] ?? 0
        return (
          <button
            key={d}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={`${formatters.dayLong.format(dateOf(d))}${count ? `, ${count} horarios` : ''}`}
            onClick={() => onSelect(d)}
            className={cn(
              'press flex cursor-pointer flex-col items-center gap-1 rounded-2xl py-3 text-center',
              disabled
                ? 'cursor-not-allowed text-muted-foreground/45'
                : selected
                  ? 'bg-primary text-primary-foreground shadow-pop'
                  : 'bg-muted/50 hover:bg-primary-soft hover:text-primary',
              d === today && !selected && 'ring-1.5 ring-primary/60 ring-inset',
            )}
          >
            <span className="text-[0.7rem] font-semibold tracking-wide uppercase opacity-80">{WEEKDAY_SHORT[i]}</span>
            <span className="font-display text-xl font-extrabold tabular-nums">{Number(d.slice(8))}</span>
            <span className={cn('text-[0.65rem] font-medium', selected ? 'opacity-90' : 'text-muted-foreground')}>
              {disabled ? '—' : count > 0 ? `${count} libres` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TimeGrid({
  days,
  today,
  hours,
  byDay,
  onEventClick,
  onSelectDay,
}: {
  days: string[]
  today: string
  hours: readonly [number, number]
  byDay: Map<string, CalendarEvent[]>
  onEventClick?: (e: CalendarEvent) => void
  onSelectDay: (d: string) => void
}) {
  const [from, to] = hours
  const rows = Array.from({ length: to - from }, (_, i) => from + i)
  const nowMin = minutesOfDay(new Date().toISOString())
  const multi = days.length > 1

  return (
    <div className="scrollbar-thin max-h-[70vh] overflow-auto">
      <div className={cn('min-w-0', multi && 'min-w-[44rem]')}>
        <div
          className="sticky top-0 z-10 grid border-b border-border bg-card/95 backdrop-blur"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <span />
          {days.map((d) => {
            const isToday = d === today
            const count = byDay.get(d)?.length ?? 0
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDay(d)}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 border-l border-border py-2.5 hover:bg-muted/60',
                  isToday && 'bg-primary-soft/60',
                )}
              >
                <span className={cn('text-[0.7rem] font-semibold tracking-wider uppercase', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {formatters.weekdayShort.format(dateOf(d)).replace('.', '')}
                </span>
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full font-display text-lg font-bold tabular-nums',
                    isToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {!multi ? (
                  <span className="text-xs text-muted-foreground">{count ? `${count} citas` : 'Sin citas'}</span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div>
            {rows.map((h) => (
              <div key={h} className="relative text-right" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 right-2 text-[0.7rem] font-medium text-muted-foreground">{hourLabel(h)}</span>
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={cn('relative border-l border-border', d === today && 'bg-primary-soft/25')}>
              {rows.map((h) => (
                <div key={h} className="border-b border-border" style={{ height: HOUR_PX }}>
                  <div className="h-1/2 border-b border-dashed border-border/70" />
                </div>
              ))}
              {d === today && nowMin >= from * 60 && nowMin <= to * 60 ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 z-[1] h-0.5 bg-primary"
                  style={{ top: ((nowMin - from * 60) / 60) * HOUR_PX }}
                >
                  <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-primary" />
                </div>
              ) : null}
              {(byDay.get(d) ?? []).map((e) => {
                const start = minutesOfDay(e.start)
                const end = e.end ? minutesOfDay(e.end) : start + 30
                const top = ((Math.max(start, from * 60) - from * 60) / 60) * HOUR_PX
                const height = Math.max(((end - start) / 60) * HOUR_PX - 3, 26)
                const tone = e.tone ?? 'rose'
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEventClick?.(e)}
                    className={cn(
                      'press absolute inset-x-1 z-[2] cursor-pointer overflow-hidden rounded-xl border-l-[3px] px-2 py-1 text-left shadow-card hover:shadow-pop',
                      TONE_BG[tone],
                      TONE_FG[tone],
                      'border-current',
                      e.muted && 'opacity-55',
                    )}
                    style={{ top: top + 1, height }}
                  >
                    <span className={cn('block truncate text-xs font-semibold text-foreground', e.muted && 'line-through')}>{e.title}</span>
                    <span className="block truncate text-[0.68rem] font-medium">
                      {formatters.time.format(new Date(e.start))}
                      {e.subtitle ? ` · ${e.subtitle}` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
