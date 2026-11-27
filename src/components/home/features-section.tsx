import { Calendar as CalendarCheck02, Clock as ClockCheck, ShieldCheck as ShieldTick } from '@gravity-ui/icons'

const FEATURES = [
  {
    icon: CalendarCheck02,
    title: 'Reserva en segundos',
    description:
      'Elige servicio, barbero y horario disponible sin llamadas ni mensajes de ida y vuelta.',
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

export function FeaturesSection() {
  return (
    <section
      id="como-funciona"
      className="mx-auto max-w-6xl scroll-mt-20 space-y-12 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/60 px-3.5 py-1 text-xs font-medium text-muted-foreground">
          Cómo funciona
        </span>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Menos fricción, mejor servicio
        </h2>
        <p className="text-base text-muted-foreground">
          La base está lista: autenticación segura, permisos por rol y una
          agenda preparada para crecer.
        </p>
      </div>

      <div id="funciones" className="grid gap-6 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group rounded-2xl border border-border/80 bg-card p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg dark:hover:border-primary/40"
          >
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/15">
              <Icon className="size-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
