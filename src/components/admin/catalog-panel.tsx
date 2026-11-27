import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Edit02,
  Plus,
  Scissors01,
  SearchLg,
  UserPlus01,
  Users01,
} from '@untitledui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { EmptyState, FieldError, SectionHeader } from './admin-ui'

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
    <Badge variant={active ? 'success' : 'secondary'}>
      {active ? 'Activo' : 'Inactivo'}
    </Badge>
  )
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
      <SearchLg
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
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

function ConfirmDisableDialog({
  name,
  kind,
  onCancel,
  onConfirm,
  busy,
}: {
  name: string | null
  kind: string
  onCancel: () => void
  onConfirm: () => void
  busy: boolean
}) {
  return (
    <Dialog
      open={name !== null}
      onOpenChange={(o) => (o ? undefined : onCancel())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inhabilitar {kind}</DialogTitle>
          <DialogDescription>
            {name} dejará de estar disponible para nuevas reservas. Podrás
            habilitarlo de nuevo cuando quieras.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? 'Inhabilitando…' : 'Inhabilitar'}
          </Button>
        </DialogFooter>
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

export function BarbersPanel({ barbers }: { barbers: Array<AdminBarber> }) {
  const create = useServerFn(adminCreateBarber)
  const update = useServerFn(adminUpdateBarber)
  const setActive = useServerFn(adminSetBarberActive)
  const { busy, error, setError, run } = useRunner()
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<DialogState<AdminBarber>>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toDisable, setToDisable] = useState<AdminBarber | null>(null)

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
    if (ok) setToDisable(null)
  }

  const rowActions = (b: AdminBarber) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setDialog({ mode: 'edit', item: b })}
        aria-label={`Editar a ${b.name}`}
      >
        <Edit02 className="size-5" />
        Editar
      </Button>
      {b.isActive ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setToDisable(b)}
        >
          Inhabilitar
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void toggle(b, true)}
        >
          Habilitar
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        description={`${barbers.length} barberos registrados.`}
        action={
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <UserPlus01 className="size-5" />
            Nuevo barbero
          </Button>
        }
      />
      <SearchBox
        value={query}
        onChange={setQuery}
        label="Buscar por nombre o correo"
      />

      <Card className="overflow-hidden p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users01 className="size-6" />}
            title={
              barbers.length === 0 ? 'Aún no hay barberos' : 'Sin resultados'
            }
            help={
              barbers.length === 0
                ? 'Agrega el primer barbero del equipo.'
                : 'Ningún barbero coincide con tu búsqueda.'
            }
            action={
              barbers.length === 0 ? (
                <Button onClick={() => setDialog({ mode: 'create' })}>
                  Nuevo barbero
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Limpiar búsqueda
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((b) => (
                <li key={b.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{b.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {b.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pago: {b.paymentMethod ?? 'No registrado'}
                      </p>
                    </div>
                    <StatusBadge active={b.isActive} />
                  </div>
                  {rowActions(b)}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barbero</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Método de pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.email}
                        </p>
                      </TableCell>
                      <TableCell>{b.phone ?? '—'}</TableCell>
                      <TableCell>
                        {b.paymentMethod ?? 'No registrado'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge active={b.isActive} />
                      </TableCell>
                      <TableCell>{rowActions(b)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

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

      <ConfirmDisableDialog
        name={toDisable?.name ?? null}
        kind="barbero"
        busy={busy}
        onCancel={() => setToDisable(null)}
        onConfirm={() => toDisable && void toggle(toDisable, false)}
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
  const [toDisable, setToDisable] = useState<AdminService | null>(null)

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
    const ok = await run(
      () => setActive({ data: { id: service.id, isActive: on } }),
      on ? `${service.name} habilitado` : `${service.name} inhabilitado`,
    )
    if (ok) setToDisable(null)
  }

  const rowActions = (s: AdminService) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setDialog({ mode: 'edit', item: s })}
        aria-label={`Editar ${s.name}`}
      >
        <Edit02 className="size-5" />
        Editar
      </Button>
      {s.isActive ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setToDisable(s)}
        >
          Inhabilitar
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void toggle(s, true)}
        >
          Habilitar
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        description={`${services.length} servicios registrados.`}
        action={
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <Plus className="size-5" />
            Nuevo servicio
          </Button>
        }
      />
      <SearchBox value={query} onChange={setQuery} label="Buscar servicio" />

      <Card className="overflow-hidden p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Scissors01 className="size-6" />}
            title={
              services.length === 0 ? 'Aún no hay servicios' : 'Sin resultados'
            }
            help={
              services.length === 0
                ? 'Crea el primer servicio del catálogo.'
                : 'Ningún servicio coincide con tu búsqueda.'
            }
            action={
              services.length === 0 ? (
                <Button onClick={() => setDialog({ mode: 'create' })}>
                  Nuevo servicio
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Limpiar búsqueda
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {s.durationMinutes} min · {formatCop(s.price)}
                      </p>
                    </div>
                    <StatusBadge active={s.isActive} />
                  </div>
                  {rowActions(s)}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        {s.description ? (
                          <p className="text-xs text-muted-foreground">
                            {s.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {s.durationMinutes} min
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCop(s.price)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge active={s.isActive} />
                      </TableCell>
                      <TableCell>{rowActions(s)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

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

      <ConfirmDisableDialog
        name={toDisable?.name ?? null}
        kind="servicio"
        busy={busy}
        onCancel={() => setToDisable(null)}
        onConfirm={() => toDisable && void toggle(toDisable, false)}
      />
    </div>
  )
}
