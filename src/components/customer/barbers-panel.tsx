import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Heart, HeartFill, Persons, Scissors } from '@gravity-ui/icons'
import { favoritesKey, useLocalStore } from './local-store'
import type { AppointmentRow } from './appointment-card'
import { EmptyState } from '@/components/app/empty-state'
import { PageHeader } from '@/components/app/page-header'
import { UserAvatar } from '@/components/app/user-avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { cn } from '@/lib/utils'

const lastFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})

export function BarbersPanel({
  userId,
  appointments,
}: {
  userId: string
  appointments: Array<AppointmentRow>
}) {
  // TODO API: persistir barberos favoritos en el servidor.
  const [favorites, setFavorites] = useLocalStore<string[]>(favoritesKey(userId), [])

  const barbers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; cuts: number; last: Date }>()
    for (const a of appointments) {
      if (a.status !== 'completed') continue
      const when = new Date(a.startsAt)
      const prev = map.get(a.barberId)
      if (prev) {
        prev.cuts += 1
        if (when > prev.last) prev.last = when
      } else {
        map.set(a.barberId, { id: a.barberId, name: a.barber.name, cuts: 1, last: when })
      }
    }
    return [...map.values()].sort((a, b) => b.cuts - a.cuts)
  }, [appointments])

  function toggle(id: string, name: string) {
    const on = favorites.includes(id)
    setFavorites((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]))
    toast.success(on ? `${name} salió de tus favoritos` : `${name} es ahora tu favorito`)
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow="Mis barberos"
        title="Tus barberos favoritos"
        description="Los profesionales con quienes más has ido. Reserva con ellos en un toque."
      />
      {barbers.length === 0 ? (
        <EmptyState
          icon={<Persons />}
          title="Aún no tienes barberos de confianza"
          description="Después de tu primer corte, aquí aparecerán los barberos con los que has ido."
          className="rounded-3xl bg-warm-surface py-14"
          action={
            <Button asChild size="lg" className="press min-h-12">
              <Link to="/reservar">Agendar cita</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => {
            const fav = favorites.includes(b.id)
            return (
              <article
                key={b.id}
                className="lift flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar name={b.name} size="xl" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xl font-extrabold tracking-tight text-foreground">
                      {b.name}
                    </h3>
                    <p className="text-base text-muted-foreground">
                      {b.cuts} {b.cuts === 1 ? 'corte' : 'cortes'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={fav}
                    aria-label={fav ? `Quitar a ${b.name} de favoritos` : `Marcar a ${b.name} como favorito`}
                    onClick={() => toggle(b.id, b.name)}
                    className={cn(
                      'press flex size-12 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
                      fav ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground hover:text-primary',
                    )}
                  >
                    {fav ? <HeartFill className="size-6 animate-pop-in" /> : <Heart className="size-6" />}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Último corte: {lastFmt.format(b.last)}
                </p>
                <Button asChild size="lg" className="press mt-auto min-h-12 gap-2">
                  <Link to="/reservar" search={{ barbero: b.id }}>
                    <Scissors className="size-5" />
                    Reservar con él
                  </Link>
                </Button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
