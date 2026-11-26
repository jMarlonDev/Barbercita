import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, User01, Mail01, Phone01, CreditCard01 } from '@untitledui/icons'
import { Separator } from '@/components/ui/separator'
import type { getBarberProfile } from '@/server/barber-panel'
import { updateBarberProfile } from '@/server/barber-panel'

type Profile = Awaited<ReturnType<typeof getBarberProfile>>

export function BarberProfile({ profile }: { profile: Profile }) {
  const router = useRouter()
  const save = useServerFn(updateBarberProfile)
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [paymentMethod, setPaymentMethod] = useState(
    profile.paymentMethod ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (phone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(phone.trim())) {
      setError('El teléfono no es válido.')
      return
    }
    setBusy(true)
    try {
      await save({ data: { name, phone, paymentMethod } })
      toast.success('Perfil actualizado')
      await router.invalidate()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar el perfil.'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <div className="relative">
              <User01 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="profile-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Correo</Label>
            <div className="relative">
              <Mail01 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="pl-10 bg-muted/50"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El correo vincula tu cuenta y no se puede cambiar.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <div className="relative">
              <Phone01 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                maxLength={20}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Método de pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-payment">Método de pago para liquidaciones</Label>
            <div className="relative">
              <CreditCard01 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="profile-payment"
                value={paymentMethod}
                maxLength={100}
                placeholder="Ej. Nequi 300 000 0000"
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Este método se usará para recibir tus liquidaciones.
            </p>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}