import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

interface CtaBannerProps {
  user: { name: string; role: 'customer' | 'barber' | 'admin' } | null
}

export function CtaBanner({ user }: CtaBannerProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-secondary-soft px-6 py-14 text-center shadow-sm sm:px-12 ">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          ¿Listo para ordenar tu agenda?
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-base text-muted-foreground sm:text-lg">
          Crea tu cuenta en menos de un minuto y empieza a gestionar tus citas
          desde cualquier dispositivo.
        </p>

        <Link
          to={
            user
              ? user.role === 'customer'
                ? '/reservar'
                : user.role === 'barber'
                  ? '/barbero'
                  : '/admin'
              : '/registro'
          }
          className="group mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          {user
            ? user.role === 'customer'
              ? 'Reservar cita'
              : 'Ir a mi panel'
            : 'Empezar ahora'}
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="size-4" />
          </span>
        </Link>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} BarberCita. Todos los derechos
            reservados.
          </p>
          <div className="flex items-center gap-6">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="hover:text-foreground transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="hover:text-foreground transition-colors"
                >
                  Crear cuenta
                </Link>
              </>
            ) : (
              <Link
                to="/cuenta"
                search={{ tab: 'inicio' }}
                className="hover:text-foreground transition-colors"
              >
                Mi cuenta
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
