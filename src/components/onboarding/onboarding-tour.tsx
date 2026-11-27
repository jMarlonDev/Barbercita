import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from '@gravity-ui/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { iconTile } from '@/components/app/tone'
import type { Tone } from '@/components/app/tone'
import { ROLE_NAV } from '@/components/app/nav-config'
import type { NavIcon } from '@/components/app/nav-config'
import type { AuthUser, UserRole } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useOnboarding } from './use-onboarding'

interface Step {
  title: string
  body: string
  tone: Tone
  icon?: NavIcon
}

const INTRO: Record<UserRole, Step> = {
  customer: {
    title: 'Agendar ya no es un lío',
    body: 'Escoge servicio, barbero y hora en 3 toques. Te mostramos solo horarios realmente libres.',
    tone: 'rose',
  },
  barber: {
    title: 'Tu silla, en orden',
    body: 'Mira tu día de un vistazo, marca asistencias con un toque y controla tus servicios y horario.',
    tone: 'blue',
  },
  admin: {
    title: 'Tu negocio en una pantalla',
    body: 'Ingresos, citas y equipo siempre al día. Te mostramos lo esencial en 4 pasos.',
    tone: 'amber',
  },
}

const HINTS: Record<string, string> = {
  Inicio: 'Tu resumen del día: lo importante primero.',
  'Agendar cita': 'Reserva en pasos cortos y paga en línea si quieres.',
  'Mis citas': 'Consulta, reprograma o cancela cuando lo necesites.',
  'Mis barberos': 'Tus favoritos y cómo te ha ido con cada uno.',
  Historial: 'Tus cortes anteriores y tus calificaciones.',
  'Mi perfil': 'Tus datos de contacto, siempre editables.',
  'Servicios y horario': 'Crea servicios y define tu disponibilidad semanal.',
  Citas: 'Todas las citas: filtra, reprograma o cancela.',
  Barberos: 'Crea, edita o inhabilita a tu equipo.',
  Servicios: 'Catálogo de servicios con precio y duración.',
  Pagos: 'Ingresos por citas y pagos a barberos.',
  Configuración: 'Nombre, horario de atención y reglas del negocio.',
}

function buildSteps(role: UserRole): Step[] {
  const items = ROLE_NAV[role].flatMap((s) => s.items)
  const tones: Tone[] = ['blue', 'green', 'amber', 'rose']
  const main = items
    .filter((i) => HINTS[i.label] && i.label !== 'Inicio')
    .slice(0, 3)
    .map((i, idx) => ({
      title: i.label,
      body: HINTS[i.label] ?? '',
      tone: tones[idx % tones.length] ?? 'cream',
      icon: i.icon,
    }))
  return [INTRO[role], ...main]
}

/** Guía inicial (4 pasos) que aparece solo la primera vez. Se puede saltar. */
export function OnboardingTour({ user }: { user: AuthUser }) {
  const { ready, onboardingCompleted, complete } = useOnboarding(user.id)
  const [index, setIndex] = useState(0)
  const steps = buildSteps(user.role)
  const step = steps[index] ?? steps[0]
  if (!ready || onboardingCompleted || !step) return null
  const last = index === steps.length - 1
  const Icon = step.icon
  const firstName = user.name.split(' ')[0] ?? user.name

  return (
    <Dialog open onOpenChange={(open) => !open && complete()}>
      <DialogContent showCloseButton={false} className="max-w-md gap-0 overflow-hidden rounded-3xl p-0">
        <div className="flex flex-col items-center gap-4 bg-surface/60 px-6 pt-8 pb-6 text-center">
          <span key={index} className={cn(iconTile(step.tone, 'lg'), 'animate-pop-in')}>
            {Icon ? <Icon /> : <span className="font-display text-xl font-extrabold">👋</span>}
          </span>
          <p className="eyebrow">
            Paso {index + 1} de {steps.length}
          </p>
          <DialogTitle className="font-display text-2xl font-extrabold tracking-tight">
            {index === 0 ? `¡Bienvenido, ${firstName}!` : step.title}
          </DialogTitle>
          <DialogDescription className="text-base text-pretty">
            {index === 0 ? `${step.title}. ${step.body}` : step.body}
          </DialogDescription>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-4" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === index ? 'w-6 bg-primary' : 'w-1.5 bg-foreground/15',
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" size="sm" onClick={complete}>
            Saltar guía
          </Button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button variant="outline" size="icon" aria-label="Paso anterior" onClick={() => setIndex(index - 1)}>
                <ArrowLeft />
              </Button>
            ) : null}
            <Button onClick={() => (last ? complete() : setIndex(index + 1))} className="press">
              {last ? (
                <>
                  Empezar <Check />
                </>
              ) : (
                <>
                  Siguiente <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
