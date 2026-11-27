import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Magnifier,
  Pencil,
  PersonPlus,
  Persons,
  Plus,
  Scissors,
} from '@gravity-ui/icons'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { PageHeader } from '@/components/app/page-header'
import { UserAvatar } from '@/components/app/user-avatar'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/components/ui/toaster'
import { formatCop } from '@/lib/format'
import {
  adminCreateBarber,
  adminCreateService,
  adminSetBarberActive,
  adminSetServiceActive,
  adminUpdateBarber,
  adminUpdateService,
} from '@/server/admin'
import { FieldError } from './admin-ui'

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

function SearchBox({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Magnifier
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-full bg-muted pl-10"
      />
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

function FormDialog({
  open,
  title,
  description,
  onClose,
  onSubmit,
  busy,
  error,
  submitLabel,
  children,
}: {
  open: boolean
  title: string
  description: string
  onClose: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  busy: boolean
  error: string | null
  submitLabel: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function useRunner() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(
    action: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await action()
      await router.invalidate()
      toast.success(success)
      return true
    } catch (e) {
      setError(errorMessage(e))
      toast.error(errorMessage(e))
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

type DialogState<T> = { mode: 'create' } | { mode: 'edit'; item: T } | null

export function BarbersPanel({
  barbers,
  commissionPercent,
}: {
  barbers: Array<AdminBarber>
  commissionPercent?: number
}) {
  const create = useServerFn(adminCreateBarber)
  const update = useServerFn(adminUpdateBarber)
  const setActive = useServerFn(adminSetBarberActive)
  const { busy, error, setError, run } = useRunner()
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<DialogState<AdminBarber>>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toDisable, setToDisable] = useState<AdminBarber | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? barbers.filter((b) => `${b.name} ${b.email}`.toLowerCase().includes(q))
      : barbers
  }, [barbers, query])

  const editing = dialog?.mode === 'edit' ? dialog.item : null

  function close() {
    setDialog(null)
    setError(null)
    setFieldErrors({})
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phone: String(form.get('phone') ?? ''),
      bio: String(form.get('bio') ?? ''),
    }
    const errors: Record<string, string> = {}
    if (!payload.name) errors.name = 'Escribe el nombre.'
    if (!/^\S+@\S+\.\S+$/.test(payload.email))
      errors.email = 'Escribe un correo válido.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    const target = editing
    const ok = await run(
      () =>
        target
          ? update({ data: { id: target.id, ...payload } })
          : create({ data: payload }),
      target ? 'Barbero actualizado' : 'Barbero creado',
    )
    if (ok) close()
  }

  async function toggle(barber: AdminBarber, on: boolean) {
    const ok = await run(
      () => setActive({ data: { id: barber.id, isActive: on } }),
      on ? `${barber.name} habilitado` : `${barber.name} inhabilitado`,
    )
    if (ok) setConfirmOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Equipo"
        title="Barberos"
        description={`${barbers.length} barberos registrados.`}
        action={
          <Button
            className="press min-h-11 rounded-xl"
            onClick={() => setDialog({ mode: 'create' })}
          >
            <PersonPlus className="size-4" />
            Nuevo barbero
          </Button>
        }
      />
      <SearchBox
        value={query}
        onChange={setQuery}
        label="Buscar por nombre o correo"
      />

      {filtered.length === 0 && barbers.length > 0 ? (
        <EmptyState
          icon={<Persons />}
          title="Sin resultados"
          description="Ningún barbero coincide con tu búsqueda."
          action={
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setQuery('')}
            >
              Limpiar búsqueda
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((b) => (
            <li
              key={b.id}
              className="lift flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center gap-4">
                <UserAvatar name={b.name} size="xl" />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold tracking-tight text-foreground">
                    {b.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {b.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={b.isActive ? 'success' : 'secondary'}>
                  {b.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
                {commissionPercent !== undefined ? (
                  <Badge variant="outline">
                    Comisión {commissionPercent}%
                  </Badge>
                ) : null}
              </div>
              <div className="mt-auto flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 flex-1 rounded-xl"
                  onClick={() => setDialog({ mode: 'edit', item: b })}
                  aria-label={`Editar a ${b.name}`}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
                {b.isActive ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    className="min-h-11 flex-1 rounded-xl"
                    onClick={() => {
                      setToDisable(b)
                      setConfirmOpen(true)
                    }}
                  >
                    Inhabilitar
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    className="min-h-11 flex-1 rounded-xl"
                    onClick={() => void toggle(b, true)}
                  >
                    Reactivar
                  </Button>
                )}
              </div>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setDialog({ mode: 'create' })}
              className="press flex h-full min-h-48 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-foreground/20 bg-muted/40 p-5 text-muted-foreground transition-colors duration-200 hover:bg-primary-soft hover:text-primary"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-card shadow-card">
                <Plus className="size-5" />
              </span>
              <span className="font-semibold">Agregar barbero</span>
            </button>
          </li>
        </ul>
      )}

      <FormDialog
        open={dialog !== null}
        title={editing ? 'Editar barbero' : 'Nuevo barbero'}
        description="Datos de contacto y presentación del barbero."
        onClose={close}
        onSubmit={(e) => void onSubmit(e)}
        busy={busy}
        error={error}
        submitLabel={editing ? 'Guardar' : 'Crear'}
      >
        <Field id="barber-name" label="Nombre" error={fieldErrors.name}>
          <Input
            id="barber-name"
            name="name"
            defaultValue={editing?.name ?? ''}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? 'barber-name-error' : undefined
            }
          />
        </Field>
        <Field id="barber-email" label="Correo" error={fieldErrors.email}>
          <Input
            id="barber-email"
            name="email"
            type="email"
            defaultValue={editing?.email ?? ''}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? 'barber-email-error' : undefined
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="barber-phone" label="Teléfono">
            <Input
              id="barber-phone"
              name="phone"
              defaultValue={editing?.phone ?? ''}
            />
          </Field>
          <Field id="barber-bio" label="Biografía">
            <Input
              id="barber-bio"
              name="bio"
              defaultValue={editing?.bio ?? ''}
            />
          </Field>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        busy={busy}
        title="Inhabilitar barbero"
        description={`${toDisable?.name ?? ''} dejará de estar disponible para nuevas reservas. Podrás reactivarlo cuando quieras.`}
        confirmLabel="Inhabilitar"
        onConfirm={() => {
          if (toDisable) void toggle(toDisable, false)
        }}
      />
    </div>
  )
}

export function ServicesPanel({ services }: { services: Array<AdminService> }) {
  const create = useServerFn(adminCreateService)
  const update = useServerFn(adminUpdateService)
  const setActive = useServerFn(adminSetServiceActive)
  const { busy, error, setError, run } = useRunner()
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<DialogState<AdminService>>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? services.filter((s) => s.name.toLowerCase().includes(q))
      : services
  }, [services, query])

  const editing = dialog?.mode === 'edit' ? dialog.item : null

  function close() {
    setDialog(null)
    setError(null)
    setFieldErrors({})
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? ''),
      durationMinutes: Number(form.get('durationMinutes')),
      price: Number(form.get('price')),
    }
    const errors: Record<string, string> = {}
    if (!payload.name) errors.name = 'Escribe el nombre.'
    if (
      !Number.isFinite(payload.durationMinutes) ||
      payload.durationMinutes < 5 ||
      payload.durationMinutes > 480
    ) {
      errors.durationMinutes = 'La duración debe estar entre 5 y 480 minutos.'
    }
    if (String(form.get('price') ?? '') === '' || !(payload.price >= 0)) {
      errors.price = 'Escribe un precio válido.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    const target = editing
    const ok = await run(
      () =>
        target
          ? update({ data: { id: target.id, ...payload } })
          : create({ data: payload }),
      target ? 'Servicio actualizado' : 'Servicio creado',
    )
    if (ok) close()
  }

  async function toggle(service: AdminService, on: boolean) {
    await run(
      () => setActive({ data: { id: service.id, isActive: on } }),
      on ? `${service.name} visible` : `${service.name} oculto`,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Servicios"
        description={`${services.length} servicios registrados.`}
        action={
          <Button
            className="press min-h-11 rounded-xl"
            onClick={() => setDialog({ mode: 'create' })}
          >
            <Plus className="size-4" />
            Nuevo servicio
          </Button>
        }
      />
      <SearchBox value={query} onChange={setQuery} label="Buscar servicio" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Scissors />}
          tone="blue"
          title={
            services.length === 0 ? 'Aún no hay servicios' : 'Sin resultados'
          }
          description={
            services.length === 0
              ? 'Crea el primer servicio del catálogo.'
              : 'Ningún servicio coincide con tu búsqueda.'
          }
          action={
            services.length === 0 ? (
              <Button
                className="rounded-xl"
                onClick={() => setDialog({ mode: 'create' })}
              >
                Nuevo servicio
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setQuery('')}
              >
                Limpiar búsqueda
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow duration-200 hover:shadow-card"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tone-blue text-tone-blue-fg">
                <Scissors className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {s.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{s.durationMinutes} min</Badge>
                  <Badge variant="default">{formatCop(s.price)}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hidden sm:inline">
                    {s.isActive ? 'Visible' : 'Oculto'}
                  </span>
                  <Switch
                    checked={Boolean(s.isActive)}
                    disabled={busy}
                    onCheckedChange={(on) => void toggle(s, on)}
                    aria-label={`${s.name} visible`}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full bg-primary-soft text-primary hover:bg-primary-soft hover:opacity-80"
                  onClick={() => setDialog({ mode: 'edit', item: s })}
                  aria-label={`Editar ${s.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={dialog !== null}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
        description="Nombre, duración y precio del servicio."
        onClose={close}
        onSubmit={(e) => void onSubmit(e)}
        busy={busy}
        error={error}
        submitLabel={editing ? 'Guardar' : 'Crear'}
      >
        <Field id="service-name" label="Nombre" error={fieldErrors.name}>
          <Input
            id="service-name"
            name="name"
            defaultValue={editing?.name ?? ''}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? 'service-name-error' : undefined
            }
          />
        </Field>
        <Field id="service-description" label="Descripción">
          <Input
            id="service-description"
            name="description"
            defaultValue={editing?.description ?? ''}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="service-duration"
            label="Duración (min)"
            error={fieldErrors.durationMinutes}
          >
            <Input
              id="service-duration"
              name="durationMinutes"
              type="number"
              defaultValue={editing?.durationMinutes.toString() ?? '30'}
              step={5}
              aria-invalid={Boolean(fieldErrors.durationMinutes)}
              aria-describedby={
                fieldErrors.durationMinutes
                  ? 'service-duration-error'
                  : undefined
              }
            />
          </Field>
          <Field
            id="service-price"
            label="Precio (COP)"
            error={fieldErrors.price}
          >
            <Input
              id="service-price"
              name="price"
              type="number"
              defaultValue={editing ? Number(editing.price).toString() : ''}
              step="any"
              aria-invalid={Boolean(fieldErrors.price)}
              aria-describedby={
                fieldErrors.price ? 'service-price-error' : undefined
              }
            />
          </Field>
        </div>
      </FormDialog>
    </div>
  )
}
