import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { validateHours } from '@/lib/finance'
import { adminUpdateSettings } from '@/server/admin'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  Clock,
  Users01,
  CurrencyDollar,
  File01,
} from '@untitledui/icons'

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

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {icon}
          </span>
          <div>
            <CardTitle className="font-display font-semibold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

export function SettingsPanel({ settings }: { settings: AdminSettings }) {
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
      className="flex max-w-3xl flex-col gap-6"
      noValidate
    >
      <Section
        title="Negocio"
        description="Datos generales de la barbería."
        icon={<File01 className="size-5" />}
      >
        <div className="space-y-2 sm:max-w-md">
          <Label htmlFor="s-name">Nombre del negocio</Label>
          <Input
            id="s-name"
            name="businessName"
            defaultValue={settings.businessName}
            maxLength={100}
            required
          />
        </div>
      </Section>

      <Section
        title="Horarios de atención"
        description="Marca los días abiertos y define apertura y cierre."
        icon={<Clock className="size-5" />}
      >
        <ul className="flex flex-col gap-2">
          {DAYS.map((d) => {
            const h = hours[d.key]
            return (
              <li
                key={d.key}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-200 hover:bg-muted"
              >
                <Switch
                  id={`day-${d.key}`}
                  checked={h !== null}
                  onCheckedChange={(on) =>
                    setDay(d.key, on ? { open: '09:00', close: '19:00' } : null)
                  }
                  aria-label={`${d.label} abierto`}
                />
                <Label htmlFor={`day-${d.key}`} className="min-w-24">
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
                      className="w-36"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="time"
                      aria-label={`${d.label} cierre`}
                      value={h.close}
                      onChange={(e) =>
                        setDay(d.key, { ...h, close: e.target.value })
                      }
                      className="w-36"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </li>
            )
          })}
        </ul>
      </Section>

      <Section
        title="Equipo"
        description="Cantidad máxima de empleados (barberos activos)."
        icon={<Users01 className="size-5" />}
      >
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="s-max">Límite de barberos activos</Label>
          <Input
            id="s-max"
            name="maxBarbers"
            type="number"
            min={1}
            step={1}
            defaultValue={settings.maxBarbers}
            required
          />
        </div>
      </Section>

      <Section
        title="Reglas de negocio"
        description="Comisión y derecho de silla aplicados a las finanzas."
        icon={<CurrencyDollar className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-comm">Comisión del negocio (%)</Label>
            <Input
              id="s-comm"
              name="commissionPercent"
              type="number"
              min={0}
              max={100}
              step="any"
              defaultValue={settings.commissionPercent}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-rent">Derecho de silla mensual (COP)</Label>
            <Input
              id="s-rent"
              name="chairRent"
              type="number"
              min={0}
              step="any"
              defaultValue={settings.chairRentCents / 100}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-notes">Notas y reglas</Label>
          <Textarea
            id="s-notes"
            name="rulesNotes"
            rows={4}
            maxLength={2000}
            defaultValue={settings.rulesNotes ?? ''}
            placeholder="Reglas adicionales, observaciones sobre comisiones, etc."
          />
        </div>
      </Section>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? 'Guardando…' : 'Guardar configuración'}
      </Button>
    </form>
  )
}
