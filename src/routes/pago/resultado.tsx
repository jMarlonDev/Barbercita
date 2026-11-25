import { useEffect, useState } from 'react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, CheckCircle, Clock, Loading02 } from '@untitledui/icons'
import type { ComponentType, SVGProps } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    icon: Loading02,
    tone: 'bg-muted text-muted-foreground',
  },
  approved: {
    title: 'Pago aprobado',
    description: 'Tu pago fue aprobado y tu cita quedó confirmada.',
    icon: CheckCircle,
    tone: 'bg-emerald-500/10 text-emerald-600',
  },
  pending: {
    title: 'Pago en proceso',
    description:
      'Tu pago aún se está procesando. Revisa el estado en tu cuenta en unos minutos.',
    icon: Clock,
    tone: 'bg-amber-500/10 text-amber-600',
  },
  declined: {
    title: 'Pago rechazado',
    description:
      'No se pudo completar el pago. Puedes intentarlo de nuevo desde tu cuenta.',
    icon: AlertCircle,
    tone: 'bg-destructive/10 text-destructive',
  },
  voided: {
    title: 'Pago anulado',
    description:
      'El pago fue anulado. Puedes intentarlo de nuevo desde tu cuenta.',
    icon: AlertCircle,
    tone: 'bg-destructive/10 text-destructive',
  },
  error: {
    title: 'Error en el pago',
    description:
      'Ocurrió un error al procesar el pago. Puedes intentarlo de nuevo desde tu cuenta.',
    icon: AlertCircle,
    tone: 'bg-destructive/10 text-destructive',
  },
  failed: {
    title: 'No pudimos verificar el pago',
    description:
      'Revisa el estado de tu cita en tu cuenta o intenta pagar de nuevo.',
    icon: AlertCircle,
    tone: 'bg-destructive/10 text-destructive',
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

  const { title, description, icon: Icon, tone } = VIEWS[view]

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <span
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              tone,
            )}
          >
            <Icon
              className={cn('size-6', view === 'checking' && 'animate-spin')}
            />
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link to="/cuenta">Ir a mi cuenta</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
