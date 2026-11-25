import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CalendarCheck02,
  ClockCheck,
  Scissors01,
  ShieldTick,
  Star01,
} from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: Home })

const FEATURES = [
  {
    icon: CalendarCheck02,
    title: 'Reserva en segundos',
    description:
      'Elige barbero, servicio y horario disponible sin llamadas ni mensajes de ida y vuelta.',
  },
  {
    icon: ClockCheck,
    title: 'Agenda siempre al día',
    description:
      'La disponibilidad se calcula en tiempo real para evitar solapamientos y citas duplicadas.',
  },
  {
    icon: ShieldTick,
    title: 'Acceso seguro por rol',
    description:
      'Clientes, barberos y administradores ven exactamente lo que necesitan, con sesiones protegidas.',
  },
] as const

function Home() {
  const { user } = Route.useRouteContext()

  return (
    <div className="space-y-16 pb-8">
      <section className="grid items-center gap-10 pt-6 sm:pt-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Star01 className="size-3.5" />
            Agenda para barberías modernas
          </span>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Tu barbería, organizada. Tu próxima cita, a un clic.
            </h1>
            <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              BarberCita reúne reservas, servicios y agendas en un solo lugar.
              Menos coordinación manual y más tiempo dedicado a tus clientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <Button size="lg" asChild>
                  <Link to={user.role === 'customer' ? '/reservar' : '/cuenta'}>
                    {user.role === 'customer'
                      ? 'Reservar cita'
                      : 'Ir a mi cuenta'}
                  </Link>
                </Button>
                {user.role === 'customer' && (
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/cuenta">Mis citas</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/registro">Crear cuenta gratis</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
              </>
            )}
          </div>

          {user ? (
            <p className="text-sm text-muted-foreground">
              Sesión iniciada como{' '}
              <span className="font-medium text-foreground">{user.name}</span>.
              Consulta tus citas y tu perfil desde tu cuenta.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin tarjetas ni compromisos. Crea tu cuenta y gestiona tu agenda.
            </p>
          )}
        </div>

        <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-secondary/70 via-background to-background shadow-sm">
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-2xl"
          />
          <CardHeader className="space-y-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Scissors01 className="size-5" />
            </span>
            <CardTitle className="text-xl">Una agenda, tres roles</CardTitle>
            <CardDescription>
              Cada persona ve la información que le corresponde.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 px-3.5 py-3">
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
              <p>
                <span className="font-medium text-foreground">Clientes</span>{' '}
                reservan y consultan sus propias citas.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 px-3.5 py-3">
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
              <p>
                <span className="font-medium text-foreground">Barberos</span>{' '}
                gestionan solo las citas asignadas a su agenda.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 px-3.5 py-3">
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
              <p>
                <span className="font-medium text-foreground">
                  Administradores
                </span>{' '}
                supervisan todas las reservas del negocio.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Menos fricción, mejor servicio
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            La base está lista: autenticación segura, permisos por rol y una
            agenda preparada para crecer.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} size="sm" className="h-full">
              <CardHeader className="space-y-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <feature.icon className="size-4" />
                </span>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-secondary/40 px-6 py-8 text-center sm:px-10">
        <h2 className="text-xl font-semibold tracking-tight">
          ¿Listo para ordenar tu agenda?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Crea tu cuenta en menos de un minuto y empieza a gestionar tus citas
          desde cualquier dispositivo.
        </p>
        <div className="mt-5 flex justify-center">
          {user ? (
            <Button asChild>
              <Link to={user.role === 'customer' ? '/reservar' : '/cuenta'}>
                {user.role === 'customer' ? 'Reservar cita' : 'Ver mis citas'}
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/registro">Empezar ahora</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
