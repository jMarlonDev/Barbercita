import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Pencil, Plus, Scissors, Clock, CircleDollar } from '@gravity-ui/icons'
import { EmptyState } from '@/components/app/empty-state'
import { SectionCard } from '@/components/app/section-card'
import { AvailabilityEditor } from '@/components/barber-panel/availability-editor'
import type { AvailabilityRow } from '@/components/barber-panel/availability-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { formatCop } from '@/lib/format'
import type { getBarberServices } from '@/server/barber-catalog'
import {
  createBarberService,
  updateBarberService,
} from '@/server/barber-catalog'

type ServiceRow = Awaited<ReturnType<typeof getBarberServices>>[number]

interface FormState {
  name: string
  description: string
  duration: string
  price: string
  isActive: boolean
}

type FieldErrors = Partial<Record<'name' | 'duration' | 'price', string>>

const EMPTY: FormState = {
  name: '',
  description: '',
  duration: '30',
  price: '',
  isActive: true,
}

function ServiceDialog({
  service,
  open,
  onOpenChange,
}: {
  service: ServiceRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const create = useServerFn(createBarberService)
  const update = useServerFn(updateBarberService)
  const [form, setForm] = useState<FormState>(
    service
      ? {
          name: service.name,
          description: service.description ?? '',
          duration: String(service.durationMinutes),
          price: String(Number(service.price)),
          isActive: service.isActive ?? true,
        }
      : EMPTY,
  )
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const durationMinutes = Number(form.duration)
    const price = Number(form.price)
    const next: FieldErrors = {}
    if (!form.name.trim()) next.name = 'El nombre es obligatorio.'
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      next.duration = 'Debe estar entre 5 y 480 minutos.'
    }
    if (form.price.trim() === '' || !Number.isFinite(price) || price < 0) {
      next.price = 'Ingresa un precio válido.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const data = {
      name: form.name,
      description: form.description,
      durationMinutes,
      price,
      isActive: form.isActive,
    }
    setBusy(true)
    try {
      if (service) {
        await update({ data: { id: service.id, ...data } })
      } else {
        await create({ data })
      }
      toast.success(service ? 'Servicio actualizado' : 'Servicio creado')
      onOpenChange(false)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {service ? 'Editar servicio' : 'Nuevo servicio'}
            </DialogTitle>
            <DialogDescription>
              Los clientes verán este servicio cuando esté activo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="svc-name">Nombre</Label>
            <Input
              id="svc-name"
              value={form.name}
              maxLength={100}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'svc-name-error' : undefined}
              onChange={(e) => set({ name: e.target.value })}
            />
            {errors.name ? (
              <p id="svc-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-desc">Descripción (opcional)</Label>
            <Textarea
              id="svc-desc"
              value={form.description}
              maxLength={500}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="svc-duration">Duración (min)</Label>
              <Input
                id="svc-duration"
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                step={5}
                value={form.duration}
                aria-invalid={errors.duration ? true : undefined}
                aria-describedby={
                  errors.duration ? 'svc-duration-error' : undefined
                }
                onChange={(e) => set({ duration: e.target.value })}
              />
              {errors.duration ? (
                <p id="svc-duration-error" className="text-sm text-destructive">
                  {errors.duration}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Precio (COP)</Label>
              <Input
                id="svc-price"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.price}
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={errors.price ? 'svc-price-error' : undefined}
                onChange={(e) => set({ price: e.target.value })}
              />
              {errors.price ? (
                <p id="svc-price-error" className="text-sm text-destructive">
                  {errors.price}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="svc-active"
              checked={form.isActive}
              onCheckedChange={(isActive) => set({ isActive })}
            />
            <Label htmlFor="svc-active">Activo</Label>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BarberServices({
  services,
  availability,
}: {
  services: Array<ServiceRow>
  availability: Array<AvailabilityRow>
}) {
  const router = useRouter()
  const update = useServerFn(updateBarberService)
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  async function toggle(service: ServiceRow, isActive: boolean) {
    setOverrides((o) => ({ ...o, [service.id]: isActive }))
    try {
      await update({
        data: {
          id: service.id,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: Number(service.price),
          isActive,
        },
      })
      toast.success(isActive ? 'Servicio activado' : 'Servicio desactivado')
      await router.invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setOverrides((o) => {
        const { [service.id]: _removed, ...rest } = o
        return rest
      })
    }
  }

  return (
    <div className="animate-fade-up grid gap-6 xl:grid-cols-2 xl:items-start">
      <SectionCard
        icon={<Scissors className="size-5" />}
        tone="rose"
        title="Tus servicios"
        description="Lo que ofreces, con su duración y precio."
        action={
          <Button className="press rounded-xl" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nuevo
          </Button>
        }
      >
        {services.length === 0 ? (
          <EmptyState
            icon={<Scissors className="size-5" />}
            title="Aún no tienes servicios"
            description="Crea el primero para recibir reservas."
            action={
              <Button className="press rounded-xl" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Crear servicio
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {services.map((s) => {
              const active = overrides[s.id] ?? s.isActive ?? true
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate font-semibold text-foreground">{s.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-medium tabular-nums">
                      <span className="inline-flex items-center gap-1 rounded-full bg-tone-blue px-2.5 py-1 text-tone-blue-fg">
                        <Clock className="size-3.5" aria-hidden />
                        {s.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-tone-green px-2.5 py-1 text-tone-green-fg">
                        <CircleDollar className="size-3.5" aria-hidden />
                        {formatCop(s.price)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={active}
                      aria-label={`Visible: ${s.name}`}
                      onCheckedChange={(v) => void toggle(s, v)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${s.name}`}
                      className="press size-11 rounded-full bg-primary-soft text-primary hover:bg-primary-soft"
                      onClick={() => setEditing(s)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <AvailabilityEditor rows={availability} />

      {creating ? (
        <ServiceDialog service={null} open onOpenChange={setCreating} />
      ) : null}
      {editing ? (
        <ServiceDialog
          key={editing.id}
          service={editing}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
