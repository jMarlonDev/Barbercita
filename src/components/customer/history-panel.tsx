import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowShapeTurnUpRight,
  ClockArrowRotateLeft,
  Star,
  StarFill,
} from '@gravity-ui/icons'
import { StatusBadge } from './status'
import { ratingsKey, useLocalStore } from './local-store'
import type { Rating } from './local-store'
import { isUpcoming } from './appointment-card'
import type { AppointmentRow } from './appointment-card'
import { EmptyState } from '@/components/app/empty-state'
import { PageHeader } from '@/components/app/page-header'
import { UserAvatar } from '@/components/app/user-avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})

function Stars({
  value,
  onChange,
}: {
  value: number
  onChange?: (n: number) => void
}) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const Icon = n <= value ? StarFill : Star
        const cls = cn('size-8', n <= value ? 'text-tone-amber-fg' : 'text-muted-foreground')
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            onClick={() => onChange(n)}
            className="press flex size-12 items-center justify-center rounded-full transition-colors hover:bg-tone-amber focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
          >
            <Icon className={cn(cls, n === value && 'animate-pop-in')} />
          </button>
        ) : (
          <Icon key={n} className={cn(cls, 'size-5')} />
        )
      })}
    </div>
  )
}

async function shareExperience(a: AppointmentRow) {
  const text = `¡Me hice ${a.service.name} con ${a.barber.name} en BarberCita! Agenda tu cita aquí.`
  const url = window.location.origin
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'BarberCita', text, url })
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    toast.success('Texto copiado. ¡Compártelo con tus amigos!')
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    toast.error('No se pudo compartir. Intenta de nuevo.')
  }
}

function HistoryItem({
  appointment,
  rating,
  onRate,
}: {
  appointment: AppointmentRow
  rating?: Rating
  onRate: (r: Rating) => void
}) {
  const [editing, setEditing] = useState(false)
  const [stars, setStars] = useState(rating?.stars ?? 0)
  const [comment, setComment] = useState(rating?.comment ?? '')
  const done = appointment.status === 'completed'

  return (
    <article className="lift space-y-4 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={appointment.barber.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
              {appointment.service.name}
            </h3>
            <StatusBadge status={appointment.status ?? 'pending'} />
          </div>
          <p className="text-base text-muted-foreground">
            con {appointment.barber.name} ·{' '}
            <span className="capitalize">{dateFmt.format(new Date(appointment.startsAt))}</span>
          </p>
        </div>
        <span className="font-display text-xl font-extrabold tabular-nums text-foreground">
          {formatCop(appointment.service.price)}
        </span>
      </div>

      {done && (
        <div className="space-y-4 rounded-2xl bg-warm-surface p-4 sm:p-5">
          {rating && !editing ? (
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={rating.stars} />
              {rating.comment && (
                <p className="min-w-0 flex-1 text-base text-foreground">“{rating.comment}”</p>
              )}
              <Button variant="ghost" size="lg" className="press" onClick={() => {
                  setStars(rating.stars)
                  setComment(rating.comment)
                  setEditing(true)
                }}>
                Editar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground">¿Cómo te fue con este corte?</p>
              <Stars value={stars} onChange={setStars} />
              <Textarea
                value={comment}
                maxLength={300}
                rows={2}
                placeholder="Cuéntanos tu experiencia (opcional)"
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                size="lg"
                className="press"
                disabled={stars === 0}
                onClick={() => {
                  onRate({ stars, comment: comment.trim() })
                  setEditing(false)
                  toast.success('¡Gracias por tu calificación!')
                }}
              >
                Guardar calificación
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="lg"
            className="press gap-2"
            onClick={() => void shareExperience(appointment)}
          >
            <ArrowShapeTurnUpRight className="size-5" />
            Compartir experiencia
          </Button>
        </div>
      )}
    </article>
  )
}

export function HistoryPanel({
  userId,
  appointments,
}: {
  userId: string
  appointments: Array<AppointmentRow>
}) {
  const [ratings, setRatings] = useLocalStore<Record<string, Rating>>(ratingsKey(userId), {})
  const past = appointments.filter((a) => !isUpcoming(a))
  const done = past.filter((a) => a.status !== 'cancelled')
  const cancelled = past.filter((a) => a.status === 'cancelled')

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow="Historial"
        title="Tu historial de cortes"
        description="Todas tus visitas en un solo lugar. Califica tus cortes completados."
      />
      {past.length === 0 ? (
        <EmptyState
          icon={<ClockArrowRotateLeft />}
          title="Aún no tienes historial"
          description="Cuando termines tu primera cita, la verás aquí."
          className="rounded-3xl bg-warm-surface py-14"
          action={
            <Button asChild size="lg" className="press min-h-12">
              <Link to="/reservar">Agendar cita</Link>
            </Button>
          }
        />
      ) : (
        [
          { title: 'Pasadas', list: done },
          { title: 'Canceladas', list: cancelled },
        ]
          .filter(({ list }) => list.length > 0)
          .map(({ title, list }) => (
            <section key={title} className="space-y-4">
              <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
                {title} ({list.length})
              </h3>
              <div className="grid gap-5">
                {list.map((a) => (
                  <HistoryItem
                    key={a.id}
                    appointment={a}
                    rating={ratings[a.id]}
                    onRate={(r) => setRatings((prev) => ({ ...prev, [a.id]: r }))}
                  />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  )
}

