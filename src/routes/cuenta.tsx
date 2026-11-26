import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Calendar, CheckCircle, Plus, User01, Clock, AlertCircle } from '@untitledui/icons'
import {
  AppointmentCard,
  isUpcoming,
} from '@/components/customer/appointment-card'
import type { AppointmentRow } from '@/components/customer/appointment-card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toaster'
import type { AuthUser, UserRole } from '@/lib/auth'
import { cancelAppointment, getMyAppointments } from '@/server/appointments'
import { updateProfile } from '@/server/auth'
import { createPayment, syncPendingPayments } from '@/server/payments'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbero',
  customer: 'Cliente',
}

const PHONE_DIGITS = /^\+?[0-9 ()-]*$/

export const Route = createFileRoute('/cuenta')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : 'citas',
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context }) => {
    if (context.user?.role === 'customer') {
      await syncPendingPayments()
    }
    const appointments = await getMyAppointments()
    return { appointments }
  },
  component: AccountPage,
})

function validateProfile(name: string, phone: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'El nombre debe tener entre 2 y 100 caracteres.'
  }
  const clean = phone.trim()
  if (clean) {
    const digits = clean.replace(/\D/g, '').length
    if (!PHONE_DIGITS.test(clean) || digits < 7 || digits > 15) {
      return 'El teléfono debe tener entre 7 y 15 dígitos.'
    }
  }
  return null
}

function ProfileForm({ user }: { user: AuthUser }) {
  const router = useRouter()
  const updateProfileFn = useServerFn(updateProfile)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const isDirty =
    name.trim() !== user.name || phone.trim() !== (user.phone ?? '')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validateProfile(name, phone)
    setFieldError(problem)
    if (problem) {
      toast.error(problem)
      return
    }
    setIsSaving(true)
    try {
      await updateProfileFn({
        data: { name: name.trim(), phone: phone.trim() },
      })
      await router.invalidate()
      toast.success('Perfil guardado')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo guardar el perfil.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mi perfil</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={100}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Teléfono (opcional)</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {fieldError && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertCircle className="size-4" />
              <AlertDescription>{fieldError}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {!isDirty && !isSaving && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle className="size-4 text-emerald-600" />
                Guardado
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Calendar className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

function AccountPage() {
  const { user } = Route.useRouteContext()
  const { appointments } = Route.useLoaderData()
  const router = useRouter()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const cancelFn = useServerFn(cancelAppointment)
  const createPaymentFn = useServerFn(createPayment)

  const [busy, setBusy] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<AppointmentRow | null>(null)

  if (!user) {
    return null
  }

  async function confirmCancel() {
    if (!toCancel) return
    const id = toCancel.id
    setBusy(id)
    try {
      await cancelFn({ data: { appointmentId: id } })
      await router.invalidate()
      toast.success('Cita cancelada')
      setToCancel(null)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo cancelar la cita. Intenta de nuevo.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function handlePay(appointmentId: string) {
    setBusy(appointmentId)
    try {
      const { checkoutUrl } = await createPaymentFn({ data: { appointmentId } })
      window.location.href = checkoutUrl
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar el pago. Intenta de nuevo.',
      )
      setBusy(null)
    }
  }

  const active = appointments.filter(isUpcoming).reverse()
  const past = appointments.filter((a) =>
    ['completed', 'no_show'].includes(a.status ?? ''),
  )
  const cancelled = appointments.filter((a) => a.status === 'cancelled')
  const lapsed = appointments.filter(
    (a) =>
      (a.status === 'pending' || a.status === 'confirmed') && !isUpcoming(a),
  )

  const renderList = (list: Array<AppointmentRow>) => (
    <div className="grid gap-3">
      {list.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          role={user.role}
          busy={busy}
          onCancel={setToCancel}
          onPay={(id) => void handlePay(id)}
        />
      ))}
    </div>
  )

  const header = (
    <div className="flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <User01 className="size-5" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{user.name}</h1>
        <p className="truncate text-sm text-muted-foreground">
          {ROLE_LABELS[user.role]} · {user.email}
        </p>
      </div>
    </div>
  )

  if (user.role !== 'customer') {
    return (
      <div className="space-y-6">
        {header}
        {appointments.length === 0 ? (
          <EmptyState
            title="No hay citas registradas"
            hint="Cuando se registre una cita, aparecerá aquí."
          />
        ) : (
          renderList(appointments)
        )}
        <CancelDialog
          appointment={toCancel}
          busy={busy !== null}
          onClose={() => setToCancel(null)}
          onConfirm={() => void confirmCancel()}
        />
      </div>
    )
  }

  const tabs = [
    { value: 'citas', label: 'Mis citas', icon: <Calendar className="size-4" /> },
    { value: 'historial', label: 'Historial', icon: <Clock className="size-4" /> },
    { value: 'perfil', label: 'Perfil', icon: <User01 className="size-4" /> },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {header}
        <Button asChild className="w-full gap-1.5 sm:w-auto">
          <Link to="/reservar">
            <Plus className="size-4" />
            Agendar cita
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={search.tab} onValueChange={(v) => navigate({ search: { ...search, tab: v } })} className="gap-4">
        <TabsList className="w-full sm:w-fit" aria-label="Secciones de la cuenta">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="citas" className="space-y-3 animate-in fade-in-0">
          {active.length === 0 ? (
            <EmptyState
              title="No tienes citas activas"
              hint="Agenda una cita en menos de un minuto."
              action={
                <Button asChild className="mt-2">
                  <Link to="/reservar">Agendar mi primera cita</Link>
                </Button>
              }
            />
          ) : (
            renderList(active)
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-6 animate-in fade-in-0">
          {[
            { title: 'Pasadas', list: [...past, ...lapsed] },
            { title: 'Canceladas', list: cancelled },
          ].map(({ title, list }) => (
            <section key={title} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {title} ({list.length})
                </h2>
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nada por aquí todavía.
                </p>
              ) : (
                renderList(list)
              )}
            </section>
          ))}
        </TabsContent>

        <TabsContent value="perfil" className="animate-in fade-in-0">
          <ProfileForm key={`${user.name}|${user.phone}`} user={user} />
        </TabsContent>
      </Tabs>

      <CancelDialog
        appointment={toCancel}
        busy={busy !== null}
        onClose={() => setToCancel(null)}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  )
}

function CancelDialog({
  appointment,
  busy,
  onClose,
  onConfirm,
}: {
  appointment: AppointmentRow | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cancelar esta cita?</DialogTitle>
          <DialogDescription>
            {appointment
              ? `${appointment.service.name} con ${appointment.barber.name}. Esta acción no se puede deshacer.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Mantener cita
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Cancelando...' : 'Sí, cancelar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}