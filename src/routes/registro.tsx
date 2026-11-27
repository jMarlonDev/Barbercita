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
import { Alert } from '@/components/ui/alert'

export const Route = createFileRoute('/registro')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/cuenta', search: { tab: 'inicio' } })
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
      await navigate({ to: '/cuenta', search: { tab: 'inicio' } })
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
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-6 py-8">
        <Card className="w-full max-w-md border border-border bg-card rounded-xl">
          <CardHeader className="items-center space-y-2 text-center p-8">
            <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle className="size-6" />
            </span>
            <CardTitle className="font-display font-semibold text-xl tracking-tight text-foreground">
              Revisa tu correo
            </CardTitle>
            <CardDescription className="text-sm text-foreground">
              Enviamos un enlace de confirmación a{' '}
              <span className="font-medium text-foreground">
                {confirmationEmail}
              </span>
              . Confirma tu cuenta para poder iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center p-4">
            <Button asChild className="w-full rounded-lg">
              <Link to="/login">Ir a iniciar sesión</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-6 py-8">
      <Card className="w-full max-w-md border border-border bg-card rounded-xl">
        <CardHeader className="space-y-1 text-center p-8">
          <CardTitle className="font-display font-semibold text-xl tracking-tight text-foreground">
            Crear cuenta
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Regístrate para reservar y gestionar tus citas en BarberCita.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <span>{error}</span>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="register-name">Nombre completo</Label>
              <div className="relative">
                <User01 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  placeholder="Carlos Mendoza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 rounded-lg"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email">Correo electrónico</Label>
              <div className="relative">
                <Mail01 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-lg"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-phone">
                Teléfono{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 rounded-lg"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password">Contraseña</Label>
              <div className="relative">
                <Lock01 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-lg"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground p-4">
          <span>¿Ya tienes cuenta?</span>
          <Link
            to="/login"
            className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
