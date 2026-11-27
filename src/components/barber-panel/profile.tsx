import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Mail01 } from '@untitledui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      <p className="text-muted-foreground">
        Mantén tus datos al día para que los clientes y el negocio puedan
        contactarte y liquidarte.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="font-display font-semibold tracking-tight">
            Información personal
          </CardTitle>
          <CardDescription>Así te ven los clientes al reservar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={100}
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
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
              onChange={(e) => setPhone(e.target.value)}
            />
            <FieldError id="profile-phone-error" message={errors.phone} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-email">Correo</Label>
            <div className="relative">
              <Mail01
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                aria-describedby="profile-email-hint"
                className="bg-muted pl-10"
              />
            </div>
            <p id="profile-email-hint" className="text-sm text-muted-foreground">
              El correo vincula tu cuenta y no se puede cambiar.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display font-semibold tracking-tight">
            Método de pago
          </CardTitle>
          <CardDescription>
            Se usará para recibir tus liquidaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="profile-payment">Método de pago</Label>
          <Input
            id="profile-payment"
            value={paymentMethod}
            maxLength={100}
            placeholder="Ej. Nequi 300 000 0000"
            aria-describedby="profile-payment-hint"
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <p id="profile-payment-hint" className="text-sm text-muted-foreground">
            Indica el medio y el número o cuenta.
          </p>
        </CardContent>
      </Card>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
