import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Calendar, CheckCircle, Clock, Plus, User01 } from '@untitledui/icons'
import {
  AppointmentCard,
  isUpcoming,
} from '@/components/customer/appointment-card'
import type { AppointmentRow } from '@/components/customer/appointment-card'
import { CustomerHome } from '@/components/customer/home'
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
import type { AuthUser, UserRole } from '@/lib/auth'
import { cancelAppointment, getMyAppointments } from '@/server/appointments'
import { updateProfile } from '@/server/auth'
import { createPayment, syncPendingPayments } from '@/server/payments'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbero',
  customer: 'Cliente',
}

const PHONE_DIGITS = /^\+?[0-9 ()-]*$/

export const Route = createFileRoute('/cuenta')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : 'inicio',
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
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const isDirty =
    name.trim() !== user.name || phone.trim() !== (user.phone ?? '')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validateProfile(name, phone)
    if (problem) {
      setErrors(
        problem.startsWith('El nombre')
          ? { name: problem }
          : { phone: problem },
      )
      return
    }
    setErrors({})
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
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle className="font-display text-lg font-semibold tracking-tight">
          Mis datos
        </CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={100}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'profile-name-error' : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <p id="profile-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Teléfono (opcional)</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              maxLength={20}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={
                errors.phone ? 'profile-phone-error' : undefined
              }
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors.phone && (
              <p id="profile-phone-error" className="text-sm text-destructive">
                {errors.phone}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" size="lg" disabled={isSaving || !isDirty}>
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {!isDirty && !isSaving && (
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle className="size-5" />
                Datos al día
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  title,
  hint,
  action,
  icon: Icon = Calendar,
}: {
  title: string
  hint: string
  action?: React.ReactNode
  icon?: typeof Calendar
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

function renderBarberAdminView(user: AuthUser, appointments: AppointmentRow[]) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <User01 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display font-semibold text-foreground">
            {user.name}
          </h2>
          <p className="truncate font-body text-sm text-muted-foreground">
            {ROLE_LABELS[user.role]} · {user.email}
          </p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          title="No hay citas registradas"
          hint="Cuando se registre una cita, aparecerá aquí."
        />
      ) : (
        <div className="grid gap-6">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              role={user.role}
              busy={null}
              onCancel={() => {}}
              onPay={() => {}}
            />
          ))}
        </div>
      )}

      <ProfileForm key={`${user.name}|${user.phone}`} user={user} />
    </div>
  )
}

function AccountPage() {
  const { user } = Route.useRouteContext()
  const { appointments } = Route.useLoaderData()
  const router = useRouter()
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
    <div className="grid gap-4">
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

  if (user.role !== 'customer') {
    return (
      <div className="space-y-8">
        {renderBarberAdminView(user, appointments)}
        <CancelDialog
          appointment={toCancel}
          busy={busy !== null}
          onClose={() => setToCancel(null)}
          onConfirm={() => void confirmCancel()}
        />
      </div>
    )
  }

  const tab = search.tab
  const upcomingList = active
  const pastList = [...past, ...lapsed]

  return (
    <div className="space-y-6">
      {tab === 'perfil' ? (
        <ProfileForm key={`${user.name}|${user.phone}`} user={user} />
      ) : tab === 'citas' ? (
        <section className="space-y-4 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-muted-foreground">
              Tus citas próximas.
            </p>
            <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
              <Link to="/reservar">
                <Plus className="size-5" />
                Agendar cita
              </Link>
            </Button>
          </div>
          {upcomingList.length === 0 ? (
            <EmptyState
              title="No tienes citas activas"
              hint="Agenda una cita en menos de un minuto."
              action={
                <Button asChild size="lg">
                  <Link to="/reservar">Agendar cita</Link>
                </Button>
              }
            />
          ) : (
            renderList(upcomingList)
          )}
        </section>
      ) : tab === 'historial' ? (
        <div className="space-y-8 animate-fade-up">
          {pastList.length === 0 && cancelled.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Aún no tienes historial"
              hint="Aquí verás tus citas pasadas y canceladas."
              action={
                <Button asChild size="lg">
                  <Link to="/reservar">Agendar cita</Link>
                </Button>
              }
            />
          ) : (
            [
              { title: 'Pasadas', list: pastList },
              { title: 'Canceladas', list: cancelled },
            ]
              .filter(({ list }) => list.length > 0)
              .map(({ title, list }) => (
                <section key={title} className="space-y-4">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {title} ({list.length})
                  </h2>
                  {renderList(list)}
                </section>
              ))
          )}
        </div>
      ) : (
        <CustomerHome
          name={user.name}
          appointments={appointments}
          busy={busy}
          onCancel={setToCancel}
          onPay={(id) => void handlePay(id)}
        />
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
          <DialogTitle className="font-display font-semibold">
            ¿Cancelar esta cita?
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `${appointment.service.name} con ${appointment.barber.name}. Esta acción no se puede deshacer.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy} size="lg">
            Mantener cita
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={busy}
            size="lg"
          >
            {busy ? 'Cancelando…' : 'Sí, cancelar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
