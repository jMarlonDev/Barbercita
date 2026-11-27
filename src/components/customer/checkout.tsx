import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowRotateLeft,
  ArrowUpRightFromSquare,
  CircleCheck,
  CreditCard,
} from '@gravity-ui/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/app/skeletons'
import { toast } from '@/components/ui/toaster'
import { getMyAppointments } from '@/server/appointments'
import { createPayment, syncPendingPayments } from '@/server/payments'

export const PAYMENT_CHANNEL = 'barbercita-pago'
const POLL_MS = 5000

export type CheckoutOutcome = 'approved' | 'rejected'

export interface CheckoutState {
  appointmentId: string
  checkoutUrl: string | null
  /** El navegador bloqueó la pestaña nueva. */
  blocked: boolean
  checking: boolean
}

/**
 * Pago Wompi en pestaña nueva: la página queda abierta, sondea el estado y se
 * actualiza sola (poll, focus/visibility y BroadcastChannel).
 */
export function useCheckout(onSettled?: (outcome: CheckoutOutcome, appointmentId: string) => void) {
  const router = useRouter()
  const createPaymentFn = useServerFn(createPayment)
  const syncFn = useServerFn(syncPendingPayments)
  const listFn = useServerFn(getMyAppointments)
  const [state, setState] = useState<CheckoutState | null>(null)
  const [starting, setStarting] = useState<string | null>(null)
  const stateRef = useRef<CheckoutState | null>(null)
  const settledRef = useRef(onSettled)
  const inFlight = useRef(false)
  stateRef.current = state
  settledRef.current = onSettled

  const verify = useCallback(
    async (manual = false) => {
      const current = stateRef.current
      if (!current || inFlight.current) return
      inFlight.current = true
      if (manual) setState((s) => (s ? { ...s, checking: true } : s))
      try {
        await syncFn()
        const rows = await listFn()
        const row = rows.find((a) => a.id === current.appointmentId)
        const payments = row?.payments ?? []
        let outcome: CheckoutOutcome | null = null
        if (payments.some((p) => p.status === 'approved')) outcome = 'approved'
        else if (
          payments.length > 0 &&
          !payments.some((p) => p.status === 'pending')
        )
          outcome = 'rejected'
        if (outcome) {
          setState(null)
          await router.invalidate()
          if (outcome === 'approved') toast.success('¡Pago aprobado! Tu cita está confirmada.')
          else toast.error('El pago no se completó. Puedes intentarlo de nuevo.')
          settledRef.current?.(outcome, current.appointmentId)
        } else if (manual) {
          toast.info('Aún no vemos el pago. Si ya pagaste, espera unos segundos.')
        }
      } catch {
        if (manual) toast.error('No pudimos verificar el pago. Intenta de nuevo.')
      } finally {
        inFlight.current = false
        setState((s) => (s ? { ...s, checking: false } : s))
      }
    },
    [syncFn, listFn, router],
  )

  const waiting = state !== null
  useEffect(() => {
    if (!waiting) return
    const tick = () => void verify()
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const timer = setInterval(tick, POLL_MS)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVisible)
    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(PAYMENT_CHANNEL)
      channel.onmessage = tick
    }
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisible)
      channel?.close()
    }
  }, [waiting, verify])

  /** Debe llamarse directamente desde un click (abre la pestaña sincrónicamente). */
  const pay = useCallback(
    async (appointmentId: string, preOpened?: Window | null) => {
      const w = preOpened ?? window.open('', '_blank')
      setStarting(appointmentId)
      try {
        const { checkoutUrl } = await createPaymentFn({ data: { appointmentId } })
        if (w) {
          w.opener = null
          w.location.href = checkoutUrl
        }
        setState({ appointmentId, checkoutUrl, blocked: !w, checking: false })
      } catch (err) {
        w?.close()
        toast.error(
          err instanceof Error
            ? err.message
            : 'No se pudo iniciar el pago. Intenta de nuevo.',
        )
      } finally {
        setStarting(null)
      }
    },
    [createPaymentFn],
  )

  const reopen = useCallback(() => {
    const url = stateRef.current?.checkoutUrl
    if (!url) return
    const w = window.open(url, '_blank', 'noopener')
    if (!w) setState((s) => (s ? { ...s, blocked: true } : s))
  }, [])

  const dismiss = useCallback(() => setState(null), [])

  return { state, starting, pay, verify, reopen, dismiss }
}

/** Panel "Esperando confirmación del pago". */
export function PaymentWaitingPanel({
  state,
  onVerify,
  onReopen,
  onDismiss,
}: {
  state: CheckoutState
  onVerify: () => void
  onReopen: () => void
  onDismiss?: () => void
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="animate-pop-in space-y-5 rounded-3xl border border-primary/20 bg-warm-surface p-6 shadow-card sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-tone-amber text-tone-amber-fg">
          <CreditCard className="size-7 animate-pulse" />
        </span>
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Esperando confirmación del pago
          </h3>
          <p className="text-base text-muted-foreground">
            Completa el pago en la pestaña de Wompi. Esta página se actualiza
            sola cuando lo confirmemos, no hace falta que la recargues.
          </p>
        </div>
      </div>
      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-3 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
      </div>
      {state.blocked && state.checkoutUrl && (
        <p className="rounded-2xl bg-card p-4 text-base text-foreground">
          Tu navegador bloqueó la ventana nueva.{' '}
          <a
            href={state.checkoutUrl}
            target="_blank"
            rel="noopener"
            className="font-semibold text-primary underline underline-offset-4"
          >
            Abrir el pago en una pestaña nueva
          </a>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button size="lg" className="press gap-2" onClick={onVerify} disabled={state.checking}>
          <CircleCheck className="size-5" />
          {state.checking ? 'Verificando…' : 'Ya pagué, verificar'}
        </Button>
        <Button variant="outline" size="lg" className="press gap-2" onClick={onReopen}>
          <ArrowUpRightFromSquare className="size-5" />
          Volver a abrir el pago
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="lg" className="press gap-2" onClick={onDismiss}>
            <ArrowRotateLeft className="size-5" />
            Pagar más tarde
          </Button>
        )}
      </div>
    </section>
  )
}
