import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useOnboarding } from './use-onboarding'

function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/**
 * Saludo destacado para visitas siguientes (tras completar la guía).
 * Primera visita: saludo de bienvenida sin "de nuevo".
 */
export function WelcomeBanner({
  userId,
  name,
  subtitle,
  action,
  children,
  className,
  size = 'md',
}: {
  userId: string
  name: string
  /** Ej.: "Mira lo que tienes hoy en la agenda". */
  subtitle: ReactNode
  action?: ReactNode
  /** Resumen breve (chips/estadísticas). */
  children?: ReactNode
  className?: string
  size?: 'md' | 'lg'
}) {
  const { onboardingCompleted, ready } = useOnboarding(userId)
  const firstName = name.split(' ')[0] ?? name
  const returning = ready && onboardingCompleted

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border bg-card shadow-card',
        size === 'lg' ? 'p-6 sm:p-8' : 'p-5 sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-tone-rose blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-tone-blue blur-3xl"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="eyebrow">
            <span className="size-1.5 rounded-full bg-primary" />
            {greeting()}
          </p>
          <h2
            className={cn(
              'font-display font-extrabold tracking-tight text-foreground',
              size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
            )}
          >
            {returning ? `¡Hola de nuevo, ${firstName}!` : `¡Hola, ${firstName}!`}
          </h2>
          <p className="text-pretty text-muted-foreground sm:text-[1.05rem]">{subtitle}</p>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children ? <div className="relative mt-5">{children}</div> : null}
    </section>
  )
}
