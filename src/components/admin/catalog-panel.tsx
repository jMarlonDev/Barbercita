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
import { formatCop } from '@/lib/format'
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
    <span
      className={
        active
          ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'
          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
      }
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
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

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setEditing(null)
      await router.invalidate()
    } catch (e) {
      setError(errorMessage(e))
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
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Barberos</CardTitle>
          <CardDescription>{barbers.length} registrados</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{barber.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {barber.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge active={barber.isActive} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(barber)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      setActive({
                        data: { id: barber.id, isActive: !barber.isActive },
                      }),
                    )
                  }
                >
                  {barber.isActive ? 'Desactivar' : 'Activar'}
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
          <form
            key={editing?.id ?? 'new'}
            onSubmit={onSubmit}
            className="flex flex-col gap-3"
          >
            <Field label="Nombre" name="name" value={editing?.name} required />
            <Field
              label="Correo"
              name="email"
              type="email"
              value={editing?.email}
              required
            />
            <Field label="Teléfono" name="phone" value={editing?.phone} />
            <Field label="Biografía" name="bio" value={editing?.bio} />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {editing ? 'Guardar' : 'Crear'}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function ServicesPanel({
  services,
}: {
  services: Array<AdminService>
}) {
  const router = useRouter()
  const create = useServerFn(adminCreateService)
  const update = useServerFn(adminUpdateService)
  const setActive = useServerFn(adminSetServiceActive)
  const [editing, setEditing] = useState<AdminService | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setEditing(null)
      await router.invalidate()
    } catch (e) {
      setError(errorMessage(e))
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
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Servicios</CardTitle>
          <CardDescription>{services.length} registrados</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
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
                >
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
          <CardTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            key={editing?.id ?? 'new'}
            onSubmit={onSubmit}
            className="flex flex-col gap-3"
          >
            <Field label="Nombre" name="name" value={editing?.name} required />
            <Field
              label="Descripción"
              name="description"
              value={editing?.description}
            />
            <Field
              label="Duración (min)"
              name="durationMinutes"
              type="number"
              value={editing?.durationMinutes.toString() ?? '30'}
              required
            />
            <Field
              label="Precio (COP)"
              name="price"
              type="number"
              value={editing ? Number(editing.price).toString() : undefined}
              required
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {editing ? 'Guardar' : 'Crear'}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  type = 'text',
  required,
}: {
  label: string
  name: string
  value?: string | null
  type?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`admin-${name}`}>{label}</Label>
      <Input
        id={`admin-${name}`}
        name={name}
        type={type}
        defaultValue={value ?? ''}
        required={required}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
    </div>
  )
}
