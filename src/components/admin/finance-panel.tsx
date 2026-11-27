import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { adminGetFinance, adminRegisterPayout } from '@/server/admin-finance'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CurrencyDollar, TrendUp01, Users01, Wallet01 } from '@untitledui/icons'
import { EmptyState, FieldError, KpiCard } from './admin-ui'

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
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Periodo"
          >
            {PRESETS.map((p) => {
              const r = presetRange(p.id, today)
              const active = r.from === from && r.to === to
              return (
                <Button
                  key={p.id}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() => setRange(r)}
                >
                  {p.label}
                </Button>
              )
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fin-from">Desde</Label>
              <Input
                id="fin-from"
                type="date"
                value={from}
                onChange={(e) =>
                  e.target.value && setRange({ from: e.target.value, to })
                }
                aria-invalid={invalidRange}
                aria-describedby={invalidRange ? 'fin-range-error' : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-to">Hasta</Label>
              <Input
                id="fin-to"
                type="date"
                value={to}
                onChange={(e) =>
                  e.target.value && setRange({ from, to: e.target.value })
                }
                aria-invalid={invalidRange}
                aria-describedby={invalidRange ? 'fin-range-error' : undefined}
              />
              <FieldError
                id="fin-range-error"
                message={
                  invalidRange
                    ? 'La fecha final debe ser posterior a la inicial.'
                    : undefined
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-barber">Barbero</Label>
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
                <SelectTrigger id="fin-barber" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {from === to ? from : `${from} a ${to}`}
            {loading ? ' · actualizando…' : ''}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Ingresos por citas"
          value={cop(collected)}
          hint="Pagos aprobados de citas"
          icon={<CurrencyDollar className="size-5" />}
        />
        <KpiCard
          label="Pendiente por pagar"
          value={cop(pending)}
          hint={`Liquidado: ${cop(paidOut)}`}
          icon={<Users01 className="size-5" />}
          tone="secondary"
        />
        <KpiCard
          label="Balance neto"
          value={cop(
            barberId
              ? collected - rows.reduce((a, r) => a + r.shareCents, 0)
              : (data?.summary.netBalanceCents ?? 0),
          )}
          hint={`Comisión del negocio ${data?.commissionPercent ?? 0}%`}
          icon={<TrendUp01 className="size-5" />}
        />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="payouts-title">
        <h2
          id="payouts-title"
          className="font-display text-lg font-semibold tracking-tight"
        >
          Pagos a barberos
        </h2>
        <Card className="overflow-hidden p-0">
          {loading && !data ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Wallet01 className="size-6" />}
              title="Sin pagos en este periodo"
              help="No hay ingresos ni liquidaciones con estos filtros."
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {rows.map((r) => (
                  <li key={r.barberId} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{r.name}</p>
                      <PayoutBadge row={r} />
                    </div>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      Su parte {cop(r.shareCents)} · Liquidado{' '}
                      {cop(r.paidOutCents)}
                    </p>
                    <p className="text-sm font-medium tabular-nums">
                      Pendiente {cop(r.pendingCents)}
                    </p>
                    <Button
                      size="sm"
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
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barbero</TableHead>
                      <TableHead className="text-right">Recaudado</TableHead>
                      <TableHead className="text-right">Su parte</TableHead>
                      <TableHead className="text-right">Liquidado</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>
                        <span className="sr-only">Acción</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="tabular-nums">
                    {rows.map((r) => (
                      <TableRow key={r.barberId}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-right">
                          {cop(r.collectedCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {cop(r.shareCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {cop(r.paidOutCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {cop(r.pendingCents)}
                        </TableCell>
                        <TableCell>
                          <PayoutBadge row={r} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={r.pendingCents <= 0}
                            onClick={() => {
                              setFormError(null)
                              setTarget(r)
                            }}
                          >
                            Registrar pago
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="history-title">
        <h2
          id="history-title"
          className="font-display text-lg font-semibold tracking-tight"
        >
          Ingresos por citas
        </h2>
        <Card className="overflow-hidden p-0">
          {history.length === 0 ? (
            <EmptyState
              icon={<CurrencyDollar className="size-6" />}
              title="Sin ingresos"
              help="No hay pagos aprobados de citas en este periodo."
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{h.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {h.barberName}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {dateFormatter.format(new Date(h.startsAt))}
                      </p>
                    </div>
                    <p className="font-medium tabular-nums">
                      {cop(h.amountCents)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cita</TableHead>
                      <TableHead>Barbero</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="tabular-nums">
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="whitespace-nowrap">
                          {dateFormatter.format(new Date(h.startsAt))}
                        </TableCell>
                        <TableCell>{h.barberName}</TableCell>
                        <TableCell>{h.serviceName}</TableCell>
                        <TableCell className="text-right">
                          {cop(h.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </section>

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
