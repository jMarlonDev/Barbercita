import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CircleCheck } from '@gravity-ui/icons'
import { PageHeader } from '@/components/app/page-header'
import { UserAvatar } from '@/components/app/user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import type { AuthUser } from '@/lib/auth'
import { updateProfile } from '@/server/auth'

const PHONE_DIGITS = /^\+?[0-9 ()-]*$/

function validateName(name: string): string | undefined {
  const t = name.trim()
  return t.length < 2 || t.length > 100
    ? 'El nombre debe tener entre 2 y 100 caracteres.'
    : undefined
}

function validatePhone(phone: string): string | undefined {
  const clean = phone.trim()
  if (!clean) return undefined
  const digits = clean.replace(/\D/g, '').length
  return !PHONE_DIGITS.test(clean) || digits < 7 || digits > 15
    ? 'El teléfono debe tener entre 7 y 15 dígitos.'
    : undefined
}

export function ProfileForm({ user }: { user: AuthUser }) {
  const router = useRouter()
  const updateProfileFn = useServerFn(updateProfile)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean }>({})

  const nameError = touched.name ? validateName(name) : undefined
  const phoneError = touched.phone ? validatePhone(phone) : undefined
  const isDirty = name.trim() !== user.name || phone.trim() !== (user.phone ?? '')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched({ name: true, phone: true })
    if (validateName(name) || validatePhone(phone)) return
    setIsSaving(true)
    try {
      await updateProfileFn({ data: { name: name.trim(), phone: phone.trim() } })
      await router.invalidate()
      toast.success('Perfil guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow="Perfil"
        title="Tus datos"
        description="Mantén tu información al día para que tu barbero pueda contactarte."
      />
      <section className="grid gap-8 rounded-3xl border border-border bg-warm-surface p-6 shadow-card sm:p-8 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
          <UserAvatar name={name || user.name} size="xl" tone="primary" className="size-28 text-3xl" />
          <div>
            <p className="font-display text-xl font-extrabold text-foreground">{user.name}</p>
            <p className="text-base text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-base">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={100}
              autoComplete="name"
              className="h-12 text-base"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'profile-name-error' : undefined}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              onChange={(e) => setName(e.target.value)}
            />
            {nameError && (
              <p id="profile-name-error" className="text-sm text-destructive">{nameError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone" className="text-base">Teléfono (opcional)</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              maxLength={20}
              autoComplete="tel"
              className="h-12 text-base"
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? 'profile-phone-error' : undefined}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              onChange={(e) => setPhone(e.target.value)}
            />
            {phoneError && (
              <p id="profile-phone-error" className="text-sm text-destructive">{phoneError}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" size="lg" className="press min-h-12" disabled={isSaving || !isDirty}>
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {!isDirty && !isSaving && (
              <span className="inline-flex items-center gap-1.5 text-base text-success">
                <CircleCheck className="size-5" />
                Datos al día
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
