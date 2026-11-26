import type * as React from 'react'
import { useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  AlertCircle,
  CheckCircle,
  Lock01,
  Mail01,
  Phone,
  User01,
} from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/server/auth'

export const Route = createFileRoute('/registro')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/cuenta', search: { tab: 'citas' } })
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const signUpFn = useServerFn(signUp)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signUpFn({
        data: {
          name,
          email,
          phone: phone.trim() || undefined,
          password,
        },
      })

      if (result.needsEmailConfirmation) {
        setConfirmationEmail(email.trim().toLowerCase())
        return
      }

      await router.invalidate()
      await navigate({ to: '/cuenta', search: { tab: 'citas' } })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la cuenta. Intenta de nuevo.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmationEmail) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="items-center space-y-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle className="size-6" />
            </span>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Revisa tu correo
            </CardTitle>
            <CardDescription>
              Enviamos un enlace de confirmación a{' '}
              <span className="font-medium text-foreground">
                {confirmationEmail}
              </span>
              . Confirma tu cuenta para poder iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild className="w-full">
              <Link to="/login">Ir a iniciar sesión</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Crear cuenta
          </CardTitle>
          <CardDescription>
            Regístrate para reservar y gestionar tus citas en BarberCita.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="register-name">Nombre completo</Label>
              <div className="relative">
                <User01 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  placeholder="Carlos Mendoza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-8"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email">Correo electrónico</Label>
              <div className="relative">
                <Mail01 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-phone">
                Teléfono{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-8"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password">Contraseña</Label>
              <div className="relative">
                <Lock01 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <span>¿Ya tienes cuenta?</span>
          <Link
            to="/login"
            className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
