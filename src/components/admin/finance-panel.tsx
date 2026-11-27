import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { BUSINESS_TIME_ZONE, toDateKey } from '@/lib/availability'
import { presetRange, validatePayout } from '@/lib/finance'
import type {
  BarberFinanceRow,
  FinanceSummary,
  RangePreset,
} from '@/lib/finance'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import { adminGetFinance, adminRegisterPayout } from '@/server/admin-finance'
import {
  CircleDollar,
  Percent,
  Receipt,
  Wallet,
} from '@gravity-ui/icons'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { StatCard } from '@/components/app/stat-card'
import { UserAvatar } from '@/components/app/user-avatar'
import { Skeleton } from '@/components/app/skeletons'
import { Badge } from '@/components/ui/badge'
import { FieldError } from './admin-ui'

export interface FinanceData {
  range: { from: string; to: string }
  commissionPercent: number
  summary: FinanceSummary
  history: Array<{
    id: string
    startsAt: string
    amountCents: number
    barberName: string
    serviceName: string
  }>
  truncated: boolean
}

const PRESETS: Array<{ id: Exclude<RangePreset, 'range'>; label: string }> = [
  { id: 'day', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
]

export interface FinanceSearch {
  from?: string
  to?: string
  barberId?: string
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

const cop = (cents: number) => formatCop(cents / 100)

function PayoutBadge({ row }: { row: BarberFinanceRow }) {
  if (row.overpaidCents > 0) {
    return (
      <Badge variant="destructive">Sobrepago {cop(row.overpaidCents)}</Badge>
    )
  }
  return row.pendingCents > 0 ? (
    <Badge variant="warning">Pendiente</Badge>
  ) : (
    <Badge variant="success">Pagado</Badge>
  )
}

export function FinancePanel({
  barbers,
  search,
}: {
  barbers: Array<{ id: string; name: string }>
  search: FinanceSearch
}) {
  const fetchFinance = useServerFn(adminGetFinance)
  const register = useServerFn(adminRegisterPayout)
  const navigate = useNavigate({ from: '/admin' })
  const today = toDateKey(new Date())
  const defaults = presetRange('month', today)
  const from = search.from ?? defaults.from
  const to = search.to ?? defaults.to
  const barberId = search.barberId
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<BarberFinanceRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function setRange(next: { from: string; to: string }) {
    void navigate({ search: (prev) => ({ ...prev, ...next }) })
  }

  const load = useCallback(async () => {
    if (to < from) {
      return
    }
    setLoading(true)
    try {
      // TODO API: adminGetFinance no acepta barberId; el filtro por barbero se aplica en cliente.
      setData(await fetchFinance({ data: { from, to } }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
  }, [fetchFinance, from, to])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target) {
      return
    }
    const form = new FormData(event.currentTarget)
    const amountCents = Math.round(Number(form.get('amount')) * 100)
    const problem = validatePayout(amountCents, target.pendingCents)
    if (problem) {
      setFormError(problem)
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await register({
        data: {
          barberId: target.barberId,
          amountCents,
          note: String(form.get('note') ?? ''),
          from,
          to,
        },
      })
      toast.success(`Liquidación registrada para ${target.name}`)
      setTarget(null)
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Ocurrió un error')
    } finally {
      setBusy(false)
    }
  }

  const barberName = barbers.find((b) => b.id === barberId)?.name
  const rows = (data?.summary.rows ?? []).filter(
    (r) => !barberId || r.barberId === barberId,
  )
  const history = (data?.history ?? []).filter(
    (h) => !barberId || h.barberName === barberName,
  )
  const collected = rows.reduce((acc, r) => acc + r.collectedCents, 0)
  const pending = rows.reduce((acc, r) => acc + r.pendingCents, 0)
  const paidOut = rows.reduce((acc, r) => acc + r.paidOutCents, 0)
  const invalidRange = to < from

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            className="inline-flex self-start rounded-full bg-muted p-1"
            role="group"
            aria-label="Periodo"
          >
            {PRESETS.map((p) => {
              const r = presetRange(p.id, today)
              const active = r.from === from && r.to === to
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRange(r)}
                  className={cn(
                    'min-h-9 rounded-full px-4 text-sm font-semibold transition-all duration-200',
                    active
                      ? 'bg-card text-foreground shadow-card'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <Input
              id="fin-from"
              type="date"
              aria-label="Desde"
              value={from}
              onChange={(e) =>
                e.target.value && setRange({ from: e.target.value, to })
              }
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? 'fin-range-error' : undefined}
              className="min-h-11 rounded-full bg-muted"
            />
            <Input
              id="fin-to"
              type="date"
              aria-label="Hasta"
              value={to}
              onChange={(e) =>
                e.target.value && setRange({ from, to: e.target.value })
              }
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? 'fin-range-error' : undefined}
              className="min-h-11 rounded-full bg-muted"
            />
            {/* TODO API: adminGetFinance no acepta barberId; el filtro se aplica en cliente. */}
            <Select
              value={barberId ?? 'all'}
              onValueChange={(v) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    barberId: v === 'all' ? undefined : v,
                  }),
                })
              }
            >
              <SelectTrigger
                id="fin-barber"
                aria-label="Barbero"
                className="min-h-11 w-full rounded-full bg-muted"
              >
                <SelectValue placeholder="Todos los barberos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los barberos</SelectItem>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <FieldError
          id="fin-range-error"
          message={
            invalidRange
              ? 'La fecha final debe ser posterior a la inicial.'
              : undefined
          }
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {from === to ? from : `${from} a ${to}`}
          {loading ? ' · actualizando…' : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos por citas"
          value={cop(collected)}
          hint="Pagos aprobados de citas"
          icon={<CircleDollar />}
          tone="green"
        />
        <StatCard
          label="Comisiones del negocio"
          value={cop(
            barberId
              ? collected - rows.reduce((a, r) => a + r.shareCents, 0)
              : (data?.summary.netBalanceCents ?? 0),
          )}
          hint={`Comisión ${data?.commissionPercent ?? 0}%`}
          icon={<Percent />}
          tone="rose"
        />
        <StatCard
          label="Pendiente por pagar"
          value={cop(pending)}
          hint="A barberos"
          icon={<Wallet />}
          tone="amber"
        />
        <StatCard
          label="Pagado a barberos"
          value={cop(paidOut)}
          hint="Liquidaciones registradas"
          icon={<Receipt />}
          tone="blue"
        />
      </div>

      <SectionCard
        icon={<Wallet />}
        tone="amber"
        title="Pagos a barberos"
        description="Lo que le corresponde a cada barbero y su liquidación."
      >
        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Wallet />}
            tone="amber"
            title="Sin pagos en este periodo"
            description="No hay ingresos ni liquidaciones con estos filtros."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li
                key={r.barberId}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3 lg:w-64">
                  <UserAvatar name={r.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <PayoutBadge row={r} />
                  </div>
                </div>
                <dl className="grid flex-1 grid-cols-2 gap-3 text-sm tabular-nums sm:grid-cols-4">
                  {(
                    [
                      ['Recaudado', r.collectedCents],
                      ['Su parte', r.shareCents],
                      ['Liquidado', r.paidOutCents],
                      ['Pendiente', r.pendingCents],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-semibold text-foreground">
                        {cop(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Button
                  className="press min-h-11 rounded-xl"
                  disabled={r.pendingCents <= 0}
                  onClick={() => {
                    setFormError(null)
                    setTarget(r)
                  }}
                >
                  Registrar pago
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={<Receipt />}
        tone="green"
        title="Ingresos por citas"
        description="Pagos aprobados en el periodo."
      >
        {history.length === 0 ? (
          <EmptyState
            icon={<CircleDollar />}
            tone="green"
            title="Sin ingresos"
            description="No hay pagos aprobados de citas en este periodo."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{h.serviceName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {h.barberName} · {dateFormatter.format(new Date(h.startsAt))}
                  </p>
                </div>
                <p className="font-bold text-foreground tabular-nums">
                  {cop(h.amountCents)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null)
          }
        }}
      >
        <DialogContent>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Registrar pago</DialogTitle>
              <DialogDescription>
                {target?.name} · pendiente {cop(target?.pendingCents ?? 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Monto (COP)</Label>
              <Input
                id="payout-amount"
                name="amount"
                type="number"
                min={1}
                step="any"
                max={(target?.pendingCents ?? 0) / 100}
                defaultValue={(target?.pendingCents ?? 0) / 100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-note">Nota (opcional)</Label>
              <Input id="payout-note" name="note" maxLength={500} />
            </div>
            <FieldError id="payout-error" message={formError ?? undefined} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Guardando…' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
