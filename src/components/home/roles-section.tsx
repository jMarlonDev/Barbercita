import { CheckCircle, Scissors01, ShieldTick, User01 } from '@untitledui/icons'

const ROLES = [
  {
    name: 'Clientes',
    subtitle: 'Reserva, reprograma y paga en segundos',
    icon: User01,
    iconBgClass: 'bg-primary/10 text-primary dark:bg-primary/15',
    bullets: [
      'Paso a paso: Servicio → Barbero → Horario → Pago',
      'Historial completo: Próximas, Pasadas, Canceladas',
      'Pago seguro con Wompi o pagar después',
    ],
  },
  {
    name: 'Barberos',
    subtitle: 'Agenda visual y control total',
    icon: Scissors01,
    iconBgClass: 'bg-warning-soft text-warning',
    bullets: [
      'Vista Día / Semana / Historial',
      'Asistencia en 1 clic: Asistió / No asistió',
      'CRUD de servicios con activación por Switch',
    ],
  },
  {
    name: 'Administradores',
    subtitle: 'Control total del negocio',
    icon: ShieldTick,
    iconBgClass: 'bg-secondary-soft text-secondary',
    bullets: [
      'Dashboard financiero con KPIs dinámicos',
      'Gestión de barberos y servicios',
      'Configuración: horarios, comisiones, derecho de silla',
    ],
  },
] as const

export function RolesSection() {
  return (
    <section
      id="roles"
      className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/60 px-3.5 py-1 text-xs font-medium text-muted-foreground">
          Diseñado para todo el equipo
        </span>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Para cada rol, las herramientas adecuadas
        </h2>
        <p className="text-base text-muted-foreground">
          Cada persona accede exactamente a lo que necesita, desde cualquier
          dispositivo.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {ROLES.map(({ name, subtitle, icon: Icon, iconBgClass, bullets }) => (
          <div
            key={name}
            className="group rounded-2xl border border-border/80 bg-card p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg dark:hover:border-primary/40"
          >
            <div
              className={`mb-5 flex size-12 items-center justify-center rounded-2xl ${iconBgClass}`}
            >
              <Icon className="size-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <ul className="mt-5 space-y-3">
              {bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                >
                  <CheckCircle
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
