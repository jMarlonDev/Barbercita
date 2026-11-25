import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const durationMinutes = Number(form.duration)
    const price = Number(form.price)
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      return setError('La duración debe estar entre 5 y 480 minutos.')
    }
    if (form.price.trim() === '' || !Number.isFinite(price) || price < 0) {
      return setError('Ingresa un precio válido.')
    }
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
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
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
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-desc">Descripción</Label>
            <Textarea
              id="svc-desc"
              value={form.description}
              maxLength={500}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                onChange={(e) => set({ duration: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Precio (COP)</Label>
              <Input
                id="svc-price"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.price}
                onChange={(e) => set({ price: e.target.value })}
              />
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
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
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
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BarberServices({ services }: { services: Array<ServiceRow> }) {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Mis servicios</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          Nuevo servicio
        </Button>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no tienes servicios. Crea el primero para recibir reservas.
          </p>
        ) : (
          <ul className="space-y-2">
            {services.map((s) => {
              const active = overrides[s.id] ?? s.isActive ?? true
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.durationMinutes} min · {formatCop(s.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={active ? 'secondary' : 'outline'}>
                      {active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Switch
                      checked={active}
                      aria-label={`Activar ${s.name}`}
                      onCheckedChange={(v) => void toggle(s, v)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(s)}
                    >
                      Editar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
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
    </Card>
  )
}
