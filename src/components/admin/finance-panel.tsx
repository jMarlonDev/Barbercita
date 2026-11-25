import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

interface FinanceData {
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

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'range', label: 'Rango' },
]

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

const cop = (cents: number) => formatCop(cents / 100)

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  )
}

export function FinancePanel() {
  const fetchFinance = useServerFn(adminGetFinance)
  const register = useServerFn(adminRegisterPayout)
  const today = toDateKey(new Date())
  const [preset, setPreset] = useState<RangePreset>('month')
  const [custom, setCustom] = useState({ from: today, to: today })
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<BarberFinanceRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const range = preset === 'range' ? custom : presetRange(preset, today)
  const { from, to } = range

  const load = useCallback(async () => {
    if (to < from) {
      return
    }
    setLoading(true)
    try {
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

  const summary = data?.summary

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div
            className="flex gap-1"
            role="group"
            aria-label="Periodo de finanzas"
          >
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={preset === p.id ? 'default' : 'outline'}
                aria-pressed={preset === p.id}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {preset === 'range' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fin-from">Desde</Label>
                <Input
                  id="fin-from"
                  type="date"
                  value={custom.from}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, from: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fin-to">Hasta</Label>
                <Input
                  id="fin-to"
                  type="date"
                  value={custom.to}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, to: e.target.value }))
                  }
                />
              </div>
            </>
          ) : null}
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {from === to ? from : `${from} a ${to}`}
            {loading ? ' · actualizando…' : ''}
          </p>
        </CardContent>
      </Card>

      {to < from ? (
        <p role="alert" className="text-sm text-destructive">
          La fecha final debe ser posterior a la inicial.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total recaudado"
          value={cop(summary?.collectedCents ?? 0)}
          hint="Pagos aprobados de citas"
        />
        <Stat
          label="Pendiente por pagar"
          value={cop(summary?.pendingCents ?? 0)}
          hint={`Liquidado: ${cop(summary?.paidOutCents ?? 0)}`}
        />
        <Stat
          label="Balance neto"
          value={cop(summary?.netBalanceCents ?? 0)}
          hint={`Comisión del negocio ${data?.commissionPercent ?? 0}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por barbero</CardTitle>
          <CardDescription>
            Parte del barbero = recaudado × (100 − comisión) / 100.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {summary && summary.rows.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Barbero</th>
                  <th className="py-2 pr-4 text-right font-medium">
                    Recaudado
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">Su parte</th>
                  <th className="py-2 pr-4 text-right font-medium">
                    Liquidado
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    Pendiente
                  </th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {summary.rows.map((r) => (
                  <tr key={r.barberId} className="border-t border-border">
                    <td className="py-2 pr-4 font-medium">{r.name}</td>
                    <td className="py-2 pr-4 text-right">
                      {cop(r.collectedCents)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {cop(r.shareCents)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {cop(r.paidOutCents)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {cop(r.pendingCents)}
                      {r.overpaidCents > 0 ? (
                        <span className="block text-xs text-destructive">
                          Sobrepago {cop(r.overpaidCents)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        disabled={r.pendingCents <= 0}
                        onClick={() => {
                          setFormError(null)
                          setTarget(r)
                        }}
                      >
                        Registrar liquidación
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin ingresos ni liquidaciones en este periodo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de ingresos</CardTitle>
          <CardDescription>
            {data?.history.length ?? 0} pagos · total{' '}
            {cop(summary?.collectedCents ?? 0)}
            {data?.truncated ? ' (lista limitada, acota el periodo)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data && data.history.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Cita</th>
                  <th className="py-2 pr-4 font-medium">Barbero</th>
                  <th className="py-2 pr-4 font-medium">Servicio</th>
                  <th className="py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.history.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {dateFormatter.format(new Date(h.startsAt))}
                    </td>
                    <td className="py-2 pr-4">{h.barberName}</td>
                    <td className="py-2 pr-4">{h.serviceName}</td>
                    <td className="py-2 text-right">{cop(h.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay pagos aprobados en este periodo.
            </p>
          )}
        </CardContent>
      </Card>

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
              <DialogTitle>Registrar liquidación</DialogTitle>
              <DialogDescription>
                {target?.name} · pendiente {cop(target?.pendingCents ?? 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payout-note">Nota (opcional)</Label>
              <Input id="payout-note" name="note" maxLength={500} />
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
