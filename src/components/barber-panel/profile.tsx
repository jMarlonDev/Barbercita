import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mi perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Correo</Label>
            <Input id="profile-email" value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">
              El correo vincula tu cuenta y no se puede cambiar.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-payment">Método de pago</Label>
            <Input
              id="profile-payment"
              value={paymentMethod}
              maxLength={100}
              placeholder="Ej. Nequi 300 000 0000"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            Guardar cambios
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
