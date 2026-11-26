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
import { toast } from '@/components/ui/toaster'
import { formatCop } from '@/lib/format'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, UserPlus01, UserCheck01, UserX01, Plus, Edit02 } from '@untitledui/icons'
import { Badge } from '@/components/ui/badge'
import {
  adminCreateBarber,
  adminCreateService,
  adminSetBarberActive,
  adminSetServiceActive,
  adminUpdateBarber,
  adminUpdateService,
} from '@/server/admin'

export interface AdminBarber {
  id: string
  name: string
  email: string
  phone: string | null
  bio: string | null
  paymentMethod?: string | null
  isActive: boolean | null
}

export interface AdminService {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: string
  isActive: boolean | null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error'
}

function StatusBadge({ active }: { active: boolean | null }) {
  return (
    <Badge variant={active ? 'default' : 'outline'} className="gap-1.5">
      {active ? (
        <>
          <UserCheck01 className="size-3" />
          Activo
        </>
      ) : (
        <>
          <UserX01 className="size-3" />
          Inactivo
        </>
      )}
    </Badge>
  )
}

function BarberForm({
  editing,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  editing: AdminBarber | null
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  busy: boolean
  error: string | null
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="barber-name">Nombre</Label>
        <Input
          id="barber-name"
          name="name"
          defaultValue={editing?.name ?? ''}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="barber-email">Correo</Label>
        <Input
          id="barber-email"
          name="email"
          type="email"
          defaultValue={editing?.email ?? ''}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="barber-phone">Teléfono</Label>
        <Input
          id="barber-phone"
          name="phone"
          defaultValue={editing?.phone ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="barber-bio">Biografía</Label>
        <Input
          id="barber-bio"
          name="bio"
          defaultValue={editing?.bio ?? ''}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {editing ? 'Guardar' : 'Crear'}
        </Button>
        {editing ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function ServiceForm({
  editing,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  editing: AdminService | null
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  busy: boolean
  error: string | null
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="service-name">Nombre</Label>
        <Input
          id="service-name"
          name="name"
          defaultValue={editing?.name ?? ''}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="service-description">Descripción</Label>
        <Input
          id="service-description"
          name="description"
          defaultValue={editing?.description ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="service-duration">Duración (min)</Label>
        <Input
          id="service-duration"
          name="durationMinutes"
          type="number"
          defaultValue={editing?.durationMinutes.toString() ?? '30'}
          required
          min={5}
          max={480}
          step={5}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="service-price">Precio (COP)</Label>
        <Input
          id="service-price"
          name="price"
          type="number"
          defaultValue={editing ? Number(editing.price).toString() : ''}
          required
          min={0}
          step="any"
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {editing ? 'Guardar' : 'Crear'}
        </Button>
        {editing ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}

export function BarbersPanel({ barbers }: { barbers: Array<AdminBarber> }) {
  const router = useRouter()
  const create = useServerFn(adminCreateBarber)
  const update = useServerFn(adminUpdateBarber)
  const setActive = useServerFn(adminSetBarberActive)
  const [editing, setEditing] = useState<AdminBarber | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setEditing(null)
      await router.invalidate()
      if (success) {
        toast.success(success)
      }
    } catch (e) {
      setError(errorMessage(e))
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      bio: String(form.get('bio') ?? ''),
    }
    const target = editing
    void run(
      () =>
        target
          ? update({ data: { id: target.id, ...payload } })
          : create({ data: payload }),
      target ? 'Barbero actualizado' : 'Barbero creado',
    )
    if (!target) {
      event.currentTarget.reset()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Barberos</CardTitle>
            <CardDescription>{barbers.length} registrados</CardDescription>
          </div>
          <Button size="sm" onClick={() => setEditing(null)} className="gap-2">
            <UserPlus01 className="size-4" />
            Nuevo barbero
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{barber.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {barber.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Método de pago: {barber.paymentMethod ?? 'No registrado'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge active={barber.isActive} />
                <Switch
                  checked={Boolean(barber.isActive)}
                  disabled={busy}
                  aria-label={`${barber.isActive ? 'Inhabilitar' : 'Habilitar'} a ${barber.name}`}
                  onCheckedChange={(on) =>
                    void run(
                      () =>
                        setActive({ data: { id: barber.id, isActive: on } }),
                      on
                        ? `${barber.name} habilitado`
                        : `${barber.name} inhabilitado`,
                    )
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(barber)}
                  className="gap-2"
                >
                  <Edit02 className="size-3.5" />
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Editar barbero' : 'Nuevo barbero'}</CardTitle>
        </CardHeader>
        <CardContent>
          <BarberForm
            editing={editing}
            onSubmit={onSubmit}
            onCancel={() => setEditing(null)}
            busy={busy}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export function ServicesPanel({ services }: { services: Array<AdminService> }) {
  const router = useRouter()
  const create = useServerFn(adminCreateService)
  const update = useServerFn(adminUpdateService)
  const setActive = useServerFn(adminSetServiceActive)
  const [editing, setEditing] = useState<AdminService | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setEditing(null)
      await router.invalidate()
      if (success) {
        toast.success(success)
      }
    } catch (e) {
      setError(errorMessage(e))
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') ?? ''),
      description: String(form.get('description') ?? ''),
      durationMinutes: Number(form.get('durationMinutes')),
      price: Number(form.get('price')),
    }
    const target = editing
    void run(() =>
      target
        ? update({ data: { id: target.id, ...payload } })
        : create({ data: payload }),
    )
    if (!target) {
      event.currentTarget.reset()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Servicios</CardTitle>
            <CardDescription>{services.length} registrados</CardDescription>
          </div>
          <Button size="sm" onClick={() => setEditing(null)} className="gap-2">
            <Plus className="size-4" />
            Nuevo servicio
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {service.durationMinutes} min · {formatCop(service.price)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge active={service.isActive} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(service)}
                  className="gap-2"
                >
                  <Edit02 className="size-3.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      setActive({
                        data: { id: service.id, isActive: !service.isActive },
                      }),
                    )
                  }
                >
                  {service.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {editing ? 'Editar servicio' : 'Nuevo servicio'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            editing={editing}
            onSubmit={onSubmit}
            onCancel={() => setEditing(null)}
            busy={busy}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}