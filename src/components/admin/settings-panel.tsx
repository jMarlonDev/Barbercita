import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Briefcase,
  CircleDollar,
  CircleExclamation,
  Clock,
} from '@gravity-ui/icons'
import { PageHeader } from '@/components/app/page-header'
import { SectionCard } from '@/components/app/section-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { validateHours } from '@/lib/finance'
import { adminUpdateSettings } from '@/server/admin'

export interface AdminSettings {
  businessName: string
  businessHours: Record<string, { open: string; close: string }>
  maxBarbers: number
  commissionPercent: number
  chairRentCents: number
  rulesNotes: string | null
}

const DAYS: Array<{ key: string; label: string }> = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
]

type Hours = Record<string, { open: string; close: string } | null>

/** Fila de ajuste: etiqueta y ayuda a la izquierda, control a la derecha. */
function SettingRow({
  htmlFor,
  label,
  help,
  children,
}: {
  htmlFor?: string
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="min-w-0 md:max-w-sm">
        <Label htmlFor={htmlFor} className="text-sm font-semibold">
          {label}
        </Label>
        {help ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{help}</p>
        ) : null}
      </div>
      <div className="md:w-full md:max-w-md">{children}</div>
    </div>
  )
}

export function SettingsPanel({
  settings,
  activeBarbers,
}: {
  settings: AdminSettings
  activeBarbers: number
}) {
  const router = useRouter()
  const save = useServerFn(adminUpdateSettings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState<Hours>(() =>
    Object.fromEntries(
      DAYS.map((d) => [d.key, settings.businessHours[d.key] ?? null]),
    ),
  )

  function setDay(key: string, value: { open: string; close: string } | null) {
    setHours((h) => ({ ...h, [key]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    for (const d of DAYS) {
      const h = hours[d.key]
      const problem = h ? validateHours(h.open, h.close) : null
      if (problem) {
        setError(`${d.label}: ${problem}`)
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      await save({
        data: {
          businessName: String(form.get('businessName') ?? ''),
          businessHours: hours,
          maxBarbers: Number(form.get('maxBarbers')),
          commissionPercent: Number(form.get('commissionPercent')),
          chairRentCents: Math.round(Number(form.get('chairRent')) * 100),
          rulesNotes: String(form.get('rulesNotes') ?? ''),
        },
      })
      toast.success('Configuración guardada')
      await router.invalidate()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocurrió un error'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="flex flex-col gap-6"
      noValidate
    >
      <PageHeader
        eyebrow="Mi negocio"
        title="Configuración"
        description="Identidad, horarios, equipo y reglas de tu barbería."
        action={
          <Button
            type="submit"
            disabled={busy}
            className="press hidden rounded-xl sm:inline-flex"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          icon={<Briefcase />}
          tone="rose"
          title="Identidad"
          description="Datos generales de la barbería."
          contentClassName="divide-y divide-border"
        >
          <SettingRow
            htmlFor="s-name"
            label="Nombre del negocio"
            help="Se muestra a tus clientes al reservar."
          >
            <Input
              id="s-name"
              name="businessName"
              defaultValue={settings.businessName}
              maxLength={100}
              required
              className="rounded-xl"
            />
          </SettingRow>
          <SettingRow
            label="Empleados activos"
            help="Barberos habilitados hoy. Se administran en la pestaña Barberos."
          >
            {/* TODO API: la cantidad de empleados es derivada (solo lectura) */}
            <p className="text-2xl font-extrabold text-foreground tabular-nums">
              {activeBarbers}
            </p>
          </SettingRow>
          <SettingRow
            htmlFor="s-max"
            label="Límite de barberos activos"
            help="Cantidad máxima de empleados del negocio."
          >
            <Input
              id="s-max"
              name="maxBarbers"
              type="number"
              min={1}
              step={1}
              defaultValue={settings.maxBarbers}
              required
              className="rounded-xl"
            />
          </SettingRow>
        </SectionCard>

        <SectionCard
          icon={<CircleDollar />}
          tone="green"
          title="Reglas de negocio"
          description="Comisión y derecho de silla aplicados a las finanzas."
          contentClassName="divide-y divide-border"
        >
          <SettingRow
            htmlFor="s-comm"
            label="Comisión del negocio (%)"
            help="Porcentaje que retiene el negocio de cada cita."
          >
            <Input
              id="s-comm"
              name="commissionPercent"
              type="number"
              min={0}
              max={100}
              step="any"
              defaultValue={settings.commissionPercent}
              required
              className="rounded-xl"
            />
          </SettingRow>
          <SettingRow
            htmlFor="s-rent"
            label="Derecho de silla mensual (COP)"
            help="Valor mensual por uso de silla."
          >
            <Input
              id="s-rent"
              name="chairRent"
              type="number"
              min={0}
              step="any"
              defaultValue={settings.chairRentCents / 100}
              required
              className="rounded-xl"
            />
          </SettingRow>
          <SettingRow
            htmlFor="s-notes"
            label="Notas y reglas"
            help="Observaciones sobre comisiones u otras reglas."
          >
            <Textarea
              id="s-notes"
              name="rulesNotes"
              rows={4}
              maxLength={2000}
              defaultValue={settings.rulesNotes ?? ''}
              placeholder="Reglas adicionales, observaciones sobre comisiones, etc."
              className="rounded-xl"
            />
          </SettingRow>
        </SectionCard>
      </div>

      <SectionCard
        icon={<Clock />}
        tone="blue"
        title="Horario de atención"
        description="Marca los días abiertos y define apertura y cierre."
      >
        <ul className="grid gap-3 lg:grid-cols-2">
          {DAYS.map((d) => {
            const h = hours[d.key]
            return (
              <li
                key={d.key}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors duration-200 hover:bg-muted/50"
              >
                <Switch
                  id={`day-${d.key}`}
                  checked={h !== null}
                  onCheckedChange={(on) =>
                    setDay(d.key, on ? { open: '09:00', close: '19:00' } : null)
                  }
                  aria-label={`${d.label} abierto`}
                />
                <Label htmlFor={`day-${d.key}`} className="min-w-24 font-semibold">
                  {d.label}
                </Label>
                {h ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${d.label} apertura`}
                      value={h.open}
                      onChange={(e) =>
                        setDay(d.key, { ...h, open: e.target.value })
                      }
                      className="w-32 rounded-xl"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="time"
                      aria-label={`${d.label} cierre`}
                      value={h.close}
                      onChange={(e) =>
                        setDay(d.key, { ...h, close: e.target.value })
                      }
                      className="w-32 rounded-xl"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </li>
            )
          })}
        </ul>
      </SectionCard>

      {error ? (
        <Alert variant="destructive" role="alert">
          <CircleExclamation className="size-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        disabled={busy}
        className="press min-h-11 w-full rounded-xl sm:hidden"
      >
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
