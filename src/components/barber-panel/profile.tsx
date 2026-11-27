import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Envelope, CreditCard, Person } from '@gravity-ui/icons'
import { SectionCard } from '@/components/app/section-card'
import { UserAvatar } from '@/components/app/user-avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import type { getBarberProfile } from '@/server/barber-panel'
import { updateBarberProfile } from '@/server/barber-panel'

type Profile = Awaited<ReturnType<typeof getBarberProfile>>
type Errors = { name?: string; phone?: string }

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

export function BarberProfile({ profile }: { profile: Profile }) {
  const router = useRouter()
  const save = useServerFn(updateBarberProfile)
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [paymentMethod, setPaymentMethod] = useState(
    profile.paymentMethod ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const next: Errors = {}
    if (!name.trim()) next.name = 'El nombre es obligatorio.'
    if (phone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(phone.trim())) {
      next.phone = 'Ingresa un teléfono válido (7 a 20 dígitos).'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    try {
      await save({ data: { name, phone, paymentMethod } })
      toast.success('Perfil actualizado')
      await router.invalidate()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar el perfil.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <UserAvatar name={name || profile.name} size="xl" tone="primary" />
          <div className="min-w-0">
            <p className="font-display text-xl font-extrabold tracking-tight text-foreground">
              {name || profile.name}
            </p>
            <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <span className="rounded-full bg-tone-rose px-3 py-1 text-xs font-medium text-tone-rose-fg">
            Barbero
          </span>
        </section>

        <div className="space-y-6">
          <SectionCard
            icon={<Person className="size-5" />}
            tone="rose"
            title="Información personal"
            description="Así te ven los clientes al reservar."
            contentClassName="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={name}
                maxLength={100}
                className="h-11 rounded-xl"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'profile-name-error' : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldError id="profile-name-error" message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Teléfono</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                maxLength={20}
                className="h-11 rounded-xl"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
                onChange={(e) => setPhone(e.target.value)}
              />
              <FieldError id="profile-phone-error" message={errors.phone} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-email">Correo</Label>
              <div className="relative">
                <Envelope
                  className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="profile-email"
                  value={profile.email}
                  disabled
                  aria-describedby="profile-email-hint"
                  className="h-11 rounded-xl bg-muted pl-10"
                />
              </div>
              <p id="profile-email-hint" className="text-sm text-muted-foreground">
                El correo vincula tu cuenta y no se puede cambiar.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={<CreditCard className="size-5" />}
            tone="blue"
            title="Método de pago"
            description="Se usará para recibir tus liquidaciones."
            contentClassName="space-y-2"
          >
            <Label htmlFor="profile-payment">Método de pago</Label>
            <Input
              id="profile-payment"
              value={paymentMethod}
              maxLength={100}
              className="h-11 rounded-xl"
              placeholder="Ej. Nequi 300 000 0000"
              aria-describedby="profile-payment-hint"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <p id="profile-payment-hint" className="text-sm text-muted-foreground">
              Indica el medio y el número o cuenta.
            </p>
          </SectionCard>
        </div>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy} className="press w-full rounded-xl sm:w-auto">
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
