import { useEffect, useState } from 'react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  CircleCheck,
  CircleExclamation,
  Clock,
  Hourglass,
} from '@gravity-ui/icons'
import type { ComponentType, SVGProps } from 'react'
import { Confetti } from '@/components/customer/confetti'
import { PAYMENT_CHANNEL } from '@/components/customer/checkout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { syncPayment } from '@/server/payments'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 6

type PaymentStatus = Awaited<ReturnType<typeof syncPayment>>['status']
type ViewState = PaymentStatus | 'checking' | 'failed'

const VIEWS: Record<
  ViewState,
  {
    title: string
    description: string
    icon: ComponentType<SVGProps<SVGSVGElement>>
    tone: string
  }
> = {
  checking: {
    title: 'Verificando tu pago',
    description: 'Un momento, estamos confirmando la transacción con Wompi.',
    icon: Hourglass,
    tone: 'bg-tone-cream text-tone-cream-fg',
  },
  approved: {
    title: 'Pago aprobado',
    description: 'Tu pago fue aprobado y tu cita quedó confirmada.',
    icon: CircleCheck,
    tone: 'bg-tone-green text-tone-green-fg',
  },
  pending: {
    title: 'Pago en proceso',
    description:
      'Tu pago aún se está procesando. Revisa el estado en tu cuenta en unos minutos.',
    icon: Clock,
    tone: 'bg-tone-amber text-tone-amber-fg',
  },
  declined: {
    title: 'Pago rechazado',
    description:
      'No se pudo completar el pago. Puedes intentarlo de nuevo desde tu cuenta.',
    icon: CircleExclamation,
    tone: 'bg-destructive-soft text-destructive',
  },
  voided: {
    title: 'Pago anulado',
    description:
      'El pago fue anulado. Puedes intentarlo de nuevo desde tu cuenta.',
    icon: CircleExclamation,
    tone: 'bg-destructive-soft text-destructive',
  },
  error: {
    title: 'Error en el pago',
    description:
      'Ocurrió un error al procesar el pago. Puedes intentarlo de nuevo desde tu cuenta.',
    icon: CircleExclamation,
    tone: 'bg-destructive-soft text-destructive',
  },
  failed: {
    title: 'No pudimos verificar el pago',
    description:
      'Revisa el estado de tu cita en tu cuenta o intenta pagar de nuevo.',
    icon: CircleExclamation,
    tone: 'bg-destructive-soft text-destructive',
  },
}

export const Route = createFileRoute('/pago/resultado')({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === 'string' && search.id ? search.id : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: PaymentResultPage,
})

function PaymentResultPage() {
  const { id } = Route.useSearch()
  const syncFn = useServerFn(syncPayment)
  const [view, setView] = useState<ViewState>(id ? 'checking' : 'failed')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function check(attempt: number) {
      try {
        const { status } = await syncFn({ data: { transactionId: id! } })
        if (cancelled) return
        if (status === 'pending' && attempt < MAX_ATTEMPTS) {
          timer = setTimeout(() => void check(attempt + 1), POLL_INTERVAL_MS)
          return
        }
        setView(status)
      } catch {
        if (!cancelled) setView('failed')
      }
    }

    void check(1)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, syncFn])

  useEffect(() => {
    if (view === 'checking' || typeof BroadcastChannel === 'undefined') return
    // Avisa a la pestaña original de BarberCita para que se actualice al instante.
    const channel = new BroadcastChannel(PAYMENT_CHANNEL)
    channel.postMessage({ type: 'payment-result', status: view })
    channel.close()
  }, [view])

  const { title, description, icon: Icon, tone } = VIEWS[view]

  const settled = view !== 'checking'

  return (
    <div className="mx-auto max-w-xl">
      <section className="relative animate-pop-in space-y-6 overflow-hidden rounded-3xl border border-border bg-warm-surface p-8 text-center shadow-card sm:p-10">
        {view === 'approved' && <Confetti />}
        <span
          className={cn(
            'mx-auto flex size-20 items-center justify-center rounded-3xl',
            tone,
          )}
        >
          <Icon className={cn('size-10', view === 'checking' && 'animate-pulse')} />
        </span>
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>
        {settled && (
          <p className="rounded-2xl bg-card p-4 text-base text-foreground">
            Puedes cerrar esta pestaña y volver a BarberCita.
          </p>
        )}
        <Button asChild size="lg" className="press min-h-12">
          <Link to="/cuenta" search={{ tab: 'citas' }}>
            Ir a mis citas
          </Link>
        </Button>
      </section>
    </div>
  )
}
