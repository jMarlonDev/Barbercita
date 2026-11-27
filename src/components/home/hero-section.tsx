import { Link } from '@tanstack/react-router'
import { ArrowRight } from '@gravity-ui/icons'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  user: { name: string; role: 'customer' | 'barber' | 'admin' } | null
}

export function HeroSection({ user }: HeroSectionProps) {
  return (
    <section id="inicio" className="relative scroll-mt-20 overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-surface to-background"
      />

      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Reserva tu corte en menos de un minuto
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          Elige tu servicio, tu barbero y el horario que prefieras. Paga en
          línea y recibe la confirmación al instante.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!user ? (
            <>
              <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                <Link to="/registro">
                  Crear cuenta
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            </>
          ) : user.role === 'customer' ? (
            <>
              <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                <Link to="/reservar">
                  Agendar cita
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link to="/cuenta" search={{ tab: 'citas' }}>
                  Ver mis citas
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
              <Link to={user.role === 'barber' ? '/barbero' : '/admin'}>
                Ir a mi panel
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          )}
        </div>
        {user && (
          <p className="mt-6 text-sm text-muted-foreground">
            Sesión activa como {user.name}
          </p>
        )}
      </div>
    </section>
  )
}
